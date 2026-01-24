import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('transaction_id');

    if (transactionId) {
      // Verify the transaction with backend
      apiRequest('POST', '/api/paddle/verify-transaction', { transactionId })
        .then(() => {
          setVerified(true);
          // Invalidate user queries to refresh subscription status
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/usage'] });
        })
        .catch((error) => {
          console.error('Transaction verification failed:', error);
          setVerified(true); // Still show success - webhook will handle it
        })
        .finally(() => {
          setVerifying(false);
        });
    } else {
      setVerifying(false);
      setVerified(true);
    }
  }, []);

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Verifying Payment...</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your subscription.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-green-500">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for subscribing to stockwhisperer.AI.
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
