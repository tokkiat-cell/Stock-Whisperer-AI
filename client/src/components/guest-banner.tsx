import { Button } from "@/components/ui/button";
import { useGuestUsage } from "@/hooks/use-guest-usage";
import { LogIn, Sparkles } from "lucide-react";

export default function GuestBanner() {
  const { getRemainingAnalysis, getRemainingChat, limits } = useGuestUsage();
  
  const remainingAnalysis = getRemainingAnalysis();
  const remainingChat = getRemainingChat();

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">Guest Mode</span>
          </span>
          <span className="text-muted-foreground">
            {remainingAnalysis}/{limits.analysis} analyses
          </span>
          <span className="text-muted-foreground">
            {remainingChat}/{limits.chat} chats
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            Sign in for full access
          </span>
          <Button 
            size="sm" 
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-guest-signin"
          >
            <LogIn className="w-4 h-4 mr-1" />
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
