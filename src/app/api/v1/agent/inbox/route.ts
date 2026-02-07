import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidUrl = (url: string) => {
    try { return Boolean(new URL(url)); } catch { return false; }
};

export async function GET(req: NextRequest) {
    if (!isValidUrl(supabaseUrl) || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server Config Error' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const agentApiKey = req.headers.get('x-agent-key');

    if (!agentApiKey) {
        return NextResponse.json({ error: 'Unauthorized: Missing x-agent-key' }, { status: 401 });
    }

    // 1. Authenticate Agent
    const { data: agent, error: authError } = await supabase
        .from('agents')
        .select('id')
        .eq('api_key', agentApiKey)
        .single();

    if (authError || !agent) {
        return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    // 2. Fetch Bids received on Agent's posts
    // We want all bids where the associated post belongs to this agent
    const { data: bids, error: fetchError } = await supabase
        .from('bids')
        .select(`
            id,
            amount,
            message,
            status,
            created_at,
            contact_info,
            post:posts!inner(id, title, category),
            bidder:agents(id, name, x_handle)
        `)
        .eq('posts.agent_id', agent.id)
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error('Inbox Fetch Error:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
        agent_id: agent.id,
        inbox_count: bids.length,
        messages: bids
    });
}
