/**
 * OnboardingFlow — Orchestrates the 3-screen onboarding sequence.
 * splash → building selector → tutorial → done (reveals chat)
 *
 * Persists completion in localStorage so returning users skip it.
 * Also saves building + unit to the guest session via API.
 *
 * BUG FIX: Children (chat) are NOT rendered until onboarding is "done".
 * This prevents the flash of the home screen between screens.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import SplashScreen from "./SplashScreen";
import BuildingSelector from "./BuildingSelector";
import TutorialScreen from "./TutorialScreen";

const ONBOARDING_KEY = "bldg_onboarding_complete";
const BUILDING_KEY = "bldg_selected_building";

type OnboardingStep = "splash" | "building" | "tutorial" | "done";

interface OnboardingFlowProps {
  children: React.ReactNode;
}

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
  } catch {
    // localStorage unavailable — proceed anyway
  }
}

function saveBuildingLocally(building: string, unit: string) {
  try {
    localStorage.setItem(BUILDING_KEY, JSON.stringify({ building, unit }));
  } catch {
    // best effort
  }
}

const BUILDING_NAMES: Record<string, string> = {
  "opus-la": "For Opus LA",
  "century-park-east": "For Century Park East",
};

/**
 * Create guest session early so the cookie exists before /api/set-building.
 * Without this, the building selector's POST fails with 401 because
 * ensureSession() in Home.tsx only runs after onboarding completes.
 */
async function ensureGuestSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/guest-session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    console.log("[OnboardingSession]", data.alreadyExists ? "Existing session" : "Created guest session", data.userId);
    return true;
  } catch (err) {
    console.error("[OnboardingSession] Failed:", err);
    return false;
  }
}

export default function OnboardingFlow({ children }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>(
    isOnboardingComplete() ? "done" : "splash"
  );
  const [buildingName, setBuildingName] = useState("");
  const sessionCreated = useRef(false);

  // Create guest session as soon as onboarding starts (before building step)
  useEffect(() => {
    if (step !== "done" && !sessionCreated.current) {
      sessionCreated.current = true;
      ensureGuestSession();
    }
  }, [step]);

  const handleSplashComplete = useCallback(() => {
    setStep("building");
  }, []);

  const handleBuildingComplete = useCallback(
    async (building: string, unit: string) => {
      saveBuildingLocally(building, unit);
      setBuildingName(BUILDING_NAMES[building] || building);

      // Ensure guest session exists before saving building (belt + suspenders)
      if (!sessionCreated.current) {
        await ensureGuestSession();
        sessionCreated.current = true;
      }

      // Send building + unit to backend — cookie now exists
      try {
        const res = await fetch("/api/set-building", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ building, unit }),
        });
        if (!res.ok) {
          console.error("[SetBuilding] Failed:", res.status);
        }
      } catch (err) {
        console.error("[SetBuilding] Error:", err);
      }

      setStep("tutorial");
    },
    []
  );

  const handleTutorialComplete = useCallback(() => {
    markOnboardingComplete();
    setStep("done");
  }, []);

  // If onboarding is done, render children (the app) directly
  if (step === "done") {
    return <>{children}</>;
  }

  // During onboarding, render ONLY the current onboarding screen.
  // Children are NOT mounted — no flash of the home screen.
  return (
    <>
      {step === "splash" && <SplashScreen onComplete={handleSplashComplete} />}
      {step === "building" && <BuildingSelector onComplete={handleBuildingComplete} />}
      {step === "tutorial" && (
        <TutorialScreen buildingName={buildingName} onComplete={handleTutorialComplete} />
      )}
    </>
  );
}
