
-- Create whatsapp_credentials table for secure OAuth token storage
CREATE TABLE IF NOT EXISTS public.whatsapp_credentials (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_token TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  display_phone_number TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_credentials_single_row CHECK (id = 1)
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_credentials_updated_at
  BEFORE UPDATE ON public.whatsapp_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_credentials_updated_at();

-- Seed default disconnected row so upsert always works
INSERT INTO public.whatsapp_credentials (id, is_connected)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- RLS: block direct client access; only service_role (edge functions) can access
ALTER TABLE public.whatsapp_credentials ENABLE ROW LEVEL SECURITY;
