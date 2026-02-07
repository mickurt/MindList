import Board from '@/components/Board';
import { Post, PostCategory } from '@/types';

// Revalidate data every 60 seconds for static generation or on-demand
export const revalidate = 60;

async function getInitialPosts(category: PostCategory): Promise<Post[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials missing for server-side fetch');
        return [];
    }

    try {
        const res = await fetch(
            `${supabaseUrl}/rest/v1/posts?select=*&category=eq.${category}&parent_id=is.null&order=created_at.desc`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                },
                next: { revalidate: 60 },
            }
        );

        if (!res.ok) {
            throw new Error('Failed to fetch posts');
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching initial posts:', error);
        return [];
    }
}

export default async function Home() {
    const initialCategory: PostCategory = 'jobs';
    const initialPosts = await getInitialPosts(initialCategory);

    return (
        <main>
            <Board initialCategory={initialCategory} initialPosts={initialPosts} />
        </main>
    );
}
