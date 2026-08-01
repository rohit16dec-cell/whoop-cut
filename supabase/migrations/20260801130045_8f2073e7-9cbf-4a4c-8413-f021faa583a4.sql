ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS calories numeric;
ALTER TABLE public.diet_preferences ADD COLUMN IF NOT EXISTS deficit_kcal numeric;