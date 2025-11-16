import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { topic, correct, timeSpent } = await req.json();

    console.log(`Updating progress for user ${user.id}, topic: ${topic}, correct: ${correct}`);

    // Get or create progress record
    const { data: existing, error: fetchError } = await supabaseClient
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic', topic)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let newMasteryLevel = 0;
    let questionsAnswered = 1;
    let correctAnswers = correct ? 1 : 0;

    if (existing) {
      questionsAnswered = existing.questions_answered + 1;
      correctAnswers = existing.correct_answers + (correct ? 1 : 0);
      const accuracy = (correctAnswers / questionsAnswered) * 100;
      newMasteryLevel = Math.min(100, Math.floor(accuracy));
    } else {
      newMasteryLevel = correct ? 20 : 0;
    }

    // Upsert progress
    const { error: upsertError } = await supabaseClient
      .from('user_progress')
      .upsert({
        user_id: user.id,
        topic,
        mastery_level: newMasteryLevel,
        questions_answered: questionsAnswered,
        correct_answers: correctAnswers,
        last_practiced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,topic'
      });

    if (upsertError) throw upsertError;

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const { data: streak, error: streakFetchError } = await supabaseClient
      .from('learning_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (streakFetchError && streakFetchError.code !== 'PGRST116') {
      throw streakFetchError;
    }

    let newStreak = 1;
    let longestStreak = 1;
    let totalPoints = 10; // Points for this activity

    if (streak) {
      const lastDate = streak.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === today) {
        // Same day, no streak change
        newStreak = streak.current_streak;
      } else if (lastDate === yesterdayStr) {
        // Consecutive day
        newStreak = streak.current_streak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
      longestStreak = Math.max(newStreak, streak.longest_streak);
      totalPoints = streak.total_points + 10;
    }

    const { error: streakUpsertError } = await supabaseClient
      .from('learning_streaks')
      .upsert({
        user_id: user.id,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
        total_points: totalPoints,
      }, {
        onConflict: 'user_id'
      });

    if (streakUpsertError) throw streakUpsertError;

    // Check for new badges
    const badges = [];
    if (newStreak === 7) {
      badges.push({ type: 'streak', name: '7-Day Streak', description: 'Practiced for 7 consecutive days!' });
    }
    if (newStreak === 30) {
      badges.push({ type: 'streak', name: '30-Day Champion', description: 'Practiced for 30 consecutive days!' });
    }
    if (newMasteryLevel >= 80 && !existing) {
      badges.push({ type: 'mastery', name: 'Quick Learner', description: 'Achieved 80% mastery on first try!' });
    }
    if (totalPoints >= 100) {
      badges.push({ type: 'points', name: 'Century Club', description: 'Earned 100 points!' });
    }

    for (const badge of badges) {
      const { error: badgeError } = await supabaseClient
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_type: badge.type,
          badge_name: badge.name,
          badge_description: badge.description,
        });
      
      if (badgeError) console.error('Badge insert error:', badgeError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        masteryLevel: newMasteryLevel,
        streak: newStreak,
        totalPoints,
        newBadges: badges
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-progress:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});