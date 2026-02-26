import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

type ScrapeOptions = {
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
};

export interface SearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export const firecrawlApi = {
  async scrape(url: string, options?: ScrapeOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async search(query: string, limit = 8): Promise<FirecrawlResponse<SearchResult[]>> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { action: 'search', query, limit },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
