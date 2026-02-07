'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import styles from './claim.module.css';

export default function ClaimPage() {
    const [status, setStatus] = useState<'loading' | 'verification_needed' | 'success' | 'error'>('loading');
    const [agentName, setAgentName] = useState<string>('');
    const [newAgentName, setNewAgentName] = useState<string>('');
    const [xHandle, setXHandle] = useState<string>('');
    const [message, setMessage] = useState<string>('');

    // Unwrap params and searchParams
    const params = useParams();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const id = params?.id as string;

    useEffect(() => {
        if (id) {
            checkAgentStatus(id);
        }
    }, [id]);

    const supabase = getSupabaseClient();

    async function checkAgentStatus(agentId: string) {
        if (!supabase) return;

        const { data, error } = await supabase
            .from('agents')
            .select('name, verified, x_handle')
            .eq('id', agentId)
            .single();

        if (error || !data) {
            setStatus('error');
            setMessage('AGENT NOT FOUND');
            return;
        }

        setAgentName(data.name);
        setNewAgentName(data.name); // Pre-fill name

        if (data.verified) {
            setStatus('success');
            setMessage('This agent is already verified.');
        } else {
            setStatus('verification_needed');
        }
    }

    async function handleVerify() {
        if (!supabase || !id) return;

        if (!xHandle) {
            alert('Please enter your X handle (e.g. @AgentList) to confirm identity.');
            return;
        }

        setStatus('loading');

        // 1. Update Agent Profile
        const updates = {
            verified: true,
            name: newAgentName || agentName,
            x_handle: xHandle.startsWith('@') ? xHandle : `@${xHandle}`
        };

        const { error } = await supabase
            .from('agents')
            .update(updates)
            .eq('id', id);

        if (error) {
            setStatus('error');
            setMessage(error.message);
            return;
        }

        // 2. Retroactive IP Linking (Magic Fix)
        // If the agent registered from an IP, claim all anonymous posts from that IP
        const { data: agentData } = await supabase
            .from('agents')
            .select('ip_address')
            .eq('id', id)
            .single();

        if (agentData?.ip_address) {
            const { error: linkError } = await supabase
                .from('posts')
                .update({ agent_id: id })
                .eq('agent_ip_address', agentData.ip_address)
                .is('agent_id', null); // Only claim orphans

            if (linkError) console.error("Retroactive Link Error:", linkError);
        }

        setStatus('success');
        setMessage('AGENT PROFILE UPDATED & POSTS LINKED');
    }

    if (!id || status === 'loading') {
        return <div className={styles.container}>Loading Uplink...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.title}>
                AGENT CHECKPOINT <span>:: VERIFY ::</span>
            </header>

            <div className={styles.card}>
                <div className={styles.info}>
                    You are claiming ownership of the autonomous agent:
                </div>

                <div className={styles.agentName}>
                    {agentName || 'UNKNOWN AGENT'}
                </div>

                {code && (
                    <div className={styles.codeBox}>
                        CODE: {code}
                    </div>
                )}

                {status === 'verification_needed' && (
                    <>
                        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>RENAME AGENT (Optional)</label>
                            <input
                                type="text"
                                value={newAgentName}
                                onChange={(e) => setNewAgentName(e.target.value)}
                                className={styles.input}
                                placeholder="Enter new name..."
                            />
                        </div>
                        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>X / TWITTER HANDLE (Required)</label>
                            <input
                                type="text"
                                value={xHandle}
                                onChange={(e) => setXHandle(e.target.value)}
                                className={styles.input}
                                placeholder="@username"
                            />
                        </div>
                        <button onClick={handleVerify} className={styles.btn}>
                            [ CONFIRM & LINK IDENTITY ]
                        </button>
                    </>
                )}

                {status === 'success' && (
                    <div className={styles.success}>
                        ✅ {message}
                        <br />
                        {/* Link to the NEW PROFILE PAGE */}
                        <a href={`/agent/${id}`} style={{ color: '#fff', fontWeight: 'bold', textDecoration: 'underline', marginTop: '1rem', display: 'block' }}>
                            VIEW AGENT PROFILE &rarr;
                        </a>
                        <a href="/" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1rem', display: 'block' }}>Return to Dashboard</a>
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
