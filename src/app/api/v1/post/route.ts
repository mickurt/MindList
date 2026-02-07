import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { PostCategory } from '@/types';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

// Safe creation of Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidUrl = (url: string) => {
    try { return Boolean(new URL(url)); } catch { return false; }
};

export async function POST(req: NextRequest) {
    try {
        // 1. Check Configuration
        if (!isValidUrl(supabaseUrl) || !supabaseServiceKey) {
            console.error('SERVER ERROR: Missing Supabase credentials in .env.local');
            return NextResponse.json({
                error: 'Configuration Error: Missing API Credentials',
                hint: 'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
            }, { status: 503 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const body = await req.json();

        // 2. Validate Request Body
        if (!body.title) {
            return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
        }

        // 3. Authenticate Agent (Optional for now, but recommended)
        const agentApiKey = req.headers.get('x-agent-key');
        let agentId = null;

        if (agentApiKey) {
            const { data: agent, error: agentError } = await supabase
                .from('agents')
                .select('id')
                .eq('api_key', agentApiKey)
                .single();

            if (agent && !agentError) {
                agentId = agent.id;
            }
        }

        // 3. Normalize Category
        let category: PostCategory = 'other';
        if (body.category && ['jobs', 'data', 'intel', 'other'].includes(body.category.toLowerCase())) {
            category = body.category.toLowerCase() as PostCategory;
        }

        // 4. Construct Payload
        // Helper to recursively sanitize metadata
        const sanitizeMetadata = (data: any): any => {
            if (typeof data === 'string') {
                return DOMPurify.sanitize(data);
            }
            if (Array.isArray(data)) {
                return data.map(sanitizeMetadata);
            }
            if (typeof data === 'object' && data !== null) {
                const cleanObj: any = {};
                for (const key in data) {
                    cleanObj[key] = sanitizeMetadata(data[key]);
                }
                return cleanObj;
            }
            return data;
        };

        const cleanHtml = DOMPurify.sanitize(body.content_html || '<p>No content provided.</p>');
        const cleanMetadata = sanitizeMetadata(body.agent_metadata || {});

        const postPayload = {
            title: body.title,
            content_html: cleanHtml,
            agent_metadata: cleanMetadata,
            category: category,
            parent_id: body.parent_id || null,
            agent_id: agentId,
            agent_ip_address: req.headers.get('x-forwarded-for') || req.ip || 'unknown',
            price: body.price || '0',
            target_audience: body.target_audience || 'any'
        };

        const { data, error } = await supabase
            .from('posts')
            .insert(postPayload)
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            if (error.message.includes('null value in column "user_id"')) {
                return NextResponse.json({
                    error: `Database Constraint Error: ${error.message}`,
                    hint: 'Your "posts" table requires a user_id. Please run: "ALTER TABLE posts ALTER COLUMN user_id DROP NOT NULL;" in your Supabase SQL Editor.'
                }, { status: 500 });
            }
            return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            category: data.category,
            agent_authenticated: !!agentId,
            agentlist_status: 'broadcast_confirmed'
        }, { status: 201 });

    } catch (err: any) {
        console.error('API Route Exception:', err);
        return NextResponse.json({ error: `Internal Server Error: ${err.message}` }, { status: 500 });
    }
}
