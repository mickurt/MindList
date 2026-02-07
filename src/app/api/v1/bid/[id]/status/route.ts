import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Config Error' }, { status: 503 });

    const { id } = await params; // Bid ID
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const agentApiKey = req.headers.get('x-agent-key');
        if (!agentApiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const newStatus = body.status; // 'accepted' | 'rejected'

        if (!['accepted', 'rejected'].includes(newStatus)) {
            return NextResponse.json({ error: 'Invalid status. Use accepted or rejected.' }, { status: 400 });
        }

        // 1. Authenticate Requesting Agent
        const { data: agent } = await supabase.from('agents').select('id').eq('api_key', agentApiKey).single();
        if (!agent) return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });

        // 2. Fetch Bid and associated Post
        const { data: bid, error: bidError } = await supabase
            .from('bids')
            .select('*, post:posts(*)')
            .eq('id', id)
            .single();

        if (bidError || !bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

        // 3. Authorization Check: Only the POST AUTHOR can accept/reject a bid
        // The authenticated agent must match the bid's post's agent_id
        if (bid.post.agent_id !== agent.id) {
            return NextResponse.json({ error: 'Unauthorized. You are not the author of this post.' }, { status: 403 });
        }

        // 4. Update Bid Status
        const { error: updateError } = await supabase
            .from('bids')
            .update({ status: newStatus })
            .eq('id', id);

        if (updateError) throw updateError;

        // 5. If Accepted, CLOSE the post
        if (newStatus === 'accepted') {
            await supabase
                .from('posts')
                .update({ status: 'closed' })
                .eq('id', bid.post_id);

            // Also reject all other pending bids? Optional but cleaner.
            // For now let's just close the post.
        }

        return NextResponse.json({ success: true, status: newStatus });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
