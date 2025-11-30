import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, CheckCircle, XCircle, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MathRenderer } from "@/components/MathRenderer";

interface Quiz {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

const Quizzes = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transform data to ensure options is string[]
      const transformedQuizzes = (data || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : []
      }));
      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topic, difficulty: 'medium', count: 5 }
      });

      if (error) throw error;

      if (data?.quizzes && data.quizzes.length > 0) {
        setQuizzes(data.quizzes);
        setCurrentQuizIndex(0);
        setSelectedAnswer("");
        setShowResult(false);
        setScore({ correct: 0, total: 0 });
        toast.success(`Generated ${data.quizzes.length} quiz questions!`);
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error('Failed to generate quiz. Make sure you have curriculum uploaded.');
    } finally {
      setGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer || quizzes.length === 0) return;

    const currentQuiz = quizzes[currentQuizIndex];
    const correct = selectedAnswer === currentQuiz.correct_answer;
    setIsCorrect(correct);
    setShowResult(true);
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    // Record the attempt
    try {
      await supabase.from('quiz_attempts').insert({
        user_id: session!.user.id,
        quiz_id: currentQuiz.id,
        user_answer: selectedAnswer,
        is_correct: correct,
        time_taken: 30,
      });

      await supabase.functions.invoke('update-progress', {
        body: { topic: currentQuiz.topic, correct, timeSpent: 30 }
      });
    } catch (error) {
      console.error('Error recording attempt:', error);
    }
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer("");
      setShowResult(false);
    } else {
      toast.success(`Quiz completed! Score: ${score.correct + (isCorrect ? 1 : 0)}/${score.total + 1}`);
    }
  };

  const currentQuiz = quizzes[currentQuizIndex];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary" />
              Quizzes & Tests
            </h1>
            <p className="text-muted-foreground">Test your knowledge from your curriculum</p>
          </div>
        </div>

        {/* Generate Quiz */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Generate New Quiz</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Enter topic (e.g., Number Theory, Calculus)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateQuiz()}
            />
            <Button onClick={generateQuiz} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Score */}
        {score.total > 0 && (
          <Card className="p-4 bg-primary/5">
            <div className="flex justify-between items-center">
              <span className="font-medium">Current Score</span>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {score.correct}/{score.total}
              </Badge>
            </div>
          </Card>
        )}

        {/* Quiz Interface */}
        {currentQuiz ? (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Badge>{currentQuiz.topic}</Badge>
              <span className="text-sm text-muted-foreground">
                Question {currentQuizIndex + 1} of {quizzes.length}
              </span>
            </div>
            
            <div className="mb-6">
              <MathRenderer content={currentQuiz.question} />
            </div>
            
            <div className="space-y-2 mb-6">
              {currentQuiz.options.map((option, index) => (
                <Button
                  key={index}
                  variant={
                    showResult
                      ? option === currentQuiz.correct_answer
                        ? "default"
                        : selectedAnswer === option
                          ? "destructive"
                          : "outline"
                      : selectedAnswer === option
                        ? "default"
                        : "outline"
                  }
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => !showResult && setSelectedAnswer(option)}
                  disabled={showResult}
                >
                  <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
                  <MathRenderer content={option} />
                </Button>
              ))}
            </div>

            {showResult && (
              <Card className={`p-4 mb-4 ${isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-950/30' : 'bg-red-50 border-red-200 dark:bg-red-950/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                <div className="text-sm">
                  <MathRenderer content={currentQuiz.explanation} />
                </div>
              </Card>
            )}

            <div className="flex gap-2">
              {!showResult ? (
                <Button onClick={submitAnswer} disabled={!selectedAnswer} className="flex-1">
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={nextQuestion} className="flex-1">
                  {currentQuizIndex < quizzes.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Quizzes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate a quiz on any topic from your curriculum to test your knowledge.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Quizzes;