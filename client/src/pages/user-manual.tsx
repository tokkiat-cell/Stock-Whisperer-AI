import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  LayoutDashboard, 
  Scan, 
  PieChart, 
  Server, 
  MessageCircle, 
  LineChart,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function UserManualPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          User Manual
        </h2>
        <p className="text-muted-foreground mt-1">
          Learn how to use all the features of TK Stock Whisperper.AI platform
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="getting-started" data-testid="tab-getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-manual-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="scanner" data-testid="tab-manual-scanner">AI Scanner</TabsTrigger>
          <TabsTrigger value="portfolio" data-testid="tab-manual-portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="trading" data-testid="tab-manual-trading">Trading</TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-manual-chat">AI Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to TK Stock Whisperper.AI</CardTitle>
              <CardDescription>Your AI-powered stock trading assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                TK Stock Whisperper.AI is a comprehensive stock trading platform that combines artificial intelligence 
                with real-time market data to help you make smarter trading decisions.
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Quick Start Guide:</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Badge className="mt-0.5">1</Badge>
                    <div>
                      <p className="font-medium">Explore the Dashboard</p>
                      <p className="text-sm text-muted-foreground">View market indices, top movers, and your watchlist at a glance.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Badge className="mt-0.5">2</Badge>
                    <div>
                      <p className="font-medium">Use AI Scanner</p>
                      <p className="text-sm text-muted-foreground">Get AI-powered stock recommendations based on technical analysis.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Badge className="mt-0.5">3</Badge>
                    <div>
                      <p className="font-medium">Manage Your Portfolio</p>
                      <p className="text-sm text-muted-foreground">Track your holdings, view P&L, and import positions from Excel.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Badge className="mt-0.5">4</Badge>
                    <div>
                      <p className="font-medium">Execute Trades</p>
                      <p className="text-sm text-muted-foreground">Create orders and submit them to Moomoo for execution.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                Dashboard
              </CardTitle>
              <CardDescription>Your trading command center</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Market Indices</p>
                    <p className="text-sm text-muted-foreground">View real-time data for major indices like S&P 500, Dow Jones, and Nasdaq.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Pre-Market Movers</p>
                    <p className="text-sm text-muted-foreground">See which stocks are moving the most before market open.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Watchlist</p>
                    <p className="text-sm text-muted-foreground">Add and monitor your favorite stocks in one place.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scanner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-primary" />
                AI Scanner
              </CardTitle>
              <CardDescription>AI-powered stock recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The AI Scanner analyzes S&P 500 stocks using technical indicators and provides actionable trade recommendations.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Click "Generate Recommendations"</p>
                    <p className="text-sm text-muted-foreground">The AI will analyze market conditions and suggest trades.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Review Entry, Stop Loss, and Take Profit</p>
                    <p className="text-sm text-muted-foreground">Each recommendation includes risk management levels.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Create Trade from Recommendation</p>
                    <p className="text-sm text-muted-foreground">One-click to add the trade to your order queue.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Portfolio & P&L
              </CardTitle>
              <CardDescription>Track your holdings and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Add Holdings Manually</p>
                    <p className="text-sm text-muted-foreground">Enter your stock positions with cost basis to track performance.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Import from Excel</p>
                    <p className="text-sm text-muted-foreground">Upload an Excel file with columns: Symbol, Shares, Cost Basis.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Real-time P&L</p>
                    <p className="text-sm text-muted-foreground">See your unrealized gains/losses updated with live prices.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Moomoo Trading
              </CardTitle>
              <CardDescription>Execute trades through Moomoo broker</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5">1</Badge>
                  <div>
                    <p className="font-medium">Create Draft Order</p>
                    <p className="text-sm text-muted-foreground">Click "New Order" and fill in symbol, action, quantity, and price levels.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5">2</Badge>
                  <div>
                    <p className="font-medium">Login to Moomoo</p>
                    <p className="text-sm text-muted-foreground">When submitting, you'll be prompted to login to your Moomoo account.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5">3</Badge>
                  <div>
                    <p className="font-medium">Review and Approve</p>
                    <p className="text-sm text-muted-foreground">Confirm all order details before final submission.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5">4</Badge>
                  <div>
                    <p className="font-medium">Track Order Status</p>
                    <p className="text-sm text-muted-foreground">Monitor your orders in the Active and History tabs.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                stockwhisperer AI Chat
              </CardTitle>
              <CardDescription>Your AI trading assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Chat with our AI assistant to get insights, analysis, and answers to your trading questions.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Ask About Stocks</p>
                    <p className="text-sm text-muted-foreground">"What do you think about AAPL?" or "Analyze TSLA for me"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Get Market Insights</p>
                    <p className="text-sm text-muted-foreground">"What's moving the market today?" or "Best sectors right now?"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Learn Trading Strategies</p>
                    <p className="text-sm text-muted-foreground">"Explain stop-loss orders" or "What is a trailing stop?"</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
