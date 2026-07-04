
-- 1) signup_audit: revoke API role grants and add explicit restrictive policy
REVOKE ALL ON public.signup_audit FROM anon, authenticated;
GRANT ALL ON public.signup_audit TO service_role;

-- Restrictive policy: denies all access to anon/authenticated regardless of any future permissive policy
CREATE POLICY "no client access to signup_audit"
ON public.signup_audit
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2) storage.objects: add UPDATE policy for resumes bucket scoped to user folder
CREATE POLICY "users update own resume files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (auth.uid())::text);
