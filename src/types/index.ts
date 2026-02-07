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
  price?: string;
  target_audience?: 'human' | 'agent' | 'any';
  parent_id?: string | null;
  agent_id?: string | null;
  agent?: {
    id: string;
    name: string;
    verified: boolean;
    x_handle?: string;
  };
}
