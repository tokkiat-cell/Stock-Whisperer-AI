import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RefundPolicy() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/pricing">
          <Button variant="ghost" size="sm" data-testid="button-back-pricing">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pricing
          </Button>
        </Link>
      </div>

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: January 2026</p>
        
        <Separator className="my-6" />

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Subscription Refund Policy</h2>
            <p className="text-muted-foreground">
              We want you to be satisfied with your subscription to stockwhisperer.AI. Our refund policy is designed to be fair while protecting against abuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Free Trial Period</h2>
            <p className="text-muted-foreground">
              All users start with a Free tier that includes limited monthly usage. We encourage you to fully evaluate the Service during this period before subscribing to a paid plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Monthly Subscriptions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>First 7 Days:</strong> If you are not satisfied with your subscription within the first 7 days of your initial purchase, you may request a full refund.</li>
              <li><strong>After 7 Days:</strong> Refunds are generally not provided after the first 7 days. However, we may consider refund requests on a case-by-case basis for exceptional circumstances.</li>
              <li><strong>Renewal Payments:</strong> Renewal charges are non-refundable. Please cancel your subscription before the renewal date if you do not wish to continue.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Annual Subscriptions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>First 14 Days:</strong> You may request a full refund within 14 days of your initial annual purchase.</li>
              <li><strong>After 14 Days:</strong> No refunds will be provided for annual subscriptions after the 14-day period.</li>
              <li><strong>Pro-rata Refunds:</strong> We do not offer pro-rata refunds for partial usage periods.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How to Request a Refund</h2>
            <p className="text-muted-foreground mb-3">To request a refund:</p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>Contact us through the Q&A / Feedback section of the application.</li>
              <li>Provide your account email and reason for the refund request.</li>
              <li>Include the date of purchase and subscription type.</li>
              <li>We will review your request and respond within 3-5 business days.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Refund Processing</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Approved refunds will be processed to your original payment method.</li>
              <li>Refunds may take 5-10 business days to appear on your statement.</li>
              <li>Upon refund, your subscription will be cancelled and you will lose access to paid features immediately.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Non-Refundable Situations</h2>
            <p className="text-muted-foreground mb-3">Refunds will not be provided in the following situations:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violation of our Terms of Service</li>
              <li>Account suspension or termination due to abuse</li>
              <li>Failure to cancel before automatic renewal</li>
              <li>Dissatisfaction with AI-generated trading recommendations or market outcomes</li>
              <li>Financial losses from investment decisions</li>
              <li>Service interruptions due to factors beyond our control</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cancellation</h2>
            <p className="text-muted-foreground">
              You may cancel your subscription at any time. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>You will retain access to paid features until the end of your current billing period.</li>
              <li>Your account will revert to the Free tier after the billing period ends.</li>
              <li>Your data (portfolio, watchlist, etc.) will be retained unless you request deletion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Investment Disclaimer</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Important:</strong> Refunds are not provided based on investment performance or trading losses. stockwhisperer.AI provides AI-powered analysis for informational purposes only and does not guarantee any investment returns. All trading decisions are made at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting. Continued use of the Service after changes constitutes acceptance of the modified policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Information</h2>
            <p className="text-muted-foreground">
              For refund requests or questions about this policy, please contact us through the Q&A / Feedback section of the application.
            </p>
          </section>
        </div>

        <Separator className="my-6" />

        <div className="flex gap-4 text-sm">
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </div>
      </Card>
    </div>
  );
}
