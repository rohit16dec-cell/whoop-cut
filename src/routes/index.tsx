import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  getWhoopDashboard,
  getWhoopStatus,
  startWhoopOAuth,
} from "@/lib/whoop.functions";
import {
  listWeightEntries,
  saveWeightEntry,
} from "@/lib/weight.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cut and Buk Tracker" },
      { name: "description", content: "Track fitness and diet with Cut Tracker." },
      { property: "og:title", content: "Cut and Buk Tracker" },
      { property: "og:description", content: "Track fitness and diet with Cut Tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Dashboard = {
  strain: number | null;
  calories: number | null;
  recoveryScore: number | null;
};

function Index() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const statusFn = useServerFn(getWhoopStatus);
  const startFn = useServerFn(startWhoopOAuth);
  const dashboardFn = useServerFn(getWhoopDashboard);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setUserEmail(null);
        setChecking(false);
        return;
      }
      setUserEmail(data.session.user.email ?? "signed in");
      try {
        const s = await statusFn();
        if (!cancelled) setConnected(s.connected);
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFn]);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setDashboardLoading(true);
    setDashboardError(null);
    (async () => {
      try {
        const d = await dashboardFn();
        if (!cancelled) setDashboard(d);
      } catch (e) {
        if (!cancelled) {
          setDashboardError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, dashboardFn]);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await startFn();
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const fmt = (n: number | null, digits = 1) =>
    typeof n === "number" ? n.toFixed(digits) : "—";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <h1 className="text-4xl font-bold">Cut and Buk Tracker</h1>

      {checking ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !userEmail ? (
        <Link
          to="/auth"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Sign in to continue
        </Link>
      ) : connected ? (
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <p className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Whoop connected
          </p>

          <div className="w-full rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Today</h2>
            {dashboardLoading ? (
              <p className="text-sm text-muted-foreground">Loading Whoop data…</p>
            ) : dashboardError ? (
              <p className="whitespace-pre-wrap break-words rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
                {dashboardError}
              </p>
            ) : dashboard ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Today's Strain</div>
                  <div className="text-2xl font-bold">{fmt(dashboard.strain)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Recovery Score</div>
                  <div className="text-2xl font-bold">
                    {dashboard.recoveryScore ?? "—"}
                    {dashboard.recoveryScore !== null && (
                      <span className="text-sm">%</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Calories Burned</div>
                  <div className="text-2xl font-bold">{fmt(dashboard.calories, 0)}</div>
                </div>
              </div>
            ) : null}
          </div>

          <WeightSection />


          <p className="text-xs text-muted-foreground">Signed in as {userEmail}</p>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-muted-foreground underline"
          >
            Sign out
          </button>
        </div>
      ) : (

        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Redirecting…" : "Connect Whoop"}
          </button>

          <WeightSection />

          <p className="text-xs text-muted-foreground">Signed in as {userEmail}</p>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-muted-foreground underline"
          >
            Sign out
          </button>
        </div>

      )}
    </div>
  );
}
