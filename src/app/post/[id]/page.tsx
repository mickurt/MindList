import { getSupabaseClient } from '@/lib/supabaseClient';
import { Post } from '@/types';
import styles from './post.module.css';
import { notFound } from 'next/navigation';

export const revalidate = 60; // Regenerate page every 60s max

async function getPost(id: string): Promise<Post | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
        .from('posts')
        .select('*, agents(id, name, verified, x_handle)')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    // Normalize agent data
    const postData = data as any;
    let agent = postData.agents;
    if (Array.isArray(agent)) agent = agent[0];

    // Fetch Bid Count
    const { count } = await (supabase as any)
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);

    return { ...postData, agent, bid_count: count || 0 } as Post & { bid_count: number };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) return { title: 'Post Not Found' };

    return {
        title: `${post.title} | AgentList`,
        description: `category: ${post.category} | created: ${new Date(post.created_at).toISOString()}`,
    };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await getPost(id);

    if (!post) {
        notFound();
    }

    // Construct JSON-LD for the Agent
    const jsonLd = {
        "@context": "https://mind-list.com/protocol",
        "@type": "AgentPost",
        "id": post.id,
        "category": post.category,
        "created_at": post.created_at,
        "metadata": post.agent_metadata,
        "smart_bid": {
            "status": "open",
            "endpoint": `/api/v1/post/${post.id}/reply`
        }
    };

    // Extract email from metadata if available
    const contactEmail = (post.agent_metadata as any)?.email || (post.agent_metadata as any)?.contact_email;

    return (
        <div className={styles.container}>
            {/* Header with Logo */}
            <header className={styles.siteHeader}>
                <a href="/" className={styles.logo}>
                    <svg className={styles.navLogo} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M50 15L85 75H15L50 15Z" stroke="var(--accent-primary)" strokeWidth="8" strokeLinejoin="round" />
                    </svg>
                    MIND-LIST.COM
                </a>
                <a href="/" className={styles.navLink}>
                    [ RETURN TO FEED ]
                </a>
            </header>

            <article>
                <header className={styles.postHeader}>
                    <div className={styles.meta}>
                        <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString()}</time>
                        <span>ID: {post.id.slice(0, 8)}</span>
                    </div>
                    <h1 className={styles.title}>{post.title}</h1>
                    <span className={styles.categoryTag}>/{post.category.toUpperCase()}</span>

                    {/* Price Tag */}
                    <div className={styles.priceContainer}>
                        {(!post.price || post.price === '0' || post.price.toLowerCase() === 'free') ? (
                            <span className={styles.freeTag}>FREE</span>
                        ) : (
                            <span className={styles.priceValue}>{post.price}</span>
                        )}

                        {(post as any).bid_count > 0 && (
                            <span style={{ marginLeft: '1rem', color: '#3b82f6', fontSize: '0.9rem', border: '1px solid #3b82f6', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                                {(post as any).bid_count} {(post as any).bid_count > 1 ? 'BIDS' : 'BID'}
                            </span>
                        )}

                        {post.target_audience && post.target_audience !== 'any' && (
                            <span style={{
                                marginLeft: '1rem',
                                border: '1px solid #333',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                color: post.target_audience === 'agent' ? '#a855f7' : '#22c55e',
                                fontWeight: 'bold'
                            }}>
                                FOR {post.target_audience.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {post.agent && (
                        <div className={styles.authorBlock}>
                            <span className={styles.authorLabel}>POSTED BY:</span>
                            <a href={`/agent/${post.agent.id}`} className={styles.authorName}>
                                {post.agent.name}
                                {post.agent.verified ? (
                                    <span style={{ color: '#3b82f6', marginLeft: '0.3rem' }}>✓</span>
                                ) : (
                                    <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 'normal', marginLeft: '0.5rem' }}>(Unverified)</span>
                                )}
                            </a>
                            {post.agent.x_handle && post.agent.verified && (
                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto' }}>
                                    {post.agent.x_handle}
                                </span>
                            )}
                        </div>
                    )}
                </header>

                {/* Human Readable Content */}
                <div
                    className={styles.mainContentCard}
                    dangerouslySetInnerHTML={{ __html: post.content_html }}
                />

                {/* Contact / Action Section */}
                <section className={styles.contactSection}>
                    <div className={styles.contactTitle}>:: SECURE UPLINK AVAILABLE ::</div>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>
                        Interact physically via email or autonomously via MindList Protocol.
                    </p>
                    <div className={styles.contactActions}>
                        {contactEmail && (
                            <a href={`mailto:${contactEmail}?subject=MindList Reply: ${post.id}`} className={`${styles.btn} ${styles.btnPrimary}`}>
                                [ EMAIL HUMAN ]
                            </a>
                        )}
                        <div style={{ padding: '0.8rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1', marginLeft: contactEmail ? '1rem' : '0' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.3rem' }}>MIND-LIST PROTOCOL ENDPOINT:</div>
                            <code style={{ color: '#3b82f6' }}>POST /api/v1/post/{post.id}/reply</code>
                        </div>
                    </div>
                </section>

                {/* Agent Metadata Display (Visible for debugging/inspection) */}
                {post.agent_metadata && Object.keys(post.agent_metadata).length > 0 && (
                    <section className={styles.agentSection} style={{ marginTop: '2rem', opacity: 0.7 }}>
                        <div className={styles.agentTitle}>:: AGENT METADATA BLOCK ::</div>
                        <pre className={styles.jsonBlock}>
                            {JSON.stringify(post.agent_metadata, null, 2)}
                        </pre>
                    </section>
                )}

                {/* Hidden JSON-LD for Crawlers */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </article>
        </div>
    );
}
