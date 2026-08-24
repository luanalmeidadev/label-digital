ALTER TABLE public.orders
  ADD COLUMN cancelled_at timestamp with time zone,
  ADD COLUMN cancelled_by uuid,
  ADD COLUMN cancellation_reason text,
  ADD CONSTRAINT orders_cancellation_reason_length_check
    CHECK (
      cancellation_reason IS NULL
      OR char_length(cancellation_reason) BETWEEN 3 AND 300
    );

CREATE TABLE public.order_refunds (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_payment_id    uuid NOT NULL REFERENCES public.order_payments(id) ON DELETE RESTRICT,
  cash_session_id     uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE RESTRICT,
  method              text NOT NULL,
  amount              numeric(10,2) NOT NULL,
  reason              text NOT NULL,
  created_by          uuid NOT NULL,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_refunds_payment_key UNIQUE (order_payment_id),
  CONSTRAINT order_refunds_method_check
    CHECK (
      method = ANY (
        ARRAY[
          'cash'::text,
          'pix'::text,
          'debit_card'::text,
          'credit_card'::text
        ]
      )
    ),
  CONSTRAINT order_refunds_amount_check CHECK (amount > 0),
  CONSTRAINT order_refunds_reason_length_check
    CHECK (char_length(reason) BETWEEN 3 AND 300)
);

CREATE INDEX order_refunds_order_idx
  ON public.order_refunds (order_id, created_at DESC);

CREATE INDEX order_refunds_session_idx
  ON public.order_refunds (cash_session_id, created_at DESC);

CREATE TABLE public.product_losses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loss_reference    uuid NOT NULL,
  cash_session_id   uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE RESTRICT,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name      text NOT NULL,
  quantity          integer NOT NULL,
  reason            text NOT NULL,
  notes             text,
  estimated_value   numeric(10,2) NOT NULL,
  created_by        uuid NOT NULL,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_losses_reference_key UNIQUE (loss_reference),
  CONSTRAINT product_losses_quantity_check CHECK (quantity BETWEEN 1 AND 10000),
  CONSTRAINT product_losses_reason_check
    CHECK (
      reason = ANY (
        ARRAY[
          'expired'::text,
          'damaged'::text,
          'production'::text,
          'internal'::text,
          'other'::text
        ]
      )
    ),
  CONSTRAINT product_losses_notes_length_check
    CHECK (notes IS NULL OR char_length(notes) <= 300),
  CONSTRAINT product_losses_estimated_value_check CHECK (estimated_value >= 0)
);

CREATE INDEX product_losses_session_idx
  ON public.product_losses (cash_session_id, created_at DESC);

CREATE INDEX product_losses_product_idx
  ON public.product_losses (product_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_refunds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_losses;

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_losses ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.order_refunds TO authenticated;
GRANT SELECT ON public.product_losses TO authenticated;
GRANT ALL ON public.order_refunds TO service_role;
GRANT ALL ON public.product_losses TO service_role;

CREATE POLICY "Administradores consultam estornos"
ON public.order_refunds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin') <> 'attendant'
        OR COALESCE(
          auth.jwt() -> 'app_metadata' -> 'label_permissions',
          '[]'::jsonb
        ) ?| ARRAY['cashier', 'orders', 'billing']
      )
  )
);

CREATE POLICY "Administradores consultam perdas"
ON public.product_losses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin') <> 'attendant'
        OR COALESCE(
          auth.jwt() -> 'app_metadata' -> 'label_permissions',
          '[]'::jsonb
        ) ?| ARRAY['cashier', 'billing']
      )
  )
);

CREATE OR REPLACE FUNCTION public.cancel_completed_order(
  p_order_id uuid,
  p_reason text
)
RETURNS TABLE (
  cancelled_order_id uuid,
  refunded_total numeric
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
  selected_session_id uuid;
  payment_total numeric(10,2) := 0;
  previous_session_cash_refund numeric(10,2) := 0;
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário.' USING ERRCODE = '42501';
  END IF;

  IF current_role = 'attendant'
    AND NOT (
      current_permissions ? 'cashier'
      OR current_permissions ? 'orders'
    ) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar vendas.' USING ERRCODE = '42501';
  END IF;

  IF char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 3 AND 300 THEN
    RAISE EXCEPTION 'Informe um motivo entre 3 e 300 caracteres.' USING ERRCODE = '22023';
  END IF;

  SELECT sale.*
  INTO selected_order
  FROM public.orders AS sale
  WHERE sale.id = p_order_id
  FOR UPDATE;

  IF selected_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF selected_order.status <> 'completed' THEN
    RAISE EXCEPTION 'Somente pedidos finalizados podem ser estornados.' USING ERRCODE = 'P0001';
  END IF;

  SELECT session.id
  INTO selected_session_id
  FROM public.cash_sessions AS session
  WHERE session.status = 'open'
  FOR UPDATE;

  SELECT COALESCE(ROUND(SUM(payment.amount), 2), 0)
  INTO payment_total
  FROM public.order_payments AS payment
  WHERE payment.order_id = selected_order.id;

  IF payment_total > 0 AND selected_session_id IS NULL THEN
    RAISE EXCEPTION 'Abra o caixa antes de estornar uma venda.' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.order_refunds AS refund
    WHERE refund.order_id = selected_order.id
  ) THEN
    RAISE EXCEPTION 'Esta venda já foi estornada.' USING ERRCODE = 'P0001';
  END IF;

  IF payment_total > 0 THEN
    INSERT INTO public.order_refunds (
      order_id,
      order_payment_id,
      cash_session_id,
      method,
      amount,
      reason,
      created_by
    )
    SELECT
      selected_order.id,
      payment.id,
      selected_session_id,
      payment.method,
      payment.amount,
      btrim(p_reason),
      current_user_id
    FROM public.order_payments AS payment
    WHERE payment.order_id = selected_order.id;

    SELECT COALESCE(ROUND(SUM(payment.amount), 2), 0)
    INTO previous_session_cash_refund
    FROM public.order_payments AS payment
    WHERE payment.order_id = selected_order.id
      AND payment.method = 'cash'
      AND payment.cash_session_id IS DISTINCT FROM selected_session_id;

    IF previous_session_cash_refund > 0 THEN
      PERFORM *
      FROM public.create_cash_movement(
        selected_session_id,
        pg_catalog.gen_random_uuid(),
        'expense',
        previous_session_cash_refund,
        'Estorno do pedido #' || selected_order.order_number || ': ' || btrim(p_reason)
      );
    END IF;
  END IF;

  UPDATE public.orders
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = current_user_id,
    cancellation_reason = btrim(p_reason)
  WHERE id = selected_order.id;

  RETURN QUERY SELECT selected_order.id, payment_total;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_completed_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_completed_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_product_loss(
  p_cash_session_id uuid,
  p_loss_reference uuid,
  p_product_id uuid,
  p_quantity integer,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  loss_id uuid,
  estimated_value numeric
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
  selected_product public.products%ROWTYPE;
  created_loss_id uuid;
  calculated_value numeric(10,2);
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário.' USING ERRCODE = '42501';
  END IF;

  IF current_role = 'attendant' AND NOT (current_permissions ? 'cashier') THEN
    RAISE EXCEPTION 'Sem permissão para registrar perdas.' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.cash_sessions AS session
  WHERE session.id = p_cash_session_id
    AND session.status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'O caixa informado não está aberto.' USING ERRCODE = 'P0001';
  END IF;

  IF p_loss_reference IS NULL THEN
    RAISE EXCEPTION 'Identificador da perda inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT loss.id, loss.estimated_value
  INTO created_loss_id, calculated_value
  FROM public.product_losses AS loss
  WHERE loss.loss_reference = p_loss_reference;

  IF created_loss_id IS NOT NULL THEN
    RETURN QUERY SELECT created_loss_id, calculated_value;
    RETURN;
  END IF;

  IF p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Informe uma quantidade válida.' USING ERRCODE = '22023';
  END IF;

  IF p_reason NOT IN ('expired', 'damaged', 'production', 'internal', 'other') THEN
    RAISE EXCEPTION 'Motivo da perda inválido.' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(p_notes, '')) > 300 THEN
    RAISE EXCEPTION 'As observações devem ter no máximo 300 caracteres.' USING ERRCODE = '22023';
  END IF;

  SELECT product.*
  INTO selected_product
  FROM public.products AS product
  WHERE product.id = p_product_id;

  IF selected_product.id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  calculated_value := ROUND(selected_product.price * p_quantity, 2);

  INSERT INTO public.product_losses (
    loss_reference,
    cash_session_id,
    product_id,
    product_name,
    quantity,
    reason,
    notes,
    estimated_value,
    created_by
  ) VALUES (
    p_loss_reference,
    p_cash_session_id,
    selected_product.id,
    selected_product.name,
    p_quantity,
    p_reason,
    NULLIF(btrim(p_notes), ''),
    calculated_value,
    current_user_id
  )
  RETURNING id INTO created_loss_id;

  RETURN QUERY SELECT created_loss_id, calculated_value;
END;
$$;

REVOKE ALL ON FUNCTION public.create_product_loss(uuid, uuid, uuid, integer, text, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_product_loss(uuid, uuid, uuid, integer, text, text)
TO authenticated;
