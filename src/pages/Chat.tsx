import { useState, useEffect, useRef } from "react";
import { Send, BookOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  created_at?: string;
}

const Chat = () => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [explainMode, setExplainMode] = useState("default");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data as Message[]);
      } else {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm Jamont, your AI tutor. I'm here to help you understand your curriculum materials with patience and clarity. Upload your curriculum in the Curriculum Library, then come back and ask me anything!",
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !session) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          question: input,
          conversationHistory: messages.slice(-10),
          mode: explainMode,
        },
      });

      console.log('Chat response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.answer) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from AI');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      };

      console.log('Adding assistant message:', assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);

      // Update progress if this was a learning interaction
      if (data.answer && !data.answer.includes("don't see that information")) {
        try {
          await supabase.functions.invoke('update-progress', {
            body: { 
              topic: input.split(' ').slice(0, 3).join(' '), // Simple topic extraction
              correct: true,
              timeSpent: 0 
            }
          });
        } catch (progressError) {
          console.error('Progress update error:', progressError);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response from Jamont. Please try again.');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again or upload your curriculum materials if you haven't already.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingHistory) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">Jamont</h1>
                <p className="text-sm text-muted-foreground">Your AI Tutor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <Select value={explainMode} onValueChange={setExplainMode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="simplify">Simplify</SelectItem>
                  <SelectItem value="exam">Exam Mode</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="teacher">Teacher Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-1">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`py-6 px-4 ${
                message.role === "user" 
                  ? "bg-background" 
                  : "bg-muted/30"
              } ${index === 0 ? "rounded-t-lg" : ""} ${index === messages.length - 1 ? "rounded-b-lg" : ""}`}
            >
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-gradient-to-br from-primary to-secondary text-white"
                  }`}>
                    {message.role === "user" ? (
                      <span className="text-sm font-bold">You</span>
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <span className="font-semibold text-sm">
                        {message.role === "user" ? "You" : "Jamont"}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                      <MathRenderer content={message.content} />
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BookOpen className="w-3 h-3" />
                          <span className="font-medium">Sources:</span>
                          <span>{message.sources.join(" • ")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="py-6 px-4 bg-muted/30">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1">
                      <span className="font-semibold text-sm">Jamont</span>
                    </div>
                    <div className="flex gap-1.5 items-center mt-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Jamont a question about your curriculum..."
            className="min-h-[60px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
