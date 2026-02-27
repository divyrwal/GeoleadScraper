import fetch from "node-fetch";
import { config } from "@geolead/config";

/**
 * Service to sync locally scraped and AI-validated leads to the public Cloud SaaS platform.
 * This ensures the powerful local scraping node acts as an engine for the multi-tenant web app.
 */
export async function syncLeadsToCloud(leads: any[]): Promise<boolean> {
    if (!config.cloudSync.enabled) {
        console.log(`[CloudSync] Sync is disabled in configuration. Skipping upload to cloud.`);
        return false;
    }

    if (!config.cloudSync.apiUrl || !config.cloudSync.apiKey) {
        console.error(`[CloudSync] Cannot sync: Cloud API URL or API Key is missing in environment variables.`);
        return false;
    }

    console.log(`[CloudSync] Preparing to push ${leads.length} leads to Cloud Node: ${config.cloudSync.apiUrl}`);

    try {
        const response = await fetch(`${config.cloudSync.apiUrl}/api/webhooks/ingest-leads`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.cloudSync.apiKey}`
            },
            body: JSON.stringify({
                leads,
                sourceNode: "local-gpu-worker-1",
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[CloudSync] Success! Cloud Node accepted ${leads.length} leads. (Cloud Sync ID: ${data.syncId || 'N/A'})`);
        return true;

    } catch (error) {
        console.error(`[CloudSync] Fatal error pushing leads to cloud:`, error);
        // Do not crash the local node if the cloud is down.
        // We'd typically implement an exponential backoff retry queue here using Redis/BullMQ.
        return false;
    }
}
