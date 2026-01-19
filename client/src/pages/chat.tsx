import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  MessageCircle, Send, Sparkles, Loader2, Bot, User, 
  Image, X, Search, Wallet, TrendingUp, BarChart3
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatAIResponse(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let listType: 'bullet' | 'numbered' | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'numbered') {
        elements.push(
          <ol key={elements.length} className="list-decimal list-inside space-y-1 my-2">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-1 my-2">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      flushList();
      return;
    }

    const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)$/);
    const numberedMatch = trimmedLine.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch) {
      if (listType !== 'bullet') {
        flushList();
        listType = 'bullet';
      }
      currentList.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (listType !== 'numbered') {
        flushList();
        listType = 'numbered';
      }
      currentList.push(numberedMatch[1]);
    } else {
      flushList();
      
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        elements.push(
          <p key={index} className="font-semibold text-sm my-2">
            {trimmedLine.slice(2, -2)}
          </p>
        );
      } else if (trimmedLine.startsWith('###')) {
        elements.push(
          <h4 key={index} className="font-semibold text-sm mt-3 mb-1">
            {trimmedLine.replace(/^#+\s*/, '')}
          </h4>
        );
      } else if (trimmedLine.startsWith('##')) {
        elements.push(
          <h3 key={index} className="font-bold text-base mt-4 mb-2">
            {trimmedLine.replace(/^#+\s*/, '')}
          </h3>
        );
      } else {
        const formattedText = trimmedLine
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');
        elements.push(
          <p 
            key={index} 
            className="text-sm leading-relaxed my-1"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      }
    }
  });

  flushList();
  return elements;
}

export default function ChatPage() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: recommendations } = useQuery<any[]>({
    queryKey: ["/api/sp500/recommendations"],
  });

  const chatMutation = useMutation({
    mutationFn: async ({ message, imageBase64 }: { message: string; imageBase64?: string }) => {
      const res = await apiRequest("POST", "/api/dashboard/chat", { message, imageBase64 });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      setSelectedImage(null);
      setImagePreview(null);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedImage) || chatMutation.isPending) return;
    
    let imageBase64: string | undefined;
    if (selectedImage) {
      const reader = new FileReader();
      imageBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedImage);
      });
    }
    
    const displayMessage = selectedImage 
      ? `${chatInput || "Analyze this image"} [Image attached]` 
      : chatInput;
    
    setMessages(prev => [...prev, { role: "user", content: displayMessage }]);
    chatMutation.mutate({ message: chatInput || "Analyze this image and extract any relevant information", imageBase64 });
    setChatInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = [
    "What stocks should I buy today?",
    "Explain the current market trend",
    "Give me a trading strategy for beginners",
    "What are the risks of day trading?",
    "Analyze the tech sector outlook"
  ];

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          TradeMind AI Assistant
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Ask me anything about stocks, trading strategies, or market analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-4rem)]">
        <Card className="lg:col-span-3 flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">TradeMind AI</h3>
                <span className="text-xs text-green-500">Online</span>
              </div>
            </div>
            {recommendations && recommendations.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {recommendations.length} active recommendations
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">How can I help you today?</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  I can help you analyze stocks, explain market trends, suggest trading strategies, and answer your investment questions.
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {quickPrompts.slice(0, 3).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setMessages([{ role: "user", content: prompt }]);
                        chatMutation.mutate(prompt);
                      }}
                      className="text-xs px-3 py-2 rounded-full bg-secondary hover-elevate text-muted-foreground"
                      data-testid={`button-quick-prompt-${i}`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[75%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-secondary rounded-bl-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <div className="space-y-1">
                      {formatAIResponse(msg.content)}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-secondary p-4 rounded-2xl rounded-bl-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Selected" 
                  className="max-h-24 rounded-lg border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  data-testid="button-remove-image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask TradeMind anything... (Shift+Enter for new line)"
                  disabled={chatMutation.isPending}
                  className="min-h-[80px] max-h-[200px] resize-none pr-12"
                  rows={3}
                  data-testid="input-chat-message"
                />
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  data-testid="input-image-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={chatMutation.isPending}
                  data-testid="button-attach-image"
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button type="submit" disabled={chatMutation.isPending} data-testid="button-send-message">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line. Click the image icon to attach a screenshot.
            </p>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Prompts
            </h3>
            <div className="space-y-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!chatMutation.isPending) {
                      setMessages(prev => [...prev, { role: "user", content: prompt }]);
                      chatMutation.mutate(prompt);
                    }
                  }}
                  disabled={chatMutation.isPending}
                  className="block w-full text-left text-xs p-3 rounded-lg bg-secondary/50 hover-elevate text-muted-foreground disabled:opacity-50"
                  data-testid={`button-sidebar-prompt-${i}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/scan">
                <Button variant="outline" className="w-full justify-start" size="sm" data-testid="link-scan">
                  <Search className="w-4 h-4 mr-2" />
                  Market Scanner
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button variant="outline" className="w-full justify-start" size="sm" data-testid="link-portfolio">
                  <Wallet className="w-4 h-4 mr-2" />
                  Portfolio
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full justify-start" size="sm" data-testid="link-dashboard">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Tips</h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                Attach screenshots for AI analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                Use stock symbols (e.g., AAPL, NVDA)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                Ask about market trends & sectors
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
