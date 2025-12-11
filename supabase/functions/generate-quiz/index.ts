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

    const { topic, difficulty = 'medium', count = 5, documentId } = await req.json();

    console.log(`Generating ${count} quizzes for topic: ${topic}, difficulty: ${difficulty}, doc: ${documentId || 'all'}`);

    // Fetch relevant document chunks - if documentId provided, filter by it
    let chunksQuery = supabaseClient
      .from('document_chunks')
      .select('chunk_text, document_id, page_number')
      .eq('user_id', user.id);
    
    if (documentId) {
      chunksQuery = chunksQuery.eq('document_id', documentId);
    }

    const { data: chunks, error: chunksError } = await chunksQuery.limit(15);

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No curriculum content found. Please upload documents first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine chunks with page references for better context
    const context = chunks
      .map((c, i) => `[Section ${i + 1}, Page ${c.page_number || 'N/A'}]:\n${c.chunk_text}`)
      .join('\n\n---\n\n');

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
    
    console.log('Raw AI response:', generatedContent.substring(0, 200));
    
    // Parse JSON response, handling potential markdown code blocks and special characters
    let quizData;
    try {
      let jsonStr = generatedContent;
      
      // Remove markdown code block markers if present
      const codeBlockMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      
      // If still not valid JSON, try to extract JSON object
      if (!jsonStr.startsWith('{')) {
        const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }
      
      // Sanitize common issues: replace Cyrillic lookalikes with ASCII equivalents
      jsonStr = jsonStr
        .replace(/с/g, ',')  // Cyrillic 'с' to comma
        .replace(/а/g, 'a')  // Cyrillic 'а' to ASCII 'a'
        .replace(/е/g, 'e')  // Cyrillic 'е' to ASCII 'e'
        .replace(/о/g, 'o')  // Cyrillic 'о' to ASCII 'o'
        .replace(/р/g, 'p')  // Cyrillic 'р' to ASCII 'p'
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
      
      quizData = JSON.parse(jsonStr);
      console.log('Parsed quiz data successfully');
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedContent);
      console.error('Parse error:', parseError);
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