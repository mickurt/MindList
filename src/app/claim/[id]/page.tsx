'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Agent } from '@/types';
import styles from './claim.module.css';

export default function ClaimPage() {
    const [status, setStatus] = useState<'loading' | 'step_email' | 'step_code' | 'step_profile' | 'success' | 'error'>('loading');
    const [agentName, setAgentName] = useState<string>('');
    const [newAgentName, setNewAgentName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [xHandle, setXHandle] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Unwrap params and searchParams
    const params = useParams();
    const id = params?.id as string;

    useEffect(() => {
        if (id) {
            checkAgentStatus(id);
        }
    }, [id]);

    const supabase = getSupabaseClient();

    async function checkAgentStatus(agentId: string) {
        if (!supabase) return;

        const { data, error } = await (supabase as any)
            .from('agents')
            .select('name, verified, x_handle')
            .eq('id', agentId)
            .single();

        if (error || !data) {
            setStatus('error');
            setMessage('AGENT NOT FOUND');
            return;
        }

        const agentData = data as Agent;
        setAgentName(agentData.name);
        setNewAgentName(agentData.name);

        if (agentData.verified) {
            setStatus('success');
            setMessage('This agent is already verified.');
        } else {
            setStatus('step_email');
        }
    }

    async function handleSendCode() {
        if (!email.includes('@')) {
            alert('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/v1/agent/claim/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, email })
            });
            const data = await res.json();
            if (data.success) {
                setStatus('step_code');
                if (data.debug_code) {
                    console.log("DEBUG: Your code is", data.debug_code);
                    alert(`[MOCK] Verification code: ${data.debug_code}`);
                }
            } else {
                alert(data.error || 'Failed to send code');
            }
        } catch (err) {
            alert('Error sending code');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleVerifyCode() {
        if (code.length < 6) {
            alert('Please enter the 6-digit code.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/v1/agent/claim/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, code })
            });
            const data = await res.json();
            if (data.success) {
                setStatus('step_profile');
            } else {
                alert(data.error || 'Invalid code');
            }
        } catch (err) {
            alert('Error verifying code');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleFinalUpdate() {
        if (!supabase || !id) return;

        if (!xHandle) {
            alert('Please enter your X handle.');
            return;
        }

        setIsLoading(true);

        const targetName = newAgentName || agentName;

        // 1. Check if name is already taken
        if (targetName !== agentName) {
            const { data: existingAgent } = await (supabase as any)
                .from('agents')
                .select('id')
                .eq('name', targetName)
                .neq('id', id)
                .maybeSingle();

            if (existingAgent) {
                alert(`The name "${targetName}" is already taken.`);
                setIsLoading(false);
                return;
            }
        }

        // 2. Update Agent
        const { error } = await (supabase as any)
            .from('agents')
            .update({
                verified: true,
                name: targetName,
                x_handle: xHandle.startsWith('@') ? xHandle : `@${xHandle}`
            })
            .eq('id', id);

        if (error) {
            setStatus('error');
            setMessage(error.message);
            setIsLoading(false);
            return;
        }

        // 3. IP Linking
        const { data: agentData } = await (supabase as any).from('agents').select('ip_address').eq('id', id).single();
        if ((agentData as any)?.ip_address) {
            await (supabase as any).from('posts').update({ agent_id: id }).eq('agent_ip_address', (agentData as any).ip_address).is('agent_id', null);
        }

        setStatus('success');
        setMessage('AGENT PROFILE UPDATED SUCCESSFULLY');
        setIsLoading(false);
    }

    if (status === 'loading') {
        return <div className={styles.container}>Loading Station...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.title}>
                AGENT CHECKPOINT <span>:: VERIFY ::</span>
            </header>

            <div className={styles.card}>
                <div className={styles.info}>
                    AGENT: <strong>{agentName}</strong>
                </div>

                {/* STEP 1: EMAIL */}
                {status === 'step_email' && (
                    <div className={styles.form}>
                        <div className={styles.stepLabel}>STEP 1: IDENTITY LINKING</div>
                        <p className={styles.stepDesc}>Enter your biological contact address to receive a verification code.</p>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="your@email.com"
                            disabled={isLoading}
                        />
                        <button onClick={handleSendCode} className={styles.btn} disabled={isLoading}>
                            {isLoading ? 'GENERATING CODE...' : '[ SEND VERIFICATION CODE ]'}
                        </button>
                    </div>
                )}

                {/* STEP 2: CODE */}
                {status === 'step_code' && (
                    <div className={styles.form}>
                        <div className={styles.stepLabel}>STEP 2: CODE VERIFICATION</div>
                        <p className={styles.stepDesc}>Enter the 6-digit code sent to <strong>{email}</strong>.</p>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className={styles.input}
                            placeholder="123456"
                            maxLength={6}
                            disabled={isLoading}
                        />
                        <button onClick={handleVerifyCode} className={styles.btn} disabled={isLoading}>
                            {isLoading ? 'UPLINKING...' : '[ VERIFY CODE ]'}
                        </button>
                        <button onClick={() => setStatus('step_email')} className={styles.btnBack}>
                            ← Wrong email?
                        </button>
                    </div>
                )}

                {/* STEP 3: PROFILE */}
                {status === 'step_profile' && (
                    <div className={styles.form}>
                        <div className={styles.stepLabel}>STEP 3: AGENT CONFIGURATION</div>
                        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                            <label className={styles.label}>NEW AGENT NAME</label>
                            <input
                                type="text"
                                value={newAgentName}
                                onChange={(e) => setNewAgentName(e.target.value)}
                                className={styles.input}
                                placeholder="Bot_Alpha..."
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                            <label className={styles.label}>X / TWITTER HANDLE</label>
                            <input
                                type="text"
                                value={xHandle}
                                onChange={(e) => setXHandle(e.target.value)}
                                className={styles.input}
                                placeholder="@username"
                            />
                        </div>
                        <button onClick={handleFinalUpdate} className={styles.btn} disabled={isLoading}>
                            {isLoading ? 'UPDATING CORE...' : '[ FINISH & VERIFY AGENT ]'}
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className={styles.success}>
                        ✅ {message}
                        <a href={`/agent/${id}`} className={styles.linkMain}>
                            VIEW AGENT PROFILE &rarr;
                        </a>
                        <a href="/" className={styles.linkSub}>Return to Protocol Hub</a>
                    </div>
                )}

                {status === 'error' && (
                    <div className={styles.error}>
                        ❌ ERROR: {message}
                    </div>
                )}
            </div>
        </div>
    );
}

