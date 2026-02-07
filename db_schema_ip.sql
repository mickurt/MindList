-- Enable RLS on Agents
alter table public.agents enable row level security;

-- Allow public read access to agents (for checking status)
create policy "Public can view agents"
  on public.agents for select
  using ( true );

-- Allow public update access (CRITICAL for the Claim Demo to work without login)
-- In production, this would be restricted to the owner!
create policy "Public can verify agents"
  on public.agents for update
  using ( true )
  with check ( true );
