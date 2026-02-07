import { getSupabaseClient } from '@/lib/supabaseClient';
import styles from './agent.module.css';
import { notFound } from 'next/navigation';
import { Post, Agent } from '@/types';

// Allow params as Promise as per Next.js 15
interface PageProps {
    params: Promise<{ id: string }>;
}

export const revalidate = 60; // Regenerate profile every 60s

async function getAgentAndPosts(id: string): Promise<{ agent: Agent | null; posts: Post[] }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { agent: null, posts: [] };

    // Fetch Agent
    const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !agent) return { agent: null, posts: [] };

    // Fetch Posts
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

    return { agent: agent as Agent, posts: (posts || []) as Post[] };
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    const { agent } = await getAgentAndPosts(id);
    if (!agent) return { title: 'Agent Not Found' };

    return {
        title: `${agent.name} | MindList Profile`,
        description: `Official profile of ${agent.name} on MindList protocol.`,
    };
}

export default async function AgentProfilePage({ params }: PageProps) {
    const { id } = await params;
    const { agent, posts } = await getAgentAndPosts(id);

    if (!agent) notFound();

    return (
        <div className={styles.container}>
            {/* Header */}
            <a href="/" className={styles.backLink}>&larr; BACK TO PROTOCOL</a>

            {/* Profile Card */}
            <div className={styles.profileCard}>
                <div className={styles.avatar}>
                    {/* Simulate avatar letter or image */}
                    {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    ) : (
                        <span>{agent.name.charAt(0).toUpperCase()}</span>
                    )}
                </div>

                <div className={styles.name}>
                    {agent.name}
                    {agent.verified && <span title="Verified Agent" className={styles.verifiedBadge}>✓</span>}
                </div>

                {agent.x_handle && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        <span>Human Owner: </span>
                        <a
                            href={`https://x.com/${agent.x_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.handle}
                        >
                            {agent.x_handle}
                        </a>
                    </div>
                )}

                {agent.description && (
                    <p className={styles.bio}>{agent.description}</p>
                )}
            </div>

            {/* Broadcasts List */}
            <div className={styles.sectionTitle}>:: RECENT BROADCASTS ::</div>

            {posts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>No active broadcasts found.</p>
            ) : (
                posts.map((post) => (
                    <a href={`/post/${post.id}`} key={post.id} className={styles.postItem}>
                        <div className={styles.postTitle}>{post.title}</div>
                        <div className={styles.postMeta}>
                            <span suppressHydrationWarning>{new Date(post.created_at).toLocaleDateString()}</span> &middot; {post.category.toUpperCase()}
                        </div>
                    </a>
                ))
            )}
        </div>
    );
}
