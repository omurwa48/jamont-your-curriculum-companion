import { useState, useEffect } from "react";
import { Users, FileUp, TrendingUp, BookOpen, Clock, Award, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StudentProgress {
  id: string;
  user_id: string;
  display_name: string;
  total_xp: number;
  level: number;
  study_streak: number;
  topics_mastered: number;
  last_active: string;
}

interface DocumentStats {
  id: string;
  title: string;
  total_chunks: number;
  upload_status: string;
  created_at: string;
}

const TeacherDashboard = () => {
  const { session } = useAuth();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [documents, setDocuments] = useState<DocumentStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgProgress: 0,
    totalDocuments: 0,
    activeToday: 0
  });

  useEffect(() => {
    if (session?.user?.id) {
      checkTeacherRole();
    }
  }, [session]);

  const checkTeacherRole = async () => {
    try {
      // Check if user has teacher or admin role via RPC
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: session?.user?.id, _role: 'teacher' });
      
      if (error) {
        console.error('Error checking role:', error);
        setIsTeacher(false);
        setLoading(false);
        return;
      }

      // Also check for admin role
      const { data: isAdmin } = await supabase
        .rpc('has_role', { _user_id: session?.user?.id, _role: 'admin' });

      if (data || isAdmin) {
        setIsTeacher(true);
        loadDashboardData();
      } else {
        setIsTeacher(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking teacher role:', error);
      setIsTeacher(false);
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load student profiles with progress
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('total_xp', { ascending: false });

      if (profilesError) throw profilesError;

      // Load user progress data
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id, topic, mastery_level');

      if (progressError) throw progressError;

      // Aggregate progress by user
      const userMastery: Record<string, number> = {};
      progressData?.forEach(p => {
        if (!userMastery[p.user_id]) userMastery[p.user_id] = 0;
        if ((p.mastery_level || 0) >= 80) userMastery[p.user_id]++;
      });

      const enrichedStudents = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name || 'Anonymous Student',
        total_xp: p.total_xp || 0,
        level: p.level || 1,
        study_streak: p.study_streak || 0,
        topics_mastered: userMastery[p.user_id] || 0,
        last_active: p.updated_at || p.created_at
      }));

      setStudents(enrichedStudents);

      // Load documents
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);

      // Calculate stats
      const today = new Date().toDateString();
      const activeToday = enrichedStudents.filter(s => 
        new Date(s.last_active).toDateString() === today
      ).length;

      const avgXP = enrichedStudents.length > 0 
        ? enrichedStudents.reduce((acc, s) => acc + s.total_xp, 0) / enrichedStudents.length 
        : 0;

      setStats({
        totalStudents: enrichedStudents.length,
        avgProgress: Math.round(avgXP / 100), // Rough percentage
        totalDocuments: docs?.length || 0,
        activeToday
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading dashboard...</div>
      </div>
    );
  }

  // Access denied - user is not a teacher or admin
  if (isTeacher === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the Teacher Dashboard. 
              Only users with the teacher or admin role can view this page.
            </p>
            <Button variant="outline" asChild>
              <a href="/">Return to Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor student progress and manage curriculum
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            TR-Pad
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeToday}</p>
                  <p className="text-xs text-muted-foreground">Active Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                  <p className="text-xs text-muted-foreground">Curriculum Docs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                  <p className="text-xs text-muted-foreground">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="students" className="w-full">
          <TabsList>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Curriculum
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredStudents.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No students found
                  </CardContent>
                </Card>
              ) : (
                filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Student Info */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                            {student.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{student.display_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last active: {formatDate(student.last_active)}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-bold text-primary">{student.total_xp}</p>
                            <p className="text-xs text-muted-foreground">XP</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold">{student.level}</p>
                            <p className="text-xs text-muted-foreground">Level</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-orange-500">{student.study_streak}</p>
                            <p className="text-xs text-muted-foreground">Streak</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-green-500">{student.topics_mastered}</p>
                            <p className="text-xs text-muted-foreground">Mastered</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full md:w-32">
                          <Progress value={Math.min(100, student.total_xp / 10)} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {Math.min(100, Math.round(student.total_xp / 10))}% complete
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Curriculum</CardTitle>
                <CardDescription>
                  Documents available for students to learn from
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No curriculum documents uploaded yet</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href="/curriculum">Upload Curriculum</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.total_chunks || 0} chunks • {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={doc.upload_status === 'completed' ? 'default' : 'secondary'}>
                          {doc.upload_status}
                        </Badge>
                      </div>
                    ))}
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

export default TeacherDashboard;
