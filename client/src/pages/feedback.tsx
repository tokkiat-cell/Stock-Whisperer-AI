import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  HelpCircle, 
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "How do I connect to Moomoo for trading?",
    answer: "Go to Moomoo Trading page, click Settings, and configure your gateway host (usually 127.0.0.1) and port (4002 for paper trading, 4001 for live). Make sure Moomoo OpenAPI gateway is running on your computer."
  },
  {
    question: "How do I import my portfolio from Excel?",
    answer: "In the Portfolio page, click 'Import from Excel'. Your Excel file should have columns: Symbol, Shares, and Cost Basis (or Average Cost). The system will automatically match the columns."
  },
  {
    question: "What is the AI Scanner and how does it work?",
    answer: "The AI Scanner analyzes S&P 500 stocks using technical indicators like moving averages and price patterns. It generates BUY or SELL recommendations with specific entry prices, stop-loss, and take-profit levels."
  },
  {
    question: "How are the stop-loss and take-profit levels calculated?",
    answer: "The AI uses technical analysis to identify key support and resistance levels. Stop-loss is typically placed below recent support for BUY orders, and take-profit is based on the next resistance level, aiming for a favorable risk/reward ratio."
  },
  {
    question: "Is my Moomoo login information stored?",
    answer: "Your Moomoo credentials are only used for the current browser session and are not permanently stored. You'll need to login again when you start a new session."
  },
  {
    question: "How do I add stocks to my watchlist?",
    answer: "On the Dashboard, use the 'Add to Watchlist' section. Enter a stock symbol and click Add. Your watchlist is saved to your account and will persist across sessions."
  },
  {
    question: "What markets are supported?",
    answer: "Currently, we support US markets (NYSE, NASDAQ) and Singapore markets (SGX). You can configure which markets to display in your preferences."
  },
  {
    question: "How often is the market data updated?",
    answer: "Market data is fetched in real-time when you load pages. Pre-market and after-hours data is also available for US stocks."
  }
];

export default function FeedbackPage() {
  const { toast } = useToast();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    subject: "",
    message: "",
    email: ""
  });
  const [questionForm, setQuestionForm] = useState({
    question: "",
    email: ""
  });

  const handleSubmitFeedback = () => {
    if (!feedbackForm.subject || !feedbackForm.message) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in subject and message." });
      return;
    }
    toast({ title: "Feedback Submitted", description: "Thank you for your feedback! We'll review it soon." });
    setFeedbackForm({ subject: "", message: "", email: "" });
  };

  const handleSubmitQuestion = () => {
    if (!questionForm.question) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your question." });
      return;
    }
    toast({ title: "Question Submitted", description: "Thank you! We'll get back to you soon." });
    setQuestionForm({ question: "", email: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Q&A and Feedback
        </h2>
        <p className="text-muted-foreground mt-1">
          Get answers to common questions or share your feedback with us
        </p>
      </div>

      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList>
          <TabsTrigger value="faq" data-testid="tab-faq">
            <HelpCircle className="w-4 h-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="question" data-testid="tab-ask-question">
            <MessageSquare className="w-4 h-4 mr-2" />
            Ask a Question
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <Send className="w-4 h-4 mr-2" />
            Submit Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {faqItems.map((item, index) => (
                <div 
                  key={index} 
                  className="border border-border rounded-lg overflow-hidden"
                  data-testid={`faq-item-${index}`}
                >
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    data-testid={`faq-toggle-${index}`}
                  >
                    <span className="font-medium pr-4">{item.question}</span>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-4 pb-4 text-muted-foreground">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="question" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>Can't find an answer? Ask us directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Question *</Label>
                <Textarea
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="What would you like to know about TK Stock Whisperper.AI?"
                  rows={4}
                  data-testid="input-question"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={questionForm.email}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com (for follow-up)"
                  data-testid="input-question-email"
                />
                <p className="text-xs text-muted-foreground">Provide your email if you'd like us to respond directly</p>
              </div>
              <Button onClick={handleSubmitQuestion} data-testid="button-submit-question">
                <Send className="w-4 h-4 mr-2" />
                Submit Question
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit Feedback</CardTitle>
              <CardDescription>Help us improve TK Stock Whisperper.AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  value={feedbackForm.subject}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Feature Request, Bug Report, Suggestion"
                  data-testid="input-feedback-subject"
                />
              </div>
              <div className="space-y-2">
                <Label>Your Feedback *</Label>
                <Textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  data-testid="input-feedback-message"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={feedbackForm.email}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  data-testid="input-feedback-email"
                />
              </div>
              <Button onClick={handleSubmitFeedback} data-testid="button-submit-feedback">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
