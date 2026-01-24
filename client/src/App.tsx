import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AnalysisPage from "@/pages/analysis";
import MarketScan from "@/pages/scan";
import ChatPage from "@/pages/chat";
import PortfolioPage from "@/pages/portfolio";
import TradingPage from "@/pages/trading";
import PricingPage from "@/pages/pricing";
import SubscriptionPage from "@/pages/subscription";
import UserManualPage from "@/pages/user-manual";
import FeedbackPage from "@/pages/feedback";
import CheckoutSuccessPage from "@/pages/checkout-success";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import RefundPolicy from "@/pages/refund-policy";
import AuthPage from "@/pages/auth";
import ProfileSetup from "@/pages/profile-setup";
import InvestorWatchlist from "@/pages/investor-watchlist";
import Premarket from "@/pages/premarket";
import LayoutShell from "@/components/layout-shell";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <LayoutShell>
      <Component {...rest} />
    </LayoutShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/api/login" component={() => {
        window.location.href = "/api/login";
        return null;
      }} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/analysis">
        <ProtectedRoute component={AnalysisPage} />
      </Route>
      
      <Route path="/scan">
        <ProtectedRoute component={MarketScan} />
      </Route>
      
      <Route path="/chat">
        <ProtectedRoute component={ChatPage} />
      </Route>
      
      <Route path="/portfolio">
        <ProtectedRoute component={PortfolioPage} />
      </Route>
      
      <Route path="/trading">
        <ProtectedRoute component={TradingPage} />
      </Route>
      
      <Route path="/pricing" component={PricingPage} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/refund-policy" component={RefundPolicy} />
      
      <Route path="/subscription">
        <ProtectedRoute component={SubscriptionPage} />
      </Route>
      
      <Route path="/user-manual">
        <ProtectedRoute component={UserManualPage} />
      </Route>
      
      <Route path="/feedback">
        <ProtectedRoute component={FeedbackPage} />
      </Route>
      
      <Route path="/profile-setup">
        <ProtectedRoute component={ProfileSetup} />
      </Route>
      
      <Route path="/investor-watchlist">
        <ProtectedRoute component={InvestorWatchlist} />
      </Route>
      
      <Route path="/premarket">
        <ProtectedRoute component={Premarket} />
      </Route>
      
      <Route path="/checkout/success">
        <ProtectedRoute component={CheckoutSuccessPage} />
      </Route>
      
      <Route path="/checkout/cancel">
        <ProtectedRoute component={() => (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <h1 className="text-2xl font-bold">Payment Cancelled</h1>
            <p className="text-muted-foreground">Your payment was cancelled. No charges were made.</p>
            <a href="/pricing" className="text-primary hover:underline">Back to Pricing</a>
          </div>
        )} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
