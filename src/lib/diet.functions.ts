import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DietType = "vegetarian" | "non-vegetarian" | "eggetarian";

export const getDietPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("diet_preferences")
      .select("diet_type, foods")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load diet preferences: ${error.message}`);
    return {
      diet_type: (data?.diet_type ?? null) as DietType | null,
      foods: (data?.foods ?? []) as string[],
    };
  });

async function upsertPrefs(
  supabase: any,
  userId: string,
  patch: { diet_type?: DietType; foods?: string[] },
) {
  const { data: existing } = await supabase
    .from("diet_preferences")
    .select("diet_type, foods")
    .eq("user_id", userId)
    .maybeSingle();
  const row = {
    user_id: userId,
    diet_type: patch.diet_type ?? existing?.diet_type ?? null,
    foods: patch.foods ?? existing?.foods ?? [],
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("diet_preferences")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to save: ${error.message}`);
}

export const setDietType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { diet_type: DietType }) => {
    if (!["vegetarian", "non-vegetarian", "eggetarian"].includes(data.diet_type)) {
      throw new Error("Invalid diet_type");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    await upsertPrefs(context.supabase, context.userId, { diet_type: data.diet_type });
    return { ok: true };
  });

export const setDietFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { foods: string[] }) => {
    if (!Array.isArray(data.foods)) throw new Error("foods must be array");
    return {
      foods: data.foods
        .map((f) => String(f).trim())
        .filter((f) => f.length > 0 && f.length < 100)
        .slice(0, 200),
    };
  })
  .handler(async ({ data, context }) => {
    await upsertPrefs(context.supabase, context.userId, { foods: data.foods });
    return { ok: true };
  });
