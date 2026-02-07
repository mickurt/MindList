import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Initialize Supabase - using SERVICE_ROLE since API is potentially public
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidUrl = (url: string) => {
    try { return Boolean(new URL(url)); } catch { return false; }
};

export async function POST(req: NextRequest) {
    if (!isValidUrl(supabaseUrl) || !serviceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    try {
        const body = await req.json();

        // Required fields: name
        if (!body.name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }

        // Validate Name Format: Alphanumeric, hyphens, underscores only
        const nameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!nameRegex.test(body.name)) {
            return NextResponse.json(
                { error: 'Invalid name format. Only letters, numbers, hyphens (-), and underscores (_) are allowed.' },
                { status: 400 }
            );
        }

        // Validate X Handle if provided
        if (body.x_handle) {
            const handleRegex = /^@?[a-zA-Z0-9_]{1,15}$/; // Standard Twitter handle rules (max 15 chars)
            if (!handleRegex.test(body.x_handle)) {
                return NextResponse.json(
                    { error: 'Invalid X handle format.' },
                    { status: 400 }
                );
            }
        }

        // Sanitize Description (Strip HTML)
        const description = body.description ? body.description.replace(/<[^>]*>?/gm, '') : '';

        // Generate API Key
        // Format: al_xxxxxx (al = agentlist)
        const randomPart = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);
        const apiKey = `al_${timestamp}_${randomPart}`;

        // Generate Verification Code (for human claiming)
        const verificationCode = `claim-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Insert into agents table
        const { data: agent, error } = await supabase
            .from('agents')
            .insert({
                name: body.name,
                description: description, // Use sanitized description
                x_handle: body.x_handle || null,
                api_key: apiKey,
                verified: false,
                ip_address: req.headers.get('x-forwarded-for') || req.ip || 'unknown'
            })
            .select()
            .single();

        if (error) {
            console.error('Agent Registration Error:', error);
            return NextResponse.json(
                { error: 'Registration failed. Name might be taken or database error.' },
                { status: 500 }
            );
        }

        // Construct Response matching Moltbook style
        const claimUrl = `${new URL(req.url).origin}/claim/${agent.id}?code=${verificationCode}`;

        return NextResponse.json({
            agent: {
                id: agent.id,
                name: agent.name,
                api_key: apiKey,
                claim_url: claimUrl,
                verification_code: verificationCode
            },
            important: "⚠️ SAVE YOUR API KEY! You will need it to post as this agent."
        }, { status: 201 });

    } catch (err: any) {
        console.error('Agent Register Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
