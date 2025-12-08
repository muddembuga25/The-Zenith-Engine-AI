
import type { Site, MailchimpSettings } from '../types';

export const verifyMailchimpConnection = async (settings: MailchimpSettings): Promise<{ success: boolean; message: string; }> => {
    if (!settings.apiKey || !settings.serverPrefix) {
        return { success: false, message: 'API Key and Server Prefix are required.' };
    }
    
    // The API key format is typically "key-usX" where usX is the server prefix.
    const keyParts = settings.apiKey.split('-');
    if (keyParts.length < 2 || keyParts[keyParts.length - 1] !== settings.serverPrefix) {
        return { success: false, message: 'API Key does not seem to match the Server Prefix.' };
    }

    console.log(`[Mailchimp Sim] Verifying connection for server: ${settings.serverPrefix}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate a random failure for demonstration
    if (Math.random() < 0.2) {
        return { success: false, message: 'Invalid Mailchimp API Key or Server Prefix.' };
    }

    return { success: true, message: 'Mailchimp connection successful!' };
};

export const sendCampaign = async (subject: string, htmlBody: string, site: Site): Promise<{ success: boolean; message: string; }> => {
    if (!site.mailchimpSettings.isConnected) {
        return { success: false, message: 'Mailchimp is not connected.' };
    }
    if (!site.mailchimpSettings.defaultListId) {
        return { success: false, message: 'No default audience/list ID is configured in settings.' };
    }

    console.log(`
        --- [Mailchimp Campaign Simulation] ---
        Attempting to send an email campaign via Mailchimp.
        
        Subject: "${subject}"
        To List ID: "${site.mailchimpSettings.defaultListId}"
        Body (first 100 chars): "${htmlBody.replace(/<[^>]+>/g, '').substring(0, 100)}..."
        
        In a real app, this would make a series of authenticated API calls to create
        a campaign, set its content, and send it.
        -------------------------------------------
    `);

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (Math.random() < 0.1) {
        return { success: false, message: 'Failed to send campaign due to a simulated API error.' };
    }

    return { success: true, message: 'Campaign sent successfully via Mailchimp!' };
};
