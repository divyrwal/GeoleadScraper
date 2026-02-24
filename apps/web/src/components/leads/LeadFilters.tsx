"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Download, X, Phone, Globe, Mail } from "lucide-react";
import type { LeadFilter } from "@geolead/types";

interface LeadFiltersProps {
    filters: LeadFilter;
    onFilterChange: (filters: LeadFilter) => void;
    onExport: () => void;
}

const STATUSES = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "closed", label: "Closed" },
];

const SCORES = [
    { value: "Hot", label: "🔥 Hot" },
    { value: "Warm", label: "🌡️ Warm" },
    { value: "Cold", label: "❄️ Cold" },
];

export default function LeadFilters({ filters, onFilterChange, onExport }: LeadFiltersProps) {
    const hasActiveFilters = filters.search || filters.category || filters.status || filters.score || filters.minRating || filters.hasPhone || filters.hasWebsite || filters.hasEmail;

    const clearFilters = () => {
        onFilterChange({});
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, category, or address..."
                    className="pl-9"
                    value={filters.search || ""}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
                />
            </div>

            {/* Has Phone toggle */}
            <Button
                variant={filters.hasPhone ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange({ ...filters, hasPhone: filters.hasPhone ? undefined : true })}
                className="gap-1"
            >
                <Phone className="h-3.5 w-3.5" />
                Phone
            </Button>

            {/* Has Website toggle */}
            <Button
                variant={filters.hasWebsite ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange({ ...filters, hasWebsite: filters.hasWebsite ? undefined : true })}
                className="gap-1"
            >
                <Globe className="h-3.5 w-3.5" />
                Website
            </Button>

            {/* Has Email toggle */}
            <Button
                variant={filters.hasEmail ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange({ ...filters, hasEmail: filters.hasEmail ? undefined : true })}
                className="gap-1"
            >
                <Mail className="h-3.5 w-3.5" />
                Email
            </Button>

            <Select
                value={filters.status || "all"}
                onValueChange={(v) => onFilterChange({ ...filters, status: v === "all" ? undefined : v })}
            >
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={filters.score || "all"}
                onValueChange={(v) => onFilterChange({ ...filters, score: v === "all" ? undefined : v })}
            >
                <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Score" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    {SCORES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-3 w-3" />
                    Clear
                </Button>
            )}

            <Button variant="outline" size="sm" onClick={onExport} className="gap-1 ml-auto">
                <Download className="h-4 w-4" />
                Export CSV
            </Button>
        </div>
    );
}
