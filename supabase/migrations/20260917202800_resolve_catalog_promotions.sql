-- Migration: 20260917202800_resolve_catalog_promotions.sql
-- Description: Função set-returning para resolver as promoções ativas de todo o catálogo de forma eficiente usando resolve_active_promotion.

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
    -- Para produtos do tipo simple, não temos variant_id
    SELECT p.id AS product_id, NULL::uuid AS variant_id
    FROM public.products p
    WHERE p.pricing_mode = 'simple' AND p.active = true

    UNION ALL

    -- Para produtos do tipo variant, precisamos considerar cada variante ativa
    SELECT v.product_id, v.id AS variant_id
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    WHERE p.pricing_mode = 'variant' AND v.active = true AND p.active = true
  )
  SELECT
    t.product_id,
    t.variant_id,
    r.event_id,
    r.event_name,
    r.promotional_price,
    r.availability_mode
  FROM target_items t
  CROSS JOIN LATERAL public.resolve_active_promotion(t.product_id, t.variant_id, p_timezone, p_now) r
  WHERE r.event_id IS NOT NULL;
END;
$$;
