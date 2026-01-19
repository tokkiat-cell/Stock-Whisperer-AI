import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet, ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";

export default function AuthPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden bg-secondary">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Wallet className="text-primary-foreground w-6 h-6" />
            </div>
            <h1 className="font-display font-bold text-2xl tracking-tight">stockwhisperer.AI</h1>
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-5xl font-display font-bold leading-tight">
              Trade smarter with <span className="text-primary">Artificial Intelligence</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Experience the next generation of stock trading. Real-time analysis, automated risk management, and institutional-grade insights powered by AI.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <Zap className="w-6 h-6 text-yellow-400 mb-3" />
            <h3 className="font-semibold mb-1">Instant Analysis</h3>
            <p className="text-sm text-muted-foreground">Real-time technical analysis on any US stock.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <ShieldCheck className="w-6 h-6 text-green-400 mb-3" />
            <h3 className="font-semibold mb-1">Risk Controls</h3>
            <p className="text-sm text-muted-foreground">Automated stop-loss and take-profit calculation.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <BarChart3 className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="font-semibold mb-1">Smart Portfolio</h3>
            <p className="text-sm text-muted-foreground">Track performance with advanced metrics.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to access your trading dashboard.</p>
          </div>

          <Card className="p-8 glass-panel border-white/5 shadow-2xl">
            <div className="space-y-6">
              <Button 
                size="lg" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all duration-200"
                onClick={handleLogin}
              >
                Sign In with Replit <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Secure Authentication</span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
