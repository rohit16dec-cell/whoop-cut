import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listTodayFoodLogs } from "@/lib/food-log.functions";
import { getDietPreferences, setDeficitTarget } from "@/lib/diet.functions";

export function CalorieBudgetSection({
  burned,
  refreshKey,
}: {
  burned: number | null;
  refreshKey: number;
}) {
  const listFn = useServerFn(listTodayFoodLogs);
  const prefsFn = useServerFn(getDietPreferences);
  const saveDeficitFn = useServerFn(setDeficitTarget);

  const [eaten, setEaten] = useState(0);
  const [deficit, setDeficit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logs, prefs] = await Promise.all([listFn(), prefsFn()]);
      setEaten(logs.reduce((sum, l) => sum + (l.calories ?? 0), 0));
      setDeficit(prefs.deficit_kcal);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listFn, prefsFn]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const saveDeficit = async () => {
    const v = parseFloat(input);
    if (!isFinite(v) || v < 0) {
      setError("Enter a deficit in kcal");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveDeficitFn({ data: { deficit_kcal: v } });
      setInput("");
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const target =
    deficit !== null && burned !== null ? Math.round(burned - deficit) : null;
  const remaining = target !== null ? target - Math.round(eaten) : null;

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-semibold">Calorie Budget</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : deficit === null || editing ? (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {deficit === null
              ? "Set your daily calorie deficit target to see your budget."
              : "Update your daily calorie deficit target."}
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="50"
              inputMode="numeric"
              placeholder="Deficit (kcal)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={saveDeficit}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Calorie target for today</div>
              <div className="text-xl font-bold">
                {target !== null ? `${target} kcal` : "—"}
              </div>
              {burned === null && (
                <div className="text-xs text-muted-foreground">
                  Needs Whoop calories burned
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Calories eaten today</div>
              <div className="text-xl font-bold">{Math.round(eaten)} kcal</div>
            </div>
          </div>

          <div className="mt-4 rounded-md border p-3 text-center">
            <div className="text-xs text-muted-foreground">Remaining calories for today</div>
            <div
              className={`text-3xl font-bold ${
                remaining === null
                  ? ""
                  : remaining >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {remaining !== null ? `${remaining} kcal` : "—"}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Deficit target: {deficit} kcal{" "}
            <button
              type="button"
              onClick={() => {
                setInput(String(deficit));
                setEditing(true);
              }}
              className="underline"
            >
              Edit
            </button>
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
