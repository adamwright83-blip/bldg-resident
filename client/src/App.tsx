/**
 * BLDG.chat App — Root component
 * Home = marketplace/services hub (/). Concierge chat lives at /chat.
 * Routes: /welcome (handoff), /orders/:orderId, /receipt/:token, /setup (onboarding), /tour, etc.
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import NeutralBuildingFallback from "./components/NeutralBuildingFallback";
import Welcome from "./pages/Welcome";
import OrderReceipt from "./pages/OrderReceipt";
import Receipt from "./pages/Receipt";
import ManusLanding from "./pages/ManusLanding";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import PenPullPrototype from "./components/held/PenPullPrototype";
import {
  extractNumericHostToken,
  resolveBuildingFromHostname,
} from "@shared/buildingHostMap";

function PageSwitch() {
  const [location] = useLocation();

  // Render exactly one page component. This avoids any ambiguity in route
  // matching that could leave multiple Home instances mounted at once.
  if (location.startsWith("/welcome")) {
    return <Welcome />;
  }

  if (location === "/terms") {
    return <Terms />;
  }

  if (location === "/privacy") {
    return <Privacy />;
  }

  if (
    location === "/" ||
    location === "/chat" ||
    location.startsWith("/chat/") ||
    location === "/held-pen-prototype" ||
    location === "/marketplace" ||
    location.startsWith("/marketplace/") ||
    location.startsWith("/pulse")
  ) {
    return <PenPullPrototype />;
  }

  if (/^\/orders\/[^/]+/.test(location)) {
    return <OrderReceipt />;
  }

  if (/^\/receipt\/[^/]+/.test(location)) {
    return <Receipt />;
  }

  if (location.startsWith("/tour")) {
    return <ManusLanding />;
  }

  return <Redirect to="/" />;
}

function App() {
  const [location] = useLocation();

  /** Public product tour — sales/demo; no session or OTP required */
  const isPublicTour =
    location === "/tour" || location.startsWith("/tour/");
  const isHeldExperience =
    location === "/" ||
    location === "/chat" ||
    location.startsWith("/chat/") ||
    location === "/held-pen-prototype" ||
    location === "/marketplace" ||
    location.startsWith("/marketplace/") ||
    location.startsWith("/pulse");

  const shouldShowNeutralFallback =
    !isPublicTour &&
    !isHeldExperience &&
    typeof window !== "undefined" &&
    Boolean(extractNumericHostToken(window.location.hostname)) &&
    !resolveBuildingFromHostname(window.location.hostname);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#FFFFFF",
                color: "#1A1A1A",
                border: "1px solid #E5E5E5",
                fontSize: 13,
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
              },
            }}
          />
          {shouldShowNeutralFallback ? (
            <NeutralBuildingFallback />
          ) : isPublicTour || isHeldExperience ? (
            <PageSwitch />
          ) : (
            <OnboardingFlow>
              <PageSwitch />
            </OnboardingFlow>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
