import { extractNumericHostToken } from "@shared/buildingHostMap";

export default function NeutralBuildingFallback() {
  const token =
    typeof window !== "undefined"
      ? extractNumericHostToken(window.location.hostname)
      : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 28,
            fontWeight: 700,
            color: "#2C2824",
            letterSpacing: "-0.02em",
          }}
        >
          BLDG.chat
        </h1>
        <p style={{ margin: "0 0 8px", fontSize: 16, color: "#4A4540" }}>
          This resident portal is being prepared.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#8A7D6B" }}>
          {token
            ? `Building code ${token} is not active yet.`
            : "This address is not active yet."}
        </p>
      </div>
    </div>
  );
}
