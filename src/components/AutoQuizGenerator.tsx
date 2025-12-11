import { useState, useEffect } from "react";
import { Brain, Sparkles, Loader2, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Document {
  id: string;
  title: string;
  total_chunks: number;
}

interface AutoQuizGeneratorProps {
  onQuizGenerated: (quizzes: any[]) => void;
}

export const AutoQuizGenerator = ({ onQuizGenerated }: AutoQuizGeneratorProps) => {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [questionCount, setQuestionCount] = useState<string>("5");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");

  useEffect(() => {
    loadDocuments();
  }, [session?.user?.id]);

  const loadDocuments = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('documents')
      .select('id, title, total_chunks')
      .eq('user_id', session.user.id)
      .eq('upload_status', 'completed');

    if (!error && data) {
      setDocuments(data);
    }
  };

  const generateQuiz = async () => {
    if (!selectedDoc) {
      toast.error('Please select a document');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get the document title for the topic
      const doc = documents.find(d => d.id === selectedDoc);
      const topic = doc?.title || 'General';

      setGenerationStep('Fetching relevant content...');
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGenerationStep('Generating AI-powered questions...');

      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { 
          topic,
          documentId: selectedDoc,
          difficulty, 
          count: parseInt(questionCount) 
        }
      });

      if (error) throw error;

      if (data?.quizzes && data.quizzes.length > 0) {
        setGenerationStep('Quiz ready!');
        toast.success(`Generated ${data.quizzes.length} questions from "${topic}"`);
        onQuizGenerated(data.quizzes);
      } else {
        throw new Error('No quizzes generated');
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  return (
    <Card className="p-6 border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-lg">AI Quiz Generator</h3>
          <p className="text-sm text-muted-foreground">Generate quizzes from your uploaded materials</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Document Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Document</label>
          <Select value={selectedDoc} onValueChange={setSelectedDoc}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a document..." />
            </SelectTrigger>
            <SelectContent>
              {documents.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              ) : (
                documents.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{doc.title}</span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {doc.total_chunks} chunks
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Easy
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="hard">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Hard
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Questions</label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Questions</SelectItem>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={generateQuiz} 
          disabled={isGenerating || !selectedDoc}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          size="lg"
        >
          {isGenerating ? (
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{generationStep}</span>
            </motion.div>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Quiz
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        {documents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Upload curriculum documents first to generate quizzes
          </p>
        )}
      </div>
    </Card>
  );
};
