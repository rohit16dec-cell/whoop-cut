import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  WHOOP_AUTH_URL,
  WHOOP_REDIRECT_URI,
  WHOOP_SCOPE,
  WHOOP_STATE_COOKIE,
  WHOOP_TOKEN_URL,
  redactTokenResponse,
} from "@/lib/whoop.server";

const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";

async function refreshWhoopToken(refreshToken: string) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Whoop credentials not configured");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: WHOOP_SCOPE,
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Whoop token refresh failed (${res.status}): ${text}`);
  }
  const parsed = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!parsed.access_token || !parsed.expires_in) {
    throw new Error(
      `Whoop refresh response missing fields: ${JSON.stringify(redactTokenResponse(parsed))}`,
    );
  }
  return parsed;
}

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

    setCookie(WHOOP_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: WHOOP_REDIRECT_URI,
      response_type: "code",
      scope: WHOOP_SCOPE,
      state,
    });

    return { url: `${WHOOP_AUTH_URL}?${params.toString()}` };
  });

export const completeWhoopOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; state: string }) => data)
  .handler(async ({ data, context }) => {
    const cookieState = getCookie(WHOOP_STATE_COOKIE);
    if (!cookieState || cookieState !== data.state) {
      throw new Error("Invalid OAuth state");
    }
    deleteCookie(WHOOP_STATE_COOKIE, { path: "/" });

    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Whoop credentials not configured");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: data.code,
      redirect_uri: WHOOP_REDIRECT_URI,
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

    const rawTokenResponse = (await res.json()) as Record<string, unknown>;
    const redactedTokenResponse = redactTokenResponse(rawTokenResponse);
    console.log("Whoop token exchange response", redactedTokenResponse);

    const token = rawTokenResponse as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in: number;
      scope?: string;
    };

    if (typeof token.access_token !== "string" || token.access_token.length === 0) {
      throw new Error(
        `Whoop token response missing access_token. Response: ${JSON.stringify(redactedTokenResponse)}`,
      );
    }

    if (typeof token.refresh_token !== "string" || token.refresh_token.length === 0) {
      throw new Error(
        `Whoop did not return a refresh_token. Please reconnect Whoop so the updated offline access permission is requested. Response: ${JSON.stringify(redactedTokenResponse)}`,
      );
    }

    if (typeof token.expires_in !== "number") {
      throw new Error(
        `Whoop token response missing expires_in. Response: ${JSON.stringify(redactedTokenResponse)}`,
      );
    }

    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error } = await context.supabase.from("whoop_tokens").upsert(
      {
        user_id: context.userId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAt,
        scope: token.scope ?? WHOOP_SCOPE,
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
