import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FoodLogUnit = "g" | "portion";
export type FoodLog = {
  id: string;
  name: string;
  quantity: number | null;
  unit: FoodLogUnit;
  entry_date: string;
  calories: number | null;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const listTodayFoodLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("food_logs")
      .select("id, name, quantity, unit, entry_date, calories")
      .eq("user_id", context.userId)
      .eq("entry_date", todayUtc())
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Failed to load food log: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      quantity: r.quantity === null ? null : Number(r.quantity),
      unit: (r.unit === "g" ? "g" : "portion") as FoodLogUnit,
      entry_date: r.entry_date as string,
      calories:
        (r as { calories?: number | null }).calories === null ||
        (r as { calories?: number | null }).calories === undefined
          ? null
          : Number((r as { calories?: number | null }).calories),
    })) satisfies FoodLog[];
  });

export const addFoodLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; quantity: number | null; unit: FoodLogUnit }) => {
    const name = String(data?.name ?? "").trim();
    if (!name || name.length > 100) throw new Error("Enter a food name");
    const quantity =
      typeof data?.quantity === "number" && isFinite(data.quantity) && data.quantity > 0
        ? data.quantity
        : null;
    return { name, quantity, unit: (data?.unit === "g" ? "g" : "portion") as FoodLogUnit };
  })
  .handler(async ({ data, context }) => {
    const { estimateCalories } = await import("@/lib/calories.server");
    const calories = await estimateCalories(data.name, data.quantity, data.unit);
    const { error } = await context.supabase.from("food_logs").insert({
      user_id: context.userId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      entry_date: todayUtc(),
      calories,
    });
    if (error) throw new Error(`Failed to log food: ${error.message}`);
    return { ok: true, calories };
  });

export const deleteFoodLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "");
    if (!id) throw new Error("Missing id");
    return { id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("food_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(`Failed to remove entry: ${error.message}`);
    return { ok: true };
  });
