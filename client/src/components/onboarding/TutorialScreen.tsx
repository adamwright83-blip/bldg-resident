/**
 * TutorialScreen — Third onboarding screen.
 * Cream background, white cards with Lloyd's voice explaining the app.
 * Shows a mockup of the Laundry button with an arrow pointing DOWN at it.
 * Chat bubbles unfold slowly — just faster than reading speed.
 *
 * Tiles are VISUAL ONLY (non-clickable). The "Got it" button dismisses
 * the tutorial, and the user taps Laundry on the real home screen.
 */
import { useState, useEffect } from "react";

interface TutorialScreenProps {
  buildingName: string;
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    text: "I handle everything in your building. Laundry, dry cleaning, car wash, grooming, cleaning. One tap and it\u2019s done.",
    delay: 600,
  },
  {
    text: "No menus. No forms. No waiting. You tell me what you need. I book it instantly.",
    delay: 4200,
  },
  {
    text: "Register on the next screen — then type 'laundry' to see what happens.",
    delay: 8000,
    highlight: true,
  },
];

export default function TutorialScreen({ buildingName, onComplete }: TutorialScreenProps) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [showMockup, setShowMockup] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    TUTORIAL_STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => setVisibleSteps(i + 1), step.delay));
    });
    // Show the mockup tiles + arrow 1s after the last bubble appears
    timers.push(setTimeout(() => setShowMockup(true), 9200));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9997,
        display: "flex",
        flexDirection: "column",
        background: "#FAF7F2",
        animation: "onboard-fade-in 400ms ease-out both",
        overflow: "hidden",
      }}
    >
      {/* Header area */}
      <div style={{ padding: "60px 24px 0", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 0,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#2C2824" }}>BLDG</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#C9A96E", marginLeft: -1, marginRight: -1 }}>.</span>
          <span style={{ fontSize: 15, fontWeight: 400, color: "#8A7D6B" }}>chat</span>
        </div>
        <p style={{ fontSize: 13, color: "#B0A89C", margin: 0, letterSpacing: "0.03em" }}>
          {buildingName || "Your building concierge"}
        </p>
      </div>

      {/* Chat-style tutorial bubbles */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "32px 24px 16px",
          maxWidth: 400,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {TUTORIAL_STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              opacity: visibleSteps > i ? 1 : 0,
              transform: visibleSteps > i ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms ease, transform 600ms ease",
            }}
          >
            {/* Mini BLDG avatar */}
            {i === 0 && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "#2C2824",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#F5F0E8",
                  }}
                />
              </div>
            )}
            {i !== 0 && <div style={{ width: 28, flexShrink: 0 }} />}

            {/* Bubble */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8E3DC",
                borderRadius: i === 0 ? "16px 16px 16px 4px" : "16px",
                padding: "12px 16px",
                fontSize: 15,
                lineHeight: 1.5,
                color: "#2C2824",
                maxWidth: "85%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {step.text}
            </div>
          </div>
        ))}
      </div>

      {/* Visual-only mockup tiles with arrow pointing DOWN above Laundry */}
      <div
        style={{
          padding: "0 24px 24px",
          maxWidth: 400,
          width: "100%",
          margin: "0 auto",
          opacity: showMockup ? 1 : 0,
          transform: showMockup ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 500ms ease, transform 500ms ease",
        }}
      >
        {/* Mockup tiles — VISUAL ONLY, not clickable */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            position: "relative",
            pointerEvents: "none", // Entire grid is non-interactive
          }}
        >
          {/* Arrow pointing DOWN — positioned above the Laundry tile */}
          <div
            style={{
              position: "absolute",
              top: -28,
              left: 0,
              width: "calc(25% - 6px)",
              display: "flex",
              justifyContent: "center",
              animation: showMockup ? "arrow-bounce 1.2s ease-in-out infinite" : "none",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M19 12l-7 7-7-7" />
            </svg>
          </div>

          {/* Arrow points to Laundry tile — first in the grid */}
          {[
            { label: "Laundry", highlight: true },
            { label: "Car Wash", highlight: false },
            { label: "Grooming", highlight: false },
            { label: "Cleaning", highlight: false },
          ].map((tile) => (
            <div
              key={tile.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "12px 4px",
                borderRadius: 8,
                border: tile.highlight ? "2px solid #C9A96E" : "1px solid #E0D9CE",
                background: tile.highlight ? "#FFF8ED" : "#FFFFFF",
                boxShadow: tile.highlight ? "0 0 12px rgba(201, 169, 110, 0.2)" : "none",
                minHeight: 44,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, color: tile.highlight ? "#8A7030" : "#8A7D6B" }}>
                {tile.label}
              </span>
            </div>
          ))}
        </div>

        {/* "Got it" button — the ONLY clickable element */}
        <button
          onClick={onComplete}
          style={{
            display: "block",
            width: "100%",
            marginTop: 16,
            padding: "12px 0",
            borderRadius: 10,
            border: "none",
            background: "#2C2824",
            color: "#F5F0E8",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Got it — let's go
        </button>
      </div>
    </div>
  );
}
