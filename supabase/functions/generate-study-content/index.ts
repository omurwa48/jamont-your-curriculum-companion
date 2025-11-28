import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { documentId, type } = await req.json();

    if (!documentId || !type) {
      throw new Error('Missing documentId or type');
    }

    // Fetch document chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('chunk_text')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .limit(20);

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      throw new Error('No content found for this document');
    }

    const content = chunks.map(c => c.chunk_text).join('\n\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'summary':
        systemPrompt = `You are an expert educational content summarizer. Create clear, comprehensive summaries that help students understand key concepts. Use bullet points, headers, and examples where appropriate. If the content contains mathematical formulas, preserve them using LaTeX notation (e.g., $E = mc^2$ for inline, $$\\int f(x)dx$$ for display).`;
        userPrompt = `Summarize the following curriculum content in a way that's easy to understand and study from:\n\n${content}`;
        break;

      case 'flashcards':
        systemPrompt = `You are an expert at creating educational flashcards. Create flashcards that test key concepts, definitions, formulas, and important facts. Return your response as a JSON array of objects with "front" (question) and "back" (answer) properties. Use LaTeX notation for any math (e.g., $x^2$). Return ONLY the JSON array, no other text.`;
        userPrompt = `Create 10 flashcards from this curriculum content:\n\n${content}`;
        break;

      case 'quiz':
        systemPrompt = `You are an expert at creating educational quizzes. Create multiple-choice questions that test understanding of key concepts. Return your response as a JSON array of objects with: "question" (string), "options" (array of 4 strings), "correct" (index 0-3 of correct answer), "explanation" (string explaining why). Use LaTeX notation for math. Return ONLY the JSON array, no other text.`;
        userPrompt = `Create 5 quiz questions from this curriculum content:\n\n${content}`;
        break;

      default:
        throw new Error('Invalid type. Must be summary, flashcards, or quiz');
    }

    console.log(`Generating ${type} for document ${documentId}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate content');
    }

    const aiResponse = await response.json();
    const generatedContent = aiResponse.choices?.[0]?.message?.content || '';

    console.log(`Generated ${type} content:`, generatedContent.substring(0, 200));

    let result: Record<string, unknown> = {};

    if (type === 'summary') {
      result = { content: generatedContent };
    } else {
      // Parse JSON for flashcards and quiz
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = generatedContent;
        const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonStr.trim());
        
        if (type === 'flashcards') {
          result = { flashcards: parsed };
        } else if (type === 'quiz') {
          result = { questions: parsed };
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        throw new Error('Failed to parse generated content');
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-study-content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
