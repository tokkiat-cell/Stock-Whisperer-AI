import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, LineChart, ArrowRight, ArrowLeft, Check, User, Target } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InvestorProfile, ProfileType, RiskLevel, InvestmentHorizon, TraderStyle, RiskPerTrade } from "@shared/schema";

const investorRiskQuestions = [
  {
    id: "experience",
    question: "How many years of investing experience do you have?",
    options: [
      { value: "beginner", label: "Less than 2 years", score: 1 },
      { value: "intermediate", label: "2-5 years", score: 2 },
      { value: "experienced", label: "More than 5 years", score: 3 },
    ],
  },
  {
    id: "reaction",
    question: "If your portfolio dropped 20% in a month, you would:",
    options: [
      { value: "sell", label: "Sell everything to prevent further losses", score: 1 },
      { value: "hold", label: "Hold and wait for recovery", score: 2 },
      { value: "buy", label: "Buy more at lower prices", score: 3 },
    ],
  },
  {
    id: "priority",
    question: "What is your primary investment priority?",
    options: [
      { value: "preserve", label: "Preserve capital with stable returns", score: 1 },
      { value: "balanced", label: "Balanced growth with moderate risk", score: 2 },
      { value: "maximize", label: "Maximize growth even with volatility", score: 3 },
    ],
  },
  {
    id: "income",
    question: "How stable is your income source?",
    options: [
      { value: "unstable", label: "Variable or uncertain", score: 1 },
      { value: "moderate", label: "Reasonably stable", score: 2 },
      { value: "stable", label: "Very stable with savings buffer", score: 3 },
    ],
  },
  {
    id: "timeline",
    question: "When do you expect to need this money?",
    options: [
      { value: "short", label: "Within 3 years", score: 1 },
      { value: "medium", label: "3-7 years", score: 2 },
      { value: "long", label: "More than 7 years", score: 3 },
    ],
  },
];

function calculateRiskLevel(answers: Record<string, string>): RiskLevel {
  let totalScore = 0;
  const questionScores: Record<string, number> = {};
  
  investorRiskQuestions.forEach(q => {
    const selectedOption = q.options.find(o => o.value === answers[q.id]);
    if (selectedOption) {
      questionScores[q.id] = selectedOption.score;
      totalScore += selectedOption.score;
    }
  });
  
  if (totalScore <= 7) return "CONSERVATIVE";
  if (totalScore <= 11) return "MODERATE";
  return "AGGRESSIVE";
}

export default function ProfileSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"type" | "details" | "complete">("type");
  const [profileType, setProfileType] = useState<ProfileType | null>(null);
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestmentHorizon | null>(null);
  const [traderStyle, setTraderStyle] = useState<TraderStyle | null>(null);
  const [riskPerTrade, setRiskPerTrade] = useState<RiskPerTrade | null>(null);

  const { data: existingProfile, isLoading } = useQuery<InvestorProfile | null>({
    queryKey: ["/api/investor-profile"],
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<InvestorProfile>) => {
      return apiRequest("POST", "/api/investor-profile", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor-profile"] });
      toast({ title: "Profile saved successfully" });
      setStep("complete");
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  const handleTypeSelect = (type: ProfileType) => {
    setProfileType(type);
    setStep("details");
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setRiskAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < investorRiskQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleInvestorSubmit = () => {
    if (!investmentHorizon) {
      toast({ title: "Please select an investment horizon", variant: "destructive" });
      return;
    }

    const riskLevel = calculateRiskLevel(riskAnswers);
    
    saveProfileMutation.mutate({
      profileType: "INVESTOR",
      riskLevel,
      investmentHorizon,
      riskAssessmentAnswers: JSON.stringify(riskAnswers),
    });
  };

  const handleTraderSubmit = () => {
    if (!traderStyle || !riskPerTrade) {
      toast({ title: "Please complete all selections", variant: "destructive" });
      return;
    }

    saveProfileMutation.mutate({
      profileType: "TRADER",
      traderStyle,
      riskPerTrade,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Profile Setup Complete</h2>
              <p className="text-muted-foreground">
                Your {profileType === "INVESTOR" ? "investor" : "trader"} profile has been saved.
                The AI Scanner will now provide personalized recommendations based on your profile.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button onClick={() => navigate("/scan")} data-testid="button-go-to-scanner">
                  Go to AI Scanner
                </Button>
                {profileType === "INVESTOR" && (
                  <Button variant="outline" onClick={() => navigate("/investor-watchlist")} data-testid="button-go-to-watchlist">
                    <Target className="h-4 w-4 mr-2" />
                    My Target List
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "type") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Profile</h1>
          <p className="text-muted-foreground">
            Select how you approach the markets to get personalized recommendations
          </p>
        </div>

        {existingProfile && (
          <Card className="mb-6 border-primary/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Current Profile: {existingProfile.profileType}</p>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.profileType === "INVESTOR" 
                      ? `Risk Level: ${existingProfile.riskLevel} | Horizon: ${existingProfile.investmentHorizon?.replace(/_/g, " ")}`
                      : `Style: ${existingProfile.traderStyle?.replace(/_/g, " ")} | Risk: ${existingProfile.riskPerTrade?.replace(/_/g, " ")}`
                    }
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate("/scan")} data-testid="button-keep-current">
                  Keep Current
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover-elevate transition-all border-2 hover:border-primary/50"
            onClick={() => handleTypeSelect("INVESTOR")}
            data-testid="card-investor"
          >
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Long-Term Investor</CardTitle>
              <CardDescription>
                Build wealth over time with fundamental analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Risk assessment questionnaire
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  AI-recommended target stocks
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Upload intrinsic values for tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Value-focused recommendations
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-elevate transition-all border-2 hover:border-primary/50"
            onClick={() => handleTypeSelect("TRADER")}
            data-testid="card-trader"
          >
            <CardHeader>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle>Active Trader</CardTitle>
              <CardDescription>
                Trade momentum with technical analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Day / Swing / Position trading
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Candlestick pattern scanner
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Pre-market movers & volatility
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Technical entry/exit signals
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "details" && profileType === "INVESTOR") {
    const allAnswered = investorRiskQuestions.every(q => riskAnswers[q.id]);
    const progress = (Object.keys(riskAnswers).length / investorRiskQuestions.length) * 100;
    const currentQ = investorRiskQuestions[currentQuestion];

    return (
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" className="mb-4" onClick={() => setStep("type")} data-testid="button-back-to-type">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                <TrendingUp className="h-3 w-3 mr-1" />
                Investor Profile
              </Badge>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {investorRiskQuestions.length}
              </span>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{currentQ.question}</h3>
              <RadioGroup
                value={riskAnswers[currentQ.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
              >
                {currentQ.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={option.value} id={option.value} data-testid={`radio-${option.value}`} />
                    <Label htmlFor={option.value} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevQuestion}
                disabled={currentQuestion === 0}
                data-testid="button-prev-question"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              {currentQuestion < investorRiskQuestions.length - 1 ? (
                <Button
                  onClick={handleNextQuestion}
                  disabled={!riskAnswers[currentQ.id]}
                  data-testid="button-next-question"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : null}
            </div>

            {allAnswered && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium">Investment Horizon</h3>
                <RadioGroup
                  value={investmentHorizon || ""}
                  onValueChange={(value) => setInvestmentHorizon(value as InvestmentHorizon)}
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="1_3_YEARS" id="1_3_YEARS" data-testid="radio-1-3-years" />
                    <Label htmlFor="1_3_YEARS" className="cursor-pointer">1-3 Years</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="3_5_YEARS" id="3_5_YEARS" data-testid="radio-3-5-years" />
                    <Label htmlFor="3_5_YEARS" className="cursor-pointer">3-5 Years</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="5_PLUS_YEARS" id="5_PLUS_YEARS" data-testid="radio-5-plus-years" />
                    <Label htmlFor="5_PLUS_YEARS" className="cursor-pointer">5+ Years</Label>
                  </div>
                </RadioGroup>

                <div className="pt-4">
                  <div className="p-4 bg-muted/50 rounded-lg mb-4">
                    <p className="text-sm font-medium">Your Risk Profile: {calculateRiskLevel(riskAnswers)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on your answers, we've determined your risk tolerance level.
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleInvestorSubmit}
                    disabled={saveProfileMutation.isPending}
                    data-testid="button-save-investor-profile"
                  >
                    {saveProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Investor Profile
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "details" && profileType === "TRADER") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" className="mb-4" onClick={() => setStep("type")} data-testid="button-back-to-type">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <Badge variant="secondary">
              <LineChart className="h-3 w-3 mr-1" />
              Trader Profile
            </Badge>
            <CardTitle className="mt-4">Configure Your Trading Style</CardTitle>
            <CardDescription>
              Tell us about your trading approach to get relevant signals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-4">Trading Style</h3>
              <RadioGroup
                value={traderStyle || ""}
                onValueChange={(value) => setTraderStyle(value as TraderStyle)}
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="DAY_TRADER" id="DAY_TRADER" data-testid="radio-day-trader" />
                  <Label htmlFor="DAY_TRADER" className="cursor-pointer flex-1">
                    <span className="font-medium">Day Trader</span>
                    <p className="text-xs text-muted-foreground">Open and close positions within the same day</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="SWING_TRADER" id="SWING_TRADER" data-testid="radio-swing-trader" />
                  <Label htmlFor="SWING_TRADER" className="cursor-pointer flex-1">
                    <span className="font-medium">Swing Trader</span>
                    <p className="text-xs text-muted-foreground">Hold positions for days to weeks</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="POSITION_TRADER" id="POSITION_TRADER" data-testid="radio-position-trader" />
                  <Label htmlFor="POSITION_TRADER" className="cursor-pointer flex-1">
                    <span className="font-medium">Position Trader</span>
                    <p className="text-xs text-muted-foreground">Hold positions for weeks to months</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="font-medium mb-4">Risk Per Trade</h3>
              <RadioGroup
                value={riskPerTrade || ""}
                onValueChange={(value) => setRiskPerTrade(value as RiskPerTrade)}
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="1_2_PERCENT" id="1_2_PERCENT" data-testid="radio-1-2-percent" />
                  <Label htmlFor="1_2_PERCENT" className="cursor-pointer flex-1">
                    <span className="font-medium">1-2% of capital</span>
                    <p className="text-xs text-muted-foreground">Conservative, lower risk per trade</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="3_5_PERCENT" id="3_5_PERCENT" data-testid="radio-3-5-percent" />
                  <Label htmlFor="3_5_PERCENT" className="cursor-pointer flex-1">
                    <span className="font-medium">3-5% of capital</span>
                    <p className="text-xs text-muted-foreground">Moderate risk tolerance</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="5_PLUS_PERCENT" id="5_PLUS_PERCENT" data-testid="radio-5-plus-percent" />
                  <Label htmlFor="5_PLUS_PERCENT" className="cursor-pointer flex-1">
                    <span className="font-medium">5%+ of capital</span>
                    <p className="text-xs text-muted-foreground">Aggressive, higher risk per trade</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              className="w-full" 
              onClick={handleTraderSubmit}
              disabled={saveProfileMutation.isPending || !traderStyle || !riskPerTrade}
              data-testid="button-save-trader-profile"
            >
              {saveProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Trader Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
