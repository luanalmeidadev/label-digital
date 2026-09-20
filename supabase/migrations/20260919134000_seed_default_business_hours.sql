-- Migration: Garante a presença dos 7 dias da semana (0..6) na tabela business_hours.
-- Necessário para que o Checkout e o Admin consigam consultar e atualizar os horários da loja.

INSERT INTO public.business_hours (weekday, is_open, opens_at, closes_at)
VALUES
  (0, true, '00:00:00', '23:59:00'),
  (1, true, '00:00:00', '23:59:00'),
  (2, true, '00:00:00', '23:59:00'),
  (3, true, '00:00:00', '23:59:00'),
  (4, true, '00:00:00', '23:59:00'),
  (5, true, '00:00:00', '23:59:00'),
  (6, true, '00:00:00', '23:59:00')
ON CONFLICT (weekday) DO NOTHING;
