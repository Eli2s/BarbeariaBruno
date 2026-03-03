
-- Fix: Add explicit deny-all RLS policy (table is service_role only)
-- No authenticated or anon users should access credentials directly
CREATE POLICY "Deny all direct access to whatsapp_credentials"
  ON public.whatsapp_credentials
  FOR ALL
  USING (false);

-- Fix: Set stable search_path on the trigger function
CREATE OR REPLACE FUNCTION public.update_whatsapp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
