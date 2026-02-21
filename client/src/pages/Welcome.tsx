/**
 * /welcome page — handles the Laundry Butler handoff redirect.
 *
 * The actual JWT verification, user upsert, and session creation happen
 * server-side at GET /api/welcome?token=JWT. The server then redirects
 * to /orders/:orderId.
 *
 * This frontend page is a fallback in case someone navigates directly
 * to /welcome without a token, or if the server redirect hasn't happened yet.
 * In normal flow, the user never sees this page — the server handles everything.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Welcome() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Check if there's a token in the URL — if so, redirect to the API endpoint
    // which handles JWT verification server-side
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Redirect to the server-side handler
      window.location.href = `/api/welcome?token=${encodeURIComponent(token)}`;
    } else {
      // No token — redirect to home
      navigate("/");
    }
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#FAF8F5" }}
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="font-display"
          style={{
            fontSize: 28,
            color: "#B5A48B",
            letterSpacing: "0.06em",
          }}
        >
          BLDG
        </span>
        <div className="flex items-center gap-2">
          <div
            className="animate-spin rounded-full border-2 border-t-transparent"
            style={{
              width: 20,
              height: 20,
              borderColor: "#B5A48B",
              borderTopColor: "transparent",
            }}
          />
          <span style={{ fontSize: 14, color: "#9B9590" }}>
            Setting up your account...
          </span>
        </div>
      </div>
    </div>
  );
}
