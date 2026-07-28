
CREATE TABLE public.diet_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_type TEXT CHECK (diet_type IN ('vegetarian','non-vegetarian','eggetarian')),
  foods TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_preferences TO authenticated;
GRANT ALL ON public.diet_preferences TO service_role;
ALTER TABLE public.diet_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own diet preferences" ON public.diet_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_diet_preferences_updated_at BEFORE UPDATE ON public.diet_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
