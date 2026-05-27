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
import { Search, Download, X, Phone, Globe, Mail, MapPin, Target, Star } from "lucide-react";
import type { LeadFilter } from "@geolead/types";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect } from "react";
import { Country, State, City } from "country-state-city";
import { TIER_OPTIONS } from "@/lib/utils/location-utils";

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
    // Local state for hierarchy
    const [countryCode, setCountryCode] = useState<string>("");
    const [stateCode, setStateCode] = useState<string>("");

    const countries = useMemo(() => Country.getAllCountries(), []);
    const states = useMemo(() => countryCode ? State.getStatesOfCountry(countryCode) : [], [countryCode]);
    const cities = useMemo(() => (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [], [countryCode, stateCode]);

    const hasActiveFilters = filters.search || filters.category || filters.status || filters.score || filters.minRating || filters.hasPhone || filters.hasWebsite || filters.hasEmail || filters.tier || filters.city;

    const clearFilters = () => {
        setCountryCode("");
        setStateCode("");
        onFilterChange({});
    };

    // When codes change, update the names in filters
    useEffect(() => {
        const countryName = countryCode ? Country.getCountryByCode(countryCode)?.name : undefined;
        const stateName = (countryCode && stateCode) ? State.getStateByCodeAndCountry(stateCode, countryCode)?.name : undefined;

        const newFilters = { ...filters };
        if (countryName) newFilters.country = countryName; else delete newFilters.country;
        if (stateName) newFilters.state = stateName; else delete newFilters.state;

        if (filters.country !== newFilters.country || filters.state !== newFilters.state) {
            onFilterChange(newFilters);
        }
    }, [countryCode, stateCode, filters, onFilterChange]);

    return (
        <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card shadow-sm">
            {/* Primary Search Row */}
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
                    className="gap-1 font-medium"
                >
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                </Button>

                {/* Has Website toggle */}
                <Button
                    variant={filters.hasWebsite ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange({ ...filters, hasWebsite: filters.hasWebsite ? undefined : true })}
                    className="gap-1 font-medium"
                >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                </Button>

                {/* Has Email toggle */}
                <Button
                    variant={filters.hasEmail ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange({ ...filters, hasEmail: filters.hasEmail ? undefined : true })}
                    className="gap-1 font-medium"
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

            {/* Global Location Row */}
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <div className="flex items-center gap-2 mr-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Geography:</span>
                </div>

                <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); setStateCode(""); onFilterChange({ ...filters, city: undefined, tier: undefined }); }}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {countries.map((c) => (
                            <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={stateCode} onValueChange={(v) => { setStateCode(v); onFilterChange({ ...filters, city: undefined, tier: undefined }); }} disabled={!countryCode}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="State/Region" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {states.map((s) => (
                            <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select 
                    value={filters.city || "all"} 
                    onValueChange={(v) => onFilterChange({ ...filters, city: v === "all" ? undefined : v, tier: undefined })}
                    disabled={!stateCode}
                >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">All Cities</SelectItem>
                        {cities.map((c) => (
                            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select 
                    value={filters.tier || "all"} 
                    onValueChange={(v) => onFilterChange({ ...filters, tier: v === "all" ? undefined : v })}
                >
                    <SelectTrigger className="w-[160px] h-8 text-xs border-primary/20 bg-primary/5">
                        <SelectValue placeholder="City Tier" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Any Tier</SelectItem>
                        {TIER_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="h-4 w-px bg-border mx-1" />

                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground py-0">Global Data Enabled</Badge>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex items-center gap-3 border-t pt-3">
                <Badge variant="secondary" className="font-normal text-muted-foreground mr-2">Agency Targets:</Badge>

                <div className="relative w-[130px]">
                    <Star className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="number"
                        placeholder="Max Rating"
                        className="pl-8 h-8 text-xs"
                        step="0.1"
                        max="5"
                        value={filters.maxRating || ""}
                        onChange={(e) => onFilterChange({ ...filters, maxRating: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                </div>

                <Button
                    variant={filters.missingWebsite ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange({ ...filters, missingWebsite: filters.missingWebsite ? undefined : true, hasWebsite: filters.missingWebsite ? undefined : false })}
                    className={`gap-1 h-8 text-xs ${filters.missingWebsite ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
                >
                    <Globe className="h-3.5 w-3.5" />
                    Needs Website
                </Button>

                <Button
                    variant={filters.missingSocials ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange({ ...filters, missingSocials: filters.missingSocials ? undefined : true })}
                    className={`gap-1 h-8 text-xs ${filters.missingSocials ? "bg-pink-600 hover:bg-pink-700 text-white" : ""}`}
                >
                    <Target className="h-3.5 w-3.5" />
                    Needs Socials
                </Button>
            </div>
        </div>
    );
}
