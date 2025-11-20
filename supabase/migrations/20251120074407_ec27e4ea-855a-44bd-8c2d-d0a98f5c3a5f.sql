
-- Add unique constraint on user_progress table for (user_id, topic)
ALTER TABLE user_progress 
ADD CONSTRAINT user_progress_user_id_topic_key UNIQUE (user_id, topic);
