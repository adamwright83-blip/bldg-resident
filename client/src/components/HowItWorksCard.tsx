/**
 * HowItWorksCard — Post-payment "How laundry pickup works" card.
 *
 * Renders two inline SVG illustrations with step descriptions,
 * styled in the BLDG dark glass design system.
 */

interface HowItWorksCardProps {
  isNew?: boolean;
}

function HandoffIllustration() {
  return (
    <svg viewBox="0 0 200 120" width="200" height="120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Handing garment bag to driver">
      {/* Person (left) */}
      <circle cx="55" cy="30" r="8" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="55" y1="38" x2="55" y2="65" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="55" y1="65" x2="45" y2="85" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="55" y1="65" x2="65" y2="85" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      {/* Arm reaching out with bag */}
      <line x1="55" y1="48" x2="80" y2="42" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      {/* Garment bag */}
      <rect x="78" y="28" width="14" height="30" rx="3" stroke="rgba(201,169,110,0.7)" strokeWidth="1.2" />
      <line x1="85" y1="28" x2="85" y2="24" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
      <circle cx="85" cy="23" r="2" stroke="rgba(201,169,110,0.5)" strokeWidth="0.8" />
      {/* Driver (right) */}
      <circle cx="130" cy="30" r="8" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="130" y1="38" x2="130" y2="65" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="130" y1="65" x2="120" y2="85" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="130" y1="65" x2="140" y2="85" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      {/* Arm reaching for bag */}
      <line x1="130" y1="48" x2="105" y2="42" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      {/* Door frame */}
      <rect x="155" y="10" width="30" height="80" rx="2" stroke="rgba(201,169,110,0.25)" strokeWidth="0.8" />
      <circle cx="160" cy="50" r="1.5" fill="rgba(201,169,110,0.3)" />
      {/* Ground line */}
      <line x1="20" y1="90" x2="190" y2="90" stroke="rgba(201,169,110,0.15)" strokeWidth="0.6" />
    </svg>
  );
}

function DoorPickupIllustration() {
  return (
    <svg viewBox="0 0 200 120" width="200" height="120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Driver picking up bag from outside door">
      {/* Door */}
      <rect x="30" y="10" width="45" height="80" rx="2" stroke="rgba(201,169,110,0.4)" strokeWidth="1.2" />
      <circle cx="67" cy="50" r="2" fill="rgba(201,169,110,0.35)" />
      {/* Garment bag hanging on door handle */}
      <rect x="70" y="38" width="14" height="30" rx="3" stroke="rgba(201,169,110,0.7)" strokeWidth="1.2" />
      <line x1="77" y1="38" x2="77" y2="34" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
      <path d="M73 34 Q77 30 81 34" stroke="rgba(201,169,110,0.5)" strokeWidth="0.8" fill="none" />
      {/* Driver approaching (right side) */}
      <circle cx="140" cy="30" r="8" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="140" y1="38" x2="140" y2="65" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="140" y1="65" x2="130" y2="85" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      <line x1="140" y1="65" x2="150" y2="85" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      {/* Arm reaching toward bag */}
      <line x1="140" y1="48" x2="110" y2="44" stroke="rgba(201,169,110,0.6)" strokeWidth="1.2" />
      {/* Arrow indicating motion */}
      <path d="M120 44 L110 44 M113 41 L110 44 L113 47" stroke="rgba(201,169,110,0.35)" strokeWidth="0.8" strokeLinecap="round" />
      {/* Ground line */}
      <line x1="20" y1="90" x2="190" y2="90" stroke="rgba(201,169,110,0.15)" strokeWidth="0.6" />
    </svg>
  );
}

export default function HowItWorksCard({ isNew = false }: HowItWorksCardProps) {
  const animClass = isNew ? "lc-card-enter" : "";
  return (
    <div className={`hiw-card ${animClass}`}>
      <div className="hiw-header">How laundry pickup works:</div>

      <div className="hiw-step">
        <div className="hiw-illustration">
          <HandoffIllustration />
        </div>
        <div className="hiw-step-text">
          <span className="hiw-step-num">1.</span> Hand your bag directly to the driver or leave it outside your door before the pickup window.
        </div>
      </div>

      <div className="hiw-step">
        <div className="hiw-illustration">
          <DoorPickupIllustration />
        </div>
        <div className="hiw-step-text">
          <span className="hiw-step-num">2.</span> We'll text you 10 min before arrival. You don't need to be home.
        </div>
      </div>

      <div className="hiw-footer">
        That's it. We'll return your laundry within 24 hours.
      </div>
    </div>
  );
}
