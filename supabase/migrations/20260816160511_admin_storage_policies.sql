DROP POLICY IF EXISTS "Administradores gerenciam imagens de produtos"
ON storage.objects;

CREATE POLICY "Administradores gerenciam imagens de produtos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
  )
);
