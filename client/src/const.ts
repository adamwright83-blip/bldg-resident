export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const resolveApiBase = () => {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return normalizeBaseUrl(window.location.origin);
    }
  }
  return "https://api.bldg.chat";
};

/** Backend API base for REST/tRPC calls. In local dev, set VITE_API_URL explicitly. */
export const API_BASE = resolveApiBase();

export const getAppHomeUrl = () => {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
};

const isAbsoluteHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  if (typeof window === "undefined") return "/";
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const fallback = getAppHomeUrl();
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  if (!oauthPortalUrl || !appId || !isAbsoluteHttpUrl(redirectUri)) {
    console.warn("[Auth] Login URL fallback", {
      oauthPortalUrl,
      appId,
      redirectUri,
      reason: "missing_or_invalid_inputs",
    });
    return fallback;
  }

  try {
    const url = new URL("/app-auth", oauthPortalUrl);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", btoa(redirectUri));
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (error) {
    console.warn("[Auth] Login URL fallback", {
      oauthPortalUrl,
      appId,
      redirectUri,
      reason: "url_construction_failed",
      error: String(error),
    });
    return fallback;
  }
};

export const getLogoutUrl = () => getAppHomeUrl();
