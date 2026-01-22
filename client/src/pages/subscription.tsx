import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Loader2, 
  ArrowRight,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Link } from "wouter";

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

export default function SubscriptionPage() {
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ['/api/usage'],
  });

  const planTier = usageData?.planTier || 'free';

  const getPlanName = () => {
    if (planTier === 'pro') return 'Pro';
    if (planTier === 'basic') return 'Basic';
    return 'Free';
  };

  const getPlanIcon = () => {
    if (planTier === 'pro') return <Crown className="w-6 h-6 text-yellow-500" />;
    if (planTier === 'basic') return <Crown className="w-6 h-6 text-primary" />;
    return <Sparkles className="w-6 h-6 text-muted-foreground" />;
  };

  if (usageLoading) {
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
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {planTier === 'free' 
                  ? "Limited AI features - Upgrade to unlock more"
                  : "Unlimited access to AI features"
                }
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/pricing">
              <Button data-testid="button-view-plans">
                View Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
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
        <p>Payment integration coming soon. Subscription management will be available shortly.</p>
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
