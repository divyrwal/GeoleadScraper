import { Router } from "express";
import { getDb, ObjectId } from "@geolead/db";

export const leadsContactRouter: Router = Router();

// POST /api/leads/:id/contact
leadsContactRouter.post("/:id/contact", async (req, res) => {
    try {
        const notes = req.body.notes || "";
        const db = await getDb();
        const leadId = new ObjectId(req.params.id);

        const lead = await db.collection("leads").findOne({ _id: leadId });
        if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });

        await db.collection("contact_logs").insertOne({ lead_id: req.params.id, notes, contacted_at: new Date() });
        await db.collection("leads").updateOne(
            { _id: leadId },
            { $set: { lead_status: "contacted", last_contacted_at: new Date(), updated_at: new Date() }, $inc: { contact_count: 1 } }
        );

        const updatedLead = await db.collection("leads").findOne({ _id: leadId });
        const history = await db.collection("contact_logs").find({ lead_id: req.params.id }).sort({ contacted_at: -1 }).toArray();

        res.json({
            success: true,
            data: {
                lead: { ...updatedLead, id: updatedLead?._id.toString() },
                contactHistory: history.map((h) => ({ ...h, id: h._id.toString() })),
            },
        });
    } catch (error) {
        console.error("Contact log failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// GET /api/leads/:id/contact
leadsContactRouter.get("/:id/contact", async (req, res) => {
    try {
        const db = await getDb();
        const history = await db.collection("contact_logs").find({ lead_id: req.params.id }).sort({ contacted_at: -1 }).toArray();
        res.json({ success: true, data: history.map((h) => ({ ...h, id: h._id.toString() })) });
    } catch (error) {
        console.error("Get contact history failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
