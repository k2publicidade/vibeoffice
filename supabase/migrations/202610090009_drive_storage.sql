BEGIN;
-- Qualify the outer Storage object: bare "name" resolved to drive_items.name.
ALTER POLICY files_read ON storage.objects USING (
  (bucket_id IN ('release-assets', 'course-assets') AND public.office_role() IS NOT NULL)
  OR (bucket_id = 'drive-files' AND (
    owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.drive_items d
      WHERE d.storage_path = storage.objects.name AND public.can_drive(d.id)
    )
  ))
);
ALTER POLICY files_delete ON storage.objects USING (
  bucket_id IN ('drive-files', 'release-assets', 'course-assets') AND (
    owner_id = auth.uid()::text OR public.office_role() = 'Admin'
    OR (bucket_id = 'drive-files' AND EXISTS (
      SELECT 1 FROM public.drive_items d
      WHERE d.storage_path = storage.objects.name AND public.can_drive(d.id, true)
    ))
  )
);
COMMIT;
