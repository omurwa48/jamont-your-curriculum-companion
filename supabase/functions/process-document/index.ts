import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessingResult {
  success: boolean;
  documentId?: string;
  message?: string;
  error?: string;
}

function requireAuthToken(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("Unauthorized");
  return token;
}

function extractTextFromBytes(opts: {
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
}): string {
  const { fileName, mimeType, bytes } = opts;
  const textDecoder = new TextDecoder("utf-8");

  try {
    // Handle different file types
    if (mimeType === "application/pdf") {
      // PDFs are often binary; we attempt a best-effort extraction of readable text.
      const rawText = textDecoder.decode(bytes);
      const textMatches = rawText.match(/[\x20-\x7E\n\r\t]+/g) || [];
      const extracted = textMatches
        .filter((t) => t.length > 20)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (extracted.length < 100) {
        console.warn(
          `[WARN] PDF extraction yielded minimal text for ${fileName} (may need OCR)`
        );
        return `[PDF Document: ${fileName}] This document may require OCR processing for full text extraction. Partial content extracted.`;
      }

      return extracted;
    }

    // Text-based files
    return textDecoder.decode(bytes);
  } catch (e) {
    console.error("[ERROR] Text extraction failed:", e);
    return `[Document: ${fileName}] Unable to extract text content.`;
  }
}

function chunkTextByParagraphs(text: string, maxChunkSize = 1500): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());

      // If single paragraph is too long, split by words
      if (para.length > maxChunkSize) {
        const words = para.split(" ");
        currentChunk = "";
        for (const word of words) {
          if ((currentChunk + " " + word).length > maxChunkSize) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk += (currentChunk ? " " : "") + word;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  // Filter tiny/noise chunks
  return chunks.filter((c) => c.length > 10);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let createdDocumentId: string | null = null;

  try {
    const token = requireAuthToken(req);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;

    if (userError || !user) {
      console.error("[AUTH] getUser failed:", userError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) || undefined;

    if (!file) throw new Error("No file provided");

    console.log(
      `[START] Processing document request: ${file.name}, size: ${file.size}, type: ${file.type}`
    );

    // Upload file to storage (kept in-request, then the heavy processing happens in background)
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("curriculum-files")
      .upload(filePath, file);

    if (uploadError) {
      console.error("[ERROR] Upload failed:", uploadError);
      throw uploadError;
    }
    console.log("[STEP 1/2] File uploaded to storage");

    // Create document record with initial status
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        title: title || file.name,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        upload_status: "uploading",
        total_chunks: 0,
      })
      .select()
      .single();

    if (docError) {
      console.error("[ERROR] Document creation failed:", docError);
      throw docError;
    }

    createdDocumentId = doc.id;
    console.log(`[STEP 2/2] Document record created: ${doc.id}`);

    // Heavy processing runs in the background so the client request doesn't hang/time out.
    const backgroundTask = async () => {
      console.log(`[BG] Start processing doc=${doc.id}`);

      try {
        await supabase
          .from("documents")
          .update({ upload_status: "extracting_text" })
          .eq("id", doc.id);

        // Download from storage to avoid keeping large file bytes tied to the request lifecycle.
        const { data: downloaded, error: downloadError } = await supabase.storage
          .from("curriculum-files")
          .download(filePath);

        if (downloadError || !downloaded) {
          console.error("[BG][ERROR] Download failed:", downloadError);
          throw new Error(downloadError?.message || "Download failed");
        }

        const bytes = await downloaded.arrayBuffer();
        const extractedText = extractTextFromBytes({
          fileName: file.name,
          mimeType: file.type,
          bytes,
        });

        console.log(`[BG] Extracted text length: ${extractedText.length}`);

        await supabase
          .from("documents")
          .update({ upload_status: "chunking" })
          .eq("id", doc.id);

        const validChunks = chunkTextByParagraphs(extractedText, 1500);
        console.log(`[BG] Created chunks: ${validChunks.length}`);

        await supabase
          .from("documents")
          .update({
            upload_status: "storing_chunks",
            total_chunks: validChunks.length,
          })
          .eq("id", doc.id);

        const chunkRecords = validChunks.map((chunk, i) => ({
          document_id: doc.id,
          user_id: user.id,
          chunk_text: chunk,
          chunk_index: i,
          page_number: Math.floor(i / 3) + 1,
        }));

        const { error: chunksError } = await supabase
          .from("document_chunks")
          .insert(chunkRecords);

        if (chunksError) {
          console.error("[BG][ERROR] Chunks insert failed:", chunksError);
          throw new Error(chunksError.message);
        }

        await supabase
          .from("documents")
          .update({
            upload_status: "completed",
            total_chunks: validChunks.length,
          })
          .eq("id", doc.id);

        console.log(`[BG][COMPLETE] doc=${doc.id} completed`);
      } catch (e) {
        console.error(`[BG][FATAL] doc=${doc.id} failed:`, e);
        await supabase
          .from("documents")
          .update({ upload_status: "error" })
          .eq("id", doc.id);
      }
    };

    // @ts-ignore - EdgeRuntime is available in the runtime
    EdgeRuntime.waitUntil(backgroundTask());

    const result: ProcessingResult = {
      success: true,
      documentId: doc.id,
      message: "Upload received. Processing started.",
    };

    return new Response(JSON.stringify(result), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[FATAL] Processing failed:", error);

    // Best-effort: mark record as error if we already created it.
    if (createdDocumentId) {
      try {
        await supabase
          .from("documents")
          .update({ upload_status: "error" })
          .eq("id", createdDocumentId);
      } catch (e) {
        console.error("[WARN] Failed to set upload_status=error:", e);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const result: ProcessingResult = {
      success: false,
      error: errorMessage,
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
