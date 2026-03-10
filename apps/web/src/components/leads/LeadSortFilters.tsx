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
import { Search, Phone, Globe, X } from "lucide-react";
import type { LeadFilter } from "@geolead/types";
import { useState, useEffect } from "react";
import { LOCATIONS, PROFESSIONS } from "@/lib/constants/directory-data";

interface LeadSortFiltersProps {
    filters: LeadFilter;
    onFilterChange: (filters: LeadFilter) => void;
}

export default function LeadSortFilters({ filters, onFilterChange }: LeadSortFiltersProps) {
    // Local state for hierarchical selections
    const [country, setCountry] = useState<string>("");
    const [state, setState] = useState<string>("");
    const [city, setCity] = useState<string>("");

    const [professionFamily, setProfessionFamily] = useState<string>("");
    const [professionNode, setProfessionNode] = useState<string>("");
    const [subProfession, setSubProfession] = useState<string>("");

    // When location dropdowns change, we want to build a "city" search string
    // e.g., if just city is selected: "Austin"
    useEffect(() => {
        let locationQuery = "";
        if (city) locationQuery = city;
        else if (state) locationQuery = state;
        else if (country) locationQuery = country;

        const newCity = locationQuery || undefined;
        if (filters.city !== newCity) {
            onFilterChange({ ...filters, city: newCity });
        }
    }, [country, state, city, filters, onFilterChange]);

    // When profession dropdowns change, build a "category" search string
    useEffect(() => {
        let categoryQuery = "";
        if (subProfession) categoryQuery = subProfession;
        else if (professionNode) categoryQuery = professionNode;
        else if (professionFamily) categoryQuery = professionFamily;

        const newCat = categoryQuery || undefined;
        if (filters.category !== newCat) {
            onFilterChange({ ...filters, category: newCat });
        }
    }, [professionFamily, professionNode, subProfession, filters, onFilterChange]);

    const hasActiveFilters =
        filters.search || filters.category || filters.city || filters.hasPhone || filters.hasWebsite;

    const clearFilters = () => {
        setCountry("");
        setState("");
        setCity("");
        setProfessionFamily("");
        setProfessionNode("");
        setSubProfession("");
        onFilterChange({});
    };

    const locs = LOCATIONS as Record<string, Record<string, string[]>>;
    const profs = PROFESSIONS as Record<string, Record<string, string[]>>;

    const stateOptions = country && locs[country] ? Object.keys(locs[country]) : [];
    const cityOptions = state && locs[country]?.[state] ? locs[country][state] : [];

    const nodeOptions = professionFamily && profs[professionFamily] ? Object.keys(profs[professionFamily]) : [];
    const subOptions = professionNode && profs[professionFamily]?.[professionNode] ? profs[professionFamily][professionNode] : [];

    return (
        <div className="flex flex-col gap-4 p-4 border rounded-xl bg-card shadow-sm">

            {/* Base Toggles */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or exact address..."
                        className="pl-9"
                        value={filters.search || ""}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
                    />
                </div>

                <Button
                    variant={filters.hasPhone ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange({ ...filters, hasPhone: filters.hasPhone ? undefined : true })}
                    className="gap-1"
                >
                    <Phone className="h-4 w-4" />
                    Has Contact Number
                </Button>

                <Button
                    variant={filters.hasWebsite ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange({ ...filters, hasWebsite: filters.hasWebsite ? undefined : true })}
                    className="gap-1"
                >
                    <Globe className="h-4 w-4" />
                    Has Website
                </Button>

                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 ml-auto">
                        <X className="h-4 w-4" />
                        Clear All
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t">
                {/* Location Filter hierarchy */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Location Filter</h3>
                    <div className="flex flex-wrap gap-2">
                        <Select value={country} onValueChange={(v) => { setCountry(v); setState(""); setCity(""); }}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Country" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(LOCATIONS).map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={state} onValueChange={(v) => { setState(v); setCity(""); }} disabled={!country}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="State/Region" />
                            </SelectTrigger>
                            <SelectContent>
                                {stateOptions.map((s) => (
                                    <SelectItem key={s as string} value={s as string}>{s as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={city} onValueChange={setCity} disabled={!state}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent>
                                {cityOptions.map((c: string) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Profession / Category Filter hierarchy */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Profession Category Filter</h3>
                    <div className="flex flex-wrap gap-2">
                        <Select value={professionFamily} onValueChange={(v) => { setProfessionFamily(v); setProfessionNode(""); setSubProfession(""); }}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Broad Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(PROFESSIONS).map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={professionNode} onValueChange={(v) => { setProfessionNode(v); setSubProfession(""); }} disabled={!professionFamily}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Profession" />
                            </SelectTrigger>
                            <SelectContent>
                                {nodeOptions.map((n) => (
                                    <SelectItem key={n as string} value={n as string}>{n as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={subProfession} onValueChange={setSubProfession} disabled={!professionNode}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Sub-Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {subOptions.map((s: string) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

        </div>
    );
}
