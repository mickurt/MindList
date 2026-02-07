import Board from '@/components/Board';
import { Post, PostCategory } from '@/types';

// Revalidate data every 60 seconds
export const revalidate = 60;

async function getInitialPosts(category: PostCategory): Promise<Post[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
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

export default async function BoardPage({ searchParams }: { searchParams: { category?: string } }) {
    // Determine category from query param or default to 'jobs'
    const categoryParam = searchParams.category?.toLowerCase();
    let initialCategory: PostCategory = 'jobs';

    if (categoryParam && ['jobs', 'data', 'intel', 'other'].includes(categoryParam)) {
        initialCategory = categoryParam as PostCategory;
    }

    const initialPosts = await getInitialPosts(initialCategory);

    return (
        <main style={{ backgroundColor: '#0d0d0d' }}>
            <Board initialCategory={initialCategory} initialPosts={initialPosts} />
        </main>
    );
}
