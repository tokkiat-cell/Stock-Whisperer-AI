import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  LineChart, 
  LogOut, 
  Menu,
  Wallet,
  Scan,
  MessageCircle,
  PieChart,
  User as UserIcon,
  Server,
  CreditCard,
  BookOpen,
  MessageSquare,
  Settings,
  Crown,
  Zap,
  Sparkles,
  Target,
  UserCog,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: usageData } = useQuery<{ planTier: string }>({
    queryKey: ['/api/usage'],
  });

  const planTier = usageData?.planTier || 'free';
  
  const getPlanInfo = () => {
    if (planTier === 'pro') return { name: 'Pro', icon: Crown, color: 'text-yellow-500' };
    if (planTier === 'basic') return { name: 'Basic', icon: Zap, color: 'text-primary' };
    if (planTier === 'subscriber') return { name: 'Subscriber', icon: Crown, color: 'text-primary' };
    return { name: 'Free', icon: Sparkles, color: 'text-muted-foreground' };
  };

  const planInfo = getPlanInfo();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "stockwhisperer AI", icon: MessageCircle },
    { href: "/premarket", label: "Premarket Changes", icon: TrendingUp },
    { href: "/profile-setup", label: "My Profile", icon: UserCog },
    { href: "/scan", label: "AI Scanner", icon: Scan },
    { href: "/daytrading-scanner", label: "Day Trading Scanner", icon: TrendingUp },
    { href: "/month-trading-scanner", label: "Month Trading Scanner", icon: TrendingUp },
    { href: "/investor-watchlist", label: "Investor Targets", icon: Target },
    { href: "/growth-targets", label: "Growth Targets", icon: Target },
    { href: "/portfolio", label: "Portfolio & P&L", icon: PieChart },
    { href: "/trading", label: "IBKR Trading", icon: Server },
    { href: "/moomoo-trading", label: "Moomoo Trading", icon: Server },
    { href: "/analysis", label: "Manual Analysis", icon: LineChart },
    { href: "/pricing", label: "Pricing", icon: CreditCard },
    { href: "/subscription", label: "Subscription", icon: Settings },
    { href: "/user-manual", label: "User Manual", icon: BookOpen },
    { href: "/feedback", label: "Q&A / Feedback", icon: MessageSquare },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Wallet className="text-primary-foreground w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl tracking-tight">stockwhisperer.AI</h1>
              <Badge 
                variant={planInfo.name === 'Free' ? 'secondary' : 'default'}
                className={cn(
                  "text-xs px-1.5 py-0.5",
                  planInfo.name === 'Pro' && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                  planInfo.name === 'Basic' && "bg-primary/20 text-primary border-primary/30"
                )}
                data-testid="badge-plan-tier-logo"
              >
                <planInfo.icon className={cn("w-3 h-3 mr-1", planInfo.color)} />
                {planInfo.name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">AI Trading Assistant</p>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}>
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-white/10">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user?.firstName || 'Trader'}</p>
              <Badge 
                variant={planInfo.name === 'Free' ? 'secondary' : 'default'} 
                className="text-xs px-1.5 py-0"
                data-testid="badge-plan-status"
              >
                <planInfo.icon className={cn("w-3 h-3 mr-1", planInfo.color)} />
                {planInfo.name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-white/10 hover:bg-white/5 hover:text-destructive transition-colors"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 border-r border-white/5 bg-card/30 backdrop-blur-xl fixed h-full z-50">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="text-primary-foreground w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg">stockwhisperer.AI</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-card border-r-white/10">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 md:p-8 pt-20 lg:pt-8 min-h-screen animate-in">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
