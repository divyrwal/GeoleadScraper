"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    X, Phone, Globe, MapPin, Sparkles, Loader2, MessageCircle,
    Clock, Star, Send, Copy, ExternalLink, Mail, Tag,
    Flame, Thermometer, Snowflake, CheckCircle, LayoutTemplate,
    Instagram, Facebook, Linkedin, Twitter
} from "lucide-react";
import { api } from "@/lib/api";
import type { Lead, ContactLog } from "@geolead/types";

interface LeadDetailModalProps {
    lead: Lead;
    onClose: () => void;
    onUpdate: (updated: Lead) => void;
}

const SCORE_CONFIG = {
    hot: { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Hot Lead" },
    warm: { icon: Thermometer, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Warm Lead" },
    cold: { icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Cold Lead" },
};

const STATUS_OPTIONS = [
    { value: "new", label: "New", color: "bg-blue-500" },
    { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
    { value: "follow_up", label: "Follow Up", color: "bg-purple-500" },
    { value: "qualified", label: "Qualified", color: "bg-green-500" },
    { value: "negotiating", label: "Negotiating", color: "bg-indigo-500" },
    { value: "won", label: "Won", color: "bg-emerald-500" },
    { value: "lost", label: "Lost", color: "bg-red-500" },
    { value: "closed", label: "Closed", color: "bg-slate-500" },
];

export default function LeadDetailModal({ lead, onClose, onUpdate }: LeadDetailModalProps) {
    const [notes, setNotes] = useState(lead.notes || "");
    const [tagsInput, setTagsInput] = useState(lead.tags?.join(", ") || "");
    const [status, setStatus] = useState(lead.lead_status);
    const [contactNote, setContactNote] = useState("");
    const [contactHistory, setContactHistory] = useState<ContactLog[]>([]);
    const [saving, setSaving] = useState(false);
    const [contacting, setContacting] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [auditing, setAuditing] = useState(false);
    const [generatingPitch, setGeneratingPitch] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        api.getContactHistory(lead.id).then((r) => { if (r.success) setContactHistory(r.data); }).catch(console.error);
    }, [lead.id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await api.updateLead(lead.id, {
                notes, tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean), lead_status: status,
            });
            if (result.success) onUpdate(result.data);
        } catch (err) { console.error("Save failed:", err); }
        finally { setSaving(false); }
    };

    const handleContact = async () => {
        if (!contactNote.trim()) return;
        setContacting(true);
        try {
            const result = await api.logContact(lead.id, contactNote);
            if (result.success) { onUpdate(result.data.lead); setContactHistory(result.data.contactHistory); setContactNote(""); setStatus("contacted"); }
        } catch (err) { console.error("Contact log failed:", err); }
        finally { setContacting(false); }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        try {
            const result = await api.enrichLead(lead.id);
            if (result.success) onUpdate(result.data);
        } catch (err) { console.error("Enrichment failed:", err); }
        finally { setEnriching(false); }
    };

    const handleAudit = async (includeAi: boolean = false) => {
        if (includeAi) setGeneratingPitch(true);
        else setAuditing(true);

        try {
            const result = await api.auditLeadWebsite(lead.id, includeAi);
            if (result.success) onUpdate(result.data);
        } catch (err) { console.error("Audit failed:", err); }
        finally {
            setAuditing(false);
            setGeneratingPitch(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 1500);
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const scoreConfig = lead.lead_score ? SCORE_CONFIG[lead.lead_score as keyof typeof SCORE_CONFIG] : null;
    const ScoreIcon = scoreConfig?.icon || CheckCircle;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background shadow-2xl border-l animate-in slide-in-from-right duration-300 flex flex-col">

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b bg-muted/30 shrink-0">
                    <div className="flex-1 min-w-0 mr-3">
                        <h2 className="text-lg font-bold truncate">{lead.business_name}</h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {lead.category && <Badge variant="outline" className="text-xs">{lead.category}</Badge>}
                            {lead.google_rating && (
                                <div className="flex items-center gap-1 text-sm">
                                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold">{lead.google_rating}</span>
                                    <span className="text-muted-foreground text-xs">({lead.review_count || 0})</span>
                                </div>
                            )}
                            {lead.price_level && <Badge variant="outline" className="text-xs">{lead.price_level}</Badge>}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mr-1 -mt-1">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Score Card */}
                    {scoreConfig && (
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${scoreConfig.bg} ${scoreConfig.border} shadow-sm transition-colors`}>
                            <div className={`p-2 rounded-full ${scoreConfig.bg} ${scoreConfig.color}`}>
                                <ScoreIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className={`text-sm font-semibold ${scoreConfig.color}`}>{scoreConfig.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 font-mono">Score: {lead.lead_score_numeric}/100</div>
                            </div>
                            {lead.score_breakdown && (
                                <div className="flex flex-wrap gap-1 max-w-[150px] justify-end">
                                    {Object.entries(lead.score_breakdown).map(([key, val]) => (
                                        <Badge key={key} variant="outline" className={`text-[10px] px-1.5 py-0 ${scoreConfig.color} ${scoreConfig.border} bg-background/50 font-mono tracking-tight`}>
                                            {key} +{val}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</h3>
                            {lead.website_url && !lead.email && (
                                <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching} className="h-7 text-xs px-2">
                                    {enriching ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Sparkles className="h-3 w-3 mr-1.5 text-purple-500" />}
                                    Find Email
                                </Button>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {lead.phone_number && (
                                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg group">
                                    <Phone className="h-4 w-4 text-green-600 shrink-0" />
                                    <a href={`tel:${lead.phone_number}`} className="text-sm font-medium flex-1 hover:text-green-600">{lead.phone_number}</a>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(lead.phone_number!, "phone")}>
                                        {copied === "phone" ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                </div>
                            )}
                            {lead.email && (
                                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg group">
                                    <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                                    <a href={`mailto:${lead.email}`} className="text-sm font-medium flex-1 hover:text-blue-600">{lead.email}</a>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(lead.email!, "email")}>
                                        {copied === "email" ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                </div>
                            )}
                            {lead.website_url && (
                                <a href={lead.website_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                    <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                                    <span className="text-sm font-medium text-blue-600 flex-1 truncate">{lead.website_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                            )}
                            {lead.address && (
                                <a href={`https://www.google.com/maps/search/${encodeURIComponent(lead.address)}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                    <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                                    <span className="text-sm flex-1">{lead.address}</span>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                            )}
                            {lead.social_links && Object.keys(lead.social_links).length > 0 && (
                                <div className="flex items-center gap-2 pt-1">
                                    {lead.social_links.linkedin && (
                                        <a href={lead.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-muted text-blue-700 transition-colors">
                                            <Linkedin className="h-4 w-4" />
                                        </a>
                                    )}
                                    {lead.social_links.twitter && (
                                        <a href={lead.social_links.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-muted text-sky-500 transition-colors">
                                            <Twitter className="h-4 w-4" />
                                        </a>
                                    )}
                                    {lead.social_links.facebook && (
                                        <a href={lead.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-muted text-blue-600 transition-colors">
                                            <Facebook className="h-4 w-4" />
                                        </a>
                                    )}
                                    {lead.social_links.instagram && (
                                        <a href={lead.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-muted text-pink-600 transition-colors">
                                            <Instagram className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            )}
                            {!lead.phone_number && !lead.email && !lead.website_url && !lead.address && (
                                <p className="text-sm text-muted-foreground italic p-2">No contact information available</p>
                            )}
                        </div>
                    </div>

                    {/* Business Details */}
                    {(lead.opening_hours || (lead.service_options && lead.service_options.length > 0) || lead.description || lead.plus_code) && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
                            <div className="space-y-2">
                                {lead.opening_hours && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <span>{lead.opening_hours}</span>
                                    </div>
                                )}
                                {lead.service_options && lead.service_options.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {lead.service_options.map((opt, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                                        ))}
                                    </div>
                                )}
                                {lead.description && <p className="text-sm text-muted-foreground">{lead.description}</p>}
                                {lead.plus_code && <p className="text-xs text-muted-foreground font-mono">📍 {lead.plus_code}</p>}
                            </div>
                        </div>
                    )}

                    {/* AI Analysis */}
                    {lead.ai_analysis && (
                        <Card className="border-purple-200 bg-purple-50/50">
                            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" />Data Importer Fixes</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm">{lead.ai_analysis.pitch}</p>
                                {lead.ai_analysis.pain_points.length > 0 && <div className="flex flex-wrap gap-1">{lead.ai_analysis.pain_points.map((p, i) => <Badge key={i} variant="outline" className="text-xs">{p}</Badge>)}</div>}
                            </CardContent>
                        </Card>
                    )}

                    {/* Web Audit */}
                    {lead.website_url && (
                        <Card className="border-indigo-200 bg-indigo-50/10 dark:bg-indigo-950/20 dark:border-indigo-900/50">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <LayoutTemplate className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    Phase 2.6: Web Auditor
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {(!lead.website_audit || (!lead.website_audit.ai_pitch && !generatingPitch)) && (
                                        <Button variant="outline" size="sm" onClick={() => handleAudit(true)} disabled={generatingPitch || auditing} className="h-7 text-xs px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                                            {generatingPitch ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                                            {lead.website_audit ? "Generate Pitch (AI)" : "Full Audit (AI)"}
                                        </Button>
                                    )}
                                    {!lead.website_audit && (
                                        <Button variant="outline" size="sm" onClick={() => handleAudit(false)} disabled={auditing || generatingPitch} className="h-7 text-xs px-2">
                                            {auditing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Globe className="h-3 w-3 mr-1.5 text-indigo-500" />}
                                            Quick Scan
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            {lead.website_audit && (
                                <CardContent className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {lead.website_audit.tech_stack.length > 0 ? (
                                            lead.website_audit.tech_stack.map(tech => (
                                                <Badge key={tech} variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200">{tech}</Badge>
                                            ))
                                        ) : (
                                            <Badge variant="outline" className="text-xs text-muted-foreground">Unknown Stack</Badge>
                                        )}
                                        {lead.website_audit.has_ssl ? (
                                            <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50/50 dark:border-green-900/50 dark:text-green-400 dark:bg-green-900/20">SSL Secure</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50/50 dark:border-red-900/50 dark:text-red-400 dark:bg-red-900/20">No SSL</Badge>
                                        )}
                                        {lead.website_audit.domain_creation_date && (
                                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50/50 dark:border-amber-900/50 dark:text-amber-400 dark:bg-amber-900/20">
                                                <Clock className="h-3 w-3 mr-1 inline" /> Built {lead.website_audit.domain_creation_date.substring(0, 4)}
                                            </Badge>
                                        )}
                                    </div>

                                    {lead.website_audit.ai_flaws.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detected Flaws</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                {lead.website_audit.ai_flaws.map((flaw, i) => (
                                                    <li key={i} className="text-xs text-rose-600 dark:text-rose-400">{flaw}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {lead.website_audit.ai_pitch && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cold Email Generator</p>
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 -mr-2" onClick={() => copyToClipboard(lead.website_audit!.ai_pitch!, "pitch")}>
                                                    {copied === "pitch" ? <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                                                    Copy
                                                </Button>
                                            </div>
                                            <div className="p-3 bg-background rounded-md border text-xs italic text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                                "{lead.website_audit.ai_pitch}"
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Audited {formatDate(lead.website_audit.audited_at)}</span>
                                        <div className="flex gap-2">
                                            <Button variant="link" size="sm" onClick={() => handleAudit(false)} disabled={auditing} className="h-auto p-0 text-[10px]">
                                                {auditing ? "Scanning..." : "Re-scan site"}
                                            </Button>
                                            {lead.website_audit.ai_pitch && (
                                                <Button variant="link" size="sm" onClick={() => handleAudit(true)} disabled={generatingPitch} className="h-auto p-0 text-[10px] text-indigo-500">
                                                    {generatingPitch ? "Generating..." : "Regenerate AI Pitch"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    )}

                    {/* Status, Notes, Tags */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Management</h3>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium w-16">Status</label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${opt.color}`} />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Notes</label>
                            <textarea className="mt-1 w-full rounded-md border bg-background p-2.5 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this lead..." />
                        </div>
                        <div>
                            <label className="text-sm font-medium flex items-center gap-1"><Tag className="h-3 w-3" />Tags</label>
                            <Input className="mt-1" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tag1, tag2, tag3..." />
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save Changes
                        </Button>
                    </div>

                    {/* Contact History */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />Contact History ({lead.contact_count} contacts)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Input value={contactNote} onChange={(e) => setContactNote(e.target.value)}
                                    placeholder="Log a contact..." className="flex-1"
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleContact(); }} />
                                <Button size="sm" onClick={handleContact} disabled={contacting || !contactNote.trim()}>
                                    {contacting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                </Button>
                            </div>
                            {contactHistory.length > 0 && (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {contactHistory.map((log) => (
                                        <div key={log.id} className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg text-xs">
                                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm">{log.notes || "Contact logged"}</p>
                                                <p className="text-muted-foreground mt-0.5">{formatDate(log.contacted_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground space-y-1 pb-2">
                        {lead.search_query && <p>Search: {lead.search_query}</p>}
                        <p>Created: {formatDate(lead.created_at)}</p>
                        {lead.updated_at && <p>Updated: {formatDate(lead.updated_at)}</p>}
                        {lead.google_place_id && <p className="font-mono truncate">Place ID: {lead.google_place_id}</p>}
                    </div>
                </div>
            </div>
        </>
    );
}
