// API client for the web app
// All frontend API calls go through this utility

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_URL}${path}`;
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GEOLEAD_API_KEY || "test-token"}`, ...options?.headers },
        ...options,
    });
    return res.json();
}

export const api = {
    // Stats
    getStats: () => request<{ success: boolean; data: import("@geolead/types").DashboardStats }>("/api/stats"),

    // Leads
    getLeads: (params?: Record<string, string>) => {
        const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
        return request<{ success: boolean; data: import("@geolead/types").Lead[]; pagination: import("@geolead/types").PaginationMeta }>(`/api/leads${qs}`);
    },

    createLeads: (leads: unknown[]) =>
        request<{ success: boolean; inserted: number; updated: number }>("/api/leads", {
            method: "POST",
            body: JSON.stringify({ leads }),
        }),

    // Lead detail
    getLead: (id: string) =>
        request<{ success: boolean; data: import("@geolead/types").Lead }>(`/api/leads/${id}`),

    updateLead: (id: string, data: Record<string, unknown>) =>
        request<{ success: boolean; data: import("@geolead/types").Lead }>(`/api/leads/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    // Contact
    logContact: (id: string, notes: string) =>
        request<{ success: boolean; data: { lead: import("@geolead/types").Lead; contactHistory: import("@geolead/types").ContactLog[] } }>(
            `/api/leads/${id}/contact`,
            { method: "POST", body: JSON.stringify({ notes }) }
        ),

    getContactHistory: (id: string) =>
        request<{ success: boolean; data: import("@geolead/types").ContactLog[] }>(`/api/leads/${id}/contact`),

    // Analyze
    analyzeLead: (id: string) =>
        request<{ success: boolean; data: import("@geolead/types").Lead }>(`/api/leads/${id}/analyze`, { method: "POST" }),

    // Nearby
    getNearby: (lat: number, lng: number, radius: number) =>
        request<{ success: boolean; data: import("@geolead/types").Lead[] }>(`/api/leads/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),

    // Export
    getExportUrl: (params?: Record<string, string>) => {
        const queryParams = new URLSearchParams(params || {});
        // In production, we should avoid query-param tokens if possible, but for simple GET download:
        queryParams.set("token", process.env.NEXT_PUBLIC_GEOLEAD_API_KEY || "test-token");
        return `${API_URL}/api/leads/export?${queryParams.toString()}`;
    },

    // Scrape Sessions (map coverage)
    getScrapeSessions: () =>
        request<{ success: boolean; data: Array<{ id: string; search_query: string; center_lat: number; center_lng: number; zoom: number; total_found: number; total_saved: number; duplicates_skipped: number; scraped_at: string }> }>("/api/scrape-sessions"),

    // Analytics
    getAnalytics: () =>
        request<{ success: boolean; data: Record<string, unknown> }>("/api/analytics"),

    // Map data (lightweight)
    getMapLeads: (params?: Record<string, string>) => {
        const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
        return request<{ success: boolean; data: Record<string, unknown>[]; total: number }>(`/api/leads/map${qs}`);
    },

    // Bulk operations
    bulkStatus: (ids: string[], status: string) =>
        request<{ success: boolean; modified: number }>("/api/leads/bulk/status", { method: "POST", body: JSON.stringify({ ids, status }) }),

    bulkTag: (ids: string[], tag: string) =>
        request<{ success: boolean; modified: number }>("/api/leads/bulk/tag", { method: "POST", body: JSON.stringify({ ids, tag }) }),

    bulkShortlist: (ids: string[], note?: string) =>
        request<{ success: boolean; updated: number }>("/api/leads/bulk/shortlist", { method: "POST", body: JSON.stringify({ ids, note }) }),

    bulkDelete: (ids: string[]) =>
        request<{ success: boolean; deleted: number }>("/api/leads/bulk/delete", { method: "POST", body: JSON.stringify({ ids }) }),

    rescoreAll: () =>
        request<{ success: boolean; updated: number }>("/api/leads/rescore", { method: "POST" }),

    getDuplicates: <T = Record<string, unknown>>() =>
        request<{ success: boolean; data: T[]; totalGroups: number; totalDuplicateLeads: number }>("/api/leads/duplicates"),

    removeDuplicates: () =>
        request<{ success: boolean; deletedCount: number }>("/api/leads/duplicates", { method: "DELETE" }),

    // Enrichment
    enrichLead: (id: string) =>
        request<{ success: boolean; data: import("@geolead/types").Lead }>(`/api/leads/${id}/enrich`, { method: "POST" }),

    enrichBatchLeads: () =>
        request<{ success: boolean; message: string }>("/api/leads/enrich/batch", { method: "POST" }),

    // Web Audit
    auditLeadWebsite: (id: string, includeAi: boolean = false) =>
        request<{ success: boolean; data: import("@geolead/types").Lead }>(`/api/leads/${id}/audit${includeAi ? '?includeAi=true' : ''}`, { method: "POST" }),

    // Advanced Search & Request Data
    startAdvancedSearch: (params: {
        query: string;
        location: string;
        radiusKm?: number;
        maxResults?: number;
        sources?: { googleMaps: boolean; justDial: boolean; linkedIn: boolean; instagram: boolean };
        useAiValidation?: boolean;
        deepScan?: boolean;
    }) => request<{ success: boolean; jobId: string; message: string }>("/api/search/advanced", {
        method: "POST",
        body: JSON.stringify(params)
    }),
};
