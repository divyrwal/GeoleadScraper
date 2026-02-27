"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Phone, Sparkles, Loader2, ChevronLeft, ChevronRight, Trash2, Tag, CheckSquare, X, Mail, Database } from "lucide-react";
import LeadFilters from "@/components/leads/LeadFilters";
import LeadDetailModal from "@/components/leads/LeadDetailModal";
import { api } from "@/lib/api";
import type { Lead, LeadFilter, PaginationMeta } from "@geolead/types";

const SCORE_STYLES: Record<string, string> = {
    hot: "bg-orange-500 hover:bg-orange-600",
    warm: "bg-yellow-500 hover:bg-yellow-600",
    cold: "bg-blue-400 hover:bg-blue-500",
};

const STATUS_STYLES: Record<string, string> = {
    new: "bg-blue-500 hover:bg-blue-600",
    contacted: "bg-yellow-500 hover:bg-yellow-600",
    follow_up: "bg-purple-500 hover:bg-purple-600",
    qualified: "bg-green-500 hover:bg-green-600",
    negotiating: "bg-indigo-500 hover:bg-indigo-600",
    won: "bg-emerald-500 hover:bg-emerald-600",
    lost: "bg-red-500 hover:bg-red-600",
    closed: "bg-slate-500 hover:bg-slate-600",
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<LeadFilter>({});
    const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pageSize: 25, totalPages: 0 });
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    // Bulk actions state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState("");
    const [bulkTag, setBulkTag] = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);

    const fetchLeads = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), pageSize: String(pagination.pageSize) };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            if (filters.score) params.score = filters.score;
            if (filters.category) params.category = filters.category;
            if (filters.minRating) params.minRating = String(filters.minRating);
            if (filters.maxRating) params.maxRating = String(filters.maxRating);
            if (filters.city) params.city = filters.city;
            if (filters.hasPhone) params.hasPhone = "true";
            if (filters.hasWebsite) params.hasWebsite = "true";
            if (filters.hasEmail) params.hasEmail = "true";
            if (filters.missingWebsite) params.missingWebsite = "true";
            if (filters.missingSocials) params.missingSocials = "true";

            const result = await api.getLeads(params);
            if (result.success) { setLeads(result.data); setPagination(result.pagination); }
        } catch (err) { console.error("Failed to fetch leads:", err); }
        finally { setLoading(false); }
    }, [filters, pagination.pageSize]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchLeads(1), 300);
        return () => clearTimeout(debounce);
    }, [filters, fetchLeads]);

    const handleAnalyze = async (id: string) => {
        setAnalyzingId(id);
        try {
            const result = await api.analyzeLead(id);
            if (result.success) setLeads(leads.map((l) => (l.id === id ? result.data : l)));
        } catch (err) { console.error("Analysis error:", err); }
        finally { setAnalyzingId(null); }
    };

    const handleExport = () => {
        const params: Record<string, string> = {};
        if (filters.search) params.search = filters.search;
        if (filters.status) params.status = filters.status;
        if (filters.score) params.score = filters.score;
        if (filters.city) params.city = filters.city;
        if (filters.maxRating) params.maxRating = String(filters.maxRating);
        if (filters.missingWebsite) params.missingWebsite = "true";
        if (filters.missingSocials) params.missingSocials = "true";
        if (filters.hasPhone) params.hasPhone = "true";
        window.open(api.getExportUrl(params), "_blank");
    };

    // Bulk action handlers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    };

    const handleBulkStatus = async () => {
        if (!bulkStatus || selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await api.bulkStatus(Array.from(selectedIds), bulkStatus);
            setSelectedIds(new Set());
            setBulkStatus("");
            fetchLeads(pagination.page);
        } catch (err) { console.error(err); }
        finally { setBulkLoading(false); }
    };

    const handleBulkTag = async () => {
        if (!bulkTag.trim() || selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await api.bulkTag(Array.from(selectedIds), bulkTag.trim());
            setBulkTag("");
            fetchLeads(pagination.page);
        } catch (err) { console.error(err); }
        finally { setBulkLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;
        setBulkLoading(true);
        try {
            await api.bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            fetchLeads(pagination.page);
        } catch (err) { console.error(err); }
        finally { setBulkLoading(false); }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground">Manage and organize your extracted business data.</p>
                </div>
                <Button onClick={async () => {
                    if (!confirm("Start batch enriching all leads without emails? This runs in the background.")) return;
                    setBulkLoading(true);
                    try {
                        await api.enrichBatchLeads();
                        alert("Batch enrichment started in the background!");
                    } catch (e) {
                        console.error(e);
                    } finally {
                        setBulkLoading(false);
                    }
                }} disabled={bulkLoading} className="gap-2">
                    <Database className="h-4 w-4" />
                    Batch Enrich Emails
                </Button>
            </div>

            <LeadFilters filters={filters} onFilterChange={setFilters} onExport={handleExport} />

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in duration-200">
                    <Badge variant="outline" className="gap-1">
                        <CheckSquare className="h-3 w-3" />{selectedIds.size} selected
                    </Badge>

                    <div className="flex items-center gap-2 flex-1">
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Set Status" /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(STATUS_STYLES).map(s => (
                                    <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {bulkStatus && (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleBulkStatus} disabled={bulkLoading}>
                                Apply Status
                            </Button>
                        )}

                        <div className="h-4 w-px bg-border" />

                        <Input placeholder="Add tag..." value={bulkTag} onChange={(e) => setBulkTag(e.target.value)}
                            className="w-[120px] h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleBulkTag(); }} />
                        {bulkTag && (
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleBulkTag} disabled={bulkLoading}>
                                <Tag className="h-3 w-3" />Add
                            </Button>
                        )}
                    </div>

                    <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={handleBulkDelete} disabled={bulkLoading}>
                        <Trash2 className="h-3 w-3" />Delete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-lg">{pagination.total.toLocaleString()} leads</CardTitle>
                    <div className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages || 1}</div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-48 items-center justify-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading leads...
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p className="font-medium">No leads found</p>
                            <p className="text-xs">Try adjusting your filters or scrape new leads.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                                checked={selectedIds.size === leads.length && leads.length > 0}
                                                onChange={toggleSelectAll} />
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
                                            onClick={() => setSelectedLead(lead)}>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                                    checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
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
                                                    <Badge className={SCORE_STYLES[lead.lead_score || ""] || "bg-slate-200 text-slate-700"}>
                                                        {lead.lead_score ? lead.lead_score.charAt(0).toUpperCase() + lead.lead_score.slice(1) : "—"}
                                                    </Badge>
                                                    {lead.lead_score_numeric != null && <span className="text-xs text-muted-foreground">{lead.lead_score_numeric}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_STYLES[lead.lead_status || 'new'] || "bg-slate-200 text-slate-700 capitalize"}>
                                                    {(lead.lead_status || 'new').replace(/_/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => { e.stopPropagation(); handleAnalyze(lead.id); }} disabled={analyzingId === lead.id}>
                                                    {analyzingId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                    {analyzingId === lead.id ? "..." : "Analyze"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchLeads(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const start = Math.max(1, pagination.page - 2);
                                    const pageNum = start + i;
                                    if (pageNum > pagination.totalPages) return null;
                                    return <Button key={pageNum} variant={pageNum === pagination.page ? "default" : "outline"} size="sm" onClick={() => fetchLeads(pageNum)}>{pageNum}</Button>;
                                })}
                                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLeads(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedLead && (
                <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)}
                    onUpdate={(updated) => { setLeads(leads.map((l) => (l.id === updated.id ? updated : l))); setSelectedLead(updated); }} />
            )}
        </div>
    );
}
