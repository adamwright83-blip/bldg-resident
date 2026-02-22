import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = (req.hostname || "").toLowerCase();
  const isLocalHost =
    !hostname ||
    LOCAL_HOSTS.has(hostname) ||
    isIpAddress(hostname) ||
    hostname.endsWith(".local");
  const secure = isSecureRequest(req);
  const isBldgDomain = hostname === "bldg.chat" || hostname.endsWith(".bldg.chat");

  return {
    httpOnly: true,
    path: "/",
    sameSite: isLocalHost || !secure ? "lax" : "none",
    secure,
    ...(isBldgDomain ? { domain: ".bldg.chat" } : {}),
  };
}
