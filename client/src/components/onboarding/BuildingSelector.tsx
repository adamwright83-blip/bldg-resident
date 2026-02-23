/**
 * BuildingSelector — Second onboarding screen.
 * Cream background, building dropdown, unit number input.
 * Saves building + unit to session, then advances.
 */
import { useState } from "react";

const BUILDINGS = [
  { slug: "opus-south", name: "3545 Wilshire Blvd (Opus South)" },
  { slug: "opus-north", name: "3650 Wilshire Blvd (Opus North)" },
  { slug: "cpe-north", name: "2160 Century Park East" },
  { slug: "cpe-south", name: "2170 Century Park East" },
];

interface BuildingSelectorProps {
  onComplete: (building: string, unit: string) => void;
  /** If provided, building was resolved from hostname — skip dropdown */
  preselectedBuilding?: { slug: string; displayName: string };
}

export default function BuildingSelector({ onComplete, preselectedBuilding }: BuildingSelectorProps) {
  const [building, setBuilding] = useState(preselectedBuilding?.slug ?? "");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (!building) {
      setError("Select your building");
      return;
    }
    if (!unit.trim()) {
      setError("Enter your unit number");
      return;
    }
    setError("");
    onComplete(building, unit.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF7F2",
        padding: "0 32px",
        animation: "onboard-fade-in 400ms ease-out both",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 0,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#2C2824",
            }}
          >
            BLDG
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#C9A96E", marginLeft: -1, marginRight: -1 }}>.</span>
          <span style={{ fontSize: 18, fontWeight: 400, color: "#8A7D6B", letterSpacing: "-0.01em" }}>chat</span>
        </div>
        <p style={{ fontSize: 16, color: "#6B6158", fontWeight: 400, margin: 0 }}>
          Which building are you in?
        </p>
      </div>

      {/* Form */}
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Building — locked if resolved from hostname, otherwise dropdown */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#8A7D6B",
              marginBottom: 6,
            }}
          >
            Building
          </label>
          {preselectedBuilding ? (
            <div
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #E0D9CE",
                background: "#F5F0E8",
                fontSize: 16,
                color: "#2C2824",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              {preselectedBuilding.displayName}
            </div>
          ) : (
            <select
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #E0D9CE",
                background: "#FFFFFF",
                fontSize: 16,
                color: building ? "#2C2824" : "#B0A89C",
                fontFamily: "inherit",
                appearance: "none",
                WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238A7D6B' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="" disabled>
                Select your building
              </option>
              {BUILDINGS.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Unit number */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#8A7D6B",
              marginBottom: 6,
            }}
          >
            Unit
          </label>
          <input
            type="text"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              setError("");
            }}
            placeholder="e.g. 1204"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleContinue();
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #E0D9CE",
              background: "#FFFFFF",
              fontSize: 16,
              color: "#2C2824",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: "#C25B4A", margin: 0, textAlign: "center" }}>{error}</p>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 10,
            border: "none",
            background: "#2C2824",
            color: "#F5F0E8",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            marginTop: 8,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Continue
        </button>
      </div>

      {/* Footer */}
      <p
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 11,
          color: "#B0A89C",
          letterSpacing: "0.04em",
        }}
      >
        Powered by BLDG.chat
      </p>
    </div>
  );
}
