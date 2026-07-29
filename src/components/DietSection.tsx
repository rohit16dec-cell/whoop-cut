import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getDietPreferences,
  setDietType,
  setDietFoods,
  type DietType,
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
  const [foods, setFoods] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [editingType, setEditingType] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await loadFn();
      setDietTypeState(d.diet_type);
      setFoods(d.foods);
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

  const addFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (foods.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      setError("Already in your list");
      setInput("");
      return;
    }
    const violation = violatesDiet(trimmed);
    if (violation) {
      setError(violation);
      return;
    }
    const next = [...foods, trimmed];
    setSaving(true);
    setError(null);
    try {
      await saveFoodsFn({ data: { foods: next } });
      setFoods(next);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeFood = async (item: string) => {
    const next = foods.filter((f) => f !== item);
    setSaving(true);
    setError(null);
    try {
      await saveFoodsFn({ data: { foods: next } });
      setFoods(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const typeLabel: Record<DietType, string> = {
    vegetarian: "Vegetarian",
    "non-vegetarian": "Non-Vegetarian",
    eggetarian: "Eggetarian",
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
              <form onSubmit={addFood} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. paneer, oats"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={saving || !input.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Add
                </button>
              </form>

              {foods.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {foods.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => removeFood(f)}
                        disabled={saving}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${f}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No foods added yet.</p>
              )}
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
