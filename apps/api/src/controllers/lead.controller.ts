import type { Request, Response } from "express";
import { LeadService } from "../services/lead.service";

export class LeadController {
    static async getLeads(req: Request, res: Response) {
        try {
            const result = await LeadService.getLeads(req.query);
            res.json({ success: true, ...result });
        } catch (error) {
            console.error("Fetch leads failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async createLeads(req: Request, res: Response) {
        try {
            const { leads, search_query } = req.body;
            if (!leads || !Array.isArray(leads)) {
                return res.status(400).json({ success: false, error: "Invalid data: expected { leads: [...] }" });
            }

            const result = await LeadService.bulkInsertOrUpdate(leads, search_query);
            res.json({ success: true, ...result });
        } catch (error) {
            console.error("Bulk insert failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async getLeadById(req: Request, res: Response) {
        try {
            const data = await LeadService.getLeadById(req.params.id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            if (error.message === "Lead not found") return res.status(404).json({ success: false, error: error.message });
            console.error("Get lead failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async updateLead(req: Request, res: Response) {
        try {
            const data = await LeadService.updateLead(req.params.id as string, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            if (error.message === "Lead not found") return res.status(404).json({ success: false, error: error.message });
            console.error("Update lead failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async addContactLog(req: Request, res: Response) {
        try {
            const data = await LeadService.addContactLog(req.params.id as string, req.body.notes || "");
            res.json({ success: true, data });
        } catch (error: any) {
            if (error.message === "Lead not found") return res.status(404).json({ success: false, error: error.message });
            console.error("Contact log failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async getContactHistory(req: Request, res: Response) {
        try {
            const data = await LeadService.getContactHistory(req.params.id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error("Get contact history failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async auditLead(req: Request, res: Response) {
        try {
            const includeAi = req.query.includeAi === 'true';
            const data = await LeadService.auditLead(req.params.id as string, includeAi);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error("Audit lead failed:", error);
            const status = error.message.includes("not found") ? 404 : (error.message.includes("URL") ? 400 : 500);
            res.status(status).json({ success: false, error: error.message });
        }
    }

    static async analyzeLead(req: Request, res: Response) {
        try {
            const data = await LeadService.analyzeLead(req.params.id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error("Analysis failed:", error);
            const status = error.message.includes("not found") ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    static async rescoreLeads(req: Request, res: Response) {
        try {
            const updated = await LeadService.rescoreAllLeads();
            res.json({ success: true, updated, message: `Re-scored ${updated} leads` });
        } catch (error: any) {
            console.error("Rescore failed:", error);
            res.status(500).json({ success: false, error: "Failed to re-score leads" });
        }
    }

    static async bulkUpdateStatus(req: Request, res: Response) {
        try {
            const { ids, status } = req.body;
            if (!ids || !Array.isArray(ids) || !status) {
                return res.status(400).json({ success: false, error: "ids and status required" });
            }
            const modified = await LeadService.bulkUpdateStatus(ids, status);
            res.json({ success: true, modified });
        } catch (error: any) {
            console.error("Bulk status error:", error);
            res.status(500).json({ success: false, error: "Bulk status update failed" });
        }
    }

    static async bulkAddTag(req: Request, res: Response) {
        try {
            const { ids, tag } = req.body;
            if (!ids || !Array.isArray(ids) || !tag) {
                return res.status(400).json({ success: false, error: "ids and tag required" });
            }
            const modified = await LeadService.bulkAddTag(ids, tag);
            res.json({ success: true, modified });
        } catch (error: any) {
            console.error("Bulk tag error:", error);
            res.status(500).json({ success: false, error: "Bulk tag failed" });
        }
    }

    static async bulkDelete(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                return res.status(400).json({ success: false, error: "ids required" });
            }
            const deleted = await LeadService.bulkDelete(ids);
            res.json({ success: true, deleted });
        } catch (error: any) {
            console.error("Bulk delete error:", error);
            res.status(500).json({ success: false, error: "Bulk delete failed" });
        }
    }

    static async bulkShortlist(req: Request, res: Response) {
        try {
            const { ids, note } = req.body;
            if (!ids || !Array.isArray(ids)) {
                return res.status(400).json({ success: false, error: "ids required" });
            }
            const updated = await LeadService.bulkShortlist(ids, note);
            res.json({ success: true, updated });
        } catch (error: any) {
            console.error("Bulk shortlist error:", error);
            res.status(500).json({ success: false, error: "Bulk shortlist failed" });
        }
    }

    static async bulkRescore(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            const updated = await LeadService.bulkRescore(ids);
            res.json({ success: true, updated });
        } catch (error: any) {
            console.error("Bulk rescore error:", error);
            res.status(500).json({ success: false, error: "Bulk rescore failed" });
        }
    }

    static async exportLeadsCsv(req: Request, res: Response) {
        try {
            const csv = await LeadService.getExportCsv(req.query);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="geolead-export-${new Date().toISOString().split("T")[0]}.csv"`);
            res.send(csv);
        } catch (error: any) {
            console.error("Export failed:", error);
            res.status(500).json({ success: false, error: "Export failed" });
        }
    }

    static async getMapData(req: Request, res: Response) {
        try {
            const data = await LeadService.getMapData(req.query);
            res.json({ success: true, data, total: data.length });
        } catch (error: any) {
            console.error("Map data error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch map data" });
        }
    }

    static async getNearbyLeads(req: Request, res: Response) {
        try {
            const lat = parseFloat(req.query.lat as string);
            const lng = parseFloat(req.query.lng as string);
            const radius = parseInt((req.query.radius as string) || "5000");
            const category = req.query.category as string | undefined;

            if (isNaN(lat) || isNaN(lng)) {
                return res.status(400).json({ success: false, error: "Valid lat and lng are required" });
            }

            const data = await LeadService.getNearbyLeads(lat, lng, radius, category);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error("Nearby search failed:", error);
            res.status(500).json({ success: false, error: "Nearby search failed" });
        }
    }

    static async getDuplicates(_req: Request, res: Response) {
        try {
            const data = await LeadService.getDuplicates();
            res.json({ success: true, ...data });
        } catch (error) {
            console.error("Duplicates error:", error);
            res.status(500).json({ success: false, error: "Failed to detect duplicates" });
        }
    }

    static async deleteDuplicates(_req: Request, res: Response) {
        try {
            const deletedCount = await LeadService.deleteDuplicates();
            res.json({ success: true, deletedCount });
        } catch (error) {
            console.error("Delete duplicates error:", error);
            res.status(500).json({ success: false, error: "Failed to remove duplicates" });
        }
    }

    static async enrichLead(req: Request, res: Response) {
        try {
            const data = await LeadService.enrichLead(req.params.id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error("Failed to enrich lead:", error);
            const status = error.message.includes("not found") ? 404 : (error.message.includes("URL") ? 400 : 500);
            res.status(status).json({ success: false, error: error.message || "Failed to enrich lead" });
        }
    }

    static async batchEnrichLeads(_req: Request, res: Response) {
        // Return immediately for background processing
        res.json({ success: true, message: "Batch enrichment started in background" });

        // Run as background process explicitly disconnected from Express request cycle
        LeadService.batchEnrichLeads().catch((error) => {
            console.error("Uncaught error in batchEnrichLeads background job", error);
        });
    }
}
