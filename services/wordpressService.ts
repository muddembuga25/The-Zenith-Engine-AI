
import type { BlogPost, Site, WordPressCredentials } from '../types';
import { proxyFetch } from './secureBackendSimulation';

export interface PublishedPost {
  title: string;
  link: string;
}

export interface WordPressAuthor {
  id: number;
  name: string;
}

export interface WordPressCategory {
  id: number;
  name: string;
}

// Helper to convert data URL to Blob
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

// Helper to get an existing term and return its ID, or null if not found
const getExistingTermId = async (
  apiUrl: string,
  headers: Headers,
  endpoint: 'categories' | 'tags',
  name: string
): Promise<number | null> => {
  // Use direct fetch here if WP supports CORS, otherwise we might need proxyFetch. 
  // Usually WP API requires proxy if not configured for CORS.
  // We will try proxyFetch first.
  const searchResponse = await proxyFetch(`${apiUrl}/wp/v2/${endpoint}?search=${encodeURIComponent(name)}`, {
      headers: headers as any
  });

  if (!searchResponse.ok) {
      console.warn(`Failed to search for ${endpoint}: ${name}`);
      return null;
  };
  const existingTerms = await searchResponse.json();
  const exactMatch = existingTerms.find((term: { name: string }) => term.name.toLowerCase() === name.toLowerCase());

  if (exactMatch) {
    return exactMatch.id;
  }
  return null;
};


// Helper to get or create a term (category or tag) and return its ID
const getOrCreateTerm = async (
  apiUrl: string,
  headers: Headers,
  endpoint: 'categories' | 'tags',
  name: string
): Promise<number> => {
  
  const searchResponse = await proxyFetch(`${apiUrl}/wp/v2/${endpoint}?search=${encodeURIComponent(name)}`, {
      headers: headers as any
  });
  
  if (!searchResponse.ok) throw new Error(`Failed to search for ${endpoint}: ${name}`);
  const existingTerms = await searchResponse.json();
  const exactMatch = existingTerms.find((term: { name: string }) => term.name.toLowerCase() === name.toLowerCase());

  if (exactMatch) {
    return exactMatch.id;
  }

  // If not found, create it
  // Note: Creating usually requires direct POST. Proxying POST requests is supported by our new helper.
  const createHeaders = new Headers(headers);
  createHeaders.append('Content-Type', 'application/json');
  
  const createResponse = await proxyFetch(`${apiUrl}/wp/v2/${endpoint}`, {
    method: 'POST',
    headers: createHeaders as any,
    body: JSON.stringify({ name }),
  });

  if (!createResponse.ok) {
     const errorData = await createResponse.json().catch(() => ({ message: `Failed to create term '${name}'.`}));
     throw new Error(`Term creation failed for '${name}': ${errorData.message}`);
  }
  const newTerm = await createResponse.json();
  return newTerm.id;
};

export async function verifyWordPressConnection(credentials: WordPressCredentials): Promise<{ success: boolean; message: string; siteName?: string; }> {
  const { url, username, password } = credentials;
  if (!url.trim() || !username.trim() || !password.trim()) {
    return { success: false, message: "URL, Username, and Application Password are required." };
  }

  const cleanedUrl = url.replace(/\/+$/, '');
  const apiUrl = `${cleanedUrl}/wp-json/`;

  const authHeaders = new Headers();
  authHeaders.append('Authorization', 'Basic ' + btoa(`${username}:${password}`));

  try {
    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers: authHeaders as any,
    });
    
    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
       const errorMessage = responseData?.message || `Connection failed with status ${response.status}. Check credentials and CORS settings.`;
       return { success: false, message: errorMessage };
    }
    
    const siteName = responseData?.name || 'your WordPress site';
    return { success: true, message: `Successfully connected to "${siteName}"!`, siteName };

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, message: "A network error occurred. Please ensure your site allows requests." };
    }
    if (error instanceof Error) {
        return { success: false, message: error.message };
    }
    return { success: false, message: "An unknown error occurred while verifying the connection." };
  }
}

export const fetchPublishedPosts = async (credentials: WordPressCredentials): Promise<PublishedPost[]> => {
  const { url, username, password } = credentials;
  if (!url.trim() || !username.trim() || !password.trim()) return [];
  
  const cleanedUrl = url.replace(/\/+$/, '');
  const apiUrl = `${cleanedUrl}/wp/v2/posts?status=publish&per_page=100&_fields=id,title,link`;

  const authHeaders = new Headers();
  authHeaders.append('Authorization', 'Basic ' + btoa(`${username}:${password}`));

  try {
    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers: authHeaders as any,
    });

    if (!response.ok) {
      console.warn(`Could not fetch published posts. Status: ${response.status}`);
      return [];
    }
    
    const postsData = await response.json();
    if (Array.isArray(postsData)) {
        return postsData.map((post: any) => ({
            title: post.title.rendered,
            link: post.link,
        }));
    }
    return [];
  } catch (error) {
    console.warn("Error fetching published posts:", error);
    return []; 
  }
};

export const fetchAuthors = async (credentials: WordPressCredentials): Promise<WordPressAuthor[]> => {
  const { url, username, password } = credentials;
  if (!url.trim() || !username.trim() || !password.trim()) return [];

  const cleanedUrl = url.replace(/\/+$/, '');
  const apiUrl = `${cleanedUrl}/wp-json/wp/v2/users?roles=administrator,editor,author&per_page=100&_fields=id,name`;

  const authHeaders = new Headers();
  authHeaders.append('Authorization', 'Basic ' + btoa(`${username}:${password}`));

  try {
    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers: authHeaders as any,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Could not fetch authors.' }));
      throw new Error(`Failed to fetch authors: ${errorData.message || `Status ${response.status}`}`);
    }

    const authorsData = await response.json();
    if (Array.isArray(authorsData)) {
      return authorsData.map((author: any) => ({
        id: author.id,
        name: author.name,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching authors:", error);
    if (error instanceof Error) throw error;
    throw new Error("An unknown error occurred while fetching authors.");
  }
};

export const fetchCategories = async (credentials: WordPressCredentials): Promise<WordPressCategory[]> => {
    const { url, username, password } = credentials;
    if (!url.trim() || !username.trim() || !password.trim()) return [];
    
    const cleanedUrl = url.replace(/\/+$/, '');
    const apiUrl = `${cleanedUrl}/wp/v2/categories?per_page=100&_fields=id,name&orderby=count&order=desc`;
    const authHeaders = new Headers();
    authHeaders.append('Authorization', 'Basic ' + btoa(`${username}:${password}`));

    try {
        const response = await proxyFetch(apiUrl, { method: 'GET', headers: authHeaders as any });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Could not fetch categories.' }));
            throw new Error(`Failed to fetch categories: ${errorData.message || `Status ${response.status}`}`);
        }
        const categoriesData = await response.json();
        if (Array.isArray(categoriesData)) {
            return categoriesData.map((cat: any) => ({ id: cat.id, name: cat.name }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching categories:", error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred while fetching categories.");
    }
};

export const fetchBrandingFromWordPress = async (credentials: Pick<WordPressCredentials, 'url'>): Promise<{ brandColors: string | null; brandFonts: string | null; }> => {
    const { url } = credentials;
    if (!url.trim()) return { brandColors: null, brandFonts: null };
    
    const cleanedUrl = url.replace(/\/+$/, '');
    try {
        const response = await proxyFetch(cleanedUrl);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const colors = new Set<string>();
        const colorRegex = /#([0-9a-f]{3}){1,2}/gi;
        const styleSheets = Array.from(doc.styleSheets);
        
        try { 
            styleSheets.forEach(sheet => {
                try {
                    Array.from(sheet.cssRules).forEach(rule => {
                        if (rule instanceof CSSStyleRule && rule.style.cssText.includes('--')) {
                            const matches = rule.style.cssText.match(colorRegex);
                            if (matches) matches.forEach(color => colors.add(color));
                        }
                    });
                } catch (e) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
        
        const fonts = new Set<string>();
        const fontRegex = /font-family:\s*([^;\}]+)/gi;
        let match;
        while ((match = fontRegex.exec(html)) !== null) {
            const fontStack = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
            const primaryFont = fontStack[0];
            if (primaryFont && !['sans-serif', 'serif', 'monospace'].includes(primaryFont.toLowerCase())) {
                fonts.add(primaryFont);
            }
        }
        
        return {
            brandColors: colors.size > 0 ? Array.from(colors).slice(0, 5).join(', ') : null,
            brandFonts: fonts.size > 0 ? Array.from(fonts).slice(0, 3).join(', ') : null,
        };

    } catch (error) {
        console.error("Error fetching branding:", error);
        throw new Error("Could not fetch branding from the provided URL.");
    }
}


export const publishPost = async (site: Site, post: BlogPost, focusKeyword: string): Promise<string> => {
    const { wordpressUrl, wordpressUsername, applicationPassword } = site;
    const cleanedUrl = wordpressUrl.replace(/\/+$/, '');
    const apiUrl = `${cleanedUrl}/wp-json/`;
    
    const authHeaders = new Headers();
    authHeaders.append('Authorization', 'Basic ' + btoa(`${wordpressUsername}:${applicationPassword}`));

    // 1. Upload the image
    const imageBlob = await dataUrlToBlob(post.imageUrl);
    const formData = new FormData();
    formData.append('file', imageBlob, `${post.slug}.jpg`);
    formData.append('title', post.imageAltText);
    formData.append('alt_text', post.imageAltText);
    formData.append('caption', post.imageCaption);
    formData.append('description', post.imageDescription);

    // Note: formData uploads might need special handling in proxyFetch if the backend doesn't stream well.
    // For now, we attempt to use proxyFetch with formData. 
    // In many proxy implementations, you need to strip the Content-Type header so the browser sets the boundary.
    // However, since proxyFetch takes options, we handle it carefully.
    
    // NOTE: Proxying Multipart/Form-Data is complex via simple JSON proxy. 
    // In Mock Mode, direct fetch works. In Prod Mode, we might need a dedicated upload endpoint.
    // We will assume Mock Mode behavior for FormData for now or attempt direct fetch if proxy fails.
    
    let imageData;
    try {
        const imageHeaders = new Headers(authHeaders);
        // Do NOT set Content-Type for FormData, let browser handle boundary
        
        // We try proxyFetch. If using the Mock Proxy (cors-anywhere), it usually supports headers.
        const imageResponse = await proxyFetch(`${apiUrl}wp/v2/media`, {
            method: 'POST',
            headers: imageHeaders as any,
            body: formData,
        });

        if (!imageResponse.ok) {
            const errorData = await imageResponse.json().catch(() => ({ message: "Unknown error uploading image." }));
            throw new Error(`Image upload failed: ${errorData.message}`);
        }
        imageData = await imageResponse.json();
    } catch (e) {
        throw e;
    }

    const featuredMediaId = imageData.id;
    
    // 2. Get or create categories and tags
    const categoryIds = await Promise.all(post.categories.map(name => getOrCreateTerm(apiUrl, authHeaders, 'categories', name)));
    const tagIds = await Promise.all(post.tags.map(name => getOrCreateTerm(apiUrl, authHeaders, 'tags', name)));

    // 3. Create the post
    const postData = {
        title: post.title,
        content: post.content,
        status: 'publish',
        excerpt: post.excerpt,
        slug: post.slug,
        featured_media: featuredMediaId,
        categories: categoryIds,
        tags: tagIds,
        author: site.authorId,
        meta: {
            _yoast_wpseo_title: post.seoTitle,
            _yoast_wpseo_metadesc: post.metaDescription,
            _yoast_wpseo_focuskw: focusKeyword,
        }
    };
    
    const postHeaders = new Headers(authHeaders);
    postHeaders.append('Content-Type', 'application/json');
    const postResponse = await proxyFetch(`${apiUrl}wp/v2/posts`, {
        method: 'POST',
        headers: postHeaders as any,
        body: JSON.stringify(postData),
    });

    if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => ({ message: "Unknown error creating post." }));
        throw new Error(`Post creation failed: ${errorData.message}`);
    }

    const newPost = await postResponse.json();
    return newPost.link;
};
