"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

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
    const [scoreFilter, setScoreFilter] = useState("all");
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setTimeout(() => setMounted(true), 0); }, []);

    useEffect(() => {
        const params: Record<string, string> = {};
        if (scoreFilter !== "all") params.score = scoreFilter;
        api.getMapLeads(params).then(r => { if (r.success) setLeads(r.data as unknown as MapLead[]); }).catch(console.error).finally(() => setLoading(false));
    }, [scoreFilter]);

    const center = useMemo(() => {
        if (leads.length === 0) return [23.3441, 85.3096] as [number, number]; // Ranchi default
        const avgLat = leads.reduce((s, l) => s + l.lat, 0) / leads.length;
        const avgLng = leads.reduce((s, l) => s + l.lng, 0) / leads.length;
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Map View</h1>
                    <p className="text-muted-foreground">{counts.total} leads mapped</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between items-center">
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-orange-500/50 border border-orange-500 inline-block" /> Hot ({counts.hot})</span>
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-yellow-500/50 border border-yellow-500 inline-block" /> Warm ({counts.warm})</span>
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-500/50 border border-blue-500 inline-block" /> Cold ({counts.cold})</span>
                    </div>
                    <Select value={scoreFilter} onValueChange={setScoreFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Scores" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Scores</SelectItem>
                            <SelectItem value="hot">Hot Only</SelectItem>
                            <SelectItem value="warm">Warm Only</SelectItem>
                            <SelectItem value="cold">Cold Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

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
                                {leads.map((lead) => (
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
