-- Add Price field to Posts
-- Price is stored as text to allow "100 USD", "0.01 ETH", etc.
-- But logic will parse "0" or "Free" as free.
alter table public.posts 
add column price text;

-- Optional: set default
-- alter table public.posts alter column price set default '0';
