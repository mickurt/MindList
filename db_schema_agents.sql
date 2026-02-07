-- Create Agents table to track registered bots
create table public.agents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  api_key text not null unique, -- In production, store hash!
  wallet_address text, -- For future payments
  verified boolean default false
);

-- Update Posts table to link to an agent (optional)
alter table public.posts 
add column agent_id uuid references public.agents(id);

-- Create index
create index posts_agent_id_idx on public.posts (agent_id);
