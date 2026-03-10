import { getDb } from "@geolead/db";
import type { Lead } from "@geolead/types";
import { auditWebsite } from "../lib/website-auditor";
import { generateWebAuditPitch } from "../lib/ai-validator";
import { analyzeLead as aiAnalyzeLead } from "@geolead/ai";

export class AiAnalyzerService {
    static async auditLead(id: string, includeAi: boolean) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(id);

        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");
        if (!lead.website_url) throw new Error("Lead has no website URL to audit");

        const auditData = await auditWebsite(lead.website_url as string);
        if (!auditData) throw new Error("Failed to audit website (might be down or blocking bots)");

        let pitchData = null;
        if (includeAi) {
            pitchData = await generateWebAuditPitch(auditData.title, auditData.meta_description, auditData.headings);
        }

        const website_audit = {
            audited_at: new Date().toISOString(),
            tech_stack: auditData.tech_stack,
            has_ssl: auditData.has_ssl,
            domain_creation_date: auditData.domain_creation_date,
            title: auditData.title,
            meta_description: auditData.meta_description,
            headings: auditData.headings,
            ai_flaws: pitchData?.flaws || [],
            ai_pitch: pitchData?.pitch || null,
        };

        await db.collection("leads").updateOne(
            { _id: objId },
            { $set: { website_audit, updated_at: new Date().toISOString() } }
        );

        const updatedLead = await db.collection("leads").findOne({ _id: objId });
        return { ...updatedLead, id: updatedLead?._id.toString() } as unknown as Lead;
    }

    static async analyzeLead(id: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(id);
        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");

        const analysis = await aiAnalyzeLead(lead as any);
        if (!analysis) throw new Error("AI analysis failed. Is Ollama running?");

        await db.collection("leads").updateOne(
            { _id: objId },
            { $set: { ai_analysis: analysis, lead_score: analysis.lead_score, updated_at: new Date() } }
        );

        const updated = await db.collection("leads").findOne({ _id: objId });
        return { ...updated, id: updated?._id.toString() } as unknown as Lead;
    }
}
