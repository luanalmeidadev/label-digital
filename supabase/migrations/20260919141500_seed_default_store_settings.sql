-- Migration: Garante a presença do registro singleton em store_settings.
-- Necessário para que o Checkout (verificação de recebimento) e o Admin (configurações) funcionem em instalações novas.

INSERT INTO public.store_settings (id, store_name, whatsapp, instagram, pickup_enabled, delivery_enabled)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'La''bel Confeitaria',
  '5548988681096',
  '@label_confeitaria',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;
