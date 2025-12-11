-- Add missing INSERT policy for document_chunks
CREATE POLICY "Users can insert own chunks" 
ON public.document_chunks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);