import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DietType = "vegetarian" | "non-vegetarian" | "eggetarian";
export type FoodUnit = "g" | "portion";
export type FoodItem = { name: string; quantity: number | null; unit: FoodUnit };

function normalizeItems(raw: unknown): FoodItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FoodItem[] = [];
  for (const r of raw) {
    if (!r) continue;
    if (typeof r === "string") {
      out.push({ name: r, quantity: null, unit: "portion" });
      continue;
    }
    if (typeof r === "object") {
      const o = r as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      const unit: FoodUnit = o.unit === "g" ? "g" : "portion";
      const q = typeof o.quantity === "number" && isFinite(o.quantity) ? o.quantity : null;
      out.push({ name, quantity: q, unit });
    }
  }
  return out;
}

export const getDietPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("diet_preferences")
      .select("diet_type, foods, food_items")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load diet preferences: ${error.message}`);
    let items = normalizeItems((data as any)?.food_items);
    if (items.length === 0 && Array.isArray(data?.foods) && data.foods.length > 0) {
      items = (data.foods as string[]).map((n) => ({ name: n, quantity: null, unit: "portion" as FoodUnit }));
    }
    return {
      diet_type: (data?.diet_type ?? null) as DietType | null,
      food_items: items,
    };
  });

async function upsertPrefs(
  supabase: any,
  userId: string,
  patch: { diet_type?: DietType; food_items?: FoodItem[] },
) {
  const { data: existing } = await supabase
    .from("diet_preferences")
    .select("diet_type, food_items")
    .eq("user_id", userId)
    .maybeSingle();
  const items = patch.food_items ?? normalizeItems(existing?.food_items);
  const row = {
    user_id: userId,
    diet_type: patch.diet_type ?? existing?.diet_type ?? null,
    foods: items.map((i) => i.name),
    food_items: items,
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
  .inputValidator((data: { food_items: FoodItem[] }) => {
    if (!Array.isArray(data.food_items)) throw new Error("food_items must be array");
    const cleaned: FoodItem[] = data.food_items
      .map((it) => ({
        name: String(it?.name ?? "").trim(),
        quantity:
          typeof it?.quantity === "number" && isFinite(it.quantity) && it.quantity > 0
            ? it.quantity
            : null,
        unit: (it?.unit === "g" ? "g" : "portion") as FoodUnit,
      }))
      .filter((it) => it.name.length > 0 && it.name.length < 100)
      .slice(0, 200);
    return { food_items: cleaned };
  })
  .handler(async ({ data, context }) => {
    await upsertPrefs(context.supabase, context.userId, { food_items: data.food_items });
    return { ok: true };
  });
