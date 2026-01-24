import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-6">Last updated: January 2026</p>
        
        <Separator className="my-6" />

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using stockwhisperer.AI ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              stockwhisperer.AI provides AI-powered stock analysis, trading insights, and portfolio management tools. The Service includes real-time stock quotes, AI-generated trade recommendations, market scanning, and trading integration features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Investment Disclaimer</h2>
            <p className="text-muted-foreground mb-3">
              <strong className="text-foreground">IMPORTANT:</strong> The information provided by stockwhisperer.AI is for informational and educational purposes only. It does not constitute financial advice, investment advice, trading advice, or any other advice.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All AI-generated recommendations are algorithmic suggestions and should not be considered personalized investment advice.</li>
              <li>Past performance does not guarantee future results. All investments involve risk, including potential loss of principal.</li>
              <li>You should consult with a qualified financial advisor before making any investment decisions.</li>
              <li>We are not a registered investment advisor, broker-dealer, or financial planner.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Subscription and Billing</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscription fees are billed in advance on a monthly or annual basis.</li>
              <li>Your subscription will automatically renew unless cancelled before the renewal date.</li>
              <li>We reserve the right to change subscription prices with 30 days notice.</li>
              <li>Usage limits apply based on your subscription tier.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose.</li>
              <li>Attempt to reverse engineer, decompile, or hack the Service.</li>
              <li>Use automated systems or bots to access the Service beyond normal usage.</li>
              <li>Share your account credentials with others.</li>
              <li>Resell or redistribute the Service without authorization.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data and Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. By using the Service, you consent to the collection and use of your information as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of the Service, including but not limited to AI models, algorithms, software, text, graphics, and logos, are owned by stockwhisperer.AI and are protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, stockwhisperer.AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses, resulting from your use of the Service or any investment decisions made based on information provided by the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may modify, suspend, or discontinue any part of the Service at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us through the Q&A / Feedback section of the application.
            </p>
          </section>
        </div>

        <Separator className="my-6" />

        <div className="flex gap-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link href="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
        </div>
      </Card>
    </div>
  );
}
