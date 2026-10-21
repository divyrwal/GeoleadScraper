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
import { Search, Phone, Globe, X, MapPin } from "lucide-react";
import type { LeadFilter } from "@geolead/types";
import { useState, useEffect, useMemo } from "react";
import { PROFESSIONS } from "@/lib/constants/directory-data";
import { TIER_OPTIONS, getCityTier } from "@/lib/utils/location-utils";

import { Country, State, City as CityData } from "country-state-city";

interface LeadSortFiltersProps {
    filters: LeadFilter;
    onFilterChange: (filters: LeadFilter) => void;
}

export default function LeadSortFilters({ filters, onFilterChange }: LeadSortFiltersProps) {
    // Local state for hierarchical selections
    const [countryCode, setCountryCode] = useState<string>("");
    const [stateCode, setStateCode] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [tier, setTier] = useState<string>("");

    const [professionFamily, setProfessionFamily] = useState<string>("");
    const [professionNode, setProfessionNode] = useState<string>("");
    const [subProfession, setSubProfession] = useState<string>("");

    // In-memory country-state-city data (100% offline, zero API)
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    useEffect(() => {
        try {
            const allCountries = Country.getAllCountries().map(c => ({
                name: c.name,
                code: c.isoCode
            }));
            setCountries(allCountries);
        } catch (e) {
            console.error("Failed to load countries", e);
        }
    }, []);

    useEffect(() => {
        if (!countryCode) {
            setStates([]);
            setCities([]);
            return;
        }
        try {
            const allStates = State.getStatesOfCountry(countryCode).map(s => ({
                name: s.name,
                code: s.isoCode
            }));
            setStates(allStates);
        } catch (e) {
            console.error("Failed to load states", e);
        }
    }, [countryCode]);

    useEffect(() => {
        if (!countryCode || !stateCode) {
            setCities([]);
            return;
        }
        try {
            const allCities = CityData.getCitiesOfState(countryCode, stateCode).map(c => ({
                name: c.name
            }));
            setCities(allCities);
        } catch (e) {
            console.error("Failed to load cities", e);
        }
    }, [countryCode, stateCode]);

    // When location dropdowns change, build the filter
    useEffect(() => {
        const countryName = countries.find(c => c.code === countryCode)?.name || "";
        const stateName = states.find(s => s.code === stateCode)?.name || "";

        const newFilters = { ...filters };

        if (city) newFilters.city = city;
        else if (stateName) newFilters.city = stateName;
        else if (countryName) newFilters.city = countryName;
        else delete newFilters.city;

        if (tier) newFilters.tier = tier;
        else delete newFilters.tier;

        if (stateName) newFilters.state = stateName; else delete newFilters.state;
        if (countryName) newFilters.country = countryName; else delete newFilters.country;

        const isChanged =
            filters.city !== newFilters.city ||
            filters.tier !== newFilters.tier ||
            filters.state !== newFilters.state ||
            filters.country !== newFilters.country;

        if (isChanged) {
            onFilterChange(newFilters);
        }
    }, [countryCode, stateCode, city, tier, filters, onFilterChange, countries, states]);

    // ... rest of the component remains similar ...

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
        filters.search || filters.category || filters.city || filters.hasPhone || filters.hasWebsite || filters.tier;

    const clearFilters = () => {
        setCountryCode("");
        setStateCode("");
        setCity("");
        setTier("");
        setProfessionFamily("");
        setProfessionNode("");
        setSubProfession("");
        onFilterChange({});
    };

    const profs = PROFESSIONS as Record<string, Record<string, string[]>>;
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
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-muted-foreground">Global Location Filter</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); setStateCode(""); setCity(""); setTier(""); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {countries.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={stateCode} onValueChange={(v) => { setStateCode(v); setCity(""); setTier(""); }} disabled={!countryCode}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="State/Region" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {states.map((s) => (
                                    <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={city} onValueChange={(v) => { setCity(v); setTier(""); }} disabled={!stateCode}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {cities.map((c) => (
                                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={tier} onValueChange={setTier}>
                            <SelectTrigger className="w-[180px] border-primary/30 bg-primary/5">
                                <SelectValue placeholder="City Tier" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIER_OPTIONS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1 italic">
                        * Tiers are currently optimized for India and major global hubs.
                    </p>
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
