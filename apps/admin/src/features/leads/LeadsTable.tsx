import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Phone, Sparkles, Loader2, Mail } from "lucide-react";
import type { Lead } from "@geolead/types";
import { SCORE_COLORS, STATUS_COLORS } from "./constants";

interface LeadsTableProps {
    leads: Lead[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onSelectLead: (lead: Lead) => void;
    onAnalyze: (id: string) => void;
    analyzingId: string | null;
}

export function LeadsTable({
    leads,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onSelectLead,
    onAnalyze,
    analyzingId
}: LeadsTableProps) {
    if (leads.length === 0) {
        return (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="font-medium">No leads found</p>
                <p className="text-xs">Try adjusting your filters or scrape new leads.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                checked={selectedIds.size === leads.length && leads.length > 0}
                                onChange={onToggleSelectAll} />
                        </TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.map((lead) => (
                        <TableRow key={lead.id} className={`group cursor-pointer ${selectedIds.has(lead.id) ? "bg-primary/5" : ""}`}
                            onClick={() => onSelectLead(lead)}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                    checked={selectedIds.has(lead.id)} onChange={() => onToggleSelect(lead.id)} />
                            </TableCell>
                            <TableCell className="font-medium max-w-[220px] truncate">{lead.business_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{lead.category || "N/A"}</Badge></TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 font-bold">★</span>
                                    <span>{lead.google_rating ?? "—"}</span>
                                    <span className="text-xs text-muted-foreground">({lead.review_count ?? 0})</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1.5">
                                    {lead.phone_number && <div className="flex items-center gap-1.5 text-xs"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {lead.phone_number}</div>}
                                    {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-blue-600 text-xs hover:underline" onClick={(e) => e.stopPropagation()}><Mail className="h-3.5 w-3.5 text-blue-500" /> {lead.email.length > 25 ? lead.email.substring(0, 25) + "..." : lead.email}</a>}
                                    {lead.website_url && <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-600 text-xs hover:underline" onClick={(e) => e.stopPropagation()}><Globe className="h-3.5 w-3.5 text-sky-500" /> Website</a>}
                                    {!lead.phone_number && !lead.website_url && !lead.email && <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5">
                                    <Badge className={SCORE_COLORS[lead.lead_score || ""] || SCORE_COLORS["default"]}>
                                        {lead.lead_score ? lead.lead_score.charAt(0).toUpperCase() + lead.lead_score.slice(1) : "—"}
                                    </Badge>
                                    {lead.lead_score_numeric != null && <span className="text-xs text-muted-foreground">{lead.lead_score_numeric}</span>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge className={STATUS_COLORS[lead.lead_status || 'new'] || STATUS_COLORS["default"]}>
                                    {(lead.lead_status || 'new').replace(/_/g, " ")}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); onAnalyze(lead.id); }} disabled={analyzingId === lead.id}>
                                    {analyzingId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    {analyzingId === lead.id ? "..." : "Analyze"}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
