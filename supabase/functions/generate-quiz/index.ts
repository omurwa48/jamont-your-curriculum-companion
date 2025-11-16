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

    const { topic, difficulty = 'medium', count = 5 } = await req.json();

    console.log(`Generating ${count} quizzes for topic: ${topic}, difficulty: ${difficulty}`);

    // Fetch relevant document chunks
    const { data: chunks, error: chunksError } = await supabaseClient
      .from('document_chunks')
      .select('chunk_text, document_id')
      .eq('user_id', user.id)
      .limit(5);

    if (chunksError) throw chunksError;

    const context = chunks && chunks.length > 0
      ? chunks.map(c => c.chunk_text).join('\n\n')
      : 'No curriculum uploaded yet.';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Based on this curriculum content about "${topic}", generate ${count} multiple-choice quiz questions at ${difficulty} difficulty level.

Curriculum Content:
${context}

Generate questions in this EXACT JSON format (return ONLY valid JSON, no markdown):
{
  "questions": [
    {
      "question": "Question text here (use LaTeX for math: $x^2$ for inline, $$equation$$ for display)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Detailed explanation with step-by-step solution"
    }
  ]
}

Requirements:
- Questions must be directly from the curriculum content
- Include clear explanations for correct answers
- Use proper LaTeX notation for any mathematical expressions
- Vary question types (conceptual, application, problem-solving)
- Make distractors (wrong options) plausible but clearly incorrect`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a quiz generator. Return ONLY valid JSON, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;
    
    // Parse JSON response, handling potential markdown code blocks
    let quizData;
    try {
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : generatedContent;
      quizData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedContent);
      throw new Error('Failed to parse quiz data from AI response');
    }

    // Store quizzes in database
    const quizInserts = quizData.questions.map((q: any) => ({
      user_id: user.id,
      topic,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty,
    }));

    const { data: insertedQuizzes, error: insertError } = await supabaseClient
      .from('quizzes')
      .insert(quizInserts)
      .select();

    if (insertError) throw insertError;

    console.log(`Generated ${insertedQuizzes.length} quizzes successfully`);

    return new Response(
      JSON.stringify({ quizzes: insertedQuizzes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quiz:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});