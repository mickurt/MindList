-- Update Agents table to include IP address registration
alter table public.agents 
add column ip_address text;
