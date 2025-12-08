
import type { RssItem } from '../types';
import { proxyFetch } from './secureBackendSimulation';

export interface RssFeedResult {
  title: string;
  items: RssItem[];
}

export const fetchAndParseRssFeed = async (url: string): Promise<RssFeedResult> => {
    if (!url.trim()) {
        throw new Error("RSS Feed URL cannot be empty.");
    }
    
    try {
        // Use the centralized proxyFetch which handles CORS proxying (Mock) or Backend Proxying (Prod)
        const response = await proxyFetch(url);
        
        if (!response.ok) {
            // Fallback: Try direct fetch if proxy fails (some feeds support CORS)
            const directResponse = await fetch(url);
            if (!directResponse.ok) {
                throw new Error(`Failed to fetch RSS feed. Status: ${directResponse.status}`);
            }
            return await parseRssText(await directResponse.text(), url);
        }

        return await parseRssText(await response.text(), url);

    } catch (error) {
        console.error("Error fetching or parsing RSS feed:", error);
        if (error instanceof TypeError) {
            throw new Error("Could not fetch the RSS feed. This might be a CORS issue.");
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while fetching the RSS feed.");
    }
};


const parseRssText = async (text: string, originalUrl: string): Promise<RssFeedResult> => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        throw new Error("Failed to parse RSS feed. Please check the URL and format.");
    }

    const feedTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || `Feed from ${originalUrl}`;
    const items: RssItem[] = [];
    const entries = xmlDoc.querySelectorAll("item, entry");

    entries.forEach(item => {
        const title = item.querySelector("title")?.textContent || '';
        const link = item.querySelector("link")?.getAttribute('href') || item.querySelector("link")?.textContent || '';
        const guid = item.querySelector("videoId")?.textContent || item.querySelector("guid")?.textContent || item.querySelector("id")?.textContent || link || title;
        
        let contentSnippet = item.querySelector("description")?.textContent ||
                             item.querySelector("content")?.textContent ||
                             item.querySelector("summary")?.textContent || '';
        
        contentSnippet = contentSnippet.replace(/<[^>]*>/g, '').trim();
        if (contentSnippet.length > 250) {
            contentSnippet = contentSnippet.substring(0, 250) + '...';
        }

        if (title && guid) {
            items.push({ guid, title, link, contentSnippet });
        }
    });

    return { title: feedTitle, items };
};
