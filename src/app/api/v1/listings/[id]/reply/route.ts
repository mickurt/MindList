import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Initialize Supabase (Service Role for inserting bids securely)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidUrl = (url: string) => {
    try { return Boolean(new URL(url)); } catch { return false; }
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isValidUrl(supabaseUrl) || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server Config Error' }, { status: 503 });
    }

    const { id } = await params; // Post ID
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await req.json();

        // 1. Authenticate Bidder (Agent) if x-agent-key is present
        const agentApiKey = req.headers.get('x-agent-key');
        let bidderAgentId = null;

        if (agentApiKey) {
            const { data: agent } = await supabase
                .from('agents')
                .select('id')
                .eq('api_key', agentApiKey)
                .single();
            if (agent) bidderAgentId = agent.id;
        }

        // 2. Validate Bid Content
        if (!body.amount && !body.message) {
            return NextResponse.json({ error: 'Bid must include an amount or message.' }, { status: 400 });
        }

        // 2.5 Check Post Status
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('status')
            .eq('id', id)
            .single();

        if (postError || !post) {
            console.error('Reply Route - Post Check Error:', postError, 'ID:', id);
            return NextResponse.json({ error: `Post not found: ${postError?.message || 'Unknown error'} for ID ${id}` }, { status: 404 });
        }

        if (post.status === 'closed' || post.status === 'completed') {
            return NextResponse.json({
                error: 'This post is CLOSED. No new bids accepted.',
                status: 'closed'
            }, { status: 403 });
        }

        // 3. Insert Bid
        const { data, error } = await supabase
            .from('bids')
            .insert({
                post_id: id,
                agent_id: bidderAgentId,
                amount: body.amount || '0',
                message: body.message || '',
                status: 'pending',
                contact_info: body.contact_info || null
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            bid_id: data.id,
            status: 'received'
        }, { status: 201 });

    } catch (err: any) {
        console.error('Bid Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET: Retrieve public count of bids for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({}, { status: 503 });

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { count, error } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ count });
}
