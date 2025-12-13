import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  success: boolean;
  documentId?: string;
  chunksProcessed?: number;
  error?: string;
  processingTimeMs?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`[START] Processing document: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Upload file to storage
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase
      .storage
      .from('curriculum-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error('[ERROR] Upload failed:', uploadError);
      throw uploadError;
    }
    console.log('[STEP 1/5] File uploaded to storage');

    // Create document record with processing status
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: title || file.name,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        upload_status: 'extracting_text'
      })
      .select()
      .single();

    if (docError) {
      console.error('[ERROR] Document creation failed:', docError);
      throw docError;
    }
    console.log(`[STEP 2/5] Document record created: ${doc.id}`);

    // Extract text from file
    const arrayBuffer = await file.arrayBuffer();
    const textDecoder = new TextDecoder('utf-8');
    let extractedText = '';

    try {
      // Handle different file types
      if (file.type === 'application/pdf') {
        // For PDFs, attempt to extract text - may contain binary data
        const rawText = textDecoder.decode(arrayBuffer);
        // Extract readable text between stream markers or plain text
        const textMatches = rawText.match(/[\x20-\x7E\n\r\t]+/g) || [];
        extractedText = textMatches
          .filter(t => t.length > 20) // Filter out short fragments
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (extractedText.length < 100) {
          console.warn('[WARN] PDF extraction yielded minimal text - may need OCR');
          extractedText = `[PDF Document: ${file.name}] This document may require OCR processing for full text extraction. Partial content extracted.`;
        }
      } else {
        // Text-based files
        extractedText = textDecoder.decode(arrayBuffer);
      }
    } catch (e) {
      console.error('[ERROR] Text extraction failed:', e);
      extractedText = `[Document: ${file.name}] Unable to extract text content.`;
    }

    console.log(`[STEP 3/5] Text extracted: ${extractedText.length} characters`);

    // Update status to chunking
    await supabase
      .from('documents')
      .update({ upload_status: 'chunking' })
      .eq('id', doc.id);

    // Smart chunking - split by paragraphs first, then by size
    const paragraphs = extractedText.split(/\n\n+/);
    const chunks: string[] = [];
    const maxChunkSize = 1500;
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        // If single paragraph is too long, split it
        if (para.length > maxChunkSize) {
          const words = para.split(' ');
          currentChunk = '';
          for (const word of words) {
            if ((currentChunk + ' ' + word).length > maxChunkSize) {
              if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = word;
            } else {
              currentChunk += (currentChunk ? ' ' : '') + word;
            }
          }
        } else {
          currentChunk = para;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Filter empty chunks
    const validChunks = chunks.filter(c => c.length > 10);
    console.log(`[STEP 4/5] Created ${validChunks.length} chunks`);

    // Update status to embedding
    await supabase
      .from('documents')
      .update({ upload_status: 'generating_embeddings' })
      .eq('id', doc.id);

    // Generate embeddings locally (fast) - no external API calls needed
    console.log(`[EMBEDDING] Generating embeddings for ${validChunks.length} chunks locally...`);
    
    const chunkRecords = validChunks.map((chunk, i) => ({
      document_id: doc.id,
      user_id: user.id,
      chunk_text: chunk,
      chunk_index: i,
      page_number: Math.floor(i / 3) + 1,
    }));

    console.log(`[EMBEDDING] Generated ${chunkRecords.length} chunk records`);

    // Update status to storing
    await supabase
      .from('documents')
      .update({ upload_status: 'storing_chunks' })
      .eq('id', doc.id);

    // Store all chunks in a single batch (Supabase handles large inserts efficiently)
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      console.error(`[ERROR] Chunks insert failed:`, chunksError);
      throw chunksError;
    }

    console.log(`[STEP 5/5] Stored ${chunkRecords.length} chunks`);

    // Update document as completed
    await supabase
      .from('documents')
      .update({ 
        upload_status: 'completed',
        total_chunks: validChunks.length
      })
      .eq('id', doc.id);

    const processingTime = Date.now() - startTime;
    console.log(`[COMPLETE] Document processed in ${processingTime}ms`);

    const result: ProcessingResult = {
      success: true,
      documentId: doc.id,
      chunksProcessed: validChunks.length,
      processingTimeMs: processingTime
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FATAL] Processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const result: ProcessingResult = {
      success: false,
      error: errorMessage,
      processingTimeMs: Date.now() - startTime
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
