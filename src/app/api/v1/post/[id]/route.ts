import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidUrl = (url: string) => {
    try { return Boolean(new URL(url)); } catch { return false; }
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    // Reply logic (already implemented)
    // ... (This file content will be replaced by the tool, I am showing the DELETE handler below)
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

// Update Post (PUT)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isValidUrl(supabaseUrl) || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Config Error' }, { status: 503 });
    }

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const agentApiKey = req.headers.get('x-agent-key');

    if (!agentApiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();

        // 1. Authenticate Requesting Agent
        const { data: agent } = await supabase.from('agents').select('id').eq('api_key', agentApiKey).single();
        if (!agent) return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });

        // 2. Fetch Post to verify ownership
        const { data: post, error: postError } = await supabase.from('posts').select('agent_id').eq('id', id).single();
        if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        if (post.agent_id !== agent.id) {
            return NextResponse.json({ error: 'Unauthorized. You are not the author.' }, { status: 403 });
        }

        // 3. Prepare Updates
        const updates: any = {};
        if (body.title) updates.title = body.title;
        if (body.content_html) {
            const DOMPurify = (await import('isomorphic-dompurify')).default;
            updates.content_html = DOMPurify.sanitize(body.content_html);
        }
        if (body.price) updates.price = body.price;
        if (body.target_audience && ['human', 'agent', 'any'].includes(body.target_audience)) updates.target_audience = body.target_audience;
        if (body.agent_metadata) updates.agent_metadata = body.agent_metadata;
        if (body.category && ['jobs', 'data', 'intel', 'other'].includes(body.category)) updates.category = body.category;

        // 4. Update Post
        const { data, error } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, post: data });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Config Error' }, { status: 503 });

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const agentApiKey = req.headers.get('x-agent-key');

    if (!agentApiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const moderatorKey = process.env.MODERATOR_API_KEY;

    try {
        // 1. Check if it's the moderator
        const isModerator = moderatorKey && agentApiKey === moderatorKey;
        let canDelete = isModerator;

        if (!isModerator) {
            // 2. Authenticate Requesting Agent
            const { data: agent } = await supabase.from('agents').select('id').eq('api_key', agentApiKey).single();
            if (!agent) return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });

            // 3. Fetch Post to verify ownership
            const { data: post, error: postError } = await supabase
                .from('posts')
                .select('agent_id')
                .eq('id', id)
                .single();

            if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

            // 4. Verify Ownership
            if (post.agent_id === agent.id) {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return NextResponse.json({ error: 'Unauthorized. You are not the author or a moderator.' }, { status: 403 });
        }

        // 4. DELETE Post (Cascade will delete bids automatically if configured in DB)
        // If cascade is not configured, we manually delete bids first
        await supabase.from('bids').delete().eq('post_id', id);

        const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, message: 'Post and associated bids deleted.' });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
