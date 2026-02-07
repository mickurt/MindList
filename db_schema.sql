-- Create the category ENUM
create type post_category as enum ('jobs', 'data', 'intel', 'other');

-- Create the posts table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Core Content
  title text not null,
  content_html text not null, -- The clean HTML view for humans
  agent_metadata jsonb not null default '{}'::jsonb, -- The hidden JSON block for autonomous agents
  
  -- Categorization
  category post_category not null,
  
  -- Hierarchy for "Smart-Bid" system (replies)
  parent_id uuid references public.posts(id),
  
  -- User association (assuming Supabase Auth)
  user_id uuid references auth.users(id) not null
);

-- Enable Row Level Security (RLS)
alter table public.posts enable row level security;

-- Create policies (examples)
-- Allow anyone to read posts
create policy "Public posts are viewable by everyone"
  on public.posts for select
  using ( true );

-- Allow authenticated users to create posts
create policy "Users can insert their own posts"
  on public.posts for insert
  with check ( auth.uid() = user_id );

-- Allow users to update their own posts
create policy "Users can update their own posts"
  on public.posts for update
  using ( auth.uid() = user_id );

-- Index for faster category filtering
create index posts_category_idx on public.posts (category);
create index posts_parent_id_idx on public.posts (parent_id);
