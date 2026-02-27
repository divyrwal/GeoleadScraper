import { Router } from "express";
import { getDb } from "@geolead/db";
import { ObjectId } from "mongodb";
import { auditWebsite } from "../lib/website-auditor";
import { generateWebAuditPitch } from "../lib/ai-validator";

export const leadsAuditRouter: Router = Router();

// POST /api/leads/:id/audit
leadsAuditRouter.post("/:id/audit", async (req, res) => {
    try {
        const db = await getDb();
        const lead = await db.collection("leads").findOne({ _id: new ObjectId(req.params.id) });

        if (!lead) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }

        if (!lead.website_url) {
            return res.status(400).json({ success: false, error: "Lead has no website URL to audit" });
        }

        const includeAi = req.query.includeAi === 'true';

        const auditData = await auditWebsite(lead.website_url);

        if (!auditData) {
            return res.status(500).json({ success: false, error: "Failed to audit website (might be down or blocking bots)" });
        }

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
            { _id: lead._id },
            { $set: { website_audit, updated_at: new Date().toISOString() } }
        );

        const updatedLead = await db.collection("leads").findOne({ _id: lead._id });

        res.json({ success: true, data: updatedLead });
    } catch (error: any) {
        console.error("Failed to audit lead website:", error);
        res.status(500).json({ success: false, error: error.message || "Failed to audit lead website" });
    }
});
