CREATE FUNCTION public.create_configured_cashier_sale(
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
  item_json jsonb;
  option_json jsonb;
  product_record record;
  variant_record record;
  option_record record;
  group_record record;
  created_order_id uuid;
  created_order_number bigint;
  created_order_item_id uuid;
  calculated_total numeric(10,2) := 0;
  paid_total numeric(10,2);
  computed_options_price numeric(10,2);
  item_quantity integer;
  item_unit_price numeric(10,2);
  item_base_price numeric(10,2);
  item_options_price numeric(10,2);
  item_variant_id uuid;
  expected_catalog_version bigint;
  selected_in_group integer;
  payment_count integer;
  distinct_payment_count integer;
  selected_payment_method text;
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CASHIER_PERMISSION_REQUIRED';
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CASHIER_AUTH_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cash_sessions AS cash_session
    WHERE cash_session.id = p_cash_session_id
      AND cash_session.status = 'open'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CASH_SESSION_CLOSED';
  END IF;

  IF p_cashier_reference IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CASHIER_REFERENCE';
  END IF;

  IF char_length(COALESCE(p_customer_name, '')) > 100
     OR char_length(COALESCE(p_notes, '')) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CASHIER_TEXT';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cashier_reference::text, 0)
  );

  SELECT existing_order.id, existing_order.order_number, existing_order.total
  INTO created_order_id, created_order_number, calculated_total
  FROM public.orders AS existing_order
  WHERE existing_order.cashier_reference = p_cashier_reference;

  IF created_order_id IS NOT NULL THEN
    RETURN QUERY
    SELECT created_order_id, created_order_number, calculated_total;
    RETURN;
  END IF;

  calculated_total := 0;

  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1
     OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CASHIER_ITEMS';
  END IF;

  FOR item_json IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    item_quantity := (item_json ->> 'quantity')::integer;
    item_unit_price := (item_json ->> 'unit_price')::numeric;
    item_base_price := (item_json ->> 'base_unit_price')::numeric;
    item_options_price := (item_json ->> 'options_unit_price')::numeric;
    expected_catalog_version := (item_json ->> 'catalog_version')::bigint;
    item_variant_id := NULLIF(item_json ->> 'variant_id', '')::uuid;

    IF item_quantity < 1 OR item_quantity > 999
       OR item_unit_price < 0
       OR item_base_price < 0
       OR item_options_price < 0
       OR item_unit_price <> item_base_price + item_options_price
       OR char_length(COALESCE(item_json ->> 'item_notes', '')) > 300
       OR COALESCE(item_json ->> 'configuration_signature', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEM_SNAPSHOT';
    END IF;

    SELECT product.*
    INTO product_record
    FROM public.products AS product
    WHERE product.id = (item_json ->> 'product_id')::uuid
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:PRODUCT_NOT_FOUND';
    END IF;

    IF product_record.catalog_version <> expected_catalog_version
       OR NOT product_record.active
       OR NOT product_record.available THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:PRODUCT';
    END IF;

    IF product_record.name <> item_json ->> 'product_name' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:PRODUCT_NAME';
    END IF;

    IF product_record.pricing_mode = 'simple' THEN
      IF item_variant_id IS NOT NULL
         OR product_record.price <> item_base_price THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:BASE_PRICE';
      END IF;
    ELSE
      IF item_variant_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'VARIANT_REQUIRED';
      END IF;

      SELECT variant.*
      INTO variant_record
      FROM public.product_variants AS variant
      WHERE variant.id = item_variant_id
        AND variant.product_id = product_record.id;

      IF NOT FOUND
         OR NOT variant_record.active
         OR NOT variant_record.available
         OR variant_record.name <> item_json ->> 'variant_name'
         OR variant_record.price <> item_base_price THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:VARIANT';
      END IF;
    END IF;

    IF jsonb_typeof(COALESCE(item_json -> 'options', '[]'::jsonb)) <> 'array'
       OR jsonb_array_length(COALESCE(item_json -> 'options', '[]'::jsonb)) > 50 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEM_OPTIONS';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(item_json -> 'options', '[]'::jsonb)) AS selected(value)
      GROUP BY selected.value ->> 'option_id'
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DUPLICATE_ITEM_OPTION';
    END IF;

    computed_options_price := 0;

    FOR option_json IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(item_json -> 'options', '[]'::jsonb))
    LOOP
      SELECT
        option_group.id AS group_id,
        option_group.name AS group_name,
        option_group.presentation_mode,
        option_group.sort_order AS group_sort_order,
        catalog_option.id AS option_id,
        catalog_option.name AS option_name,
        catalog_option.price_delta,
        catalog_option.sort_order AS option_sort_order,
        option_group.active AS group_active,
        catalog_option.active AS option_active,
        catalog_option.available AS option_available
      INTO option_record
      FROM public.product_options AS catalog_option
      JOIN public.product_option_groups AS option_group
        ON option_group.id = catalog_option.option_group_id
      WHERE catalog_option.id = (option_json ->> 'option_id')::uuid
        AND option_group.id = (option_json ->> 'option_group_id')::uuid
        AND option_group.product_id = product_record.id;

      IF NOT FOUND
         OR NOT option_record.group_active
         OR NOT option_record.option_active
         OR NOT option_record.option_available
         OR option_record.group_name <> option_json ->> 'group_name'
         OR option_record.option_name <> option_json ->> 'option_name'
         OR option_record.presentation_mode <> option_json ->> 'presentation_mode'
         OR option_record.price_delta <> (option_json ->> 'price_delta')::numeric
         OR option_record.group_sort_order <> (option_json ->> 'group_sort_order')::integer
         OR option_record.option_sort_order <> (option_json ->> 'option_sort_order')::integer THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:OPTION';
      END IF;

      computed_options_price := computed_options_price + option_record.price_delta;
    END LOOP;

    FOR group_record IN
      SELECT option_group.*
      FROM public.product_option_groups AS option_group
      WHERE option_group.product_id = product_record.id
        AND option_group.active = true
    LOOP
      SELECT count(*)
      INTO selected_in_group
      FROM jsonb_array_elements(COALESCE(item_json -> 'options', '[]'::jsonb)) AS selected(value)
      WHERE (selected.value ->> 'option_group_id')::uuid = group_record.id;

      IF selected_in_group < group_record.min_selections
         OR (
           group_record.max_selections IS NOT NULL
           AND selected_in_group > group_record.max_selections
         )
         OR (group_record.selection_mode = 'single' AND selected_in_group > 1) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_GROUP_SELECTION';
      END IF;
    END LOOP;

    IF computed_options_price <> item_options_price THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_OPTIONS_PRICE';
    END IF;

    calculated_total := calculated_total + (item_unit_price * item_quantity);
  END LOOP;

  IF calculated_total <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CASHIER_TOTAL';
  END IF;

  IF jsonb_typeof(p_payments) <> 'array'
     OR jsonb_array_length(p_payments) < 1
     OR jsonb_array_length(p_payments) > 4 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PAYMENTS';
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
    count(*),
    count(DISTINCT method),
    round(sum(amount), 2)
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
     OR distinct_payment_count <> jsonb_array_length(p_payments)
     OR paid_total IS DISTINCT FROM calculated_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYMENT_TOTAL_MISMATCH';
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

  FOR item_json IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      variant_id,
      variant_name,
      quantity,
      base_unit_price,
      options_unit_price,
      unit_price,
      item_notes,
      configuration_signature
    ) VALUES (
      created_order_id,
      (item_json ->> 'product_id')::uuid,
      item_json ->> 'product_name',
      NULLIF(item_json ->> 'variant_id', '')::uuid,
      NULLIF(item_json ->> 'variant_name', ''),
      (item_json ->> 'quantity')::integer,
      (item_json ->> 'base_unit_price')::numeric,
      (item_json ->> 'options_unit_price')::numeric,
      (item_json ->> 'unit_price')::numeric,
      NULLIF(item_json ->> 'item_notes', ''),
      item_json ->> 'configuration_signature'
    )
    RETURNING id INTO created_order_item_id;

    FOR option_json IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(item_json -> 'options', '[]'::jsonb))
    LOOP
      INSERT INTO public.order_item_options (
        order_item_id,
        option_group_id,
        option_id,
        group_name,
        option_name,
        presentation_mode,
        price_delta,
        group_sort_order,
        option_sort_order
      ) VALUES (
        created_order_item_id,
        (option_json ->> 'option_group_id')::uuid,
        (option_json ->> 'option_id')::uuid,
        option_json ->> 'group_name',
        option_json ->> 'option_name',
        option_json ->> 'presentation_mode',
        (option_json ->> 'price_delta')::numeric,
        (option_json ->> 'group_sort_order')::integer,
        (option_json ->> 'option_sort_order')::integer
      );
    END LOOP;
  END LOOP;

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

  RETURN QUERY
  SELECT created_order_id, created_order_number, calculated_total;
END;
$$;

REVOKE ALL ON FUNCTION public.create_configured_cashier_sale(
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_configured_cashier_sale(
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text
) TO authenticated;
