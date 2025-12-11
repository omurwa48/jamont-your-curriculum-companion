import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Trophy, Zap, BookOpen, Target } from "lucide-react";

interface Notification {
  id: string;
  type: 'xp' | 'streak' | 'achievement' | 'level' | 'quiz';
  title: string;
  message: string;
  value?: number;
}

export const RealtimeNotifications = () => {
  const { session } = useAuth();
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Subscribe to learning_streaks changes
    const streakChannel = supabase
      .channel('streak-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'learning_streaks',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const oldStreak = (payload.old as any)?.current_streak || 0;
          const newStreak = (payload.new as any)?.current_streak || 0;
          
          if (newStreak > oldStreak) {
            showNotification({
              id: `streak-${Date.now()}`,
              type: 'streak',
              title: '🔥 Streak Extended!',
              message: `${newStreak} day streak! Keep it up!`,
              value: newStreak,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to user_profiles changes for XP/Level
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const oldXP = (payload.old as any)?.total_xp || 0;
          const newXP = (payload.new as any)?.total_xp || 0;
          const oldLevel = (payload.old as any)?.level || 1;
          const newLevel = (payload.new as any)?.level || 1;
          
          if (newLevel > oldLevel) {
            showNotification({
              id: `level-${Date.now()}`,
              type: 'level',
              title: '⬆️ Level Up!',
              message: `You've reached Level ${newLevel}!`,
              value: newLevel,
            });
          } else if (newXP > oldXP) {
            const xpGained = newXP - oldXP;
            showNotification({
              id: `xp-${Date.now()}`,
              type: 'xp',
              title: '+XP Earned!',
              message: `+${xpGained} XP`,
              value: xpGained,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to badge achievements
    const badgeChannel = supabase
      .channel('badge-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const badge = payload.new as any;
          showNotification({
            id: `badge-${Date.now()}`,
            type: 'achievement',
            title: '🏆 Achievement Unlocked!',
            message: badge.badge_name,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streakChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(badgeChannel);
    };
  }, [session?.user?.id]);

  const showNotification = (notif: Notification) => {
    setNotification(notif);
    
    // Also show toast
    toast.success(notif.message, {
      description: notif.title,
      duration: 3000,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'streak': return <Flame className="w-6 h-6 text-orange-500" />;
      case 'xp': return <Zap className="w-6 h-6 text-yellow-500" />;
      case 'level': return <Star className="w-6 h-6 text-purple-500" />;
      case 'achievement': return <Trophy className="w-6 h-6 text-amber-500" />;
      case 'quiz': return <Target className="w-6 h-6 text-green-500" />;
      default: return <BookOpen className="w-6 h-6 text-primary" />;
    }
  };

  const getGradient = (type: Notification['type']) => {
    switch (type) {
      case 'streak': return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
      case 'xp': return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 'level': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'achievement': return 'from-amber-500/20 to-yellow-500/20 border-amber-500/30';
      case 'quiz': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      default: return 'from-primary/20 to-secondary/20 border-primary/30';
    }
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r ${getGradient(notification.type)} backdrop-blur-lg border shadow-xl`}>
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {getIcon(notification.type)}
            </motion.div>
            <div>
              <p className="font-bold text-foreground">{notification.title}</p>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
            </div>
            {notification.value && notification.type === 'xp' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-2 px-3 py-1 bg-yellow-500 text-yellow-950 rounded-full font-bold text-sm"
              >
                +{notification.value}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
