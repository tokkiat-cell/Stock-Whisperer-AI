import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export default function CheckoutSuccess() {
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
      </Card>
    </div>
  );
}
