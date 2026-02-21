/**
 * SplashScreen — First onboarding screen.
 * Champagne gold background, BLDG.chat wordmark, 1.5s auto-advance.
 * "Like the lights coming up in a theater."
 */
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 1200);
    const timer2 = setTimeout(() => onComplete(), 1600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div
      className={`splash-screen ${fadeOut ? "splash-fade-out" : "splash-fade-in"}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #D4B87A 0%, #C9A96E 40%, #B8944F 100%)",
        transition: "opacity 400ms ease-out",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Logo wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 0,
          animation: "splash-logo-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
          }}
        >
          BLDG
        </span>
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#FFFFFF",
            marginLeft: -2,
            marginRight: -2,
          }}
        >
          .
        </span>
        <span
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "-0.01em",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
          }}
        >
          chat
        </span>
      </div>

      {/* Tagline */}
      <p
        style={{
          marginTop: 12,
          fontSize: 14,
          fontWeight: 400,
          letterSpacing: "0.06em",
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          animation: "splash-tagline-in 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms both",
        }}
      >
        Your building concierge
      </p>
    </div>
  );
}
