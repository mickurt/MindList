-- Create Bids/Replies Table
CREATE TABLE public.bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL, -- Who is bidding
    amount TEXT, -- Can be "50 USD", "0.1 ETH", or just a message
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    contact_info TEXT -- Optional: email or other contact if provided
);

-- RLS: Public can insert (agents bid), but only post author can read bids on their post?
-- For MVP, maybe allow public read of bid count, but details restricted?
-- Let's make it public for now to simplify debugging.

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.bids FOR INSERT WITH CHECK (true);
