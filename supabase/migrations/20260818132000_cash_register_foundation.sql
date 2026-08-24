ALTER TABLE public.orders
  ADD COLUMN sales_channel text NOT NULL DEFAULT 'online',
  ADD COLUMN payment_method text,
  ADD COLUMN cash_change_for numeric(10,2),
  ADD COLUMN cash_session_id uuid,
  ADD COLUMN cashier_customer_name text,
  ADD COLUMN created_by uuid,
  ADD COLUMN cashier_reference uuid;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_sales_channel_check
    CHECK (sales_channel = ANY (ARRAY['online'::text, 'cashier'::text])),
  ADD CONSTRAINT orders_payment_method_check
    CHECK (
      payment_method IS NULL
      OR payment_method = ANY (
        ARRAY[
          'cash'::text,
          'pix'::text,
          'debit_card'::text,
          'credit_card'::text,
          'mixed'::text
        ]
      )
    ),
  ADD CONSTRAINT orders_cash_change_check
    CHECK (
      cash_change_for IS NULL
      OR (
        payment_method = 'cash'::text
        AND cash_change_for >= 0::numeric
      )
    ),
  ADD CONSTRAINT orders_cashier_customer_name_length_check
    CHECK (
      cashier_customer_name IS NULL
      OR char_length(cashier_customer_name) <= 100
    ),
  ADD CONSTRAINT orders_cashier_reference_key UNIQUE (cashier_reference);

CREATE TABLE public.cash_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                text NOT NULL DEFAULT 'open',
  opening_balance       numeric(10,2) NOT NULL DEFAULT 0,
  opened_by             uuid NOT NULL,
  opened_at             timestamp with time zone NOT NULL DEFAULT now(),
  closed_by             uuid,
  closed_at             timestamp with time zone,
  closing_cash_counted  numeric(10,2),
  expected_cash         numeric(10,2),
  difference            numeric(10,2),
  notes                 text,
  CONSTRAINT cash_sessions_status_check
    CHECK (status = ANY (ARRAY['open'::text, 'closed'::text])),
  CONSTRAINT cash_sessions_opening_balance_check
    CHECK (
      opening_balance >= 0::numeric
      AND opening_balance <= 1000000::numeric
    ),
  CONSTRAINT cash_sessions_closing_values_check
    CHECK (
      closing_cash_counted IS NULL
      OR closing_cash_counted >= 0::numeric
    ),
  CONSTRAINT cash_sessions_notes_length_check
    CHECK (notes IS NULL OR char_length(notes) <= 500)
);

CREATE UNIQUE INDEX cash_sessions_single_open_idx
  ON public.cash_sessions ((status))
  WHERE status = 'open';

CREATE INDEX cash_sessions_opened_at_idx
  ON public.cash_sessions (opened_at DESC);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_cash_session_id_fkey
  FOREIGN KEY (cash_session_id)
  REFERENCES public.cash_sessions(id)
  ON DELETE SET NULL;

CREATE TABLE public.order_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cash_session_id   uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  method            text NOT NULL,
  amount            numeric(10,2) NOT NULL,
  tendered_amount   numeric(10,2),
  change_amount     numeric(10,2),
  created_by        uuid NOT NULL,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_payments_method_check
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
  CONSTRAINT order_payments_amount_check
    CHECK (amount > 0::numeric),
  CONSTRAINT order_payments_cash_values_check
    CHECK (
      (
        method = 'cash'::text
        AND tendered_amount IS NOT NULL
        AND change_amount IS NOT NULL
        AND tendered_amount >= amount
        AND change_amount = tendered_amount - amount
      )
      OR (
        method <> 'cash'::text
        AND tendered_amount IS NULL
        AND change_amount IS NULL
      )
    )
);

CREATE INDEX order_payments_order_id_idx
  ON public.order_payments (order_id);

CREATE INDEX order_payments_cash_session_id_idx
  ON public.order_payments (cash_session_id, created_at DESC);

CREATE TABLE public.cash_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id   uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE RESTRICT,
  movement_type     text NOT NULL,
  amount            numeric(10,2) NOT NULL,
  description       text NOT NULL,
  created_by        uuid NOT NULL,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_movements_type_check
    CHECK (
      movement_type = ANY (
        ARRAY[
          'supply'::text,
          'withdrawal'::text,
          'expense'::text,
          'adjustment'::text
        ]
      )
    ),
  CONSTRAINT cash_movements_amount_check
    CHECK (amount > 0::numeric),
  CONSTRAINT cash_movements_description_length_check
    CHECK (
      char_length(description) >= 2
      AND char_length(description) <= 300
    )
);

CREATE INDEX cash_movements_session_idx
  ON public.cash_movements (cash_session_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_movements;

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.cash_sessions TO authenticated;
GRANT SELECT ON public.order_payments TO authenticated;
GRANT SELECT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
GRANT ALL ON public.order_payments TO service_role;
GRANT ALL ON public.cash_movements TO service_role;

CREATE POLICY "Administradores gerenciam sessoes de caixa"
ON public.cash_sessions
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin') <> 'attendant'
        OR COALESCE(
          auth.jwt() -> 'app_metadata' -> 'label_permissions',
          '[]'::jsonb
        ) ? 'cashier'
      )
  )
)
WITH CHECK (
  opened_by = auth.uid()
  AND status = 'open'
  AND closed_by IS NULL
  AND closed_at IS NULL
  AND
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin') <> 'attendant'
        OR COALESCE(
          auth.jwt() -> 'app_metadata' -> 'label_permissions',
          '[]'::jsonb
        ) ? 'cashier'
      )
  )
);

CREATE POLICY "Administradores consultam pagamentos"
ON public.order_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin') <> 'attendant'
        OR COALESCE(
          auth.jwt() -> 'app_metadata' -> 'label_permissions',
          '[]'::jsonb
        ) ? 'cashier'
      )
  )
);

CREATE POLICY "Administradores consultam movimentos de caixa"
ON public.cash_movements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'label_role', 'admin') <> 'attendant'
        OR COALESCE(
          auth.jwt() -> 'app_metadata' -> 'label_permissions',
          '[]'::jsonb
        ) ? 'cashier'
      )
  )
);

CREATE OR REPLACE FUNCTION public.create_cashier_sale(
  p_cash_session_id uuid,
  p_cashier_reference uuid,
  p_items jsonb,
  p_payments jsonb,
  p_customer_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number bigint,
  total numeric
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
  requested_item_count integer;
  found_item_count integer;
  payment_count integer;
  distinct_payment_count integer;
  calculated_total numeric(10,2);
  paid_total numeric(10,2);
  selected_payment_method text;
  created_order_id uuid;
  created_order_number bigint;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.cash_sessions
    WHERE id = p_cash_session_id
      AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'O caixa informado não está aberto.' USING ERRCODE = 'P0001';
  END IF;

  IF p_cashier_reference IS NULL THEN
    RAISE EXCEPTION 'Identificador da venda inválido.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cashier_reference::text, 0)
  );

  SELECT existing_order.id, existing_order.order_number, existing_order.total
  INTO created_order_id, created_order_number, calculated_total
  FROM public.orders AS existing_order
  WHERE existing_order.cashier_reference = p_cashier_reference;

  IF created_order_id IS NOT NULL THEN
    RETURN QUERY SELECT created_order_id, created_order_number, calculated_total;
    RETURN;
  END IF;

  IF jsonb_typeof(p_items) <> 'array'
    OR jsonb_array_length(p_items) < 1
    OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Revise os itens da venda.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items)
      AS item(product_id uuid, quantity integer)
    WHERE item.product_id IS NULL
      OR item.quantity IS NULL
      OR item.quantity < 1
      OR item.quantity > 1000
  ) THEN
    RAISE EXCEPTION 'Revise as quantidades da venda.' USING ERRCODE = '22023';
  END IF;

  WITH requested_items AS (
    SELECT
      item.product_id,
      SUM(item.quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items)
      AS item(product_id uuid, quantity integer)
    GROUP BY item.product_id
  )
  SELECT
    COUNT(*),
    COUNT(product.id),
    ROUND(SUM(product.price * requested.quantity), 2)
  INTO requested_item_count, found_item_count, calculated_total
  FROM requested_items AS requested
  LEFT JOIN public.products AS product
    ON product.id = requested.product_id
    AND product.active = true
    AND product.available = true
  ;

  IF requested_item_count < 1
    OR requested_item_count <> found_item_count
    OR calculated_total IS NULL
    OR calculated_total <= 0 THEN
    RAISE EXCEPTION 'Um ou mais produtos não estão disponíveis.' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(p_payments) <> 'array'
    OR jsonb_array_length(p_payments) < 1
    OR jsonb_array_length(p_payments) > 4 THEN
    RAISE EXCEPTION 'Revise as formas de pagamento.' USING ERRCODE = '22023';
  END IF;

  WITH requested_payments AS (
    SELECT *
    FROM jsonb_to_recordset(p_payments)
      AS payment(
        method text,
        amount numeric,
        tendered_amount numeric,
        change_amount numeric
      )
  )
  SELECT
    COUNT(*),
    COUNT(DISTINCT method),
    ROUND(SUM(amount), 2)
  INTO payment_count, distinct_payment_count, paid_total
  FROM requested_payments
  WHERE method = ANY (
      ARRAY['cash'::text, 'pix'::text, 'debit_card'::text, 'credit_card'::text]
    )
    AND amount > 0
    AND (
      (
        method = 'cash'
        AND tendered_amount IS NOT NULL
        AND change_amount IS NOT NULL
        AND tendered_amount >= amount
        AND change_amount = tendered_amount - amount
      )
      OR (
        method <> 'cash'
        AND tendered_amount IS NULL
        AND change_amount IS NULL
      )
    );

  IF payment_count <> jsonb_array_length(p_payments)
    OR paid_total IS DISTINCT FROM calculated_total THEN
    RAISE EXCEPTION 'O pagamento deve corresponder ao total da venda.' USING ERRCODE = '22023';
  END IF;

  IF distinct_payment_count = 1 THEN
    selected_payment_method := p_payments -> 0 ->> 'method';
  ELSE
    selected_payment_method := 'mixed';
  END IF;

  INSERT INTO public.orders (
    order_type,
    status,
    subtotal,
    delivery_fee,
    total,
    notes,
    completed_at,
    sales_channel,
    payment_method,
    cash_change_for,
    cash_session_id,
    cashier_customer_name,
    created_by,
    cashier_reference
  ) VALUES (
    'pickup',
    'completed',
    calculated_total,
    0,
    calculated_total,
    NULLIF(btrim(p_notes), ''),
    now(),
    'cashier',
    selected_payment_method,
    CASE
      WHEN selected_payment_method = 'cash'
        THEN (p_payments -> 0 ->> 'tendered_amount')::numeric
      ELSE NULL
    END,
    p_cash_session_id,
    NULLIF(btrim(p_customer_name), ''),
    current_user_id,
    p_cashier_reference
  )
  RETURNING id, public.orders.order_number
  INTO created_order_id, created_order_number;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price
  )
  SELECT
    created_order_id,
    product.id,
    product.name,
    requested.quantity,
    product.price
  FROM (
    SELECT
      item.product_id,
      SUM(item.quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items)
      AS item(product_id uuid, quantity integer)
    GROUP BY item.product_id
  ) AS requested
  JOIN public.products AS product
    ON product.id = requested.product_id;

  INSERT INTO public.order_payments (
    order_id,
    cash_session_id,
    method,
    amount,
    tendered_amount,
    change_amount,
    created_by
  )
  SELECT
    created_order_id,
    p_cash_session_id,
    payment.method,
    payment.amount,
    payment.tendered_amount,
    payment.change_amount,
    current_user_id
  FROM jsonb_to_recordset(p_payments)
    AS payment(
      method text,
      amount numeric,
      tendered_amount numeric,
      change_amount numeric
    );

  RETURN QUERY SELECT created_order_id, created_order_number, calculated_total;
END;
$$;

REVOKE ALL ON FUNCTION public.create_cashier_sale(
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_cashier_sale(
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text
) TO authenticated;
