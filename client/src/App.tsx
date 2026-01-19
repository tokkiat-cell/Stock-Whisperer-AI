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
import TradeHistory from "@/pages/history";
import MarketScan from "@/pages/scan";
import ChatPage from "@/pages/chat";
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
      
      <Route path="/history">
        <ProtectedRoute component={TradeHistory} />
      </Route>
      
      <Route path="/scan">
        <ProtectedRoute component={MarketScan} />
      </Route>
      
      <Route path="/chat">
        <ProtectedRoute component={ChatPage} />
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
