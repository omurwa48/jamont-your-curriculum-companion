import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressCircle } from "@/components/ProgressCircle";
import { StreakWidget } from "@/components/StreakWidget";
import { Loader2, BookOpen, Target, TrendingUp, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  completed_lessons: number;
  total_lessons: number;
}

interface DailyGoal {
  xpEarned: number;
  xpGoal: number;
  lessonsCompleted: number;
  lessonsGoal: number;
}

const Dashboard = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({ 
    xpEarned: 0, 
    xpGoal: 50, 
    lessonsCompleted: 0, 
    lessonsGoal: 3 
  });
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (session?.user) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    if (!session?.user?.id) return;
    
    try {
      const [coursesData, streakData, profileData] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('learning_streaks').select('*').single(),
        supabase.from('user_profiles').select('*').eq('user_id', session.user.id).single(),
      ]);

      if (coursesData.data) setCourses(coursesData.data);
      if (streakData.data) setStreak(streakData.data);
      if (profileData.data) {
        setTotalXP(profileData.data.total_xp || 0);
        setLevel(profileData.data.level || 1);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalProgress = courses.reduce((acc, course) => {
    return acc + (course.total_lessons > 0 ? (course.completed_lessons / course.total_lessons) * 100 : 0);
  }, 0) / (courses.length || 1);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">Continue your learning journey</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">Level {level}</div>
            <div className="text-sm text-muted-foreground">{totalXP} XP</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Goal */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Daily Goal
              </h3>
            </div>
            <ProgressCircle progress={(dailyGoal.xpEarned / dailyGoal.xpGoal) * 100} size={100} />
            <p className="text-center mt-4 text-sm text-muted-foreground">
              {dailyGoal.xpEarned} / {dailyGoal.xpGoal} XP
            </p>
          </Card>

          {/* Streak */}
          <StreakWidget 
            currentStreak={streak.current_streak} 
            longestStreak={streak.longest_streak}
          />

          {/* Overall Progress */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Overall Progress
              </h3>
            </div>
            <ProgressCircle progress={totalProgress} size={100} />
            <p className="text-center mt-4 text-sm text-muted-foreground">
              {courses.length} courses in progress
            </p>
          </Card>
        </div>

        {/* What You're Studying */}
        <Card className="p-6 animate-bounce-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            What You're Studying
          </h2>
          
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No courses yet. Start learning today!</p>
              <Button onClick={() => navigate('/curriculum')} className="animate-wiggle">Upload Curriculum</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course, index) => {
                const progress = course.total_lessons > 0 
                  ? (course.completed_lessons / course.total_lessons) * 100 
                  : 0;
                
                return (
                  <div 
                    key={course.id} 
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:shadow-md transition-all hover:scale-[1.02] animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ProgressCircle progress={progress} size={60} strokeWidth={6} />
                    <div className="flex-1">
                      <h3 className="font-medium">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.completed_lessons} / {course.total_lessons} lessons completed
                      </p>
                    </div>
                    <Button onClick={() => navigate('/chat')} className="hover:scale-105 transition-transform">Continue</Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] animate-slide-up" onClick={() => navigate('/chat')}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ask Jamont</h3>
                <p className="text-sm text-muted-foreground">Get help with your studies</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] animate-slide-up" style={{ animationDelay: '100ms' }} onClick={() => navigate('/progress')}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">View Progress</h3>
                <p className="text-sm text-muted-foreground">Track your achievements</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;