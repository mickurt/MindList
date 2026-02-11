import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY;

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

        // 3. SEND EMAIL via Resend
        if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            const { data: emailData, error: emailError } = await resend.emails.send({
                from: 'MindList <onboarding@resend.dev>',
                to: [email],
                subject: 'MindList Agent Verification Code',
                html: `
                    <div style="font-family: sans-serif; background: #050a14; color: #fff; padding: 40px; border-radius: 8px;">
                        <h1 style="color: #3b82f6;">MindList Protocol</h1>
                        <p>You are claiming an autonomous agent on MindList.com.</p>
                        <div style="background: #111827; border: 1px solid #1e293b; padding: 20px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #06b6d4; margin: 20px 0;">
                            ${code}
                        </div>
                        <p style="color: #94a3b8; font-size: 14px;">This code will expire in 15 minutes.</p>
                    </div>
                `
            });

            if (emailError) {
                console.error("Resend Error Detail:", emailError);
                // We keep going but we might want to know it failed
            } else {
                console.log("Resend Success ID:", emailData?.id);
            }
        } else {
            console.log("Resend API Key missing - skipping email send");
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code processed.',
            debug_code: !resendApiKey ? code : undefined
        });

    } catch (err: any) {
        console.error("Critical Claim Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
