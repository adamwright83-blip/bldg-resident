import { useState } from "react";
import "./identity-screen.css";

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
  mode?: "identity" | "consent";
  onConsent?: () => Promise<void>;
  onDecline?: () => void;
}

export default function IdentityScreen({ onSubmit, preselectedBuilding, isSubmitting, error, mode = "identity", onConsent, onDecline }: IdentityScreenProps) {
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
    <main className={`identity-screen${mode === "consent" ? " identity-screen--consent" : ""}`}>
      <div className="identity-orbit identity-orbit-left" aria-hidden="true" />
      <div className="identity-orbit identity-orbit-right" aria-hidden="true" />

      <section className="identity-content">
        <img className="identity-logo" src="/held/held-logo-mark.png" alt="HELD" />
        {preselectedBuilding && <p className="identity-building-name">{preselectedBuilding.displayName}</p>}
        <h1>{mode === "consent" ? <>Before we text you.</> : <>Your concierge<br />is ready.</>}</h1>
        <p className="identity-intro">{mode === "consent" ? "Review the full disclosure before choosing whether HELD may text you." : <>Tell us where you live and we’ll<br />connect you to your building.</>}</p>

        {mode === "consent" ? <div className="identity-form consent-card" data-testid="sms-consent-card">
          <p className="consent-disclosure">By selecting ‘Agree &amp; send code,’ you agree to receive transactional text messages from HELD by BLDG.chat at the number provided. Messages may include verification codes, account and security notices, service confirmations, appointment reminders, provider coordination, pickup and delivery updates, payment notices, and customer support. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.</p>
          <p className="consent-links"><a href="https://www.bldg.chat/termsofuse" target="_blank" rel="noreferrer">Terms of Use</a><a href="https://www.bldg.chat/privacypolicy" target="_blank" rel="noreferrer">Privacy Policy</a></p>
          {displayError && <p className="identity-error" role="alert">{displayError}</p>}
          <button data-testid="sms-consent-agree" onClick={onConsent} disabled={isSubmitting}>{isSubmitting ? "Sending code..." : "Agree & send code"}</button>
          <button className="consent-decline" onClick={onDecline} disabled={isSubmitting}>Not now</button>
        </div> : <div className="identity-form">
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
            <span>What mobile number should HELD use for your account and service updates?</span>
            <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setLocalError(""); }} placeholder="(310) 555-0100" autoComplete="tel" onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
          </label>
          {displayError && <p className="identity-error" role="alert">{displayError}</p>}
          <button onClick={handleSubmit} disabled={isSubmitting}>Continue</button>
          <p className="identity-microcopy">No text will be sent until you review and agree.</p>
        </div>}
      </section>

      <footer><span />Powered by BLDG.chat</footer>
    </main>
  );
}
