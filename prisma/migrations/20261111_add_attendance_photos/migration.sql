ALTER TABLE public.attendance
  ADD COLUMN photo_path text,
  ADD COLUMN photo_captured_at timestamptz;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attendance-photos', 'attendance-photos', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'attendance-photos'
      AND public = false
      AND file_size_limit = 5242880
      AND allowed_mime_types = ARRAY['image/jpeg']::text[]
  ) THEN
    RAISE EXCEPTION 'attendance-photos bucket must be private and limited to 5 MB JPEG images';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.attendance'::regclass
      AND relrowsecurity = true
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'storage.objects'::regclass
      AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS must be enabled for attendance and storage.objects before photo policies are installed';
  END IF;
END
$$;

CREATE POLICY geopulse_admin_read_attendance_photos
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    photo_path IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.employees AS current_employee
      WHERE current_employee.id = auth.uid()
        AND current_employee.role = 'admin'
        AND current_employee.is_active = true
    )
  );

CREATE POLICY geopulse_upload_own_attendance_photos
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(check_in|check_out)\.jpg$'
  );

CREATE POLICY geopulse_read_own_or_admin_attendance_photos
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attendance-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.employees AS current_employee
        WHERE current_employee.id = auth.uid()
          AND current_employee.role = 'admin'
          AND current_employee.is_active = true
      )
    )
  );
