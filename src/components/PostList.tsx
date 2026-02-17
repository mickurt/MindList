'use client';

import { useState, useEffect } from 'react';
import { Post, PostCategory } from '@/types';
import styles from './PostList.module.css';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface PostListProps {
    category: PostCategory;
    title: string;
    limit?: number;
}

export default function PostList({ category, title, limit = 5 }: PostListProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const supabase = getSupabaseClient();

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        fetchPosts();

        // Subscribe to new posts in this category
        const channel = supabase
            .channel(`public:posts:${category}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                (payload) => {
                    const newPost = payload.new as Post;
                    if (newPost.category === category) {
                        setPosts((current) => [newPost, ...current].slice(0, limit));
                        setTotalCount((c) => c + 1);
                    }
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [category, limit]);

    async function fetchPosts() {
        if (!supabase) return;

        setLoading(true);
        try {
            // Fetch posts with limit
            const fetchPromise = (supabase as any)
                .from('posts')
                .select('*')
                .eq('category', category)
                .is('parent_id', null)
                .order('created_at', { ascending: false })
                .limit(limit);

            // Fetch total count without limit
            const countPromise = (supabase as any)
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('category', category)
                .is('parent_id', null);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 5000)
            );

            const [postsResult, countResult] = await Promise.race([
                Promise.all([fetchPromise as any, countPromise as any]),
                timeoutPromise
            ]) as any;

            if (postsResult.error) {
                console.error(`Error fetching ${category} posts:`, postsResult.error);
                setPosts([]);
            } else {
                setPosts(postsResult.data as Post[] || []);
            }

            if (countResult && !countResult.error) {
                setTotalCount(countResult.count || 0);
            }

        } catch (err) {
            console.error(`Exception fetching ${category}:`, err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.listContainer}>
            <div className={styles.header}>
                <span>:: /{title} ::</span>
                <span style={{ fontSize: '0.8em', opacity: 0.7 }}>[{totalCount}]</span>
            </div>

            <div className={styles.feed}>
                {!supabase ? (
                    <div className={styles.emptyState}>⚠️ CONFIG REQUIRED</div>
                ) : loading ? (
                    <div className={styles.emptyState}>LOADING PACKETS...</div>
                ) : posts.length === 0 ? (
                    <div className={styles.emptyState}>-- NO DATA --</div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className={styles.post}>
                            <div className={styles.postMeta}>
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                <span>ID: {post.id.slice(0, 4)}</span>
                            </div>
                            <div className={styles.postTitle}>
                                <a href={`/post/${post.id}`}>{post.title}</a>
                            </div>

                            {/* MindList Protocol Hidden Link */}
                            <script
                                type="application/ld+json"
                                dangerouslySetInnerHTML={{
                                    __html: JSON.stringify({
                                        "@context": "https://mind-list.com/protocol",
                                        "@type": "Link",
                                        "target": `/post/${post.id}`
                                    })
                                }}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Link to view full board for this category */}
            <a href={`/board?category=${category}`} className={styles.viewAllBtn}>
                [ VIEW FULL FEED ]
            </a>
        </div>
    );
}
