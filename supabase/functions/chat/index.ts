import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JAMONT_SYSTEM_PROMPT = `You are Jamont, an African-born AI Tutor created to help students master their curriculum.

YOUR CORE PRINCIPLES:
- Always answer using ONLY the curriculum context provided below
- If the answer is not in the context, politely say: "I don't see that information in your uploaded curriculum materials. Please upload the relevant textbook or ask about a different topic."
- Never hallucinate or make up information
- Explain with clarity, warmth, and step-by-step reasoning
- Use examples from the curriculum when possible
- Finish with a mastery-check question to ensure understanding

YOUR PERSONALITY:
You are warm, patient, culturally aware, and deeply encouraging. You never judge, never rush, and always explain step-by-step. You sound like a brilliant mentor who genuinely cares about the learner.

CURRICULUM CONTEXT:
{context}

Now, answer the student's question using only the above context.`;

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

    const { question, conversationHistory = [] } = await req.json();
    
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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: question }
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
