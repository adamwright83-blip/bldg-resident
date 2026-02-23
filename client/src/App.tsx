/**
 * BLDG.chat App — Root component
 * Chat-first concierge. No AppShell, no bottom nav.
 * Routes: / (chat), /welcome (handoff), /orders/:orderId (receipt)
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import NeutralBuildingFallback from "./components/NeutralBuildingFallback";
import Home from "./pages/Home";
import Welcome from "./pages/Welcome";
import OrderReceipt from "./pages/OrderReceipt";
import Receipt from "./pages/Receipt";
import {
  extractNumericHostToken,
  resolveBuildingFromHostname,
} from "@shared/buildingHostMap";

function Router() {
  return (
    <Switch>
      {/* Chat home — the primary interface */}
      <Route path="/" component={Home} />

      {/* Laundry Butler handoff — redirects to /api/welcome server-side */}
      <Route path="/welcome" component={Welcome} />

      {/* Order receipt page — standalone for direct links */}
      <Route path="/orders/:orderId" component={OrderReceipt} />

      {/* Receipt page — JWT-authenticated order completion view */}
      <Route path="/receipt/:token" component={Receipt} />

      {/* Fallback — redirect to chat */}
      <Route component={Home} />
    </Switch>
  );
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
