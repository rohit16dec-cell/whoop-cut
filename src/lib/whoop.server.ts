export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_REDIRECT_URI = "https://whoop-cut.lovable.app/whoop-callback";
export const WHOOP_SCOPE =
  "offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement";
export const WHOOP_STATE_COOKIE = "whoop_oauth_state";

export const redactTokenResponse = (value: unknown) => {
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => {
      if (key.toLowerCase().includes("token")) {
        return [
          key,
          typeof fieldValue === "string"
            ? `[redacted:${fieldValue.length}]`
            : "[redacted]",
        ];
      }
      return [key, fieldValue];
    }),
  );
};
