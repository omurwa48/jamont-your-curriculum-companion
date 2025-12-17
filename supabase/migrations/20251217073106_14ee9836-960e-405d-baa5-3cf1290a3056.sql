-- Allow the curriculum processing pipeline statuses used by the backend function
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_upload_status_check;

ALTER TABLE public.documents
ADD CONSTRAINT documents_upload_status_check
CHECK (
  upload_status IS NULL OR upload_status IN (
    'uploading',
    'extracting_text',
    'chunking',
    'storing_chunks',
    'processing',
    'completed',
    'error',
    'failed'
  )
);