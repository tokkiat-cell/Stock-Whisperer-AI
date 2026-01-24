import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Loader2, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  Calendar,
  DollarSign,
  Zap,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UsageData {
  chatCount: number;
  imageCount: number;
  voiceCount: number;
  stockAnalysisCount: number;
  isSubscriber: boolean;
  planTier: string;
  limits: {
    chat: number;
    image: number;
    voice: number;
    stockAnalysis: number;
  };
}

interface SubscriptionData {
  subscription: {
    status: string;
    interval: string;
    priceAmount: number;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ['/api/usage'],
  });

  const { data: subscriptionData, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ['/api/stripe/subscription'],
  });

  const planTier = usageData?.planTier || 'free';
  const subscription = subscriptionData?.subscription;

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/portal');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (usageLoading || subLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Usage</h1>
        <p className="text-muted-foreground mt-2">
          View your current plan and AI usage
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
                <Badge variant={planTier !== 'free' ? "default" : "secondary"}>
                  {planTier !== 'free' ? "Active" : "Free Tier"}
                </Badge>
                {subscription?.cancelAtPeriodEnd && (
                  <Badge variant="destructive">Canceling</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {planTier === 'free' 
                  ? "Limited AI features - Upgrade to unlock more"
                  : "Full access to AI features"
                }
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {planTier !== 'free' && (
              <Button 
                variant="outline" 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Manage Billing
              </Button>
            )}
            <Link href="/pricing">
              <Button data-testid="button-view-plans">
                {planTier === 'free' ? 'Upgrade' : 'Change Plan'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Billing Details for Subscribers */}
        {subscription && planTier !== 'free' && (
          <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-semibold">
                  ${subscription.priceAmount.toFixed(2)}/{subscription.interval === 'year' ? 'year' : 'month'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Billing Cycle</p>
                <p className="font-semibold capitalize">{subscription.interval}ly</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                </p>
                <p className="font-semibold">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Usage Statistics */}
      <Card className="p-6" data-testid="card-usage-stats">
        <h3 className="text-lg font-semibold mb-4">Monthly AI Usage</h3>
        
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
      </Card>

      {/* Upgrade CTA for Free users */}
      {planTier === 'free' && (
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
              <Button data-testid="button-upgrade-plan">
                View Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="text-center text-muted-foreground text-sm">
        <p>Secure payments powered by Stripe. Cancel or modify your subscription anytime.</p>
      </div>
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
