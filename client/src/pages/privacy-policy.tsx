import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: January 2026</p>
        
        <Separator className="my-6" />

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              stockwhisperer.AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered trading assistant service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            
            <h3 className="font-medium mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (name, email address) provided through Replit authentication</li>
              <li>Profile preferences and settings</li>
              <li>Subscription and billing information</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Stock symbols you analyze and track</li>
              <li>Portfolio holdings and watchlist items you add</li>
              <li>AI chat conversations and analysis history</li>
              <li>Trading orders and recommendations you interact with</li>
              <li>Feature usage and access patterns</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">Technical Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>IP address and browser type</li>
              <li>Device information</li>
              <li>Access times and referring URLs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and maintain the Service</li>
              <li>To personalize AI recommendations and analysis</li>
              <li>To process your subscription and payments</li>
              <li>To send price alerts and notifications you've configured</li>
              <li>To improve our AI models and service quality</li>
              <li>To communicate with you about updates and support</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. AI Data Processing</h2>
            <p className="text-muted-foreground mb-3">
              When you use our AI features, your queries and data are processed by AI models (Google Gemini) to generate responses. We want you to understand:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>AI-generated content is based on patterns in data and may not always be accurate.</li>
              <li>Your conversations may be used to improve AI model performance.</li>
              <li>We do not share your personal trading data with third parties for their marketing purposes.</li>
              <li>AI analysis is provided for informational purposes only and does not constitute financial advice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-3">We may share your information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, payment processing, AI services)</li>
              <li><strong>Trading Integrations:</strong> If you connect to Moomoo or other brokers, your order data is shared with those platforms</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time through our support channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use cookies and similar tracking technologies to track activity on our Service and maintain certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Our Service integrates with third-party services including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Replit (authentication and hosting)</li>
              <li>Google Gemini (AI analysis)</li>
              <li>Yahoo Finance (market data)</li>
              <li>Telegram and Twilio (notifications)</li>
              <li>Moomoo (trading integration)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              These services have their own privacy policies that govern their use of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our Service is not intended for anyone under the age of 18. We do not knowingly collect personal information from children under 18.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us through the Q&A / Feedback section of the application.
            </p>
          </section>
        </div>

        <Separator className="my-6" />

        <div className="flex gap-4 text-sm">
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link href="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
        </div>
      </Card>
    </div>
  );
}
