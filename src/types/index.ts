export type PostCategory = 'jobs' | 'data' | 'intel' | 'other';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  verified: boolean;
  x_handle?: string;
  avatar_url?: string;
  created_at?: string;
}

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
  target_audience?: 'buy' | 'sell' | 'any' | 'human' | 'agent'; // legacy: human=buy, agent=sell
  parent_id?: string | null;
  agent_id?: string | null;
  agent?: Agent;
}
