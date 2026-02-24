"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Phone, MapPin, Star, Trash2, Copy } from "lucide-react";
import { api } from "@/lib/api";

interface DuplicateGroup {
    reason: string;
    confidence: string;
    phone: string | null;
    count: number;
    leads: Array<{
        id: string;
        business_name: string;
        category?: string;
        address?: string;
        phone_number?: string;
        google_rating?: number;
        lead_score?: string;
        google_place_id?: string;
        created_at?: string;
    }>;
}

export default function DuplicatesPage() {
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalDuplicates, setTotalDuplicates] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const result = await api.getDuplicates();
            if (result.success) {
                setGroups(result.data);
                setTotalDuplicates(result.totalDuplicateLeads);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDuplicates(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this lead? This cannot be undone.")) return;
        setDeletingId(id);
        try {
            await api.bulkDelete([id]);
            fetchDuplicates();
        } catch (err) { console.error(err); }
        finally { setDeletingId(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />Scanning for duplicates...
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Duplicate Detection</h1>
                    <p className="text-muted-foreground">
                        Found {groups.length} groups with {totalDuplicates} potential duplicate leads
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDuplicates}>
                    <Loader2 className="h-3 w-3 mr-1" />Rescan
                </Button>
            </div>

            {groups.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Copy className="h-10 w-10 mb-3" />
                        <p className="text-lg font-medium">No duplicates found</p>
                        <p className="text-sm">Your leads database is clean!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {groups.map((group, gi) => (
                        <Card key={gi} className="border-yellow-200/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    <span className="flex-1">{group.reason}</span>
                                    <Badge variant={group.confidence === "high" ? "destructive" : "secondary"} className="text-xs">
                                        {group.confidence} confidence
                                    </Badge>
                                    <Badge variant="outline">{group.count} leads</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {group.leads.map((lead, li) => (
                                        <div key={li} className="p-3 bg-muted/40 rounded-lg border relative group">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{lead.business_name}</p>
                                                    {lead.category && <Badge variant="outline" className="text-xs mt-1">{lead.category}</Badge>}
                                                </div>
                                                {lead.lead_score && (
                                                    <Badge className={`text-xs ${lead.lead_score === "hot" ? "bg-orange-500" : lead.lead_score === "warm" ? "bg-yellow-500" : "bg-blue-400"}`}>
                                                        {lead.lead_score}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                {lead.phone_number && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone_number}</p>}
                                                {lead.address && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.address}</p>}
                                                {lead.google_rating && <p className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{lead.google_rating}</p>}
                                                {lead.google_place_id && <p className="font-mono text-[10px] truncate">ID: {lead.google_place_id}</p>}
                                            </div>
                                            <Button
                                                variant="destructive" size="sm"
                                                className="absolute top-2 right-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDelete(lead.id)}
                                                disabled={deletingId === lead.id}
                                            >
                                                {deletingId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
