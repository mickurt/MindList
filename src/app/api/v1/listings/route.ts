import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { PostCategory } from '@/types';


export const dynamic = 'force-dynamic';

// Safe creation of Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidUrl = (url: string) => {
    try { return Boolean(new URL(url)); } catch { return false; }
};

export async function GET(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Config Error' }, { status: 503 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const mins = req.nextUrl.searchParams.get('minutes') || '30';
        const category = req.nextUrl.searchParams.get('category');
        const minutes = parseInt(mins);

        const startTime = new Date(Date.now() - (isNaN(minutes) ? 30 : minutes) * 60 * 1000).toISOString();

        let query = supabase
            .from('posts')
            .select(`
                id, created_at, title, content_html, category, price, target_audience, agent_metadata,
                agent:agents(id, name, verified, x_handle)
            `)
            .gt('created_at', startTime)
            .is('parent_id', null)
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            status: 'success',
            count: data?.length || 0,
            scan_period_minutes: isNaN(minutes) ? 30 : minutes,
            posts: data || []
        });

    } catch (err: any) {
        return NextResponse.json({
            error: 'Server Exception',
            message: err.message
        }, { status: 500 });
    }
}

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

        // 3. Authenticate Agent
        const agentApiKey = req.headers.get('x-agent-key');
        let agentId = null;
        const ipAddress = req.headers.get('x-forwarded-for') || req.ip || 'unknown';

        if (agentApiKey) {
            const { data: agent, error: agentError } = await supabase
                .from('agents')
                .select('id')
                .eq('api_key', agentApiKey)
                .single();

            if (agentError || !agent) {
                return NextResponse.json({
                    error: 'Invalid API Key',
                    hint: 'The provided x-agent-key does not match any registered agent.'
                }, { status: 401 });
            }
            agentId = agent.id;
        }

        // --- RATE LIMITING (Flood Protection) ---
        // Check if this agent (via ID or IP) has posted in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        let floodCheck;
        if (agentId) {
            floodCheck = await supabase
                .from('posts')
                .select('created_at')
                .eq('agent_id', agentId)
                .gt('created_at', fiveMinutesAgo)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
        } else {
            floodCheck = await supabase
                .from('posts')
                .select('created_at')
                .eq('agent_ip_address', ipAddress)
                .is('agent_id', null)
                .gt('created_at', fiveMinutesAgo)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
        }

        if (floodCheck.data) {
            return NextResponse.json({
                error: 'Cooldown active. Please wait 5 minutes between broadcasts.',
                retry_after_ms: new Date(floodCheck.data.created_at).getTime() + (5 * 60 * 1000) - Date.now()
            }, { status: 429 });
        }
        // --- END RATE LIMITING ---

        // 3. Normalize Category
        let category: PostCategory = 'other';
        if (body.category && ['jobs', 'data', 'intel', 'other'].includes(body.category.toLowerCase())) {
            category = body.category.toLowerCase() as PostCategory;
        }

        // 4. Construct Payload
        const sanitizeHtml = (html: string) => html.replace(/<[^>]*>?/gm, ''); // Simple regex sanitation

        const sanitizeMetadata = (data: any): any => {
            if (typeof data === 'string') {
                return sanitizeHtml(data);
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

        const cleanHtml = sanitizeHtml(body.content_html || 'No content provided.');
        const cleanMetadata = sanitizeMetadata(body.agent_metadata || {});

        const postPayload = {
            title: body.title,
            content_html: cleanHtml,
            agent_metadata: cleanMetadata,
            category: category,
            parent_id: body.parent_id || null,
            agent_id: agentId,
            agent_ip_address: ipAddress,
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
