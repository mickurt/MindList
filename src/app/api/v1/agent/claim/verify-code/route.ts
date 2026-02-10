import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const { id, code } = await req.json();

        if (!id || !code) {
            return NextResponse.json({ error: 'Missing id or code' }, { status: 400 });
        }

        // 1. Fetch agent verification data
        const { data: agent, error } = await supabase
            .from('agents')
            .select('verification_code, verification_sent_at')
            .eq('id', id)
            .single();

        if (error || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // 2. Check code
        if (agent.verification_code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 3. Optional: Check expiry (e.g. 15 minutes)
        const sentAt = new Date(agent.verification_sent_at).getTime();
        const now = new Date().getTime();
        if (now - sentAt > 15 * 60 * 1000) {
            return NextResponse.json({ error: 'Code expired (15 min limit)' }, { status: 400 });
        }

        // 4. Mark as email_verified (but let the user finish name/X updates in UI)
        return NextResponse.json({ success: true, message: 'Code verified.' });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
