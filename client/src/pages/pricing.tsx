import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Get access to AI-powered stock analysis and trading insights
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Free Tier */}
        <Card className="p-6" data-testid="card-plan-free">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Free</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Get started with basic AI trading insights
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                10 AI chat messages/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                10 stock analyses/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                3 AI image generations/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Basic portfolio tracking
              </li>
            </ul>
            {user ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="button-get-started-free">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Basic Tier */}
        <Card className="p-6" data-testid="card-plan-basic">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Basic</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Essential AI trading analysis tools for individual traders
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$9.90</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                50 AI chat messages/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                60 stock analyses/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                20 AI image generations/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Portfolio & watchlist tracking
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Email support
              </li>
            </ul>
            <Button className="w-full" disabled data-testid="button-subscribe-basic">
              Coming Soon
            </Button>
          </div>
        </Card>

        {/* Pro Tier */}
        <Card className="p-6 border-primary/50 relative" data-testid="card-plan-pro">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
            Most Popular
          </Badge>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-semibold">Pro</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Advanced AI trading with market scanning and integrations
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$49.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                Unlimited AI chat messages
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                Unlimited stock analyses
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                Unlimited image generation
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                AI Market Scanner
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                Moomoo trading integration
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                Priority support
              </li>
            </ul>
            <Button className="w-full" disabled data-testid="button-subscribe-pro">
              Coming Soon
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-12 text-center text-muted-foreground">
        <p>Payment integration coming soon. All plans will be available shortly.</p>
      </div>
    </div>
  );
}
