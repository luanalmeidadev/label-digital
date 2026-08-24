ALTER TABLE public.cash_movements
  ADD COLUMN movement_reference uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD CONSTRAINT cash_movements_reference_key UNIQUE (movement_reference);

ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_order_method_key UNIQUE (order_id, method);

CREATE OR REPLACE FUNCTION public.ensure_cashier_order_has_open_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_session_status text;
BEGIN
  IF NEW.sales_channel = 'cashier' THEN
    SELECT session.status
    INTO current_session_status
    FROM public.cash_sessions AS session
    WHERE session.id = NEW.cash_session_id
    FOR UPDATE;

    IF current_session_status IS DISTINCT FROM 'open' THEN
      RAISE EXCEPTION 'O caixa informado não está aberto.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_cashier_order_has_open_session
BEFORE INSERT OR UPDATE OF sales_channel, cash_session_id
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_cashier_order_has_open_session();

CREATE OR REPLACE FUNCTION public.create_cash_movement(
  p_cash_session_id uuid,
  p_movement_reference uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text
)
RETURNS TABLE (
  movement_id uuid,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_role text := COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin');
  current_permissions jsonb := COALESCE(
    auth.jwt() -> 'app_metadata' -> 'label_permissions',
    '[]'::jsonb
  );
  created_movement_id uuid;
  created_movement_at timestamp with time zone;
  available_cash numeric(10,2) := 0;
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário.' USING ERRCODE = '42501';
  END IF;

  IF current_role = 'attendant' AND NOT (current_permissions ? 'cashier') THEN
    RAISE EXCEPTION 'Sem permissão para operar o caixa.' USING ERRCODE = '42501';
  END IF;

  IF p_movement_reference IS NULL THEN
    RAISE EXCEPTION 'Identificador da movimentação inválido.' USING ERRCODE = '22023';
  END IF;

  IF p_movement_type NOT IN ('supply', 'withdrawal', 'expense') THEN
    RAISE EXCEPTION 'Tipo de movimentação inválido.' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Valor da movimentação inválido.' USING ERRCODE = '22023';
  END IF;

  IF char_length(btrim(COALESCE(p_description, ''))) < 2
    OR char_length(btrim(COALESCE(p_description, ''))) > 300 THEN
    RAISE EXCEPTION 'Informe uma descrição entre 2 e 300 caracteres.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_movement_reference::text, 0)
  );

  SELECT movement.id, movement.created_at
  INTO created_movement_id, created_movement_at
  FROM public.cash_movements AS movement
  WHERE movement.movement_reference = p_movement_reference;

  IF created_movement_id IS NOT NULL THEN
    RETURN QUERY SELECT created_movement_id, created_movement_at;
    RETURN;
  END IF;

  PERFORM 1
    FROM public.cash_sessions
    WHERE id = p_cash_session_id
      AND status = 'open'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'O caixa informado não está aberto.' USING ERRCODE = 'P0001';
  END IF;

  IF p_movement_type IN ('withdrawal', 'expense') THEN
    SELECT ROUND(
      session.opening_balance
      + COALESCE((
        SELECT SUM(payment.amount)
        FROM public.order_payments AS payment
        JOIN public.orders AS sale
          ON sale.id = payment.order_id
        WHERE payment.cash_session_id = session.id
          AND payment.method = 'cash'
          AND sale.status = 'completed'
      ), 0)
      + COALESCE((
        SELECT SUM(movement.amount)
        FROM public.cash_movements AS movement
        WHERE movement.cash_session_id = session.id
          AND movement.movement_type = 'supply'
      ), 0)
      - COALESCE((
        SELECT SUM(movement.amount)
        FROM public.cash_movements AS movement
        WHERE movement.cash_session_id = session.id
          AND movement.movement_type IN ('withdrawal', 'expense')
      ), 0),
      2
    )
    INTO available_cash
    FROM public.cash_sessions AS session
    WHERE session.id = p_cash_session_id;

    IF p_amount > available_cash THEN
      RAISE EXCEPTION 'A saída é maior que o dinheiro disponível no caixa.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.cash_movements (
    cash_session_id,
    movement_reference,
    movement_type,
    amount,
    description,
    created_by
  ) VALUES (
    p_cash_session_id,
    p_movement_reference,
    p_movement_type,
    ROUND(p_amount, 2),
    btrim(p_description),
    current_user_id
  )
  RETURNING id, public.cash_movements.created_at
  INTO created_movement_id, created_movement_at;

  RETURN QUERY SELECT created_movement_id, created_movement_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_cash_movement(
  uuid,
  uuid,
  text,
  numeric,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_cash_movement(
  uuid,
  uuid,
  text,
  numeric,
  text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_cash_session(
  p_cash_session_id uuid,
  p_closing_cash_counted numeric,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  expected_cash numeric,
  counted_cash numeric,
  difference numeric,
  cash_sales numeric,
  supplies numeric,
  outflows numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_role text := COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin');
  current_permissions jsonb := COALESCE(
    auth.jwt() -> 'app_metadata' -> 'label_permissions',
    '[]'::jsonb
  );
  session_status text;
  opening_cash numeric(10,2);
  calculated_cash_sales numeric(10,2) := 0;
  calculated_supplies numeric(10,2) := 0;
  calculated_outflows numeric(10,2) := 0;
  calculated_expected numeric(10,2);
  calculated_counted numeric(10,2);
  calculated_difference numeric(10,2);
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário.' USING ERRCODE = '42501';
  END IF;

  IF current_role = 'attendant' AND NOT (current_permissions ? 'cashier') THEN
    RAISE EXCEPTION 'Sem permissão para operar o caixa.' USING ERRCODE = '42501';
  END IF;

  IF p_closing_cash_counted IS NULL
    OR p_closing_cash_counted < 0
    OR p_closing_cash_counted > 1000000 THEN
    RAISE EXCEPTION 'Valor contado inválido.' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(p_notes, '')) > 500 THEN
    RAISE EXCEPTION 'As observações devem ter no máximo 500 caracteres.' USING ERRCODE = '22023';
  END IF;

  SELECT session.status, session.opening_balance
  INTO session_status, opening_cash
  FROM public.cash_sessions AS session
  WHERE session.id = p_cash_session_id
  FOR UPDATE;

  IF session_status IS NULL THEN
    RAISE EXCEPTION 'Caixa não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF session_status <> 'open' THEN
    RAISE EXCEPTION 'Este caixa já foi fechado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(ROUND(SUM(payment.amount), 2), 0)
  INTO calculated_cash_sales
  FROM public.order_payments AS payment
  JOIN public.orders AS sale
    ON sale.id = payment.order_id
  WHERE payment.cash_session_id = p_cash_session_id
    AND payment.method = 'cash'
    AND sale.status = 'completed';

  SELECT
    COALESCE(ROUND(SUM(movement.amount) FILTER (
      WHERE movement.movement_type = 'supply'
    ), 2), 0),
    COALESCE(ROUND(SUM(movement.amount) FILTER (
      WHERE movement.movement_type IN ('withdrawal', 'expense')
    ), 2), 0)
  INTO calculated_supplies, calculated_outflows
  FROM public.cash_movements AS movement
  WHERE movement.cash_session_id = p_cash_session_id;

  calculated_expected := ROUND(
    opening_cash
    + calculated_cash_sales
    + calculated_supplies
    - calculated_outflows,
    2
  );
  calculated_counted := ROUND(p_closing_cash_counted, 2);
  calculated_difference := ROUND(
    calculated_counted - calculated_expected,
    2
  );

  UPDATE public.cash_sessions
  SET
    status = 'closed',
    closed_by = current_user_id,
    closed_at = now(),
    closing_cash_counted = calculated_counted,
    expected_cash = calculated_expected,
    difference = calculated_difference,
    notes = NULLIF(btrim(p_notes), '')
  WHERE id = p_cash_session_id;

  RETURN QUERY SELECT
    calculated_expected,
    calculated_counted,
    calculated_difference,
    calculated_cash_sales,
    calculated_supplies,
    calculated_outflows;
END;
$$;

REVOKE ALL ON FUNCTION public.close_cash_session(
  uuid,
  numeric,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.close_cash_session(
  uuid,
  numeric,
  text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_online_order(
  p_order_id uuid
)
RETURNS TABLE (
  order_id uuid,
  completed_at timestamp with time zone,
  cash_session_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_role text := COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin');
  current_permissions jsonb := COALESCE(
    auth.jwt() -> 'app_metadata' -> 'label_permissions',
    '[]'::jsonb
  );
  selected_order public.orders%ROWTYPE;
  selected_cash_session_id uuid;
  completion_time timestamp with time zone := now();
  tendered_cash numeric(10,2);
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário.' USING ERRCODE = '42501';
  END IF;

  IF current_role = 'attendant'
    AND NOT (
      current_permissions ? 'orders'
      OR current_permissions ? 'deliveries'
    ) THEN
    RAISE EXCEPTION 'Sem permissão para finalizar pedidos.' USING ERRCODE = '42501';
  END IF;

  SELECT sale.*
  INTO selected_order
  FROM public.orders AS sale
  WHERE sale.id = p_order_id
  FOR UPDATE;

  IF selected_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF selected_order.sales_channel <> 'online' THEN
    RAISE EXCEPTION 'Somente pedidos online podem ser finalizados por esta operação.'
      USING ERRCODE = '22023';
  END IF;

  IF selected_order.status = 'completed' THEN
    RETURN QUERY SELECT
      selected_order.id,
      selected_order.completed_at,
      selected_order.cash_session_id;
    RETURN;
  END IF;

  IF NOT (
    (selected_order.order_type = 'pickup' AND selected_order.status = 'ready_for_pickup')
    OR
    (selected_order.order_type = 'delivery' AND selected_order.status = 'out_for_delivery')
  ) THEN
    RAISE EXCEPTION 'O pedido ainda não está pronto para ser finalizado.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT session.id
  INTO selected_cash_session_id
  FROM public.cash_sessions AS session
  WHERE session.status = 'open'
  FOR UPDATE;

  IF selected_order.payment_method = 'cash'
    AND selected_cash_session_id IS NULL THEN
    RAISE EXCEPTION 'Abra o caixa antes de receber um pedido em dinheiro.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.orders
  SET
    status = 'completed',
    completed_at = completion_time,
    cash_session_id = selected_cash_session_id
  WHERE id = selected_order.id;

  IF selected_order.payment_method IN (
    'cash',
    'pix',
    'debit_card',
    'credit_card'
  ) THEN
    tendered_cash := CASE
      WHEN selected_order.payment_method = 'cash'
        THEN COALESCE(selected_order.cash_change_for, selected_order.total)
      ELSE NULL
    END;

    INSERT INTO public.order_payments (
      order_id,
      cash_session_id,
      method,
      amount,
      tendered_amount,
      change_amount,
      created_by
    ) VALUES (
      selected_order.id,
      selected_cash_session_id,
      selected_order.payment_method,
      selected_order.total,
      tendered_cash,
      CASE
        WHEN selected_order.payment_method = 'cash'
          THEN tendered_cash - selected_order.total
        ELSE NULL
      END,
      current_user_id
    )
    ON CONFLICT (order_id, method) DO NOTHING;
  END IF;

  RETURN QUERY SELECT
    selected_order.id,
    completion_time,
    selected_cash_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_online_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_online_order(uuid) TO authenticated;
