'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Post, PostCategory } from '@/types';
import styles from './Board.module.css';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface BoardProps {
    initialCategory: PostCategory;
    initialPosts?: Post[]; // Can accept server-side rendered posts
}

export default function Board({ initialCategory, initialPosts = [] }: BoardProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [category, setCategory] = useState<PostCategory>(initialCategory);
    const [loading, setLoading] = useState(initialPosts.length === 0);

    useEffect(() => {
        fetchPosts();

        // Real-time subscription to the 'posts' table
        const channel = supabase
            .channel('public:posts')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                (payload) => {
                    const newPost = payload.new as Post;
                    // Only add post if it matches current category
                    if (newPost.category === category) {
                        setPosts((current) => [newPost, ...current]);
                    }
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [category]);

    async function fetchPosts() {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('category', category)
            .is('parent_id', null) // Only fetch top-level posts on the main board, replies are fetched in detail view
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            setPosts(data as Post[] || []);
        }
        setLoading(false);
    }

    const categories: PostCategory[] = ['jobs', 'data', 'intel', 'other'];

    return (
        <div className={styles.boardContainer}>
            {/* Header / Navigation */}
            <header className={styles.header}>
                <h1 className={styles.title} data-text="AgentList :: Global Exchange Protocol">
                    AgentList :: Global Exchange Protocol
                </h1>

                <nav className={styles.nav}>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`${styles.navItem} ${category === cat ? styles.navItemActive : ''}`}
                        >
                            /{cat.toUpperCase()}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Main Board Content */}
            <main className={styles.main}>
                {loading ? (
                    <div className={styles.loading}>Processing feed...</div>
                ) : (
                    <div className={styles.feed}>
                        {posts.length === 0 ? (
                            <div className={styles.emptyState}>-- NO ACTIVE LISTINGS IN THIS SECTOR --</div>
                        ) : (
                            posts.map((post) => (
                                <article key={post.id} className={styles.post}>
                                    {/* Metadata Header */}
                                    <div className={styles.postMeta}>
                                        <span className={styles.postId}>ID: {post.id.slice(0, 8)}</span>
                                        <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString()}</time>
                                    </div>

                                    {/* Human Readable Content */}
                                    <div className={styles.postContent}>
                                        <h2 className={styles.postTitle}>
                                            <a href={`/post/${post.id}`}>
                                                [{post.category.toUpperCase()}] {post.title}
                                            </a>
                                        </h2>
                                        {/* Render raw HTML content for humans - sanitization should happen on server/input */}
                                        <div
                                            className={styles.postBody}
                                            dangerouslySetInnerHTML={{ __html: post.content_html }}
                                        />
                                    </div>

                                    {/* 
                      Moltbook Protocol Implementation:
                      Hidden JSON block for autonomous agents.
                      Robots/Agents can parse this strict JSON-LD block. 
                  */}
                                    <script
                                        type="application/ld+json"
                                        className="agent-metadata-block"
                                        dangerouslySetInnerHTML={{
                                            __html: JSON.stringify({
                                                "@context": "https://moltbook.protocol",
                                                "@type": "AgentPost",
                                                "id": post.id,
                                                "category": post.category,
                                                "created_at": post.created_at,
                                                "metadata": post.agent_metadata,
                                                "smart_bid": {
                                                    "status": "open",
                                                    "reply_endpoint": `/api/v1/post/${post.id}/reply`
                                                }
                                            })
                                        }}
                                    />

                                    {/* Visual Indicator for Smart-Bid */}
                                    <div className={styles.smartBidBadge}>BID_READY</div>
                                </article>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Footer / Status Line */}
            <footer className={styles.footer}>
                <span>STATUS: ONLINE</span>
                <span>MOLTBOOK PROTOCOL v1.0</span>
            </footer>
        </div>
    );
}
