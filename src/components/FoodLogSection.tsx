import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  addFoodLog,
  deleteFoodLog,
  listTodayFoodLogs,
  type FoodLog,
  type FoodLogUnit,
} from "@/lib/food-log.functions";
import {
  getDietPreferences,
  setDietFoods,
  type FoodItem,
} from "@/lib/diet.functions";

export function FoodLogSection({ onChange }: { onChange?: () => void }) {
  const listFn = useServerFn(listTodayFoodLogs);
  const addFn = useServerFn(addFoodLog);
  const deleteFn = useServerFn(deleteFoodLog);
  const prefsFn = useServerFn(getDietPreferences);
  const saveFoodsFn = useServerFn(setDietFoods);

  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [saved, setSaved] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<FoodLogUnit>("portion");

  const [custom, setCustom] = useState("");
  const [customQty, setCustomQty] = useState("");
  const [customUnit, setCustomUnit] = useState<FoodLogUnit>("g");
  const [alsoSave, setAlsoSave] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, p] = await Promise.all([listFn(), prefsFn()]);
      setLogs(l);
      setSaved(p.food_items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listFn, prefsFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFromList = async () => {
    if (!selected) {
      setError("Pick a food from your saved list");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const q = parseFloat(qty);
      await addFn({
        data: { name: selected, quantity: isFinite(q) && q > 0 ? q : null, unit },
      });
      setSelected("");
      setQty("");
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const name = custom.trim();
    if (!name) {
      setError("Enter a food name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const q = parseFloat(customQty);
      const quantity = isFinite(q) && q > 0 ? q : null;
      await addFn({ data: { name, quantity, unit: customUnit } });
      if (alsoSave && !saved.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        const next: FoodItem[] = [...saved, { name, quantity, unit: customUnit }];
        await saveFoodsFn({ data: { food_items: next } });
      }
      setCustom("");
      setCustomQty("");
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteFn({ data: { id } });
      setLogs((prev) => prev.filter((l) => l.id !== id));
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const label = (l: FoodLog) => {
    const qty =
      l.quantity === null
        ? ""
        : `, ${l.quantity}${l.unit === "g" ? "g" : l.quantity === 1 ? " serving" : " servings"}`;
    const kcal = l.calories === null ? " — estimating…" : ` — approx ${Math.round(l.calories)} kcal`;
    return `${l.name}${qty}${kcal}`;
  };

  const totalKcal = logs.reduce((sum, l) => sum + (l.calories ?? 0), 0);

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-semibold">Log Food</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="min-w-0 flex-1 rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="">
                {saved.length === 0 ? "No saved foods yet" : "Choose from saved foods…"}
              </option>
              {saved.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              placeholder="Qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 rounded-md border bg-background px-2 py-2 text-sm"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as FoodLogUnit)}
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="portion">servings</option>
              <option value="g">grams</option>
            </select>
            <button
              type="button"
              onClick={addFromList}
              disabled={busy}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Estimating…" : "Add"}
            </button>
          </div>

          <div className="mt-3 border-t pt-3">
            <p className="mb-2 text-xs text-muted-foreground">Not on your list?</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="e.g. sprouts salad"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="min-w-0 flex-1 rounded-md border bg-background px-2 py-2 text-sm"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="Qty"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                className="w-20 rounded-md border bg-background px-2 py-2 text-sm"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as FoodLogUnit)}
                className="rounded-md border bg-background px-2 py-2 text-sm"
              >
                <option value="g">grams</option>
                <option value="portion">servings</option>
              </select>
              <button
                type="button"
                onClick={addCustom}
                disabled={busy}
                className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {busy ? "Estimating…" : "Log"}
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={alsoSave}
                onChange={(e) => setAlsoSave(e.target.checked)}
              />
              Also add to my saved food list
            </label>
          </div>

          {error && (
            <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">
              Today{logs.length > 0 ? ` — ${Math.round(totalKcal)} kcal eaten` : ""}
            </h3>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged today yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {logs.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 border-b py-1 last:border-b-0"
                  >
                    <span>{label(l)}</span>
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      disabled={busy}
                      aria-label={`Remove ${l.name}`}
                      className="text-xs text-muted-foreground underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
