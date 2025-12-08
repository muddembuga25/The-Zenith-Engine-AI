import type { Site, BlogPost, SeoChecklist, SeoScoreResult, StrategicBrief } from '../types';

// Helper to get word count from HTML content
const getWordCount = (html: string): number => {
    const text = html.replace(/<[^>]*>/g, ' '); // Strip HTML tags
    return text.trim().split(/\s+/).filter(Boolean).length;
};

// Helper to count occurrences of a keyword (case-insensitive)
const countKeywordOccurrences = (text: string, keyword: string): number => {
    if (!keyword) return 0;
    const regex = new RegExp(keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
};

// Helper for readability check
const checkReadability = (html: string): boolean => {
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plainText) return false;
    const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 0) {
        const totalWords = plainText.split(/\s+/).filter(Boolean).length;
        const avgSentenceLength = totalWords / sentences.length;
        if (avgSentenceLength > 25) return false;
    }
    const paragraphs = html.split(/<\/p>/i);
    for (const p of paragraphs) {
        if (getWordCount(p) > 150) return false;
    }
    return true;
};

export const calculateSeoScore = (post: BlogPost, brief: StrategicBrief, site: Site): SeoScoreResult => {
    const checks: SeoChecklist = {
        titleLength: false, metaDescriptionLength: false, keywordInTitle: false, keywordInMetaDescription: false, keywordInSlug: false, keywordInIntroduction: false,
        entityCoverage: false, topicalDepth: false,
        contentLength: false, keywordDensity: false, keywordInHeading: false, readability: false, imageAltText: false, faqSection: false, sufficientHeadings: false, videoEmbed: false,
        internalLinks: false, externalLinks: false, authorMention: false, aboutAuthorSection: false, schemaMarkup: false,
    };

    let score = 0;
    const lowerCaseKeyword = brief.focusKeyword.toLowerCase();
    const contentText = post.content.replace(/<[^>]*>/g, ' ').toLowerCase();

    // === On-Page Basics (25 points) ===
    if (post.seoTitle.length >= 50 && post.seoTitle.length <= 60) { checks.titleLength = true; score += 4; }
    if (post.metaDescription.length >= 120 && post.metaDescription.length <= 155) { checks.metaDescriptionLength = true; score += 4; }
    if (post.seoTitle.toLowerCase().includes(lowerCaseKeyword)) { checks.keywordInTitle = true; score += 5; }
    if (post.metaDescription.toLowerCase().includes(lowerCaseKeyword)) { checks.keywordInMetaDescription = true; score += 4; }
    if (post.slug.toLowerCase().includes(lowerCaseKeyword.replace(/\s+/g, '-'))) { checks.keywordInSlug = true; score += 4; }
    const firstParagraphMatch = post.content.match(/<p[^>]*>(.*?)<\/p>/i);
    if (firstParagraphMatch && firstParagraphMatch[1].toLowerCase().includes(lowerCaseKeyword)) {
        checks.keywordInIntroduction = true;
        score += 4;
    }

    // === Semantic & Topical Authority (10 points) ===
    if (brief.keyEntities && brief.keyEntities.length > 0) {
        const entitiesFound = brief.keyEntities.filter(entity => contentText.includes(entity.toLowerCase()));
        const coverage = entitiesFound.length / brief.keyEntities.length;
        if (coverage >= 0.7) { // At least 70% of entities covered
            checks.entityCoverage = true;
            score += 5;
        }
    } else {
        checks.entityCoverage = true; score += 5; // Pass if no entities were required
    }

    if (brief.suggestedOutline && brief.suggestedOutline.length > 0) {
        const headingsInContent = [...post.content.matchAll(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi)].map(m => m[1].replace(/<[^>]*>/g, '').toLowerCase().trim());
        const requiredHeadings = brief.suggestedOutline.map(item => item.heading.toLowerCase().trim());
        const headingsCovered = requiredHeadings.filter(reqHeading => headingsInContent.some(h => h.includes(reqHeading)));
        const headingCoverage = headingsCovered.length / requiredHeadings.length;
        if (headingCoverage >= 0.8) { // At least 80% of H2s covered
            checks.topicalDepth = true;
            score += 5;
        }
    } else {
        checks.topicalDepth = true; score += 5; // Pass if no outline was provided
    }

    // === Content Quality (40 points) ===
    const wordCount = getWordCount(post.content);
    if (wordCount > 300) { checks.contentLength = true; score += 5; }
    
    const keywordCount = countKeywordOccurrences(post.content, brief.focusKeyword);
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
    if (density >= 0.5 && density <= 1.5) { checks.keywordDensity = true; score += 5; }

    const headingRegex = /<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi;
    let headingMatch;
    let h2Count = 0;
    let keywordInHeadingFound = false;
    while ((headingMatch = headingRegex.exec(post.content)) !== null) {
        if (headingMatch[0].toLowerCase().startsWith('<h2')) {
            h2Count++;
        }
        if (!keywordInHeadingFound && headingMatch[1].toLowerCase().includes(lowerCaseKeyword)) {
            checks.keywordInHeading = true;
            score += 5;
            keywordInHeadingFound = true;
        }
    }
    
    if (h2Count >= 2) { checks.sufficientHeadings = true; score += 5; }
    if (checkReadability(post.content)) { checks.readability = true; score += 5; }
    
    let hasOptimizedAltText = post.imageAltText && post.imageAltText.toLowerCase().includes(lowerCaseKeyword);
    if (!hasOptimizedAltText) {
        const imgRegex = /<img[^>]+alt=["'](.*?)["']/gi;
        let match;
        while ((match = imgRegex.exec(post.content)) !== null) {
            if (match[1] && match[1].toLowerCase().includes(lowerCaseKeyword)) {
                hasOptimizedAltText = true;
                break;
            }
        }
    }
    if (hasOptimizedAltText) { checks.imageAltText = true; score += 5; }

    if (post.content.toLowerCase().includes('<h2>frequently asked questions</h2>')) { checks.faqSection = true; score += 5; }
    if (post.content.toLowerCase().includes('<iframe')) { checks.videoEmbed = true; score += 5; }

    // === Authority & Trust (E-E-A-T) (25 points) ===
    const linkRegex = /<a\s+.*?href=["'](.*?)["']/g;
    let linkMatch;
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    const allLinks = new Set<string>();

    let siteHostname = '';
    const urlMatch = site.brandGuideline.match(/website url:\s*(https?:\/\/\S+)/i);
    if (urlMatch && urlMatch[1]) {
        try {
            siteHostname = new URL(urlMatch[1]).hostname.replace(/^www\./, '');
        } catch (e) {
            console.warn('Invalid website URL in brand guideline:', urlMatch[1]);
        }
    }
    if (!siteHostname && site.wordpressUrl) {
        try {
            const fullUrl = site.wordpressUrl.startsWith('http') ? site.wordpressUrl : `https://${site.wordpressUrl}`;
            siteHostname = new URL(fullUrl).hostname.replace(/^www\./, '');
        } catch (e) {
            console.warn('Invalid site URL for SEO analysis:', site.wordpressUrl);
        }
    }
    
    while ((linkMatch = linkRegex.exec(post.content)) !== null) {
        const href = linkMatch[1];
        if (!href || href.startsWith('#') || allLinks.has(href)) continue;
        allLinks.add(href);

        if (href.startsWith('http')) {
            try {
                const linkHostname = new URL(href).hostname.replace(/^www\./, '');
                if (siteHostname && linkHostname === siteHostname) {
                    internalLinkCount++;
                } else {
                    externalLinkCount++;
                }
            } catch (e) { /* Invalid URL */ }
        } else {
            internalLinkCount++;
        }
    }

    if (internalLinkCount >= 2) { checks.internalLinks = true; score += 5; }
    if (externalLinkCount >= 2) { checks.externalLinks = true; score += 5; }
    
    if (site.authorName && contentText.includes(site.authorName.toLowerCase())) { checks.authorMention = true; score += 5; }
    if (post.content.toLowerCase().includes('<h3>about the author</h3>')) { checks.aboutAuthorSection = true; score += 5; }

    // Enhanced Schema Markup check
    const schemaMatch = post.content.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (schemaMatch && schemaMatch[1]) {
        try {
            const schemaJson = JSON.parse(schemaMatch[1]);
            const schemaType = schemaJson['@type'];
            const recommendedType = brief.recommendedSchema;
            
            let isSchemaCorrect = false;
            // Handle cases where schema type is an array, e.g., ["BlogPosting", "Article"]
            if (Array.isArray(schemaType)) {
                isSchemaCorrect = schemaType.includes(recommendedType) || (recommendedType === 'Article' && schemaType.some(t => ['Article', 'BlogPosting'].includes(t)));
            } else {
                isSchemaCorrect = (schemaType === recommendedType) || (recommendedType === 'Article' && ['Article', 'BlogPosting'].includes(schemaType));
            }

            if (isSchemaCorrect) {
                 checks.schemaMarkup = true;
                 score += 5;
            }

        } catch (e) {
            console.warn("Could not parse schema JSON for SEO check", e);
            checks.schemaMarkup = false; // Invalid JSON fails the check
        }
    }
    
    return { score: Math.min(100, Math.round(score)), checklist: checks };
};