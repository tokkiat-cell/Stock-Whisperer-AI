import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, Crown, Zap, ArrowRight, Info, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: Price[];
}

export default function Pricing() {
  const { user } = useAuth();

  const { data: productsData, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['/api/stripe/products-with-prices'],
  });

  const { data: subscriptionData } = useQuery<{ subscription: any; planTier: string }>({
    queryKey: ['/api/stripe/subscription'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, autoRenew }: { priceId: string; autoRenew: boolean }) => {
      const response = await apiRequest('POST', '/api/stripe/checkout', { priceId, autoRenew });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/customer-portal', {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const products = productsData?.data || [];
  const currentSubscription = subscriptionData?.subscription;
  const currentPlanTier = subscriptionData?.planTier || 'free';

  const basicPlan = products.find(p => p.metadata?.tier === 'basic');
  const proPlan = products.find(p => p.metadata?.tier === 'pro');

  const formatPrice = (amount: number, interval?: string) => {
    const price = (amount / 100).toFixed(2);
    return interval ? `$${price}/${interval === 'month' ? 'mo' : 'yr'}` : `$${price}`;
  };

  const getMonthlyPrice = (product: Product) => {
    return product.prices.find(p => p.recurring?.interval === 'month');
  };

  const getYearlyPrice = (product: Product) => {
    return product.prices.find(p => p.recurring?.interval === 'year');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Unlock the full power of AI-driven trading analysis with stockwhisperer Pro
        </p>
      </div>

      {currentSubscription && (
        <Card className="p-4 border-primary/50 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">You have an active subscription</p>
                <p className="text-sm text-muted-foreground">
                  Status: {currentSubscription.status}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-subscription"
            >
              {portalMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Free Tier */}
        <Card className="p-6" data-testid="card-plan-free">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Free</h3>
            </div>

            <p className="text-muted-foreground text-sm">
              Get started with basic AI-powered trading tools
            </p>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                No credit card required
              </p>
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
                5 voice chat sessions/month
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Portfolio & watchlist tracking
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Candlestick charts
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4 text-muted-foreground shrink-0" />
                Unlimited AI usage
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4 text-muted-foreground shrink-0" />
                Priority support
              </li>
            </ul>

            {currentPlanTier === 'free' ? (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <p className="text-sm font-medium text-primary">Your Current Plan</p>
              </div>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Free Plan
              </Button>
            )}
          </div>
        </Card>

        {/* Basic and Pro Plans */}
        {basicPlan && (
          <PlanCard
            product={basicPlan}
            icon={<Zap className="w-6 h-6" />}
            features={[
              "50 AI chat messages/month",
              "60 stock analyses/month",
              "20 AI image generations/month",
              "20 voice chat sessions/month",
              "Portfolio & watchlist tracking",
              "Price alerts (up to 10)",
              "Candlestick charts",
              "Email support",
            ]}
            limitedFeatures={[
              "Multi-market AI scanner",
              "IBKR trading integration",
            ]}
            onSelectPrice={(priceId, autoRenew) => checkoutMutation.mutate({ priceId, autoRenew })}
            isLoading={checkoutMutation.isPending}
            formatPrice={formatPrice}
            getMonthlyPrice={getMonthlyPrice}
            getYearlyPrice={getYearlyPrice}
            currentPlanTier={currentPlanTier}
          />
        )}

        {proPlan && (
          <PlanCard
            product={proPlan}
            icon={<Crown className="w-6 h-6 text-yellow-500" />}
            featured
            features={[
              "Everything in Basic, unlimited:",
              "Unlimited AI chat messages",
              "Unlimited stock analyses",
              "Unlimited image generation",
              "Unlimited voice chat",
              "Priority support",
            ]}
            onSelectPrice={(priceId, autoRenew) => checkoutMutation.mutate({ priceId, autoRenew })}
            isLoading={checkoutMutation.isPending}
            formatPrice={formatPrice}
            getMonthlyPrice={getMonthlyPrice}
            getYearlyPrice={getYearlyPrice}
            currentPlanTier={currentPlanTier}
          />
        )}
      </div>
    </div>
  );
}

interface PlanCardProps {
  product: Product;
  icon: React.ReactNode;
  features: string[];
  limitedFeatures?: string[];
  featured?: boolean;
  onSelectPrice: (priceId: string, autoRenew: boolean) => void;
  isLoading: boolean;
  formatPrice: (amount: number, interval?: string) => string;
  getMonthlyPrice: (product: Product) => Price | undefined;
  getYearlyPrice: (product: Product) => Price | undefined;
  currentPlanTier: string;
}

function PlanCard({
  product,
  icon,
  features,
  limitedFeatures,
  featured,
  onSelectPrice,
  isLoading,
  formatPrice,
  getMonthlyPrice,
  getYearlyPrice,
  currentPlanTier,
}: PlanCardProps) {
  const monthlyPrice = getMonthlyPrice(product);
  const yearlyPrice = getYearlyPrice(product);
  const [autoRenew, setAutoRenew] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  // Use actual Stripe prices (convert from cents to dollars)
  const monthlyAmount = monthlyPrice ? (monthlyPrice.unit_amount / 100).toFixed(2) : "0.00";
  const yearlyAmount = yearlyPrice ? (yearlyPrice.unit_amount / 100).toFixed(2) : "0.00";
  
  // Calculate yearly savings percentage if both prices exist (clamp to 0 minimum)
  const yearlySavings = monthlyPrice && yearlyPrice 
    ? Math.max(0, Math.round((1 - (yearlyPrice.unit_amount / (monthlyPrice.unit_amount * 12))) * 100))
    : 0;

  const displayPrice = billingPeriod === "monthly" ? monthlyAmount : yearlyAmount;

  return (
    <Card 
      className={cn(
        "p-6 relative",
        featured && "border-primary ring-1 ring-primary"
      )}
      data-testid={`card-plan-${product.metadata?.tier || product.id}`}
    >
      {featured && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-xl font-semibold">{product.name}</h3>
        </div>

        <p className="text-muted-foreground text-sm">
          {product.description}
        </p>

        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">
              ${displayPrice}
            </span>
            <span className="text-muted-foreground">
              /{billingPeriod === "monthly" ? "month" : "year"}
            </span>
          </div>
          {billingPeriod === "yearly" && yearlySavings > 0 && (
            <p className="text-xs text-green-500 font-medium">
              Save {yearlySavings}% with annual billing
            </p>
          )}
        </div>

        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Billing Period</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={billingPeriod === "monthly" ? "default" : "outline"}
                onClick={() => setBillingPeriod("monthly")}
                className="flex-1"
                data-testid={`button-period-monthly-${product.metadata?.tier}`}
              >
                Monthly (${monthlyAmount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={billingPeriod === "yearly" ? "default" : "outline"}
                onClick={() => setBillingPeriod("yearly")}
                className="flex-1"
                data-testid={`button-period-yearly-${product.metadata?.tier}`}
              >
                Yearly (${yearlyAmount})
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={`auto-renew-${product.id}`} className="text-sm font-medium">
                Auto-Renewal
              </Label>
              <p className="text-xs text-muted-foreground">
                {autoRenew ? "Renews automatically each period" : "One-time payment, no auto-renewal"}
              </p>
            </div>
            <Switch
              id={`auto-renew-${product.id}`}
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
              data-testid={`switch-auto-renew-${product.metadata?.tier}`}
            />
          </div>
        </div>

        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              {feature}
            </li>
          ))}
          {limitedFeatures?.map((feature, idx) => (
            <li key={`limited-${idx}`} className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="w-4 h-4 text-muted-foreground shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          {currentPlanTier === product.metadata?.tier ? (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <p className="text-sm font-medium text-primary">Your Current Plan</p>
            </div>
          ) : (
            <Button
              className="w-full"
              variant={featured ? "default" : "outline"}
              onClick={() => {
                const priceId = billingPeriod === "monthly" ? monthlyPrice?.id : yearlyPrice?.id;
                if (priceId) onSelectPrice(priceId, autoRenew);
              }}
              disabled={isLoading || (!monthlyPrice && !yearlyPrice)}
              data-testid={`button-subscribe-${product.metadata?.tier}`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {autoRenew ? "Subscribe" : "Pay Once"} - ${displayPrice}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              You can cancel your subscription at any time. Your access will continue until the end of your current billing period.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
