import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, MessageSquare, Image, Mic, TrendingUp } from "lucide-react";
import { Link } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usageType?: "chat" | "image" | "voice" | "stockAnalysis";
  currentCount?: number;
  limit?: number;
}

const usageTypeLabels: Record<string, { label: string; icon: typeof MessageSquare }> = {
  chat: { label: "AI Chat Messages", icon: MessageSquare },
  image: { label: "Image Generations", icon: Image },
  voice: { label: "Voice Chats", icon: Mic },
  stockAnalysis: { label: "Stock Analyses", icon: TrendingUp },
};

export function UpgradeModal({ open, onOpenChange, usageType, currentCount, limit }: UpgradeModalProps) {
  const typeInfo = usageType ? usageTypeLabels[usageType] : null;
  const TypeIcon = typeInfo?.icon || Zap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-upgrade">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            You've reached your free tier limit. Upgrade to continue using AI features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {usageType && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{typeInfo?.label}</span>
              </div>
              <Badge variant="secondary">
                {currentCount}/{limit} used
              </Badge>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-medium">Pro Plan Benefits</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Unlimited AI chat messages
              </li>
              <li className="flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Unlimited image generations
              </li>
              <li className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Unlimited voice chats
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Unlimited stock analyses
              </li>
            </ul>
          </div>

          <div className="text-center">
            <span className="text-3xl font-bold">$49.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-upgrade"
          >
            Maybe Later
          </Button>
          <Link href="/pricing">
            <Button data-testid="button-upgrade-subscribe" onClick={() => onOpenChange(false)}>
              View Plans
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
