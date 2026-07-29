import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getDietPreferences,
  setDietType,
  setDietFoods,
  type DietType,
  type FoodItem,
  type FoodUnit,
} from "@/lib/diet.functions";
import { filterByDiet } from "@/lib/food-suggestions";

const NON_VEG_KEYWORDS = [
  "chicken", "mutton", "beef", "pork", "lamb", "fish", "tuna", "salmon",
  "prawn", "shrimp", "crab", "lobster", "bacon", "ham", "sausage",
  "turkey", "duck", "meat", "egg",
];

const EGG_KEYWORDS = ["egg"];

export function DietSection() {
  const loadFn = useServerFn(getDietPreferences);
  const saveTypeFn = useServerFn(setDietType);
  const saveFoodsFn = useServerFn(setDietFoods);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dietType, setDietTypeState] = useState<DietType | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<FoodUnit>("portion");
  const [editingType, setEditingType] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await loadFn();
      setDietTypeState(d.diet_type);
      setItems(d.food_items);
      if (!d.diet_type) setEditingType(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const chooseType = async (t: DietType) => {
    setSaving(true);
    setError(null);
    try {
      await saveTypeFn({ data: { diet_type: t } });
      setDietTypeState(t);
      setEditingType(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const violatesDiet = (item: string): string | null => {
    const lower = item.toLowerCase();
    if (dietType === "vegetarian") {
      const hit = NON_VEG_KEYWORDS.find((k) => lower.includes(k));
      if (hit) return `"${item}" looks non-vegetarian (${hit}). Not added.`;
    }
    if (dietType === "eggetarian") {
      const hit = NON_VEG_KEYWORDS.filter((k) => !EGG_KEYWORDS.includes(k)).find((k) =>
        lower.includes(k),
      );
      if (hit) return `"${item}" looks non-vegetarian (${hit}). Not added.`;
    }
    return null;
  };

  const persist = async (next: FoodItem[]) => {
    setSaving(true);
    setError(null);
    try {
      await saveFoodsFn({ data: { food_items: next } });
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const addFoodByName = async (rawName: string, quantity: number | null, u: FoodUnit) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    if (items.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("Already in your list");
      return;
    }
    const violation = violatesDiet(trimmed);
    if (violation) {
      setError(violation);
      return;
    }
    try {
      await persist([...items, { name: trimmed, quantity, unit: u }]);
      setName("");
      setQty("");
    } catch {
      /* handled */
    }
  };

  const addFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = qty.trim() === "" ? null : parseFloat(qty);
    const quantity = q !== null && isFinite(q) && q > 0 ? q : null;
    await addFoodByName(name, quantity, unit);
  };

  const suggestions = useMemo(
    () => (dietType ? filterByDiet(dietType) : []),
    [dietType],
  );

  const grouped = useMemo(() => {
    const taken = new Set(items.map((f) => f.name.toLowerCase()));
    const groups = new Map<string, string[]>();
    for (const s of suggestions) {
      if (taken.has(s.name.toLowerCase())) continue;
      if (!groups.has(s.category)) groups.set(s.category, []);
      groups.get(s.category)!.push(s.name);
    }
    return Array.from(groups.entries());
  }, [suggestions, items]);

  const removeFood = async (n: string) => {
    try {
      await persist(items.filter((f) => f.name !== n));
    } catch {
      /* handled */
    }
  };

  const updateItem = async (n: string, patch: Partial<FoodItem>) => {
    try {
      await persist(items.map((f) => (f.name === n ? { ...f, ...patch } : f)));
    } catch {
      /* handled */
    }
  };

  const typeLabel: Record<DietType, string> = {
    vegetarian: "Vegetarian",
    "non-vegetarian": "Non-Vegetarian",
    eggetarian: "Eggetarian",
  };

  const fmtQty = (it: FoodItem) => {
    if (it.quantity == null) return "";
    return it.unit === "g" ? `${it.quantity} g` : `${it.quantity} ${it.quantity === 1 ? "portion" : "portions"}`;
  };

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-semibold">Diet Preferences</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Diet type</span>
              {dietType && !editingType && (
                <button
                  type="button"
                  onClick={() => setEditingType(true)}
                  className="text-xs text-muted-foreground underline"
                >
                  Edit
                </button>
              )}
            </div>
            {dietType && !editingType ? (
              <p className="text-sm">{typeLabel[dietType]}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(["vegetarian", "non-vegetarian", "eggetarian"] as DietType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="diet_type"
                      value={t}
                      checked={dietType === t}
                      onChange={() => chooseType(t)}
                      disabled={saving}
                    />
                    {typeLabel[t]}
                  </label>
                ))}
              </div>
            )}
          </div>

          {dietType && (
            <div>
              <div className="mb-2 text-sm font-medium">My food list</div>

              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setName(v);
                }}
                disabled={saving || grouped.length === 0}
                className="mb-2 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">
                  {grouped.length === 0
                    ? "All suggestions added — use the input below"
                    : "Choose from suggestions…"}
                </option>
                {grouped.map(([category, names]) => (
                  <optgroup key={category} label={category}>
                    {names.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <form onSubmit={addFood} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Food name (e.g. paneer, oats)"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Qty (optional)"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as FoodUnit)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="portion">portions</option>
                    <option value="g">grams</option>
                  </select>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </form>

              {items.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {items.map((it) => (
                    <li
                      key={it.name}
                      className="flex items-center gap-2 rounded-md border bg-secondary/40 px-3 py-2 text-xs"
                    >
                      <span className="flex-1 font-medium">{it.name}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        value={it.quantity ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const q = v === "" ? null : parseFloat(v);
                          void updateItem(it.name, {
                            quantity: q !== null && isFinite(q) && q > 0 ? q : null,
                          });
                        }}
                        placeholder="qty"
                        className="w-16 rounded border bg-background px-2 py-1 text-xs"
                      />
                      <select
                        value={it.unit}
                        onChange={(e) =>
                          void updateItem(it.name, { unit: e.target.value as FoodUnit })
                        }
                        className="rounded border bg-background px-1 py-1 text-xs"
                      >
                        <option value="portion">portions</option>
                        <option value="g">g</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFood(it.name)}
                        disabled={saving}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${it.name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No foods added yet.</p>
              )}
              {items.some((i) => i.quantity != null) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Totals: {items.filter((i) => i.quantity != null && i.unit === "g").reduce((a, b) => a + (b.quantity ?? 0), 0)} g
                  {" · "}
                  {items.filter((i) => i.quantity != null && i.unit === "portion").reduce((a, b) => a + (b.quantity ?? 0), 0)} portions
                </p>
              )}
              <p className="sr-only">{items.map(fmtQty).join(", ")}</p>
            </div>
          )}

          {error && (
            <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
