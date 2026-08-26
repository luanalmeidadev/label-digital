-- Separate physical cash movements from expenses paid by Pix or card.

ALTER TABLE public.cash_movements
  ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

ALTER TABLE public.cash_movements
  ADD CONSTRAINT cash_movements_payment_method_check
  CHECK (
    payment_method = ANY (
      ARRAY[
        'cash'::text,
        'pix'::text,
        'debit_card'::text,
        'credit_card'::text
      ]
    )
  );

CREATE FUNCTION public.create_cash_movement(
  p_cash_session_id uuid,
  p_movement_reference uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text,
  p_payment_method text
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
  created_movement_id uuid;
  created_movement_at timestamp with time zone;
  available_cash numeric(10,2) := 0;
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para operar o caixa.' USING ERRCODE = '42501';
  END IF;

  IF p_movement_reference IS NULL THEN
    RAISE EXCEPTION 'Identificador da movimentacao invalido.' USING ERRCODE = '22023';
  END IF;

  IF p_movement_type NOT IN ('supply', 'withdrawal', 'expense') THEN
    RAISE EXCEPTION 'Tipo de movimentacao invalido.' USING ERRCODE = '22023';
  END IF;

  IF p_payment_method NOT IN ('cash', 'pix', 'debit_card', 'credit_card') THEN
    RAISE EXCEPTION 'Forma de pagamento invalida.' USING ERRCODE = '22023';
  END IF;

  IF p_movement_type IN ('supply', 'withdrawal') AND p_payment_method <> 'cash' THEN
    RAISE EXCEPTION 'Suprimentos e sangrias devem ser realizados em dinheiro.'
      USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Valor da movimentacao invalido.' USING ERRCODE = '22023';
  END IF;

  IF char_length(btrim(COALESCE(p_description, ''))) < 2
    OR char_length(btrim(COALESCE(p_description, ''))) > 300 THEN
    RAISE EXCEPTION 'Informe uma descricao entre 2 e 300 caracteres.' USING ERRCODE = '22023';
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
    RAISE EXCEPTION 'O caixa informado nao esta aberto.' USING ERRCODE = 'P0001';
  END IF;

  IF p_payment_method = 'cash'
    AND p_movement_type IN ('withdrawal', 'expense') THEN
    SELECT ROUND(
      session.opening_balance
      + COALESCE((
        SELECT SUM(payment.amount)
        FROM public.order_payments AS payment
        JOIN public.orders AS sale ON sale.id = payment.order_id
        WHERE payment.cash_session_id = session.id
          AND payment.method = 'cash'
          AND sale.status = 'completed'
      ), 0)
      + COALESCE((
        SELECT SUM(movement.amount)
        FROM public.cash_movements AS movement
        WHERE movement.cash_session_id = session.id
          AND movement.movement_type = 'supply'
          AND movement.payment_method = 'cash'
      ), 0)
      - COALESCE((
        SELECT SUM(movement.amount)
        FROM public.cash_movements AS movement
        WHERE movement.cash_session_id = session.id
          AND movement.movement_type IN ('withdrawal', 'expense')
          AND movement.payment_method = 'cash'
      ), 0),
      2
    )
    INTO available_cash
    FROM public.cash_sessions AS session
    WHERE session.id = p_cash_session_id;

    IF p_amount > available_cash THEN
      RAISE EXCEPTION 'A saida e maior que o dinheiro disponivel no caixa.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.cash_movements (
    cash_session_id,
    movement_reference,
    movement_type,
    payment_method,
    amount,
    description,
    created_by
  ) VALUES (
    p_cash_session_id,
    p_movement_reference,
    p_movement_type,
    p_payment_method,
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
  uuid, uuid, text, numeric, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cash_movement(
  uuid, uuid, text, numeric, text, text
) TO authenticated;

-- Keep internal calls compatible and explicitly classify them as cash.
CREATE OR REPLACE FUNCTION public.create_cash_movement(
  p_cash_session_id uuid,
  p_movement_reference uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text
)
RETURNS TABLE (movement_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para operar o caixa.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM public.create_cash_movement(
    p_cash_session_id,
    p_movement_reference,
    p_movement_type,
    p_amount,
    p_description,
    'cash'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_cash_movement(
  uuid, uuid, text, numeric, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cash_movement(
  uuid, uuid, text, numeric, text
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
  session_status text;
  opening_cash numeric(10,2);
  calculated_cash_sales numeric(10,2) := 0;
  calculated_supplies numeric(10,2) := 0;
  calculated_outflows numeric(10,2) := 0;
  calculated_expected numeric(10,2);
  calculated_counted numeric(10,2);
  calculated_difference numeric(10,2);
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para operar o caixa.' USING ERRCODE = '42501';
  END IF;

  IF p_closing_cash_counted IS NULL
    OR p_closing_cash_counted < 0
    OR p_closing_cash_counted > 1000000 THEN
    RAISE EXCEPTION 'Valor contado invalido.' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(p_notes, '')) > 500 THEN
    RAISE EXCEPTION 'As observacoes devem ter no maximo 500 caracteres.' USING ERRCODE = '22023';
  END IF;

  SELECT session.status, session.opening_balance
  INTO session_status, opening_cash
  FROM public.cash_sessions AS session
  WHERE session.id = p_cash_session_id
  FOR UPDATE;

  IF session_status IS NULL THEN
    RAISE EXCEPTION 'Caixa nao encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF session_status <> 'open' THEN
    RAISE EXCEPTION 'Este caixa ja foi fechado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(ROUND(SUM(payment.amount), 2), 0)
  INTO calculated_cash_sales
  FROM public.order_payments AS payment
  JOIN public.orders AS sale ON sale.id = payment.order_id
  WHERE payment.cash_session_id = p_cash_session_id
    AND payment.method = 'cash'
    AND sale.status = 'completed';

  SELECT
    COALESCE(ROUND(SUM(movement.amount) FILTER (
      WHERE movement.movement_type = 'supply'
        AND movement.payment_method = 'cash'
    ), 2), 0),
    COALESCE(ROUND(SUM(movement.amount) FILTER (
      WHERE movement.movement_type IN ('withdrawal', 'expense')
        AND movement.payment_method = 'cash'
    ), 2), 0)
  INTO calculated_supplies, calculated_outflows
  FROM public.cash_movements AS movement
  WHERE movement.cash_session_id = p_cash_session_id;

  calculated_expected := ROUND(
    opening_cash + calculated_cash_sales + calculated_supplies - calculated_outflows,
    2
  );
  calculated_counted := ROUND(p_closing_cash_counted, 2);
  calculated_difference := ROUND(calculated_counted - calculated_expected, 2);

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

REVOKE ALL ON FUNCTION public.close_cash_session(uuid, numeric, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_cash_session(uuid, numeric, text)
TO authenticated;
