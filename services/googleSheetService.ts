
import { proxyFetch } from './secureBackendSimulation';

export const fetchSheetData = async (sheetUrl: string, accessToken: string): Promise<string[] | null> => {
    try {
        const spreadsheetIdMatch = sheetUrl.match(/\/d\/(.*?)\//);
        if (!spreadsheetIdMatch) {
            throw new Error("Invalid Google Sheet URL. Could not extract Spreadsheet ID.");
        }
        const spreadsheetId = spreadsheetIdMatch[1];
        
        // Assume we're reading from the first sheet, column A.
        const range = 'Sheet1!A:A'; 
        
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
        
        const response = await proxyFetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const defaultMessage = `Google Sheets API error: ${errorData.error.message}`;

            if (errorData.error.status === 'PERMISSION_DENIED') {
                 throw new Error(`Permission denied for Google Sheet. Please ensure the connected Google account has at least view access to the sheet, and that you have granted the 'spreadsheets.readonly' permission to this app.`);
            }
            throw new Error(defaultMessage);
        }

        const data = await response.json();
        const values: string[] = data.values ? data.values.map((row: any) => row[0]).filter(Boolean) : [];
        return values;

    } catch (error) {
        console.error("Error fetching Google Sheet data:", error);
        throw error;
    }
};
