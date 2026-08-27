-- Optional variant snapshots for product losses.
-- Additive: the legacy create_product_loss RPC and existing rows remain valid.

ALTER TABLE public.product_losses
  ADD COLUMN variant_id uuid,
  ADD COLUMN variant_name text;

ALTER TABLE public.product_losses
  ADD CONSTRAINT product_losses_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES public.product_variants(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT product_losses_variant_name_check
    CHECK (
      variant_name IS NULL
      OR char_length(btrim(variant_name)) BETWEEN 1 AND 120
    );

CREATE INDEX product_losses_variant_idx
  ON public.product_losses (variant_id, created_at DESC)
  WHERE variant_id IS NOT NULL;

CREATE FUNCTION public.create_configured_product_loss(
  p_cash_session_id uuid,
  p_loss_reference uuid,
  p_product_id uuid,
  p_variant_id uuid,
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
  selected_product record;
  selected_variant record;
  selected_variant_name text;
  selected_unit_price numeric(10,2);
  created_loss_id uuid;
  calculated_value numeric(10,2);
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'CASHIER_AUTH_REQUIRED';
  END IF;

  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'CASHIER_PERMISSION_REQUIRED';
  END IF;

  IF p_loss_reference IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'INVALID_LOSS_REFERENCE';
  END IF;

  IF p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'INVALID_LOSS_QUANTITY';
  END IF;

  IF p_reason NOT IN ('expired', 'damaged', 'production', 'internal', 'other')
     OR char_length(COALESCE(p_notes, '')) > 300 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'INVALID_LOSS_DETAILS';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_loss_reference::text, 0)
  );

  SELECT loss.id, loss.estimated_value
  INTO created_loss_id, calculated_value
  FROM public.product_losses AS loss
  WHERE loss.loss_reference = p_loss_reference;

  IF created_loss_id IS NOT NULL THEN
    RETURN QUERY SELECT created_loss_id, calculated_value;
    RETURN;
  END IF;

  PERFORM 1
  FROM public.cash_sessions AS cash_session
  WHERE cash_session.id = p_cash_session_id
    AND cash_session.status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'CASH_SESSION_CLOSED';
  END IF;

  SELECT product.id, product.name, product.price, product.pricing_mode
  INTO selected_product
  FROM public.products AS product
  WHERE product.id = p_product_id
    AND product.active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'LOSS_PRODUCT_NOT_FOUND';
  END IF;

  IF selected_product.pricing_mode = 'variant' THEN
    IF p_variant_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'LOSS_VARIANT_REQUIRED';
    END IF;

    SELECT variant.id, variant.name, variant.price
    INTO selected_variant
    FROM public.product_variants AS variant
    WHERE variant.id = p_variant_id
      AND variant.product_id = selected_product.id
      AND variant.active = true
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'LOSS_VARIANT_NOT_FOUND';
    END IF;

    selected_variant_name := selected_variant.name;
    selected_unit_price := selected_variant.price;
  ELSE
    IF p_variant_id IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'LOSS_VARIANT_NOT_ALLOWED';
    END IF;

    selected_variant_name := NULL;
    selected_unit_price := selected_product.price;
  END IF;

  calculated_value := round(selected_unit_price * p_quantity, 2);

  INSERT INTO public.product_losses (
    loss_reference,
    cash_session_id,
    product_id,
    product_name,
    variant_id,
    variant_name,
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
    p_variant_id,
    selected_variant_name,
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

REVOKE ALL ON FUNCTION public.create_configured_product_loss(
  uuid,
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_configured_product_loss(
  uuid,
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text
) TO authenticated;
