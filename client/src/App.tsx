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
import AuthPage from "@/pages/auth";
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
      
      <Route path="/pricing">
        <ProtectedRoute component={PricingPage} />
      </Route>
      
      <Route path="/checkout/success">
        <ProtectedRoute component={() => (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <h1 className="text-2xl font-bold text-green-500">Payment Successful!</h1>
            <p className="text-muted-foreground">Thank you for subscribing to TradeMind.</p>
            <a href="/" className="text-primary hover:underline">Go to Dashboard</a>
          </div>
        )} />
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
