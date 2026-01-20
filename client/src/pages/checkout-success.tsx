import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function CheckoutSuccess() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const applyAutoRenewSetting = async () => {
      try {
        // Get session_id from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        await apiRequest('POST', '/api/stripe/apply-auto-renew', { sessionId });
        setProcessed(true);
      } catch (error) {
        console.error("Failed to apply auto-renew setting:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    applyAutoRenewSetting();
  }, []);

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

        {isProcessing ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Setting up your subscription...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your subscription is now active. Enjoy unlimited access to all AI-powered features!
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
        )}
      </Card>
    </div>
  );
}
