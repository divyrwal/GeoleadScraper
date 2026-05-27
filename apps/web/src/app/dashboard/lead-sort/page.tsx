"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import LeadSortFilters from "@/components/leads/LeadSortFilters";
import LeadDetailModal from "@/components/leads/LeadDetailModal";

import { useLeadsTable } from "@/hooks/useLeadsTable";
import { LeadsBulkActionBar } from "@/features/leads/LeadsBulkActionBar";
import { LeadsTable } from "@/features/leads/LeadsTable";
import type { Lead } from "@geolead/types";

export default function LeadSortPage() {
    const {
        leads, loading, filters, setFilters, pagination, fetchLeads,
        handleAnalyze, analyzingId, updateLeadInState,
        selectedIds, setSelectedIds, toggleSelect, toggleSelectAll,
        bulkStatus, setBulkStatus, bulkTag, setBulkTag, bulkLoading,
        handleBulkStatus, handleBulkTag, handleBulkDelete, handleBulkShortlist
    } = useLeadsTable();

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Lead Sort & Directory</h1>
                    <p className="text-muted-foreground">Deep filter your pipeline by geographical location and precise categorized professions.</p>
                </div>
                <Button variant="outline" onClick={() => fetchLeads(pagination.page)} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Powerful Hierarchical Filter Section */}
            <LeadSortFilters filters={filters} onFilterChange={setFilters} />

            <LeadsBulkActionBar
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds(new Set())}
                bulkStatus={bulkStatus}
                onBulkStatusChange={setBulkStatus}
                onApplyStatus={handleBulkStatus}
                bulkTag={bulkTag}
                onBulkTagChange={setBulkTag}
                onApplyTag={handleBulkTag}
                onDelete={handleBulkDelete}
                onShortlist={handleBulkShortlist}
                isLoading={bulkLoading}
            />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-lg">{pagination.total.toLocaleString()} leads match criteria</CardTitle>
                    <div className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages || 1}</div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-48 items-center justify-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading results...
                        </div>
                    ) : (
                        <LeadsTable
                            leads={leads}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                            onToggleSelectAll={toggleSelectAll}
                            onSelectLead={setSelectedLead}
                            onAnalyze={handleAnalyze}
                            analyzingId={analyzingId}
                        />
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchLeads(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const MathMax = Math.max(1, pagination.page - 2);
                                    const pageNum = MathMax + i;
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
                    onUpdate={(updated) => { updateLeadInState(updated); setSelectedLead(updated); }} />
            )}
        </div>
    );
}
