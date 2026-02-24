import { useState } from "react";

const BUILDINGS = [
  { slug: "opus-south", name: "3545 Wilshire Blvd" },
  { slug: "opus-north", name: "3650 Wilshire Blvd" },
  { slug: "cpe-north", name: "2160 Century Park East" },
  { slug: "cpe-south", name: "2170 Century Park East" },
];

interface IdentityScreenProps {
  onSubmit: (data: { phone: string; unit: string; buildingSlug: string }) => Promise<void>;
  preselectedBuilding?: { slug: string; displayName: string };
  isSubmitting: boolean;
  error: string;
}

export default function IdentityScreen({
  onSubmit,
  preselectedBuilding,
  isSubmitting,
  error,
}: IdentityScreenProps) {
  const [building, setBuilding] = useState(preselectedBuilding?.slug ?? "");
  const [unit, setUnit] = useState("");
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async () => {
    const slug = preselectedBuilding?.slug || building;
    if (!slug) {
      setLocalError("Select your building");
      return;
    }
    if (!unit.trim()) {
      setLocalError("Enter your unit number");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setLocalError("Enter a valid mobile number");
      return;
    }
    setLocalError("");
    await onSubmit({ phone: phone.trim(), unit: unit.trim(), buildingSlug: slug });
  };

  const displayError = error || localError;

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
      }}
    >
      {/* Building name (if locked from hostname) */}
      {preselectedBuilding && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#B0A89C",
            marginBottom: 8,
          }}
        >
          {preselectedBuilding.displayName}
        </p>
      )}

      {/* Headline */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#2C2824",
          letterSpacing: "-0.02em",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        Your concierge is ready.
      </h1>

      {/* Form */}
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Building dropdown (only if NOT hostname-locked) */}
        {!preselectedBuilding && (
          <div>
            <label style={labelStyle}>Building</label>
            <select
              value={building}
              onChange={(e) => { setBuilding(e.target.value); setLocalError(""); }}
              style={{
                ...inputStyle,
                color: building ? "#2C2824" : "#B0A89C",
                appearance: "none" as const,
                WebkitAppearance: "none" as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238A7D6B' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                cursor: "pointer",
              }}
            >
              <option value="" disabled>Select your building</option>
              {BUILDINGS.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Unit */}
        <div>
          <label style={labelStyle}>Unit</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => { setUnit(e.target.value); setLocalError(""); }}
            placeholder="e.g. 1204"
            style={inputStyle}
          />
        </div>

        {/* Mobile */}
        <div>
          <label style={labelStyle}>Mobile</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setLocalError(""); }}
            placeholder="(310) 555-0100"
            autoComplete="tel"
            style={inputStyle}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        {/* Error */}
        {displayError && (
          <p style={{ fontSize: 13, color: "#C25B4A", margin: 0, textAlign: "center" }}>{displayError}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
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
            cursor: isSubmitting ? "wait" : "pointer",
            marginTop: 4,
            opacity: isSubmitting ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {isSubmitting ? "Sending code..." : "Enter"}
        </button>

        {/* Microcopy */}
        <p style={{ fontSize: 12, color: "#B0A89C", textAlign: "center", margin: 0 }}>
          One-time code sent to your phone.
        </p>
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#8A7D6B",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
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
};
