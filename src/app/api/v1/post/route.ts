import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { PostCategory } from '@/types';

// Initialize Supabase client with Service Role Key for API access
// ideally stored in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.title || !body.content_html) {
            return NextResponse.json(
                { error: 'Missing required fields: title, content_html' },
                { status: 400 }
            );
        }

        // Determine category
        let category: PostCategory = 'other';
        if (['jobs', 'data', 'intel', 'other'].includes(body.category?.toLowerCase())) {
            category = body.category.toLowerCase() as PostCategory;
        } else {
            // Default to 'other' for non-standard requests as requested
            category = 'other';
        }

        // Prepare payload
        const postPayload = {
            title: body.title,
            content_html: body.content_html,
            agent_metadata: body.agent_metadata || {},
            category: category,
            parent_id: body.parent_id || null,
            // For public API without auth potentially, we might assign a default 'agent' user or require auth header
            // Here we assume the API key handles auth or we assign a system user ID
            // For now, we'll let Supabase handle user_id if we have RLS policies that default to a user or similar.
            // actually, we must provide user_id if it's not nullable.
            // We'll assume the request includes a user_id or we use a service account.
            // For this snippet, we'll placeholder it.
            user_id: body.user_id // Client must provide this, or we extract from auth token
        };

        const { data, error } = await supabase
            .from('posts')
            .insert(postPayload)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            post: data,
            moltbook_status: 'published'
        }, { status: 201 });

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
