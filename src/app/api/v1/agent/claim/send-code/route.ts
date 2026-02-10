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
        const { id, email } = await req.json();

        if (!id || !email) {
            return NextResponse.json({ error: 'Missing id or email' }, { status: 400 });
        }

        // 1. Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Save code to database
        const { error } = await supabase
            .from('agents')
            .update({
                email: email,
                verification_code: code,
                verification_sent_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // 3. SEND EMAIL (Placeholder / Example)
        // In production, use: await resend.emails.send({ ... })
        console.log(`[EMAIL SEND SIMULATION] To: ${email} | Code: ${code}`);

        // IMPORTANT: In a real app, you wouldn't return the code in the response!
        // But for testing purposes or if you want to show it in the UI for now:
        return NextResponse.json({
            success: true,
            message: 'Verification code sent to email.',
            debug_code: code // REMOVE THIS IN PRODUCTION
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
