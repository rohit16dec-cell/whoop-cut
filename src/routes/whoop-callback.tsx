import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { completeWhoopOAuth } from "@/lib/whoop.functions";

export const Route = createFileRoute("/whoop-callback")({
  head: () => ({
    meta: [
      { title: "Connecting Whoop — Cut and Buk Tracker" },
      { name: "description", content: "Completing Whoop connection." },
      { property: "og:title", content: "Connecting Whoop — Cut and Buk Tracker" },
      { property: "og:description", content: "Completing Whoop connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhoopCallback,
});

function WhoopCallback() {
  const navigate = useNavigate();
  const complete = useServerFn(completeWhoopOAuth);
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Completing Whoop connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");

    if (err) {
      setStatus("error");
      setMessage(`Whoop authorization failed: ${err}`);
      return;
    }
    if (!code || !state) {
      setStatus("error");
      setMessage("Missing code or state from Whoop.");
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        await complete({ data: { code, state } });
        navigate({ to: "/" });
      } catch (e) {
        console.error(e);
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Failed to complete Whoop connection.");
      }
    })();
  }, [complete, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p
        className={`text-lg ${status === "error" ? "text-destructive" : ""}`}
      >
        {message}
      </p>
    </div>
  );
}
