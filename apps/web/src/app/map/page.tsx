"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import LeadFilters from "@/components/leads/LeadFilters";
import type { LeadFilter } from "@geolead/types";

// Dynamic import — Leaflet must be client-side only
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

const SCORE_COLORS: Record<string, string> = {
    hot: "#f97316",
    warm: "#eab308",
    cold: "#3b82f6",
};

interface MapLead {
    id: string;
    business_name: string;
    category: string | null;
    google_rating: number | null;
    phone_number: string | null;
    lead_score: string | null;
    lead_score_numeric: number | null;
    lat: number;
    lng: number;
}

export default function MapPage() {
    const [leads, setLeads] = useState<MapLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<LeadFilter>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setTimeout(() => setMounted(true), 0); }, []);

    useEffect(() => {
        setLoading(true);
        const params: Record<string, string> = {};
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                params[key] = String(value);
            }
        });
        
        api.getMapLeads(params).then(r => { 
            if (r.success) setLeads(r.data as unknown as MapLead[]); 
        }).catch(console.error).finally(() => setLoading(false));
    }, [filters]);

    const center = useMemo(() => {
        const valid = leads.filter(l => typeof l.lat === "number" && typeof l.lng === "number" && !isNaN(l.lat) && !isNaN(l.lng));
        if (valid.length === 0) return [23.3441, 85.3096] as [number, number]; // Ranchi default
        const avgLat = valid.reduce((s, l) => s + l.lat, 0) / valid.length;
        const avgLng = valid.reduce((s, l) => s + l.lng, 0) / valid.length;
        return [avgLat, avgLng] as [number, number];
    }, [leads]);

    const counts = useMemo(() => ({
        total: leads.length,
        hot: leads.filter(l => l.lead_score === "hot").length,
        warm: leads.filter(l => l.lead_score === "warm").length,
        cold: leads.filter(l => l.lead_score === "cold").length,
    }), [leads]);

    if (!mounted) return null;

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500 h-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Map View</h1>
                    <p className="text-muted-foreground">{counts.total} leads mapped</p>
                </div>
                <div className="flex items-center gap-4 bg-card border rounded-lg p-2.5 shadow-sm text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Hot ({counts.hot})</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Warm ({counts.warm})</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Cold ({counts.cold})</span>
                </div>
            </div>

            <LeadFilters filters={filters} onFilterChange={setFilters} onExport={() => {}} />

            <Card className="flex-1 min-h-[500px] overflow-hidden">
                <CardContent className="p-0 h-full">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading map data...
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px]">
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}>
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                />
                                {leads.filter(l => typeof l.lat === "number" && typeof l.lng === "number" && !isNaN(l.lat) && !isNaN(l.lng)).map((lead) => (
                                    <CircleMarker
                                        key={lead.id}
                                        center={[lead.lat, lead.lng]}
                                        radius={7}
                                        fillColor={SCORE_COLORS[lead.lead_score || ""] || "#94a3b8"}
                                        fillOpacity={0.8}
                                        color="white"
                                        weight={2}
                                    >
                                        <Popup>
                                            <div className="text-sm min-w-[180px]">
                                                <p className="font-bold">{lead.business_name}</p>
                                                {lead.category && <p className="text-xs text-gray-500">{lead.category}</p>}
                                                {lead.google_rating && <p className="text-xs">★ {lead.google_rating}</p>}
                                                {lead.phone_number && <p className="text-xs">📞 {lead.phone_number}</p>}
                                                <p className="text-xs mt-1">
                                                    Score: <span className="font-medium capitalize">{lead.lead_score || "unscored"}</span>
                                                    {lead.lead_score_numeric != null && ` (${lead.lead_score_numeric})`}
                                                </p>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
