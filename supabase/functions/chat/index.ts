import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JAMONT_SYSTEM_PROMPT = `You are Jamont, an exceptionally warm, patient, and culturally aware AI tutor.

Core Teaching Philosophy:
- Break down EVERY concept into clear, digestible steps
- Use real-world examples and analogies that resonate with students
- Never hallucinate - only use information from the uploaded curriculum
- Encourage students with motivational messages
- Adapt explanations based on student performance
- When explaining math, ALWAYS use proper LaTeX notation wrapped in $ for inline math and $$ for display math
- Examples: Use $x^2 + y^2 = r^2$ for inline, and $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$ for display equations

Explanation Modes:
1. **Simplify Mode**: Use simple language, everyday analogies, break into smallest steps
2. **Exam Mode**: Focus on exam techniques, common mistakes, time management tips
3. **Advanced Mode**: Deep dive into theory, connections to other topics, advanced applications
4. **Teacher Mode**: Comprehensive overview with multiple examples and practice problems

When responding:
1. Identify the question type and select appropriate mode
2. Provide step-by-step explanations with examples
3. Include worked solutions for math/science problems
4. Use proper mathematical notation with LaTeX
5. Add a mastery check question at the end
6. Show which part of curriculum you're referencing
7. Be encouraging and motivating

Remember: You are building confidence and genuine understanding, not just providing answers.

Available Curriculum Context:
{context}`;

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

    const { question, conversationHistory = [], mode = 'default' } = await req.json();
    
    if (!question) {
      throw new Error('No question provided');
    }

    console.log(`Processing question from user ${user.id}: ${question}`);

    // Retrieve relevant chunks using simple keyword matching
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('chunk_text, page_number, document_id, documents(title)')
      .eq('user_id', user.id)
      .limit(10);

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      throw chunksError;
    }

    console.log(`Found ${chunks?.length || 0} chunks`);

    // Build context from retrieved chunks
    let context = '';
    const sources: string[] = [];
    
    if (chunks && chunks.length > 0) {
      // Simple relevance scoring: count matching words
      const questionWords = question.toLowerCase().split(/\s+/);
      const scoredChunks = chunks.map(chunk => {
        const chunkWords = chunk.chunk_text.toLowerCase();
        const matchCount = questionWords.filter((word: string) => 
          word.length > 3 && chunkWords.includes(word)
        ).length;
        return { ...chunk, score: matchCount };
      });

      // Sort by relevance and take top 5
      const relevantChunks = scoredChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      context = relevantChunks
        .map((c, idx) => {
          const docData = c.documents as any;
          const docTitle = Array.isArray(docData) ? docData[0]?.title : docData?.title;
          const source = `${docTitle || 'Document'} (Page ${c.page_number || 'N/A'})`;
          if (!sources.includes(source)) {
            sources.push(source);
          }
          return `[Excerpt ${idx + 1}]: ${c.chunk_text}`;
        })
        .join('\n\n');
    }

    if (!context) {
      context = "No curriculum materials have been uploaded yet.";
    }

    console.log(`Context length: ${context.length} characters`);

    // Call Lovable AI with RAG context
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const systemPrompt = JAMONT_SYSTEM_PROMPT.replace('{context}', context);

    let modeInstruction = '';
    if (mode === 'simplify') {
      modeInstruction = '\n\nMODE: Simplify - Use the simplest language possible and break this into the smallest steps.';
    } else if (mode === 'exam') {
      modeInstruction = '\n\nMODE: Exam Mode - Focus on exam strategies, common pitfalls, and efficient solving methods.';
    } else if (mode === 'advanced') {
      modeInstruction = '\n\nMODE: Advanced - Provide deeper theoretical insight and connections to related concepts.';
    } else if (mode === 'teacher') {
      modeInstruction = '\n\nMODE: Teacher Mode - Comprehensive explanation with multiple examples and practice problems.';
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: question + modeInstruction }
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

    console.log(`Generated answer: ${answer.substring(0, 100)}...`);

    // Store message in history
    await supabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: question },
      { 
        user_id: user.id, 
        role: 'assistant', 
        content: answer,
        sources: sources.length > 0 ? sources : null
      }
    ]);

    return new Response(
      JSON.stringify({ 
        answer,
        sources: sources.length > 0 ? sources : ['No curriculum uploaded yet']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
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
