import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle, XCircle, ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MathRenderer } from "@/components/MathRenderer";
import { AutoQuizGenerator } from "@/components/AutoQuizGenerator";
import { LoadingScreen } from "@/components/LoadingScreen";
import { motion, AnimatePresence } from "framer-motion";

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
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizComplete, setQuizComplete] = useState(false);

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

  const handleQuizGenerated = (newQuizzes: any[]) => {
    const transformed = newQuizzes.map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options as string[] : []
    }));
    setQuizzes(transformed);
    setCurrentQuizIndex(0);
    setSelectedAnswer("");
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
    setQuizComplete(false);
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
      setQuizComplete(true);
      const finalScore = score.correct + (isCorrect ? 1 : 0);
      const totalQuestions = score.total + 1;
      toast.success(`Quiz completed! Score: ${finalScore}/${totalQuestions}`);
    }
  };

  const resetQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswer("");
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
    setQuizComplete(false);
  };

  const currentQuiz = quizzes[currentQuizIndex];

  if (loading) {
    return <LoadingScreen message="Loading quizzes..." />;
  }

  // Quiz Completed Screen
  if (quizComplete && quizzes.length > 0) {
    const finalScore = score.correct;
    const totalQuestions = score.total;
    const percentage = Math.round((finalScore / totalQuestions) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card className="p-8 border-2 border-primary/20">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
              >
                <Trophy className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              
              <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
              <p className="text-muted-foreground mb-6">Great effort on your learning journey</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold text-primary">{finalScore}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold text-secondary">{percentage}%</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetQuiz} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={() => navigate('/dashboard')} className="flex-1">
                  Continue Learning
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
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
        </motion.div>

        {/* Auto Quiz Generator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AutoQuizGenerator onQuizGenerated={handleQuizGenerated} />
        </motion.div>

        {/* Score */}
        <AnimatePresence>
          {score.total > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Current Score</span>
                  <Badge variant="secondary" className="text-lg px-4 py-1 bg-primary text-primary-foreground">
                    {score.correct}/{score.total}
                  </Badge>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Interface */}
        <AnimatePresence mode="wait">
          {currentQuiz ? (
            <motion.div
              key={currentQuizIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6 border-2 border-border/50">
                <div className="flex justify-between items-center mb-4">
                  <Badge variant="outline" className="bg-primary/10">
                    {currentQuiz.topic}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      currentQuiz.difficulty === 'easy' ? 'secondary' :
                      currentQuiz.difficulty === 'hard' ? 'destructive' : 'default'
                    }>
                      {currentQuiz.difficulty}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {currentQuizIndex + 1} / {quizzes.length}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuizIndex + 1) / quizzes.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <div className="mb-6 text-lg">
                  <MathRenderer content={currentQuiz.question} />
                </div>
                
                <div className="space-y-3 mb-6">
                  {currentQuiz.options.map((option, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Button
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
                        className={`w-full justify-start text-left h-auto py-4 px-4 transition-all ${
                          !showResult && selectedAnswer !== option ? 'hover:border-primary/50 hover:bg-primary/5' : ''
                        }`}
                        onClick={() => !showResult && setSelectedAnswer(option)}
                        disabled={showResult}
                      >
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 font-bold text-sm shrink-0">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">
                          <MathRenderer content={option} />
                        </span>
                        {showResult && option === currentQuiz.correct_answer && (
                          <CheckCircle className="w-5 h-5 text-green-500 ml-2 shrink-0" />
                        )}
                        {showResult && selectedAnswer === option && option !== currentQuiz.correct_answer && (
                          <XCircle className="w-5 h-5 text-red-500 ml-2 shrink-0" />
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>

                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card className={`p-4 mb-4 border-2 ${
                        isCorrect 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                          : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-semibold">
                            {isCorrect ? 'Correct! Well done!' : 'Incorrect - Keep learning!'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <MathRenderer content={currentQuiz.explanation} />
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  {!showResult ? (
                    <Button 
                      onClick={submitAnswer} 
                      disabled={!selectedAnswer} 
                      className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button 
                      onClick={nextQuestion} 
                      className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      {currentQuizIndex < quizzes.length - 1 ? 'Next Question →' : 'See Results 🎉'}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="p-12 text-center border-2 border-dashed border-muted-foreground/20">
                <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">No Quizzes Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Use the AI Quiz Generator above to create personalized quizzes from your uploaded curriculum materials.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Quizzes;
