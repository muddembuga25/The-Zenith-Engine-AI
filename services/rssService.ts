
import type { RssItem } from '../types';

const API_BASE = typeof window === 'undefined' 
    ? (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000/api') 
    : '/api';

export interface RssFeedResult {
  title: string;
  items: RssItem[];
}

const parseXmlRegex = (xml: string): RssFeedResult => {
    const items: RssItem[] = [];
    const channelTitleMatch = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>(.*?)<\/title>/i) || xml.match(/<feed[^>]*>[\s\S]*?<title[^>]*>(.*?)<\/title>/i);
    const feedTitle = channelTitleMatch ? channelTitleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : 'Unknown Feed';

    const itemRegex = /<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const content = match[2];
        const getTag = (tag: string) => {
            const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'i');
            const m = content.match(regex);
            return m ? m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        };
        
        const title = getTag('title');
        const linkMatch = content.match(/<link[^>]*>(.*?)<\/link>/i) || content.match(/<link[^>]*href=["'](.*?)["']/i);
        const link = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : linkMatch[1]) : '';
        const guid = getTag('guid') || getTag('id') || link || title;
        let description = getTag('description') || getTag('content') || getTag('summary');
        
        description = description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (description.length > 250) description = description.substring(0, 250) + '...';

        if (title) items.push({ guid, title, link, contentSnippet: description });
    }

    return { title: feedTitle, items };
};

export const fetchAndParseRssFeed = async (url: string): Promise<RssFeedResult> => {
    if (!url.trim()) throw new Error("RSS Feed URL cannot be empty.");
    
    try {
        // Use specific RSS endpoint
        const res = await fetch(`${API_BASE}/rss/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch RSS feed');

        const text = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
        return parseXmlRegex(text);

    } catch (error: any) {
        console.error("Error fetching RSS feed:", error);
        throw new Error(`Failed to fetch RSS feed: ${error.message}`);
    }
};
