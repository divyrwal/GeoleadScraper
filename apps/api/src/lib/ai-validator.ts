import { Ollama } from "ollama";
import { config } from "@geolead/config";
import { broadcastLog } from "./job-events";

const ollama = new Ollama({ host: config.ollama.host });

/**
 * Validates, cleans, and structures raw scraped data using the local Ollama LLM.
 * This fixes incorrect categories, messy addresses, and normalizes phone numbers.
 */
export async function validateLeadsWithAI(rawLeads: any[], userQuery: string, userLocation: string, jobId: string = "unknown"): Promise<any[]> {
    const cleanedLeads: any[] = [];

    // We batch process to avoid overwhelming the local LLM and hitting token limits.
    // An ideal batch size depends on the model's context window. 5 is safe for 7B models.
    const BATCH_SIZE = 5;

    for (let i = 0; i < rawLeads.length; i += BATCH_SIZE) {
        const batch = rawLeads.slice(i, i + BATCH_SIZE);

        broadcastLog(jobId, 'info', `Validating batch ${i / BATCH_SIZE + 1} (${batch.length} leads)...`);

        const prompt = `
        You are a Data Cleaning and Validation AI for a CRM system.
        The user searched for: "${userQuery} in ${userLocation}".

        I am providing you with a JSON array of RAW scraped leads from various sources (Google Maps, JustDial, etc).
        This data is messy, contains raw HTML/Text snippets, and might have the WRONG business category.

        Your tasks for EACH lead:
        1. Parse out the true business name, address, and phone number from the raw text/HTML if available.
        2. Categorization: Based on the search query ("${userQuery}") and the raw text, define the single most accurate category (e.g., "Plumber", "Gym", "Restaurant"). If the lead is clearly NOT related to the search query, do not include it.
        3. Format phone numbers to a standard international format if possible, or null.
        4. Normalize the data into the strict JSON schema provided.

        Raw Leads Data to Process:
        ${JSON.stringify(batch)}
        
        Return ONLY a JSON Array of objects matching exactly this structure:
        [
          {
            "business_name": "string",
            "category": "string",
            "phone_number": "string | null",
            "address": "string",
            "website_url": "string | null",
            "is_relevant": "boolean"
          }
        ]
        `;

        try {
            const response = await ollama.chat({
                model: config.ollama.model,
                messages: [{ role: "user", content: prompt }],
                format: "json",
            });

            // Process the structured output
            const validatedBatch = JSON.parse(response.message.content) as any[];

            for (let j = 0; j < validatedBatch.length; j++) {
                const validated = validatedBatch[j];
                const original = batch[j];

                if (validated.is_relevant) {
                    // Merge cleaned data back with the original source data (like ratings/reviews)
                    cleanedLeads.push({
                        ...original, // Keep source, original ratings, etc
                        business_name: validated.business_name || original.business_name,
                        category: validated.category || original.category || userQuery, // Fallback to user query as category
                        phone_number: validated.phone_number || original.phone_number || null,
                        address: validated.address || original.address || `${userLocation} (Address unverified)`,
                        // Delete the messy raw text fields from the final DB object
                        raw_text: undefined,
                        raw_html: undefined
                    });
                } else {
                    broadcastLog(jobId, 'warn', `Dropped "${original.business_name}": AI flagged as irrelevant to "${userQuery}".`);
                }
            }

        } catch (error: any) {
            broadcastLog(jobId, 'error', `LLM parsing failed for batch. Falling back to raw data. Error: ${error.message}`);
            // Fallback: If AI fails (Ollama down, etc), just pass the raw leads through to not lose data
            cleanedLeads.push(...batch.map((l: any) => ({
                ...l,
                category: l.category || userQuery,
                raw_text: undefined,
                raw_html: undefined
            })));
        }
    }

    return cleanedLeads;
}

/**
 * Reads extracted website content and generates a personalized cold email pitch using local Ollama.
 */
export async function generateWebAuditPitch(title: string | null, meta_description: string | null, headings: string[]): Promise<{ flaws: string[], pitch: string } | null> {
    const prompt = `
    You are a high-end web developer auditing a local business site to pitch them a redesign.
    
    Site Data:
    Title: ${title || 'N/A'}
    Meta Description: ${meta_description || 'N/A'}
    Headings: ${headings.join(' | ') || 'N/A'}

    Task:
    1. Identify exactly 2 critical conversion flaws based on this data (e.g., confusing messaging, missing call-to-action, generic titles). Keep them short (1 sentence each).
    2. Write a 2-sentence cold email pitching a website rebuild to fix these exact issues. Be professional and direct.

    Format as strict JSON ONLY:
    {
      "flaws": ["string", "string"],
      "pitch": "string (the 2-sentence email)"
    }
    `;

    try {
        const response = await ollama.chat({
            model: config.ollama.model,
            messages: [{ role: "user", content: prompt }],
            format: "json",
            options: { temperature: 0.7 }
        });

        const result = JSON.parse(response.message.content);
        return {
            flaws: result.flaws && Array.isArray(result.flaws) ? result.flaws.slice(0, 2) : [],
            pitch: result.pitch || "I noticed some structural issues with your website that might be costing you customers. I'd love to help you rebuild it for better conversions."
        };
    } catch (error: any) {
        console.error(`[AI Validator] Web Audit Pitch generation failed: ${error.message}`);
        return null;
    }
}
