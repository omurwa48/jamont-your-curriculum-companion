import { useState, useEffect, useRef } from "react";
import { Send, BookOpen, Loader2, Sparkles, ArrowLeft, FolderOpen, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const Chat = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [explainMode, setExplainMode] = useState("default");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          sources: msg.sources || []
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Hello! I'm Jamont, your AI tutor. I'm here to help you understand your curriculum materials. Upload your curriculum in the Curriculum Library, then ask me anything!",
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Jamont, your AI tutor. Ask me anything about your curriculum!",
      }]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const clearChat = async () => {
    try {
      if (session?.user?.id) {
        await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', session.user.id);
      }
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Chat cleared! I'm Jamont, your AI tutor. What would you like to learn today?",
      }]);
      toast.success("Chat cleared!");
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error("Failed to clear chat");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !session) return;

    const userContent = input.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          question: userContent,
          conversationHistory: messages.slice(-10),
          mode: explainMode,
        },
      });

      if (error) throw error;

      const answerText = data?.answer || data?.message || "I'm sorry, I couldn't generate a response.";

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: answerText,
        sources: data?.sources || [],
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
      
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingHistory) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Jamont AI</h1>
              <p className="text-xs text-muted-foreground">Your Personal Tutor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/study-tools")}
              className="hidden sm:flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Study Tools
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/curriculum")}
              className="hidden sm:flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Library
            </Button>
            <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <Select value={explainMode} onValueChange={setExplainMode}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="simplify">Simplify</SelectItem>
                  <SelectItem value="exam">Exam Mode</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area - Using native scroll instead of ScrollArea */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`px-4 py-4 ${
                message.role === "user" ? "bg-transparent" : "bg-muted/30"
              }`}
            >
              <div className="flex gap-3 max-w-3xl mx-auto">
                {/* Avatar */}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gradient-to-br from-primary to-secondary text-white"
                }`}>
                  {message.role === "user" ? "U" : <BookOpen className="w-4 h-4" />}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <span className="font-semibold text-sm block">
                    {message.role === "user" ? "You" : "Jamont"}
                  </span>
                  <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                    <MathRenderer content={message.content} />
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <BookOpen className="w-3 h-3" />
                      <span>Sources: {message.sources.join(" • ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="px-4 py-4 bg-muted/30">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <span className="font-semibold text-sm block">Jamont</span>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <footer className="border-t bg-card p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Jamont anything about your curriculum..."
              className="min-h-[56px] max-h-[200px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-14 w-14 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
            <button 
              onClick={() => navigate("/study-tools")} 
              className="hover:text-primary transition-colors"
            >
              📚 Summaries
            </button>
            <span>•</span>
            <button 
              onClick={() => navigate("/study-tools")} 
              className="hover:text-primary transition-colors"
            >
              🧠 Flashcards
            </button>
            <span>•</span>
            <button 
              onClick={() => navigate("/quizzes")} 
              className="hover:text-primary transition-colors"
            >
              ❓ Quizzes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Chat;
