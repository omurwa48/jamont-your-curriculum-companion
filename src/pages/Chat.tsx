import { useState, useEffect, useRef } from "react";
import { Send, BookOpen, Loader2, Sparkles, ArrowLeft, FolderOpen, Lightbulb, RefreshCw, Zap, MessageCircleQuestion, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [tutorMode, setTutorMode] = useState<"explain" | "test">("explain");
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
          content: "Hello! I'm **Jamont**, your AI tutor. I'm here to help you understand your curriculum materials with patience and clarity.\n\n### Getting Started\n- Upload your curriculum in the **Curriculum Library**\n- Ask me anything about your subjects\n- Use the **Study Tools** for summaries and flashcards\n\nWhat would you like to learn today?",
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm **Jamont**, your AI tutor. Ask me anything about your curriculum!",
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
        content: "Chat cleared! I'm **Jamont**, your AI tutor. What would you like to learn today?",
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

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          question: userContent,
          conversationHistory: messages.slice(-10),
          mode: explainMode,
          tutorMode: tutorMode,
        },
      });

      if (error) throw error;

      const answerText = data?.answer || data?.message || "I apologize, I could not generate a response. Please try again.";

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
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary-foreground animate-bounce" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Beautiful Header */}
      <header className="border-b bg-card/80 backdrop-blur-lg px-4 py-3 shrink-0 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card animate-pulse"></div>
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Jamont AI
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3 text-secondary" />
                {tutorMode === 'test' ? 'Socratic Mode' : 'Your Personal Tutor'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Explain vs Test Toggle */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
              <GraduationCap className={`w-4 h-4 transition-colors ${tutorMode === 'explain' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                id="tutor-mode"
                checked={tutorMode === 'test'}
                onCheckedChange={(checked) => setTutorMode(checked ? 'test' : 'explain')}
              />
              <MessageCircleQuestion className={`w-4 h-4 transition-colors ${tutorMode === 'test' ? 'text-secondary' : 'text-muted-foreground'}`} />
              <Label htmlFor="tutor-mode" className="text-xs font-medium cursor-pointer hidden sm:block">
                {tutorMode === 'test' ? 'Test Me' : 'Explain'}
              </Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/study-tools")}
              className="hidden sm:flex items-center gap-2 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
            >
              <Lightbulb className="w-4 h-4 text-secondary" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-medium">
                Study Tools
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/curriculum")}
              className="hidden sm:flex items-center gap-2 border-primary/20 hover:bg-primary/10"
            >
              <FolderOpen className="w-4 h-4" />
              Library
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearChat} 
              title="Clear chat"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            {/* Explanation mode - only show in explain mode */}
            {tutorMode === 'explain' && (
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <Sparkles className="w-4 h-4 text-secondary ml-2" />
                <Select value={explainMode} onValueChange={setExplainMode}>
                  <SelectTrigger className="w-[110px] h-8 text-xs border-0 bg-transparent">
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
            )}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-4">
          {/* Tutor mode indicator */}
          {tutorMode === 'test' && (
            <div className="mb-4 p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-sm">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="w-5 h-5 text-secondary" />
                <span className="font-medium text-secondary">Socratic Mode Active</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                I'll ask you questions to help you discover answers yourself, rather than explaining directly.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`mb-6 animate-fade-in`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`shrink-0 ${message.role === "user" ? "" : ""}`}>
                  {message.role === "user" ? (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md">
                      U
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                      <BookOpen className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className={`flex-1 max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}>
                  <span className={`font-semibold text-sm block mb-2 ${
                    message.role === "user" 
                      ? "text-secondary" 
                      : "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                  }`}>
                    {message.role === "user" ? "You" : "Jamont"}
                  </span>
                  <div className={`rounded-2xl p-4 ${
                    message.role === "user" 
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto rounded-tr-md" 
                      : "bg-card border border-border/50 shadow-sm rounded-tl-md"
                  }`}>
                    <div className={`prose prose-sm max-w-none ${
                      message.role === "user" 
                        ? "prose-invert text-primary-foreground" 
                        : "dark:prose-invert text-foreground"
                    }`}>
                      {message.role === "user" ? (
                        <p className="m-0">{message.content}</p>
                      ) : (
                        <MathRenderer content={message.content} />
                      )}
                    </div>
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 bg-muted/30 px-3 py-1.5 rounded-full w-fit">
                      <BookOpen className="w-3 h-3 text-primary" />
                      <span>From: {message.sources.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="mb-6 animate-fade-in">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-sm block mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Jamont
                  </span>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-md p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 bg-gradient-to-br from-primary to-secondary rounded-full animate-bounce" />
                        <div className="w-2.5 h-2.5 bg-gradient-to-br from-primary to-secondary rounded-full animate-bounce [animation-delay:0.15s]" />
                        <div className="w-2.5 h-2.5 bg-gradient-to-br from-primary to-secondary rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {tutorMode === 'test' ? 'Thinking of a question...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Beautiful Input Area */}
      <footer className="border-t bg-card/80 backdrop-blur-lg p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={tutorMode === 'test' 
                  ? "Ask a question and I'll help you think through it..."
                  : "Ask Jamont anything about your curriculum..."
                }
                className="min-h-[56px] max-h-[200px] resize-none pr-4 rounded-2xl border-primary/20 focus:border-primary/50 bg-background/50"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button 
              onClick={() => navigate("/study-tools")} 
              className="px-3 py-1.5 text-xs rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>📚</span> Summaries
            </button>
            <button 
              onClick={() => navigate("/study-tools")} 
              className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>🧠</span> Flashcards
            </button>
            <button 
              onClick={() => navigate("/quizzes")} 
              className="px-3 py-1.5 text-xs rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>❓</span> Quizzes
            </button>
            <button 
              onClick={() => navigate("/curriculum")} 
              className="px-3 py-1.5 text-xs rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>📁</span> Upload Curriculum
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Chat;