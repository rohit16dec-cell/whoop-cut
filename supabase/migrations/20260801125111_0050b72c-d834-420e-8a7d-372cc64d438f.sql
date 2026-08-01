CREATE TABLE public.food_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric,
  unit text NOT NULL DEFAULT 'portion',
  entry_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;
GRANT ALL ON public.food_logs TO service_role;

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own food logs" ON public.food_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX food_logs_user_date_idx ON public.food_logs (user_id, entry_date DESC);

CREATE TRIGGER food_logs_set_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();