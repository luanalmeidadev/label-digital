DROP FUNCTION IF EXISTS public.create_online_order_atomic(
  p_customer_id uuid,
  p_address_id uuid,
  p_order_type text,
  p_payment_method text,
  p_cash_change_for numeric,
  p_delivery_fee numeric,
  p_notes text,
  p_items jsonb
);
