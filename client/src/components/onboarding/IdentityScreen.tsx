import { useState } from "react";
import "./identity-screen.css";

const BUILDINGS = [
  { slug: "opus-south", name: "3545 Wilshire Blvd" },
  { slug: "opus-north", name: "3650 Wilshire Blvd" },
  { slug: "cpe-north", name: "2160 Century Park East" },
  { slug: "cpe-south", name: "2170 Century Park East" },
];

const SERVICES = [
  { label: "Laundry", position: "top-left" },
  { label: "Dry cleaning", position: "mid-left" },
  { label: "Groceries", position: "bottom-left" },
  { label: "Groom my dog", position: "top-right" },
  { label: "Car wash & detail", position: "mid-right" },
  { label: "Errands", position: "bottom-right" },
];

interface IdentityScreenProps {
  onSubmit: (data: { phone: string; unit: string; buildingSlug: string }) => Promise<void>;
  preselectedBuilding?: { slug: string; displayName: string };
  isSubmitting: boolean;
  error: string;
}

export default function IdentityScreen({ onSubmit, preselectedBuilding, isSubmitting, error }: IdentityScreenProps) {
  const [building, setBuilding] = useState(preselectedBuilding?.slug ?? "");
  const [unit, setUnit] = useState("");
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async () => {
    const slug = preselectedBuilding?.slug || building;
    if (!slug) return setLocalError("Select your building");
    if (!unit.trim()) return setLocalError("Enter your unit number");
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return setLocalError("Enter a valid mobile number");
    setLocalError("");
    await onSubmit({ phone: phone.trim(), unit: unit.trim(), buildingSlug: slug });
  };

  const displayError = error || localError;

  return (
    <main className="identity-screen">
      <div className="identity-orbit identity-orbit-left" aria-hidden="true" />
      <div className="identity-orbit identity-orbit-right" aria-hidden="true" />
      <div className="identity-services" aria-hidden="true">
        {SERVICES.map(({ label, position }) => <span key={label} className={`identity-service ${position}`}><i />{label}</span>)}
      </div>

      <section className="identity-content">
        <img className="identity-logo" src="/held/held-logo-mark.png" alt="HELD" />
        {preselectedBuilding && <p className="identity-building-name">{preselectedBuilding.displayName}</p>}
        <h1>Your concierge<br />is ready.</h1>
        <p className="identity-intro">Tell us where you live and we’ll<br />connect you to your building.</p>

        <div className="identity-mobile-services" aria-hidden="true">
          <span><i />Laundry</span>
          <span><i />Groom my dog</span>
        </div>

        <div className="identity-form">
          {!preselectedBuilding && (
            <label className="identity-field">
              <span>Building</span>
              <select value={building} onChange={(e) => { setBuilding(e.target.value); setLocalError(""); }} className={!building ? "placeholder" : ""}>
                <option value="" disabled>Select your building</option>
                {BUILDINGS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </label>
          )}
          <label className="identity-field">
            <span>Unit</span>
            <input value={unit} onChange={(e) => { setUnit(e.target.value); setLocalError(""); }} placeholder="e.g. 1204" />
          </label>
          <label className="identity-field">
            <span>Mobile</span>
            <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setLocalError(""); }} placeholder="(310) 555-0100" autoComplete="tel" onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
          </label>
          {displayError && <p className="identity-error" role="alert">{displayError}</p>}
          <button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Sending code..." : "Enter"}</button>
          <p className="identity-microcopy">One-time code sent to your phone.</p>
        </div>
      </section>

      <footer><span />Powered by BLDG.chat</footer>
    </main>
  );
}
