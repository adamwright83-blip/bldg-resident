/**
 * BLDG.chat App — Root component
 * Chat-first concierge. No AppShell, no bottom nav.
 * Routes: / (chat), /welcome (handoff), /orders/:orderId (receipt)
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import NeutralBuildingFallback from "./components/NeutralBuildingFallback";
import Home from "./pages/Home";
import Welcome from "./pages/Welcome";
import OrderReceipt from "./pages/OrderReceipt";
import Receipt from "./pages/Receipt";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import {
  extractNumericHostToken,
  resolveBuildingFromHostname,
} from "@shared/buildingHostMap";

function Router() {
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

  if (/^\/orders\/[^/]+/.test(location)) {
    return <OrderReceipt />;
  }

  if (/^\/receipt\/[^/]+/.test(location)) {
    return <Receipt />;
  }

  return <Home />;
}

function App() {
  const shouldShowNeutralFallback =
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
          ) : (
            <OnboardingFlow>
              <Router />
            </OnboardingFlow>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
