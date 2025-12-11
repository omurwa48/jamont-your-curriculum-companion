-- Fix security issues: Restrict social features to authenticated users only
-- and add missing DELETE/UPDATE policies

-- 1. Fix user_profiles: Add policy for authenticated users to view all profiles
CREATE POLICY "Authenticated users can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Fix profiles table: Add policy for authenticated users
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Fix feed_posts: Replace public policy with authenticated-only
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.feed_posts;
CREATE POLICY "Authenticated users can view posts" 
ON public.feed_posts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. Fix post_likes: Replace public policy with authenticated-only
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Authenticated users can view likes" 
ON public.post_likes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. Fix post_comments: Replace public policy with authenticated-only
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Authenticated users can view comments" 
ON public.post_comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 6. Fix user_connections: Replace public policy with authenticated-only
DROP POLICY IF EXISTS "Connections are viewable by everyone" ON public.user_connections;
CREATE POLICY "Authenticated users can view connections" 
ON public.user_connections 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 7. Add missing DELETE policy for document_chunks
CREATE POLICY "Users can delete own chunks" 
ON public.document_chunks 
FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Add missing DELETE policy for chat_messages
CREATE POLICY "Users can delete own messages" 
ON public.chat_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- 9. Add missing UPDATE policy for post_comments
CREATE POLICY "Users can update own comments" 
ON public.post_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 10. Add missing DELETE policy for lessons
CREATE POLICY "Users can delete own lessons" 
ON public.lessons 
FOR DELETE 
USING (auth.uid() = user_id);

-- 11. Add missing UPDATE policy for certificates
CREATE POLICY "Users can update own certificates" 
ON public.certificates 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 12. Add missing DELETE policy for certificates
CREATE POLICY "Users can delete own certificates" 
ON public.certificates 
FOR DELETE 
USING (auth.uid() = user_id);