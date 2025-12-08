
export const FeaturesMarkdown = `
# Zenith Engine AI: Application Features

This document provides a comprehensive overview of the features available in the **Zenith Engine AI** application. The app is designed to be an all-in-one AI-powered content automation engine for WordPress and beyond.

## 1. Core Functionality: AI Content Generation

The heart of the application is a sophisticated, multi-step pipeline for generating high-quality, SEO-optimized content.

### Multi-Step Generation Process
1.  **Keyword Discovery**: The AI analyzes a topic to discover the best high-intent, long-tail keyword using real-time search data or a specialized SEO API (DataForSEO).
2.  **Strategic Brief Creation**: The AI acts as an SEO strategist, analyzing the chosen keyword and top competitors to produce a detailed brief. This includes a unique content angle, SEO-optimized titles, a meta description, a URL slug, and an image prompt.
3.  **Article Writing**: Using the brief, the AI writes a full-length blog post in HTML format, complete with headings, lists, and other elements for readability. It intelligently incorporates internal and external links, an FAQ section, and structured schema markup for rich search results.
4.  **Featured Image Generation**: The AI generates a unique, high-quality featured image based on the brief's image prompt, with customizable aspect ratios.
5.  **Self-Correction SEO Loop**: To ensure optimal quality, the app employs a "Self-Correction SEO Loop". It audits the generated content against an SEO checklist, identifies any weaknesses, and then prompts the AI to make surgical edits to fix them, improving the SEO score before publishing.

### Diverse Content Sources
Users can initiate the generation process from multiple sources:
-   **Keyword List**: Manually add or use the AI to suggest a list of target keywords. The app works through the list, marking completed keywords as \`[DONE]\`.
-   **RSS Feed**: Provide an RSS feed URL (e.g., a competitor's blog, an industry news site). The app can use articles from the feed as inspiration to generate new, original, and superior content.
-   **Video Source**: Provide a direct URL to a video (like on YouTube) or a YouTube channel's RSS feed. The AI will create a comprehensive blog post that captures and expands upon the video's content.
-   **Google Sheet**: Connect a Google Sheet, and the AI will use each row in the first column as a topic for content generation, tracking processed rows.

## 2. Multi-Site, User, and Subscription Management

Zenith Engine AI is built to scale with your content strategy and team.

-   **Multi-Site Management**: Add and manage multiple WordPress sites from a single dashboard.
-   **Isolated Configurations**: Each site has its own independent configuration for credentials, AI models, brand guidelines, automation rules, content sources, and history.
-   **User Authentication**: A full-featured user system with sign-up, sign-in, and Google OAuth capabilities.
-   **Subscription Tiers**: Multiple subscription plans (Free, Creator, Pro, Agency) that unlock progressively powerful features, managing generation and site limits.
-   **Admin Dashboard**: A dedicated interface for administrators to manage all registered registered users, update subscription plans, and impersonate users for troubleshooting.

## 3. Powerful Automation Engine

Set your entire content lifecycle on autopilot.

-   **Multi-Channel Automation**: Separate automation workflows for:
    -   **Blog Posts**: Generate and publish long-form articles.
    -   **Social Graphics**: Create and post branded images with captions.
    -   **Social Videos**: Produce and share short-form videos with captions.
-   **Flexible Workflows**:
    1.  **Fully Automatic ("Autopilot")**: The AI generates, optimizes, and publishes content directly to your WordPress site and social channels without manual intervention.
    2.  **Human-in-the-Loop ("Review")**: The AI generates content and saves it as a draft within the app for you to review, edit, and manually publish.
-   **Advanced Scheduling**:
    -   **Daily Trigger**: Set a specific time each day for automation to run.
    -   **Scheduled Trigger**: Define precise, recurring schedules (e.g., every Monday at 9 AM, or on the 1st of every month).
-   **Chained Workflows**: Configure social automations to automatically trigger after a new blog post is successfully published, creating instant promotional content.

## 4. Social Media & Promotion Suite

Integrate content generation directly with your marketing channels.

-   **Multi-Platform Connections**: Securely connect multiple accounts for various platforms using OAuth 2.0 or API credentials. Supported platforms include X (Twitter), Facebook (Pages & Groups), LinkedIn, YouTube, TikTok, Instagram, Pinterest, Telegram, and WhatsApp.
-   **Manual Content Creation**:
    -   **Social Graphics Generator**: On-demand creation of unique images and tailored captions for various platforms, respecting ideal aspect ratios.
    -   **High-Quality Video Automation**: Produce a professionally edited final video product with a sophisticated multi-step process.
       1.  **AI Storyboarding**: The AI first breaks down your topic into a logical sequence of scenes.
       2.  **Continuous Scene Generation**: For each scene, the AI generates a reference image. To ensure visual consistency, it uses the previous scene's image as a base for the next, creating a smooth, continuous flow ('nano banana' continuity).
       3.  **Clip Creation**: Each scene's image and prompt are used to generate a high-quality video clip.
       4.  **Simulated Professional Editing**: The AI simulates a final edit, planning for professional transitions, music, and titles, resulting in a polished, high-budget look and feel.
       5.  The final video product is perfect for sharing on social media and YouTube.
-   **Email Marketing Integration**:
    -   Connect to **Mailchimp** to send AI-generated email campaigns.
    -   Generate full HTML email bodies and compelling subject lines from a simple topic.

## 5. Analytics & Performance Tracking

Measure your content's impact and inform your strategy with data.

-   **Google Analytics Integration**: Connect your GA4 property to pull performance data directly into your dashboard. View site-wide metrics like sessions, new users, and conversions.
-   **Content Performance Monitoring**: The "History" tab displays key metrics (Pageviews, Visitors, Conversions) for each published post, allowing you to easily identify top-performing content.
-   **Microsoft Clarity Integration**: Add your Clarity Project ID to view user behavior metrics like Dead Clicks, Rage Clicks, and Scroll Depth for each post, providing deeper insights into user engagement.
-   **AI Strategy Suggestions**: The AI analyzes your top-performing content from Google Analytics to generate actionable new content strategies and topic ideas, helping you double down on what works.

## 6. Authority & SEO Toolkit

Build your site's authority and monitor its SEO health.

-   **AI Commenting Assistant**: Find relevant, non-competitor blogs related to your published posts and use the AI to generate thoughtful, value-driven comments to build relationships and authority.
-   **Backlink Monitoring**: Add your acquired backlinks to a monitoring list. The app can periodically check if the links are still live and active, alerting you to "inactive" or "not_found" links.
-   **Advanced SEO Data**: Optionally integrate with **DataForSEO** to use their API for highly accurate keyword research and SERP analysis, supplementing the AI's built-in search capabilities.

## 7. AI Agent

Interact with the application using voice, video, or text.

-   **Multi-Modal Interaction**: Start a session with the agent using your microphone (voice), camera and microphone (video), or a traditional text chat interface.
-   **Function Calling**: The agent can perform actions within the app on your behalf, such as finding the next topic, researching a keyword, starting content generation, and even navigating between different tabs of the application.
-   **Real-Time & Low-Latency**: Built on the Gemini Live API, the voice and video modes offer a natural, conversational experience with real-time audio responses.
-   **Context-Aware**: The agent is aware of your current site's configuration and brand guidelines, providing tailored and relevant help.

## 8. Advanced Configuration & Extensibility

Fine-tune the AI and extend its capabilities.

-   **Multi-Provider AI Model Selection**:
    -   Choose different AI providers for text, image, and video generation (Google, OpenAI, Anthropic, OpenRouter, X.AI, Replicate, OpenArt).
    -   Select or specify custom models from each provider.
-   **Branding & Context**:
    -   **Brand Guideline**: A central document defining your brand's voice, tone, and mission that is injected into every AI task.
    -   **Character Personas**: Create "digital actors" with specific personalities and visual descriptions for consistent branding in social media content.
    -   **Reference Materials**: Upload files or provide URLs for the AI to use as context when generating content.
-   **Model Context Protocol (MCP) Routing**: For advanced users, connect to external "MCP Servers" to route specific AI tasks (text, image, video) to custom or self-hosted models, enabling ultimate flexibility.
`;