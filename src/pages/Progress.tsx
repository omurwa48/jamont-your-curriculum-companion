import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Flame, Award, BookOpen, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  description: string;
  total_lessons: number;
  completed_lessons: number;
  difficulty: string;
  estimated_hours: number;
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  total_chunks: number;
  upload_status: string;
  created_at: string;
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

const Progress = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const [coursesData, documentsData, badgesData, streakData] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('user_badges').select('*').order('earned_at', { ascending: false }),
        supabase.from('learning_streaks').select('*').single(),
      ]);

      if (coursesData.data) setCourses(coursesData.data);
      if (documentsData.data) setDocuments(documentsData.data);
      if (badgesData.data) setBadges(badgesData.data);
      if (streakData.data) setStreak(streakData.data);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (course: Course) => {
    if (!course.total_lessons || course.total_lessons === 0) return 0;
    return Math.round((course.completed_lessons / course.total_lessons) * 100);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
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

        {/* Course Progress */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Course Progress
          </h2>
          
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No courses added yet.</p>
              <p className="text-sm text-muted-foreground">
                Go to the Dashboard to create courses and track your progress here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {courses.map((course) => {
                const progress = getProgressPercentage(course);
                return (
                  <div key={course.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                        )}
                      </div>
                      <Badge variant={progress === 100 ? "default" : "secondary"}>
                        {course.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {course.completed_lessons} of {course.total_lessons} lessons completed
                        </span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} className="h-2" />
                      
                      <div className="flex justify-between items-center text-sm text-muted-foreground pt-2">
                        <span>{course.estimated_hours} hours estimated</span>
                        {progress === 100 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Curriculum Documents */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Uploaded Curriculum
            </h2>
            <button 
              onClick={() => navigate('/curriculum')}
              className="text-sm text-primary hover:underline"
            >
              Manage Library →
            </button>
          </div>
          
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No curriculum documents uploaded.</p>
              <button 
                onClick={() => navigate('/curriculum')}
                className="text-primary hover:underline"
              >
                Upload your first document →
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.total_chunks} sections • {doc.upload_status}
                      </p>
                    </div>
                  </div>
                  {doc.upload_status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Progress;