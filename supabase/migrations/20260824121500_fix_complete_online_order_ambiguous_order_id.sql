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
    ON CONFLICT ON CONSTRAINT order_payments_order_method_key DO NOTHING;
  END IF;

  RETURN QUERY SELECT
    selected_order.id,
    completion_time,
    selected_cash_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_online_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_online_order(uuid) TO authenticated;
