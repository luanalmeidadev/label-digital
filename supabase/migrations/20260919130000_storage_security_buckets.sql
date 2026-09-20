-- Migration: Garante a infraestrutura declarativa de storage buckets necessária para rate limit, idempotência e imagens.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  false,
  6291456,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'preorder-catalog',
  'preorder-catalog',
  false,
  1048576,
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;
