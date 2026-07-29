ALTER TABLE public.diet_preferences
  ADD COLUMN IF NOT EXISTS food_items jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.diet_preferences
SET food_items = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('name', f, 'quantity', NULL, 'unit', 'portion'))
   FROM unnest(foods) AS f),
  '[]'::jsonb
)
WHERE food_items = '[]'::jsonb AND array_length(foods, 1) IS NOT NULL;