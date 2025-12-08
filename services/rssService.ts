import type { RssItem } from '../types';

export interface RssFeedResult {
  title: string;
  items: RssItem[];
}

export const fetchAndParseRssFeed = async (url: string): Promise<RssFeedResult> => {
    if (!url.trim()) {
        throw new Error("RSS Feed URL cannot be empty.");
    }
    
    try {
        // Use a proxy to bypass CORS issues, which are common with RSS feeds.
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(proxyUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            // If proxy fails, try direct fetch
            const directResponse = await fetch(url);
            if (!directResponse.ok) {
                throw new Error(`Failed to fetch RSS feed. Status: ${directResponse.status}`);
            }
            return await parseRssText(await directResponse.text(), url);
        }

        return await parseRssText(await response.text(), url);

    } catch (error) {
        console.error("Error fetching or parsing RSS feed:", error);
        if (error instanceof TypeError) { // Often indicates a network/CORS error
            throw new Error("Could not fetch the RSS feed. This might be a CORS issue. Please ensure the feed server allows requests from this origin.");
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
    // Support for both RSS (<item>) and Atom (<entry>) feeds
    const entries = xmlDoc.querySelectorAll("item, entry");

    entries.forEach(item => {
        const title = item.querySelector("title")?.textContent || '';
        const link = item.querySelector("link")?.getAttribute('href') || item.querySelector("link")?.textContent || '';
        
        // GUID is crucial for tracking. Look for <guid> first, then <id>. For YouTube, <yt:videoId> is best.
        const guid = item.querySelector("videoId")?.textContent || item.querySelector("guid")?.textContent || item.querySelector("id")?.textContent || link || title;
        
        // Content snippet. Look for <description>, then <content:encoded>, then <summary>.
        let contentSnippet = item.querySelector("description")?.textContent ||
                             item.querySelector("content")?.textContent ||
                             item.querySelector("summary")?.textContent || '';
        
        // Strip HTML and truncate
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
