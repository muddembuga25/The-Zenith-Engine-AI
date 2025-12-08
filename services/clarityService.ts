export interface ClarityMetrics {
  pageviews: number;
  deadClicks: number;
  rageClicks: number;
  scrollDepth: number; // percentage
}

export interface AggregatedClarityMetrics {
  totalPageviews: number;
  totalDeadClicks: number;
  totalRageClicks: number;
  avgScrollDepth: number;
}

/**
 * Simulates fetching key metrics from the Microsoft Clarity API for a specific page.
 * In a real application, this would involve a secure, authenticated API call.
 * @param projectId - The Microsoft Clarity Project ID.
 * @param pageUrl - The full URL of the page to get metrics for.
 * @returns A promise that resolves to the simulated metrics.
 */
export const fetchClarityMetrics = async (
  projectId: string,
  pageUrl: string
): Promise<ClarityMetrics> => {
  console.log(`[Clarity Service Sim] Fetching metrics for Project: ${projectId}`);
  console.log(`[Clarity Service Sim]   - Page URL: ${pageUrl}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));

  // Generate realistic, randomized mock data
  const basePageviews = Math.floor(Math.random() * 5000) + 200;
  const deadClicks = Math.floor(Math.random() * (basePageviews / 100));
  const rageClicks = Math.floor(Math.random() * (basePageviews / 200));
  const scrollDepth = Math.floor(Math.random() * 60) + 40;

  console.log(`[Clarity Service Sim]   - Returning mock data:`, { pageviews: basePageviews, deadClicks, rageClicks, scrollDepth });
  
  return {
    pageviews: basePageviews,
    deadClicks,
    rageClicks,
    scrollDepth,
  };
};

/**
 * Simulates fetching aggregated project-level metrics from Microsoft Clarity.
 * @param projectId The Microsoft Clarity Project ID.
 * @returns A promise that resolves to aggregated mock metrics.
 */
export const fetchClarityProjectMetrics = async (
  projectId: string
): Promise<AggregatedClarityMetrics> => {
  console.log(`[Clarity Service Sim] Fetching aggregated metrics for Project: ${projectId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

  const mockData: AggregatedClarityMetrics = {
    totalPageviews: Math.floor(Math.random() * 50000) + 10000,
    totalDeadClicks: Math.floor(Math.random() * 500) + 50,
    totalRageClicks: Math.floor(Math.random() * 250) + 20,
    avgScrollDepth: Math.floor(Math.random() * 30) + 50,
  };
  
  console.log('[Clarity Service Sim]   - Returning aggregated mock data:', mockData);
  
  return mockData;
};


/**
 * Simulates verifying a Microsoft Clarity Project ID.
 * @param projectId The Microsoft Clarity Project ID.
 * @returns A promise that resolves to a success status and message.
 */
export const verifyClarityProject = async (projectId: string): Promise<{ success: boolean; message: string }> => {
    console.log(`[Clarity Service Sim] Verifying Project ID: ${projectId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!projectId || projectId.trim().length < 5) {
        return { success: false, message: 'Project ID seems too short or is empty.' };
    }

    // Simulate random failure
    if (Math.random() < 0.2) {
        return { success: false, message: 'Could not verify this Project ID. Please double-check it.' };
    }

    return { success: true, message: 'Project ID format is valid.' };
};