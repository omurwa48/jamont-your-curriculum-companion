import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Curriculum from "./pages/Curriculum";
import Chat from "./pages/Chat";
import Notebook from "./pages/Notebook";
import Progress from "./pages/Progress";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import StudyTools from "./pages/StudyTools";
import TeacherDashboard from "./pages/TeacherDashboard";
import Install from "./pages/Install";
import Quizzes from "./pages/Quizzes";
import Navigation from "./components/Navigation";
import SplashScreen from "./components/SplashScreen";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("hasSeenSplash");
    if (seen) {
      setShowSplash(false);
      setHasSeenSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setHasSeenSplash(true);
    sessionStorage.setItem("hasSeenSplash", "true");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && !hasSeenSplash && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Dashboard />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Courses />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/curriculum"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Curriculum />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notebook"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Notebook />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Progress />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Feed />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Profile />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/study-tools"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <StudyTools />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <TeacherDashboard />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="pb-16 md:pb-0 md:pt-16">
                  <Quizzes />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
