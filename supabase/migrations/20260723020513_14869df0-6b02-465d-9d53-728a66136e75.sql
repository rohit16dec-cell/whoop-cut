
CREATE TABLE public.whoop_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whoop_tokens TO authenticated;
GRANT ALL ON public.whoop_tokens TO service_role;

ALTER TABLE public.whoop_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own whoop tokens"
  ON public.whoop_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER whoop_tokens_set_updated_at
  BEFORE UPDATE ON public.whoop_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
