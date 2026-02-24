"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, Star, Flame, Thermometer, Snowflake, GripVertical } from "lucide-react";
import LeadDetailModal from "@/components/leads/LeadDetailModal";
import { api } from "@/lib/api";
import type { Lead } from "@geolead/types";

const PIPELINE_COLUMNS = [
    { id: "new", label: "New", color: "bg-blue-500", description: "Freshly scraped" },
    { id: "contacted", label: "Contacted", color: "bg-yellow-500", description: "Initial outreach" },
    { id: "follow_up", label: "Follow Up", color: "bg-purple-500", description: "Needs follow up" },
    { id: "qualified", label: "Qualified", color: "bg-green-500", description: "Good fit" },
    { id: "negotiating", label: "Negotiating", color: "bg-indigo-500", description: "In talks" },
    { id: "won", label: "Won ✓", color: "bg-emerald-500", description: "Deal closed" },
    { id: "lost", label: "Lost", color: "bg-red-500", description: "Not interested" },
];

const ScoreIcon = ({ score }: { score: string | null }) => {
    if (score === "hot") return <Flame className="h-3 w-3 text-orange-500" />;
    if (score === "warm") return <Thermometer className="h-3 w-3 text-yellow-600" />;
    if (score === "cold") return <Snowflake className="h-3 w-3 text-blue-500" />;
    return null;
};

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            // Fetch all non-paginated leads for pipeline
            const result = await api.getLeads({ pageSize: "500" });
            if (result.success) setLeads(result.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLeads(); }, []);

    const getColumnLeads = (status: string) => leads.filter(l => l.lead_status === status);

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("leadId");
        if (!leadId) return;

        // Optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, lead_status: targetStatus } : l));
        setDraggingId(null);

        try {
            await api.updateLead(leadId, { lead_status: targetStatus });
        } catch (err) {
            console.error("Status update failed:", err);
            fetchLeads(); // Rollback on error
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading pipeline...
        </div>
    );

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
                    <p className="text-muted-foreground">Drag leads between stages to manage your workflow.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLeads}><Loader2 className="h-3 w-3 mr-1" />Refresh</Button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
                {PIPELINE_COLUMNS.map((col) => {
                    const columnLeads = getColumnLeads(col.id);
                    return (
                        <div
                            key={col.id}
                            className="flex-shrink-0 w-64 flex flex-col"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                                <h3 className="text-sm font-semibold flex-1">{col.label}</h3>
                                <Badge variant="secondary" className="text-xs">{columnLeads.length}</Badge>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 space-y-2 bg-muted/30 rounded-lg p-2 min-h-[200px]">
                                {columnLeads.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center pt-8">{col.description}</p>
                                )}
                                {columnLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("leadId", lead.id);
                                            setDraggingId(lead.id);
                                        }}
                                        onDragEnd={() => setDraggingId(null)}
                                        onClick={() => setSelectedLead(lead)}
                                        className={`bg-background rounded-md p-3 shadow-sm border cursor-pointer transition-all
                                            hover:shadow-md hover:border-primary/30
                                            ${draggingId === lead.id ? "opacity-50 rotate-2" : ""}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 cursor-grab" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{lead.business_name}</p>
                                                {lead.category && <p className="text-xs text-muted-foreground truncate">{lead.category}</p>}
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <ScoreIcon score={lead.lead_score} />
                                                    {lead.google_rating && (
                                                        <span className="flex items-center gap-0.5 text-xs">
                                                            <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />{lead.google_rating}
                                                        </span>
                                                    )}
                                                    {lead.phone_number && <Phone className="h-2.5 w-2.5 text-green-600" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedLead && (
                <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)}
                    onUpdate={(updated) => { setLeads(leads.map(l => l.id === updated.id ? updated : l)); setSelectedLead(updated); }} />
            )}
        </div>
    );
}
