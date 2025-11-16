import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Flame, Target, Award, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface TopicProgress {
  id: string;
  topic: string;
  mastery_level: number;
  questions_answered: number;
  correct_answers: number;
  last_practiced_at: string;
}

interface UserBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
}

interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  total_points: number;
  last_activity_date: string;
}

interface Quiz {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

const Progress = () => {
  const { session } = useAuth();
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const [progressData, badgesData, streakData] = await Promise.all([
        supabase.from('user_progress').select('*').order('last_practiced_at', { ascending: false }),
        supabase.from('user_badges').select('*').order('earned_at', { ascending: false }),
        supabase.from('learning_streaks').select('*').single(),
      ]);

      if (progressData.data) setProgress(progressData.data);
      if (badgesData.data) setBadges(badgesData.data);
      if (streakData.data) setStreak(streakData.data);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async (topic: string) => {
    setGeneratingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topic, difficulty: 'medium', count: 5 }
      });

      if (error) throw error;

      if (data?.quizzes && data.quizzes.length > 0) {
        setQuizzes(data.quizzes);
        setCurrentQuiz(data.quizzes[0]);
        toast.success(`Generated ${data.quizzes.length} quiz questions!`);
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error('Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentQuiz || !selectedAnswer) return;

    const correct = selectedAnswer === currentQuiz.correct_answer;
    setIsCorrect(correct);
    setShowResult(true);

    try {
      await supabase.functions.invoke('update-progress', {
        body: { 
          topic: currentQuiz.topic, 
          correct,
          timeSpent: 30 // Could track actual time
        }
      });

      await supabase.from('quiz_attempts').insert({
        user_id: session!.user.id,
        quiz_id: currentQuiz.id,
        user_answer: selectedAnswer,
        is_correct: correct,
        time_taken: 30,
      });

      // Reload progress
      await loadProgressData();
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const nextQuestion = () => {
    const currentIndex = quizzes.indexOf(currentQuiz!);
    if (currentIndex < quizzes.length - 1) {
      setCurrentQuiz(quizzes[currentIndex + 1]);
      setSelectedAnswer("");
      setShowResult(false);
    } else {
      toast.success('Quiz completed!');
      setCurrentQuiz(null);
      setQuizzes([]);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Your Learning Progress</h1>

        {/* Streak & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{streak?.current_streak || 0} days</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">{streak?.total_points || 0}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Badges Earned</p>
                <p className="text-2xl font-bold">{badges.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" /> Your Badges
            </h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.id} variant="secondary" className="p-3">
                  <div>
                    <p className="font-semibold">{badge.badge_name}</p>
                    <p className="text-xs text-muted-foreground">{badge.badge_description}</p>
                  </div>
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Topic Progress */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" /> Topic Mastery
          </h2>
          
          {progress.length === 0 ? (
            <p className="text-muted-foreground">No progress yet. Start learning to see your progress here!</p>
          ) : (
            <div className="space-y-4">
              {progress.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.correct_answers}/{item.questions_answered} correct
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{item.mastery_level}%</span>
                      <Button 
                        size="sm" 
                        onClick={() => generateQuiz(item.topic)}
                        disabled={generatingQuiz}
                      >
                        {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : "Practice"}
                      </Button>
                    </div>
                  </div>
                  <ProgressBar value={item.mastery_level} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quiz Interface */}
        {currentQuiz && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quiz: {currentQuiz.topic}</h2>
            <p className="mb-6">{currentQuiz.question}</p>
            
            <div className="space-y-2 mb-6">
              {currentQuiz.options.map((option, index) => (
                <Button
                  key={index}
                  variant={selectedAnswer === option ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => !showResult && setSelectedAnswer(option)}
                  disabled={showResult}
                >
                  {option}
                </Button>
              ))}
            </div>

            {showResult && (
              <div className={`p-4 rounded-lg mb-4 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <p className="font-semibold mb-2">
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p className="text-sm">{currentQuiz.explanation}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!showResult ? (
                <Button onClick={submitAnswer} disabled={!selectedAnswer}>
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={nextQuestion}>
                  Next Question
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Progress;