import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  Zap, 
  Loader2, 
  CreditCard, 
  Calendar, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface UsageData {
  chatCount: number;
  imageCount: number;
  voiceCount: number;
  stockAnalysisCount: number;
  isSubscriber: boolean;
  limits: {
    chat: number;
    image: number;
    voice: number;
    stockAnalysis: number;
  };
}

export default function SubscriptionPage() {
  const { data: subscriptionData, isLoading: subLoading } = useQuery<{ subscription: any; planTier: string }>({
    queryKey: ['/api/stripe/subscription'],
  });

  const { data: usageData, isLoading: usageLoading, isError: usageError } = useQuery<UsageData>({
    queryKey: ['/api/usage'],
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

  const subscription = subscriptionData?.subscription;
  const planTier = subscriptionData?.planTier || 'free';
  const isSubscriber = planTier !== 'free';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanName = () => {
    if (planTier === 'pro') return 'Pro';
    if (planTier === 'basic') return 'Basic';
    if (planTier === 'subscriber') return 'Subscriber';
    return 'Free';
  };

  const getPlanIcon = () => {
    if (planTier === 'pro') return <Crown className="w-6 h-6 text-yellow-500" />;
    if (planTier === 'basic') return <Zap className="w-6 h-6 text-primary" />;
    if (planTier === 'subscriber') return <Crown className="w-6 h-6 text-primary" />;
    return <Sparkles className="w-6 h-6 text-muted-foreground" />;
  };

  if (subLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and view your usage
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="p-6" data-testid="card-current-plan">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              {getPlanIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{getPlanName()} Plan</h2>
                <Badge variant={isSubscriber ? "default" : "secondary"}>
                  {isSubscriber ? "Active" : "Free Tier"}
                </Badge>
              </div>
              {subscription ? (
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.cancel_at_period_end 
                    ? `Cancels on ${formatDate(subscription.current_period_end)}`
                    : `Renews on ${formatDate(subscription.current_period_end)}`
                  }
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Limited AI features - Upgrade to unlock more
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {subscription ? (
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                  </>
                )}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button data-testid="button-upgrade-plan">
                  Upgrade Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Usage Statistics */}
      <Card className="p-6" data-testid="card-usage-stats">
        <h3 className="text-lg font-semibold mb-4">Monthly AI Usage</h3>
        
        {isSubscriber ? (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Unlimited Access</p>
              <p className="text-sm text-muted-foreground">
                As a subscriber, you have unlimited access to all AI features.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Your usage resets on the 1st of each month
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <UsageCard
                label="Chat Messages"
                used={usageData?.chatCount || 0}
                limit={usageData?.limits?.chat || 10}
              />
              <UsageCard
                label="Stock Analyses"
                used={usageData?.stockAnalysisCount || 0}
                limit={usageData?.limits?.stockAnalysis || 10}
              />
              <UsageCard
                label="Image Generation"
                used={usageData?.imageCount || 0}
                limit={usageData?.limits?.image || 3}
              />
              <UsageCard
                label="Voice Chat"
                used={usageData?.voiceCount || 0}
                limit={usageData?.limits?.voice || 5}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Subscription Details (if subscribed) */}
      {subscription && (
        <Card className="p-6" data-testid="card-subscription-details">
          <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Billing Period</span>
              <span className="font-medium">
                {subscription.plan?.interval === 'year' ? 'Yearly' : 'Monthly'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                ${(subscription.plan?.amount / 100).toFixed(2)}/{subscription.plan?.interval}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Current Period</span>
              <span className="font-medium">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </span>
            </div>

            {subscription.cancel_at_period_end && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Your subscription will be cancelled at the end of the current billing period.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upgrade CTA for Free users */}
      {!subscription && (
        <Card className="p-6 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="card-upgrade-cta">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Crown className="w-10 h-10 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Unlock Unlimited AI Features</h3>
                <p className="text-sm text-muted-foreground">
                  Subscribe to remove usage limits and access all premium features
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button data-testid="button-view-plans">
                View Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number }) {
  const safeUsed = used ?? 0;
  const safeLimit = limit ?? 1;
  const percentage = safeLimit > 0 ? Math.min((safeUsed / safeLimit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = safeUsed >= safeLimit;

  return (
    <div className="p-4 bg-muted/50 rounded-lg" data-testid={`usage-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-500' : ''}`}>
          {safeUsed}
        </span>
        <span className="text-muted-foreground">/ {safeLimit}</span>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
