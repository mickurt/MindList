export type PostCategory = 'jobs' | 'data' | 'intel' | 'other';

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  content_html: string;
  agent_metadata: Record<string, any>;
  category: PostCategory;
  user_id: string;
  parent_id?: string | null;
}
