import { useState, useEffect } from "react";
import { BookOpen, FileText, Brain, HelpCircle, Loader2, Sparkles, Copy, Check, Lightbulb, AlertTriangle, Calculator, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MathRenderer } from "@/components/MathRenderer";

interface Document {
  id: string;
  title: string;
  file_name: string;
}

interface Flashcard {
  front: string;
  back: string;
  type?: 'definition' | 'misconception' | 'formula' | 'example' | 'concept';
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

type FlashcardType = 'mixed' | 'definition' | 'misconception' | 'formula' | 'example';

const FLASHCARD_TYPES: { value: FlashcardType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'mixed', label: 'Mixed', icon: <Layers className="w-4 h-4" />, description: 'Diverse mix of all types' },
  { value: 'definition', label: 'Definitions', icon: <BookOpen className="w-4 h-4" />, description: 'Term → Definition' },
  { value: 'misconception', label: 'Misconceptions', icon: <AlertTriangle className="w-4 h-4" />, description: 'Common mistake → Correction' },
  { value: 'formula', label: 'Formula Intuition', icon: <Calculator className="w-4 h-4" />, description: 'Formula → Meaning' },
  { value: 'example', label: 'Example → Principle', icon: <Lightbulb className="w-4 h-4" />, description: 'Example → Underlying rule' },
];

const StudyTools = () => {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Generated content
  const [summary, setSummary] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Enhanced flashcard options
  const [flashcardType, setFlashcardType] = useState<FlashcardType>('mixed');

  // Load documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id, title, file_name')
          .eq('upload_status', 'completed')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoadingDocs(false);
      }
    };
    loadDocuments();
  }, []);

  const generateSummary = async () => {
    if (!selectedDoc || !session) return;
    setLoading(true);
    setSummary("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-study-content', {
        body: { documentId: selectedDoc, type: 'summary' }
      });

      if (error) throw error;
      setSummary(data.content);
      toast.success("Summary generated!");
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    if (!selectedDoc || !session) return;
    setLoading(true);
    setFlashcards([]);
    setCurrentFlashcard(0);
    setFlipped(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-study-content', {
        body: { documentId: selectedDoc, type: 'flashcards', flashcardType }
      });

      if (error) throw error;
      setFlashcards(data.flashcards || []);
      toast.success(`Generated ${data.flashcards?.length || 0} ${flashcardType} flashcards!`);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast.error("Failed to generate flashcards");
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!selectedDoc || !session) return;
    setLoading(true);
    setQuiz([]);
    setCurrentQuiz(0);
    setSelectedAnswer(null);
    setShowResult(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-study-content', {
        body: { documentId: selectedDoc, type: 'quiz' }
      });

      if (error) throw error;
      setQuiz(data.questions || []);
      toast.success(`Generated ${data.questions?.length || 0} quiz questions!`);
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQuiz < quiz.length - 1) {
      setCurrentQuiz(currentQuiz + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const getFlashcardTypeIcon = (type?: string) => {
    switch (type) {
      case 'definition': return <BookOpen className="w-3 h-3" />;
      case 'misconception': return <AlertTriangle className="w-3 h-3" />;
      case 'formula': return <Calculator className="w-3 h-3" />;
      case 'example': return <Lightbulb className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  const getFlashcardTypeLabel = (type?: string) => {
    switch (type) {
      case 'definition': return 'Definition';
      case 'misconception': return 'Misconception';
      case 'formula': return 'Formula';
      case 'example': return 'Example';
      default: return 'Concept';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-medium text-primary">Study Tools</span>
          </div>
          <h1 className="text-3xl font-bold">AI-Powered Learning</h1>
          <p className="text-muted-foreground">
            Generate summaries, flashcards, and quizzes from your curriculum
          </p>
        </div>

        {/* Document Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Select Document
            </CardTitle>
            <CardDescription>
              Choose a curriculum document to generate study materials from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedDoc} onValueChange={setSelectedDoc}>
              <SelectTrigger>
                <SelectValue placeholder={loadingDocs ? "Loading documents..." : "Select a document"} />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title || doc.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {documents.length === 0 && !loadingDocs && (
              <p className="text-sm text-muted-foreground mt-2">
                No documents found. Upload curriculum in the Curriculum Library first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Study Tools Tabs */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Quiz
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>AI Summary</CardTitle>
                <CardDescription>
                  Get a comprehensive summary of your curriculum document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={generateSummary} 
                  disabled={!selectedDoc || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>

                {summary && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <div className="p-4 bg-muted/30 rounded-lg prose prose-sm max-w-none dark:prose-invert">
                      <MathRenderer content={summary} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Flashcards</CardTitle>
                <CardDescription>
                  Generate different types of flashcards for deeper learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Flashcard Type Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Flashcard Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {FLASHCARD_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFlashcardType(type.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          flashcardType === type.value
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={flashcardType === type.value ? 'text-primary' : 'text-muted-foreground'}>
                            {type.icon}
                          </span>
                          <span className="text-sm font-medium">{type.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground hidden sm:block">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={generateFlashcards} 
                  disabled={!selectedDoc || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Generate {FLASHCARD_TYPES.find(t => t.value === flashcardType)?.label} Flashcards
                    </>
                  )}
                </Button>

                {flashcards.length > 0 && (
                  <div className="space-y-4">
                    <div 
                      className="min-h-[200px] p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl cursor-pointer transition-all hover:shadow-lg flex flex-col items-center justify-center relative"
                      onClick={() => setFlipped(!flipped)}
                    >
                      {/* Type badge */}
                      {flashcards[currentFlashcard].type && (
                        <Badge variant="secondary" className="absolute top-4 left-4 flex items-center gap-1">
                          {getFlashcardTypeIcon(flashcards[currentFlashcard].type)}
                          {getFlashcardTypeLabel(flashcards[currentFlashcard].type)}
                        </Badge>
                      )}
                      
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">
                          {flipped ? "Answer" : "Question"} • Click to flip
                        </p>
                        <div className="text-lg font-medium">
                          <MathRenderer 
                            content={flipped ? flashcards[currentFlashcard].back : flashcards[currentFlashcard].front} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentFlashcard(Math.max(0, currentFlashcard - 1));
                          setFlipped(false);
                        }}
                        disabled={currentFlashcard === 0}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentFlashcard + 1} / {flashcards.length}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentFlashcard(Math.min(flashcards.length - 1, currentFlashcard + 1));
                          setFlipped(false);
                        }}
                        disabled={currentFlashcard === flashcards.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz">
            <Card>
              <CardHeader>
                <CardTitle>Practice Quiz</CardTitle>
                <CardDescription>
                  Test your knowledge with AI-generated questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={generateQuiz} 
                  disabled={!selectedDoc || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>

                {quiz.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        Question {currentQuiz + 1} of {quiz.length}
                      </p>
                      <div className="text-lg font-medium mb-4">
                        <MathRenderer content={quiz[currentQuiz].question} />
                      </div>

                      <div className="space-y-2">
                        {quiz[currentQuiz].options.map((option, index) => (
                          <button
                            key={index}
                            className={`w-full p-3 text-left rounded-lg border transition-all ${
                              selectedAnswer === index
                                ? showResult
                                  ? index === quiz[currentQuiz].correct
                                    ? "bg-green-500/20 border-green-500"
                                    : "bg-red-500/20 border-red-500"
                                  : "bg-primary/20 border-primary"
                                : showResult && index === quiz[currentQuiz].correct
                                  ? "bg-green-500/20 border-green-500"
                                  : "bg-card hover:bg-muted/50 border-border"
                            }`}
                            onClick={() => !showResult && handleAnswerSelect(index)}
                            disabled={showResult}
                          >
                            <MathRenderer content={option} />
                          </button>
                        ))}
                      </div>

                      {showResult && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-1">
                            {selectedAnswer === quiz[currentQuiz].correct ? "✅ Correct!" : "❌ Incorrect"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <MathRenderer content={quiz[currentQuiz].explanation} />
                          </p>
                        </div>
                      )}
                    </div>

                    {showResult && currentQuiz < quiz.length - 1 && (
                      <Button onClick={nextQuestion} className="w-full">
                        Next Question
                      </Button>
                    )}

                    {showResult && currentQuiz === quiz.length - 1 && (
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <p className="font-medium">Quiz Complete! 🎉</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => {
                            setCurrentQuiz(0);
                            setSelectedAnswer(null);
                            setShowResult(false);
                          }}
                        >
                          Restart Quiz
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudyTools;