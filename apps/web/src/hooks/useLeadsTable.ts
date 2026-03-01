import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import type { Lead, LeadFilter, PaginationMeta } from "@geolead/types";

export function useLeadsTable() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<LeadFilter>({});
    const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, pageSize: 25, totalPages: 0 });
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

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
            if (result.success) {
                setLeads(result.data);
                setPagination(result.pagination);
            }
        } catch (err) {
            console.error("Failed to fetch leads:", err);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.pageSize]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchLeads(1), 300);
        return () => clearTimeout(debounce);
    }, [filters, fetchLeads]);

    const handleAnalyze = async (id: string) => {
        setAnalyzingId(id);
        try {
            const result = await api.analyzeLead(id);
            if (result.success) {
                setLeads(current => current.map((l) => (l.id === id ? result.data : l)));
            }
        } catch (err) {
            console.error("Analysis error:", err);
        } finally {
            setAnalyzingId(null);
        }
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

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === leads.length && leads.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    }, [leads, selectedIds.size]);

    const handleBulkStatus = async () => {
        if (!bulkStatus || selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await api.bulkStatus(Array.from(selectedIds), bulkStatus);
            setSelectedIds(new Set());
            setBulkStatus("");
            fetchLeads(pagination.page);
        } catch (err) {
            console.error(err);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkTag = async () => {
        if (!bulkTag.trim() || selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await api.bulkTag(Array.from(selectedIds), bulkTag.trim());
            setBulkTag("");
            fetchLeads(pagination.page);
        } catch (err) {
            console.error(err);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;
        setBulkLoading(true);
        try {
            await api.bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            fetchLeads(pagination.page);
        } catch (err) {
            console.error(err);
        } finally {
            setBulkLoading(false);
        }
    };

    const updateLeadInState = useCallback((updatedLead: Lead) => {
        setLeads(current => current.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    }, []);

    return {
        leads,
        loading,
        filters,
        setFilters,
        pagination,
        fetchLeads,

        // Specific actions
        handleAnalyze,
        analyzingId,
        handleExport,
        updateLeadInState,

        // Bulk actions State
        selectedIds,
        setSelectedIds,
        toggleSelect,
        toggleSelectAll,
        bulkStatus,
        setBulkStatus,
        bulkTag,
        setBulkTag,
        bulkLoading,
        setBulkLoading,

        // Bulk action commands
        handleBulkStatus,
        handleBulkTag,
        handleBulkDelete
    };
}
