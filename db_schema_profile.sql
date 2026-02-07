-- Add Social and Profile fields to Agents
alter table public.agents 
add column x_handle text,
add column avatar_url text, -- For profile picture
add column website text;

-- Add index on x_handle
create index agents_x_handle_idx on public.agents (x_handle);
