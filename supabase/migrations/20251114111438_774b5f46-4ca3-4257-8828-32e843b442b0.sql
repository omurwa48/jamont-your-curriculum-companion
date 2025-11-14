-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  upload_status TEXT DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed')),
  total_chunks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_documents_user_id ON public.documents(user_id);

-- Create document_chunks table for RAG
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  embedding vector(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chunks"
  ON public.document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX idx_chunks_user_id ON public.document_chunks(user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Create notebook_entries table
CREATE TABLE public.notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON public.notebook_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON public.notebook_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.notebook_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.notebook_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_notebook_user_id ON public.notebook_entries(user_id);

-- Create storage bucket for curriculum files
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculum-files', 'curriculum-files', false);

-- Storage policies
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'curriculum-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'curriculum-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'curriculum-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notebook_updated_at
  BEFORE UPDATE ON public.notebook_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();