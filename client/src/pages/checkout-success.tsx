import { useEffect, useState } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function CheckoutSuccess() {
  const [syncing, setSyncing] = useState(true);
  const [syncResult, setSyncResult] = useState<{ planTier?: string } | null>(null);
  const [error, setError] = useState(false);

  const syncSubscription = async () => {
    setSyncing(true);
    setError(false);
    try {
      const response = await apiRequest('POST', '/api/stripe/sync');
      const result = await response.json();
      setSyncResult(result);
    } catch (err) {
      console.error('Failed to sync subscription:', err);
      setError(true);
    } finally {
      setSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/usage'] });
    }
  };

  useEffect(() => {
    syncSubscription();
  }, []);

  if (syncing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Processing Payment...</h1>
            <p className="text-muted-foreground">
              Please wait while we activate your subscription.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="w-16 h-16 text-yellow-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Payment Received</h1>
            <p className="text-muted-foreground">
              Your payment was successful, but we couldn't sync your subscription status immediately.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your subscription should be active within a few moments. If it's not showing, try refreshing or contact support.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => syncSubscription()} className="w-full" data-testid="button-retry-sync">
                Try Again
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full" data-testid="button-go-dashboard-error">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const tierName = syncResult?.planTier === 'pro' 
    ? 'stockwhisperer Pro' 
    : syncResult?.planTier === 'basic' 
      ? 'stockwhisperer Basic' 
      : 'stockwhisperer';

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-green-500">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for subscribing to {tierName}.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your subscription is now active. Enjoy access to all AI-powered features!
          </p>
          
          <div className="flex flex-col gap-2">
            <Link href="/">
              <Button className="w-full" data-testid="button-go-dashboard">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="outline" className="w-full" data-testid="button-view-subscription">
                View Subscription Details
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
