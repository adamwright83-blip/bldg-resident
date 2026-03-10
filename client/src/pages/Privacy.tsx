// Placeholder for Privacy Policy
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const [, setLocation] = useLocation();
  return (
    <div className="settings-container">
      <div className="settings-header">
        <button type="button" className="settings-back" onClick={() => setLocation("/")}>
          <ArrowLeft size={20} />
        </button>
        <span className="settings-title">Privacy Policy</span>
        <div style={{ width: 36 }} />
      </div>
      <div className="settings-content" style={{ paddingTop: 24 }}>
        <p style={{ fontSize: 15, color: "rgba(245, 240, 232, 0.7)", lineHeight: 1.6 }}>
          Privacy Policy will be available here.
        </p>
      </div>
    </div>
  );
}
