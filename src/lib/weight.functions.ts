import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWeightEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weight_entries")
      .select("id, weight_kg, entry_date")
      .eq("user_id", context.userId)
      .order("entry_date", { ascending: true });
    if (error) throw new Error(`Failed to load weight entries: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      weight_kg: Number(r.weight_kg),
      entry_date: r.entry_date as string,
    }));
  });

export const saveWeightEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { weight_kg: number; entry_date?: string }) => {
    if (typeof data.weight_kg !== "number" || !isFinite(data.weight_kg)) {
      throw new Error("weight_kg must be a number");
    }
    if (data.weight_kg <= 0 || data.weight_kg >= 1000) {
      throw new Error("weight_kg out of range");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const entry_date =
      data.entry_date ?? new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase.from("weight_entries").upsert(
      {
        user_id: context.userId,
        weight_kg: data.weight_kg,
        entry_date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,entry_date" },
    );
    if (error)
      throw new Error(
        `Failed to save weight: ${error.message}${error.details ? ` (${error.details})` : ""}`,
      );
    return { ok: true };
  });
