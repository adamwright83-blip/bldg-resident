/**
 * OnboardingFlow v2 — Identity + OTP → App home
 *
 * Numeric subdomains (3545.bldg.chat): building auto-locked, just Unit + Mobile.
 * Generic entry (app.bldg.chat): shows building dropdown.
 *
 * Unauthenticated users are routed to `/setup` until identity + OTP (or valid session).
 * Returning users (localStorage or valid session) skip directly to the app.
 */
import { useState, useCallback, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { API_BASE } from "@/const";
import {
  extractNumericHostToken,
  resolveBuildingFromHostname,
} from "@shared/buildingHostMap";
import IdentityScreen from "./IdentityScreen";
import OTPScreen from "./OTPScreen";

const ONBOARDING_KEY = "bldg_onboarding_complete";
const SETUP_PATH = "/setup";

const BUILDING_NAMES: Record<string, string> = {
  "opus-south": "3545 Wilshire Blvd",
  "opus-north": "3650 Wilshire Blvd",
  "cpe-north": "2160 Century Park East",
  "cpe-south": "2170 Century Park East",
};

type OnboardingStep = "identity" | "otp" | "done";

function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {}
}

function getHostnameBuilding(): { slug: string; displayName: string } | null {
  if (typeof window === "undefined") return null;
  const token = extractNumericHostToken(window.location.hostname);
  if (!token) return null;
  const record = resolveBuildingFromHostname(window.location.hostname);
  if (!record) return null;
  return {
    slug: record.slug,
    displayName: BUILDING_NAMES[record.slug] || record.displayName || record.token,
  };
}

/** Paths that can render without completing resident onboarding (handoffs, receipts, legal). */
function isExemptFromSetup(path: string): boolean {
  if (path.startsWith("/welcome")) return true;
  if (path.startsWith("/orders/")) return true;
  if (path.startsWith("/receipt/")) return true;
  if (path === "/terms" || path === "/privacy") return true;
  return false;
}

interface OnboardingFlowProps {
  children: React.ReactNode;
}

export default function OnboardingFlow({ children }: OnboardingFlowProps) {
  const [location, setLocation] = useLocation();
  const [checkingSession, setCheckingSession] = useState(true);
  const [step, setStep] = useState<OnboardingStep>(
    isOnboardingComplete() ? "done" : "identity"
  );

  // Identity state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identityError, setIdentityError] = useState("");

  // OTP state
  const [maskedPhone, setMaskedPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [buildingSlug, setBuildingSlug] = useState("");
  const [unit, setUnit] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  const hostnameBuilding = getHostnameBuilding();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/session`, {
          credentials: "include",
        });
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
          if (json?.authenticated) {
            markOnboardingComplete();
            setStep("done");
          }
        }
      } catch {
        // No-op: fall back to normal onboarding when session check fails.
      } finally {
        if (active) setCheckingSession(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleIdentitySubmit = useCallback(
    async (data: { phone: string; unit: string; buildingSlug: string }) => {
      setIsSubmitting(true);
      setIdentityError("");
      try {
        const res = await fetch(`${API_BASE}/api/otp/send`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: data.phone,
            buildingSlug: data.buildingSlug,
            unit: data.unit,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setIdentityError(json.error || "Failed to send code.");
          return;
        }
        setMaskedPhone(json.maskedPhone);
        setPhone(data.phone);
        setBuildingSlug(data.buildingSlug);
        setUnit(data.unit);
        setStep("otp");
      } catch {
        setIdentityError("Network error. Try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const handleVerify = useCallback(
    async (code: string) => {
      setIsVerifying(true);
      setOtpError("");
      try {
        const res = await fetch(`${API_BASE}/api/otp/verify`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setOtpError(json.error || "Verification failed.");
          return;
        }
        markOnboardingComplete();
        setStep("done");
        setLocation("/");
      } catch {
        setOtpError("Network error. Try again.");
      } finally {
        setIsVerifying(false);
      }
    },
    [phone, setLocation]
  );

  const handleResend = useCallback(async () => {
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE}/api/otp/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, buildingSlug, unit }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setOtpError(json.error || "Failed to resend.");
      }
    } catch {
      setOtpError("Network error.");
    }
  }, [phone, buildingSlug, unit]);

  if (checkingSession) {
    return null;
  }

  if (step === "done") {
    if (location === SETUP_PATH) {
      return <Redirect to="/" />;
    }
    return <>{children}</>;
  }

  if (isExemptFromSetup(location)) {
    return <>{children}</>;
  }

  if (location !== SETUP_PATH) {
    return <Redirect to={SETUP_PATH} />;
  }

  if (step === "otp") {
    return (
      <OTPScreen
        maskedPhone={maskedPhone}
        onVerify={handleVerify}
        onResend={handleResend}
        isVerifying={isVerifying}
        error={otpError}
      />
    );
  }

  return (
    <IdentityScreen
      onSubmit={handleIdentitySubmit}
      preselectedBuilding={hostnameBuilding ?? undefined}
      isSubmitting={isSubmitting}
      error={identityError}
    />
  );
}
