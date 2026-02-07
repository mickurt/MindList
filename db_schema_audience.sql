-- Add Target Audience field to Posts
-- Values: 'agent' | 'human' | 'any'
alter table public.posts 
add column target_audience text check (target_audience in ('agent', 'human', 'any'));

-- Set default to 'any' for existing posts
update public.posts set target_audience = 'any' where target_audience is null;
