import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const REDIRECT_URI = "https://whoop-cut.lovable.app/whoop-callback";
const SCOPE =
  "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement";
const STATE_COOKIE = "whoop_oauth_state";

export const getWhoopStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("whoop_tokens")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { connected: !!data };
  });

export const startWhoopOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const clientId = process.env.WHOOP_CLIENT_ID;
    if (!clientId) throw new Error("WHOOP_CLIENT_ID not set");

    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const state = Array.from(bytes, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");

    setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPE,
      state,
    });

    return { url: `${WHOOP_AUTH_URL}?${params.toString()}` };
  });

export const completeWhoopOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; state: string }) => data)
  .handler(async ({ data, context }) => {
    const cookieState = getCookie(STATE_COOKIE);
    if (!cookieState || cookieState !== data.state) {
      throw new Error("Invalid OAuth state");
    }
    deleteCookie(STATE_COOKIE, { path: "/" });

    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Whoop credentials not configured");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: data.code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Whoop token exchange failed", res.status, text);
      throw new Error("Whoop token exchange failed");
    }

    const token = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope?: string;
    };

    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error } = await context.supabase.from("whoop_tokens").upsert(
      {
        user_id: context.userId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAt,
        scope: token.scope ?? SCOPE,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Failed to save whoop tokens", error);
      throw new Error(
        `Failed to save Whoop tokens: ${error.message}${error.details ? ` (${error.details})` : ""}${error.hint ? ` [hint: ${error.hint}]` : ""}`,
      );
    }

    return { ok: true };
  });
