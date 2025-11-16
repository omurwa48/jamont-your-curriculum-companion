import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  description: string;
  total_lessons: number;
  completed_lessons: number;
  difficulty: string;
  estimated_hours: number;
  thumbnail_url: string | null;
}

const Courses = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    difficulty: 'beginner',
    estimated_hours: 10,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title) {
      toast.error("Please enter a course title");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('courses').insert({
        user_id: session!.user.id,
        ...newCourse,
        total_lessons: 0,
        completed_lessons: 0,
      });

      if (error) throw error;

      toast.success("Course created successfully!");
      setNewCourse({ title: '', description: '', difficulty: 'beginner', estimated_hours: 10 });
      loadCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error("Failed to create course");
    } finally {
      setCreating(false);
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">Organize your learning journey</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Course Title"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                />
                <Textarea
                  placeholder="Course Description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
                <Select
                  value={newCourse.difficulty}
                  onValueChange={(value) => setNewCourse({ ...newCourse, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Estimated Hours"
                  value={newCourse.estimated_hours}
                  onChange={(e) => setNewCourse({ ...newCourse, estimated_hours: parseInt(e.target.value) })}
                />
                <Button onClick={handleCreateCourse} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Course"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No courses yet. Create your first course to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="animate-slide-up">
                <CourseCard
                  title={course.title}
                  description={course.description}
                  totalLessons={course.total_lessons}
                  completedLessons={course.completed_lessons}
                  difficulty={course.difficulty}
                  estimatedHours={course.estimated_hours}
                  thumbnailUrl={course.thumbnail_url || undefined}
                  onContinue={() => navigate('/chat')}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;