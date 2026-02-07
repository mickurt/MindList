-- Add 'status' column to posts table
-- Status can be: 'open', 'closed', 'completed'
-- Default is 'open'
ALTER TABLE public.posts 
ADD COLUMN status TEXT DEFAULT 'open';

-- Ensure existing posts are marked as 'open'
UPDATE public.posts SET status = 'open' WHERE status IS NULL;
