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

    // Retrieve ALL chunks for semantic search
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('chunk_text, page_number, document_id, documents(title)')
      .eq('user_id', user.id);

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      throw chunksError;
    }

    console.log(`Found ${chunks?.length || 0} total chunks`);

    // Build context from retrieved chunks using advanced semantic matching
    let context = '';
    const sources: string[] = [];
    
    if (chunks && chunks.length > 0) {
      // Advanced relevance scoring with multiple factors
      const questionLower = question.toLowerCase();
      const questionWords = questionLower.split(/\s+/).filter((w: string) => w.length > 2);
      
      // Remove common stop words
      const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'being', 'some', 'what', 'when', 'where', 'which', 'while', 'who', 'will', 'with', 'would', 'this', 'that', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'their', 'there', 'about', 'would', 'could', 'should']);
      const meaningfulWords = questionWords.filter((w: string) => !stopWords.has(w));
      
      const scoredChunks = chunks.map(chunk => {
        const chunkLower = chunk.chunk_text.toLowerCase();
        let score = 0;
        
        // Exact phrase match (highest weight)
        if (chunkLower.includes(questionLower)) {
          score += 50;
        }
        
        // N-gram matching (bigrams and trigrams)
        for (let n = 2; n <= 3; n++) {
          for (let i = 0; i <= meaningfulWords.length - n; i++) {
            const ngram = meaningfulWords.slice(i, i + n).join(' ');
            if (chunkLower.includes(ngram)) {
              score += n * 5; // Higher weight for longer matches
            }
          }
        }
        
        // TF-IDF-like scoring for individual words
        for (const word of meaningfulWords) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = chunkLower.match(regex);
          if (matches) {
            // Term frequency
            const tf = Math.min(matches.length, 5); // Cap to prevent single-word flooding
            // Inverse document frequency approximation
            const docsWithWord = chunks.filter(c => c.chunk_text.toLowerCase().includes(word)).length;
            const idf = Math.log((chunks.length + 1) / (docsWithWord + 1));
            score += tf * Math.max(idf, 0.5) * 2;
          }
        }

        // Proximity bonus: words appearing close together
        const positions: number[] = [];
        for (const word of meaningfulWords) {
          const idx = chunkLower.indexOf(word);
          if (idx !== -1) positions.push(idx);
        }
        if (positions.length > 1) {
          positions.sort((a, b) => a - b);
          const avgDistance = positions.reduce((sum, pos, i) => 
            i > 0 ? sum + (pos - positions[i-1]) : sum, 0) / (positions.length - 1);
          if (avgDistance < 100) score += 10; // Words are close together
        }

        return { ...chunk, score };
      });

      // Sort by relevance and take top 6 for more context
      const relevantChunks = scoredChunks
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      console.log(`Top chunks scores: ${relevantChunks.slice(0, 3).map(c => c.score.toFixed(1)).join(', ')}`);

      context = relevantChunks
        .map((c, idx) => {
          const docData = c.documents as any;
          const docTitle = Array.isArray(docData) ? docData[0]?.title : docData?.title;
          const source = `${docTitle || 'Document'} (Page ${c.page_number || 'N/A'})`;
          if (!sources.includes(source)) {
            sources.push(source);
          }
          return `[Excerpt ${idx + 1} - ${source}]:\n${c.chunk_text}`;
        })
        .join('\n\n---\n\n');
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
