import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Crown, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

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

  const { data: subscriptionData } = useQuery<{ subscription: any }>({
    queryKey: ['/api/stripe/subscription'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/stripe/checkout', { priceId });
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
          Unlock the full power of AI-driven trading analysis with TradeMind Pro
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

      {products.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No subscription plans available yet. Check back soon.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {basicPlan && (
            <PlanCard
              product={basicPlan}
              icon={<Zap className="w-6 h-6" />}
              features={[
                "AI-powered stock analysis",
                "Portfolio & watchlist tracking",
                "Price alerts (up to 10)",
                "Candlestick charts",
                "Email support",
              ]}
              onSelectPrice={(priceId) => checkoutMutation.mutate(priceId)}
              isLoading={checkoutMutation.isPending}
              formatPrice={formatPrice}
              getMonthlyPrice={getMonthlyPrice}
              getYearlyPrice={getYearlyPrice}
            />
          )}

          {proPlan && (
            <PlanCard
              product={proPlan}
              icon={<Crown className="w-6 h-6 text-yellow-500" />}
              featured
              features={[
                "Everything in Basic",
                "S&P 500 market scanner",
                "IBKR trading integration",
                "Unlimited price alerts",
                "AI chat assistant",
                "Priority support",
              ]}
              onSelectPrice={(priceId) => checkoutMutation.mutate(priceId)}
              isLoading={checkoutMutation.isPending}
              formatPrice={formatPrice}
              getMonthlyPrice={getMonthlyPrice}
              getYearlyPrice={getYearlyPrice}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  product: Product;
  icon: React.ReactNode;
  features: string[];
  featured?: boolean;
  onSelectPrice: (priceId: string) => void;
  isLoading: boolean;
  formatPrice: (amount: number, interval?: string) => string;
  getMonthlyPrice: (product: Product) => Price | undefined;
  getYearlyPrice: (product: Product) => Price | undefined;
}

function PlanCard({
  product,
  icon,
  features,
  featured,
  onSelectPrice,
  isLoading,
  formatPrice,
  getMonthlyPrice,
  getYearlyPrice,
}: PlanCardProps) {
  const monthlyPrice = getMonthlyPrice(product);
  const yearlyPrice = getYearlyPrice(product);

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

        {monthlyPrice && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                ${(monthlyPrice.unit_amount / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {yearlyPrice && (
              <p className="text-xs text-muted-foreground">
                or ${(yearlyPrice.unit_amount / 100).toFixed(2)}/year (save 17%)
              </p>
            )}
          </div>
        )}

        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          {monthlyPrice && (
            <Button
              className="w-full"
              variant={featured ? "default" : "outline"}
              onClick={() => onSelectPrice(monthlyPrice.id)}
              disabled={isLoading}
              data-testid={`button-subscribe-${product.metadata?.tier}-monthly`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Subscribe Monthly
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
          {yearlyPrice && (
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => onSelectPrice(yearlyPrice.id)}
              disabled={isLoading}
              data-testid={`button-subscribe-${product.metadata?.tier}-yearly`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Subscribe Yearly (Save 17%)"
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
