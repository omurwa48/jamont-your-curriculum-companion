import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

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

function looksLikePdf(fileName: string, mimeType?: string | null) {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

async function extractPdfText(opts: {
  bytes: ArrayBuffer;
  maxPages?: number;
  maxChars?: number;
}): Promise<string> {
  const { bytes, maxPages = 30, maxChars = 250_000 } = opts;

  const uint8 = new Uint8Array(bytes);
  const loadingTask = getDocument({ data: uint8, useSystemFonts: true } as any);
  const pdf = await (loadingTask as any).promise;

  const pages = Math.min((pdf as any).numPages ?? 0, maxPages);
  let out = "";

  for (let pageNum = 1; pageNum <= pages; pageNum++) {
    const page = await (pdf as any).getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items || [])
      .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      out += (out ? "\n\n" : "") + pageText;
      if (out.length >= maxChars) {
        out = out.slice(0, maxChars);
        break;
      }
    }
  }

  return out.trim();
}

async function extractTextFromBytes(opts: {
  fileName: string;
  mimeType?: string | null;
  bytes: ArrayBuffer;
}): Promise<string> {
  const { fileName, mimeType, bytes } = opts;

  try {
    if (looksLikePdf(fileName, mimeType)) {
      const extracted = await extractPdfText({ bytes });
      if (extracted.length < 50) {
        console.warn(`[WARN] PDF extraction yielded minimal text for ${fileName}`);
        return `[PDF: ${fileName}] No readable text found. This PDF may be scanned and require OCR.`;
      }
      return extracted;
    }

    const textDecoder = new TextDecoder("utf-8");
    const raw = textDecoder.decode(bytes);
    return raw.length > 250_000 ? raw.slice(0, 250_000) : raw;
  } catch (e) {
    console.error("[ERROR] Text extraction failed:", e);
    return `[Document: ${fileName}] Unable to extract text content.`;
  }
}

function chunkTextByParagraphs(text: string, maxChunkSize = 3000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());

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
  return chunks.filter((c) => c.length > 10);
}

serve(async (req) => {
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

    const contentType = req.headers.get("content-type") || "";

    let file: File | null = null;
    let title: string | undefined;
    let filePath: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      file = (formData.get("file") as File | null) || null;
      title = (formData.get("title") as string | null) || undefined;

      if (!file) throw new Error("No file provided");
      fileName = file.name;
      mimeType = file.type;
      fileSize = file.size;
      filePath = `${user.id}/${Date.now()}_${file.name}`;

      console.log(`[START] In-function upload: ${file.name}, size: ${file.size}, type: ${file.type}`);

      const { error: uploadError } = await supabase.storage
        .from("curriculum-files")
        .upload(filePath, file);

      if (uploadError) {
        console.error("[ERROR] Upload failed:", uploadError);
        throw uploadError;
      }

      console.log("[STEP] File uploaded to storage");
    } else {
      const body = (await req.json()) as {
        title?: string;
        filePath?: string;
        fileName?: string;
        mimeType?: string;
        fileSize?: number;
      };

      title = body.title;
      filePath = body.filePath;
      fileName = body.fileName;
      mimeType = body.mimeType;
      fileSize = body.fileSize;

      if (!filePath) throw new Error("Missing filePath");
      if (!filePath.startsWith(`${user.id}/`)) throw new Error("Invalid filePath");
      if (!fileName) throw new Error("Missing fileName");

      console.log(`[START] Processing existing upload: ${fileName} @ ${filePath}`);
    }

    const resolvedTitle = title || fileName || "Untitled document";
    const resolvedFileName = fileName || "document";
    const resolvedMimeType = mimeType || "";
    const resolvedFileSize = fileSize ?? 0;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        title: resolvedTitle,
        file_name: resolvedFileName,
        file_path: filePath!,
        file_size: resolvedFileSize,
        mime_type: resolvedMimeType,
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
    console.log(`[DOC] Created: ${doc.id}`);

    const backgroundTask = async () => {
      const MAX_CHUNKS = 250;
      const INSERT_BATCH_SIZE = 100;

      console.log(`[BG] Start doc=${doc.id}`);

      try {
        await supabase.from("documents").update({ upload_status: "extracting_text" }).eq("id", doc.id);

        let bytes: ArrayBuffer;

        if (file) {
          bytes = await file.arrayBuffer();
        } else {
          const { data: downloaded, error: downloadError } = await supabase.storage
            .from("curriculum-files")
            .download(filePath!);

          if (downloadError || !downloaded) {
            console.error("[BG][ERROR] Download failed:", downloadError);
            throw new Error(downloadError?.message || "Download failed");
          }

          bytes = await downloaded.arrayBuffer();
        }

        const extractedText = await extractTextFromBytes({
          fileName: resolvedFileName,
          mimeType: resolvedMimeType,
          bytes,
        });

        console.log(`[BG] Extracted length=${extractedText.length}`);

        await supabase.from("documents").update({ upload_status: "chunking" }).eq("id", doc.id);

        const allChunks = chunkTextByParagraphs(extractedText, 3000);
        const validChunks = allChunks.length > MAX_CHUNKS ? allChunks.slice(0, MAX_CHUNKS) : allChunks;

        console.log(`[BG] Chunks=${validChunks.length}${allChunks.length > MAX_CHUNKS ? " (capped)" : ""}`);

        await supabase
          .from("documents")
          .update({ upload_status: "storing_chunks", total_chunks: validChunks.length })
          .eq("id", doc.id);

        const chunkRecords = validChunks.map((chunk, i) => ({
          document_id: doc.id,
          user_id: user.id,
          chunk_text: chunk,
          chunk_index: i,
          page_number: Math.floor(i / 3) + 1,
        }));

        for (let i = 0; i < chunkRecords.length; i += INSERT_BATCH_SIZE) {
          const batch = chunkRecords.slice(i, i + INSERT_BATCH_SIZE);
          const { error: chunksError } = await supabase.from("document_chunks").insert(batch);
          if (chunksError) {
            console.error("[BG][ERROR] Batch insert failed:", chunksError);
            throw new Error(chunksError.message);
          }
        }

        await supabase
          .from("documents")
          .update({ upload_status: "completed", total_chunks: validChunks.length })
          .eq("id", doc.id);

        console.log(`[BG][COMPLETE] doc=${doc.id}`);
      } catch (e) {
        console.error(`[BG][FATAL] doc=${doc.id} failed:`, e);
        await supabase.from("documents").update({ upload_status: "error" }).eq("id", doc.id);
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

    if (createdDocumentId) {
      try {
        await supabase.from("documents").update({ upload_status: "error" }).eq("id", createdDocumentId);
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
