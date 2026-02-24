import { Ollama } from "ollama";
import { config } from "@geolead/config";
import type { AiAnalysis, Lead } from "@geolead/types";

const ollama = new Ollama({ host: config.ollama.host });

export async function analyzeLead(leadData: Partial<Lead>): Promise<AiAnalysis | null> {
    try {
        const prompt = `
      Analyze this business lead for a B2B sales outreach campaign.
      Business Name: ${leadData.business_name}
      Category: ${leadData.category || "Unknown"}
      Rating: ${leadData.google_rating ?? "N/A"} (${leadData.review_count ?? 0} reviews)
      Website: ${leadData.website_url || "N/A"}
      Address: ${leadData.address || "N/A"}

      Task:
      1. Provide a short "Pitch" for this business.
      2. Rate the "Lead Quality" from 1-10.
      3. Identify potential "Pain Points".
      4. Assign a "Lead Score" (Hot, Warm, Cold).

      Return as JSON: { "pitch": "...", "quality_score": number, "pain_points": ["..."], "lead_score": "..." }
    `;

        const response = await ollama.chat({
            model: config.ollama.model,
            messages: [{ role: "user", content: prompt }],
            format: "json",
        });

        return JSON.parse(response.message.content) as AiAnalysis;
    } catch (error) {
        console.error("AI Analysis failed:", error);
        return null;
    }
}
