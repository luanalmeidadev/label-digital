-- Migration: 20260924110000_allow_inactive_promotions.sql
CREATE OR REPLACE FUNCTION public.resolve_catalog_promotions(
  p_timezone text DEFAULT 'America/Sao_Paulo',
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  product_id uuid,
  variant_id uuid,
  event_id uuid,
  event_name text,
  promotional_price numeric,
  availability_mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH target_items AS (
    SELECT p.id AS product_id, NULL::uuid AS variant_id
    FROM public.products p
    WHERE p.pricing_mode = 'simple'
    UNION ALL
    SELECT v.product_id, v.id AS variant_id
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    WHERE p.pricing_mode = 'variant'
  )
  SELECT
    t.product_id,
    t.variant_id,
    r.event_id,
    r.event_name,
    r.promotional_price,
    r.availability_mode
  FROM target_items t
  JOIN LATERAL public.resolve_active_promotion(t.product_id, t.variant_id, p_timezone, p_now) r ON true
  WHERE r.event_id IS NOT NULL;
END;
$$;
