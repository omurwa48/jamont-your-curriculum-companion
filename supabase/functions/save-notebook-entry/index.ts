import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { title, content, topic, sources } = await req.json();
    
    if (!title || !content) {
      throw new Error('Title and content are required');
    }

    console.log(`Saving notebook entry for user ${user.id}: ${title}`);

    // Save to notebook_entries table
    const { data, error } = await supabase
      .from('notebook_entries')
      .insert({
        user_id: user.id,
        title,
        content,
        topic: topic || null,
        sources: sources || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving notebook entry:', error);
      throw error;
    }

    console.log(`Notebook entry saved with ID: ${data.id}`);

    return new Response(
      JSON.stringify({ success: true, entry: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-notebook-entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
