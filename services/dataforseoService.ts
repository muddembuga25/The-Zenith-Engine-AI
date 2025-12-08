
// services/dataforseoService.ts
import { proxyFetch } from './secureBackendSimulation';

const API_URL_SERP = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
const API_URL_KEYWORD_IDEAS = 'https://api.dataforseo.com/v3/keywords_data/google/keyword_ideas/live';

/**
 * Fetches the top 10 organic search results for a keyword using the DataForSEO SERP API.
 * @param keyword The keyword to search for.
 * @param apiKey The combined API key in "login:key" format.
 * @returns A promise that resolves to an array of { title, url } objects.
 */
export const fetchOrganicResults = async (keyword: string, apiKey: string): Promise<{ title: string; url: string }[]> => {
    if (!apiKey || !apiKey.includes(':')) {
        throw new Error("DataForSEO API key is missing or in the wrong format. Expected 'login:key'.");
    }

    const [login, key] = apiKey.split(':');
    if (!login || !key) {
        throw new Error("Invalid DataForSEO API key format. Expected 'login:key'.");
    }
    const encodedCredentials = btoa(`${login}:${key}`);

    const postData = [{
        language_code: "en",
        location_code: 2840, // USA
        keyword: keyword,
        limit: 10, // Fetch top 10 results
    }];

    try {
        const response = await proxyFetch(API_URL_SERP, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(`DataForSEO API request failed with status ${response.status}: ${errorBody.status_message || 'Unknown error'}`);
        }

        const data = await response.json();
        
        if (data.status_code !== 20000) {
            throw new Error(`DataForSEO task failed: ${data.status_message}`);
        }

        const resultItems = data.tasks?.[0]?.result?.[0]?.items;
        if (!resultItems || !Array.isArray(resultItems)) {
            console.warn("DataForSEO returned no result items for keyword:", keyword);
            return [];
        }

        return resultItems
            .filter(item => item.type === 'organic' && item.url && item.title)
            .map(item => ({
                title: item.title,
                url: item.url
            }));

    } catch (error) {
        console.error("Error fetching from DataForSEO:", error);
        // Re-throw the error so it can be caught by the caller
        throw error;
    }
};

/**
 * Fetches keyword ideas and their search volumes from the DataForSEO Keyword Ideas API.
 * @param keyword The seed keyword/topic.
 * @param apiKey The combined API key in "login:key" format.
 * @returns A promise that resolves to an array of keywords with their search volumes.
 */
export const fetchKeywordIdeas = async (
  keyword: string,
  apiKey: string
): Promise<{ keyword: string; search_volume: number }[]> => {
  if (!apiKey || !apiKey.includes(':')) {
    throw new Error("DataForSEO API key is missing or in the wrong format. Expected 'login:key'.");
  }

  const [login, key] = apiKey.split(':');
  const encodedCredentials = btoa(`${login}:${key}`);

  const postData = [{
    language_code: "en",
    location_code: 2840, // USA
    keyword: keyword,
    limit: 100, // Get a good list for the AI to analyze
  }];

  try {
    const response = await proxyFetch(API_URL_KEYWORD_IDEAS, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`DataForSEO API request failed with status ${response.status}: ${errorBody.status_message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (data.status_code !== 20000) {
      throw new Error(`DataForSEO task failed: ${data.status_message}`);
    }

    const resultItems = data.tasks?.[0]?.result?.[0]?.items;
    if (!resultItems || !Array.isArray(resultItems)) {
      console.warn("DataForSEO returned no keyword ideas for:", keyword);
      return [];
    }

    return resultItems
      .filter(item => item.keyword && item.keyword_info?.search_volume != null)
      .map(item => ({
        keyword: item.keyword,
        search_volume: item.keyword_info.search_volume
      }));

  } catch (error) {
    console.error("Error fetching keyword ideas from DataForSEO:", error);
    throw error;
  }
};
