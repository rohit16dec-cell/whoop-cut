import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getWhoopStatus, startWhoopOAuth } from "@/lib/whoop.functions";

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

function Index() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const statusFn = useServerFn(getWhoopStatus);
  const startFn = useServerFn(startWhoopOAuth);

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
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
        <div className="flex flex-col items-center gap-3">
          <p className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Whoop connected
          </p>
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
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Redirecting…" : "Connect Whoop"}
          </button>
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
