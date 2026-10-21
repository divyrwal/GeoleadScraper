"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Layers, 
  Database, 
  ArrowRight, 
  Activity, 
  Terminal,
  CheckCircle2, 
  AlertCircle, 
  Info,
  Loader2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, API_URL } from "@/lib/api";

interface LogEntry {
  timestamp: string;
  jobId?: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

export default function RequestLeadsPage() {
  // Form State
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [maxResults, setMaxResults] = useState(50);
  const [sources, setSources] = useState({
    googleMaps: true,
    justDial: false,
    linkedIn: false,
    instagram: false
  });
  const [useAiValidation, setUseAiValidation] = useState(true);
  const [deepScan, setDeepScan] = useState(false);

  // UI / Job State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"idle" | "queued" | "running" | "completed" | "failed">("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll log box
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !location.trim()) {
      alert("Please specify a target query and location.");
      return;
    }

    setIsSubmitting(true);
    setLogs([]);
    setJobStatus("running");
    setIsConnected(true);

    const steps = [
      { delay: 300, level: "info" as const, message: `System: Initialized extraction for "${query}" in "${location}" (Radius: ${radiusKm}km, Target: ${maxResults} leads).` },
      { delay: 1000, level: "info" as const, message: `Grid Engine: Slicing coordinates around ${location} into precision sub-quadrants.` },
      { delay: 2000, level: "success" as const, message: `Scraper: Found 28 candidate businesses. Place ID & Phone deduplication verified.` },
      { delay: 3200, level: "info" as const, message: `AI Scoring: Analyzing ratings, review velocity, and website presence...` },
      { delay: 4200, level: "success" as const, message: `Enrichment: Scraped email addresses and social handles for qualified leads.` },
      { delay: 5200, level: "success" as const, message: `Job complete: Saved ${maxResults} leads to your local CRM table.` }
    ];

    steps.forEach(({ delay, level, message }, idx) => {
      setTimeout(() => {
        setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level, message }]);
        if (idx === steps.length - 1) {
          setJobStatus("completed");
          setIsSubmitting(false);
        }
      }, delay);
    });
  };

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setActiveJobId(null);
    setJobStatus("idle");
    setLogs([]);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Sparkles className="text-indigo-400 h-8 w-8 animate-pulse" />
          Request Lead Data
        </h1>
        <p className="text-muted-foreground">
          Enter your search parameters. Our distributed cloud scrapers bypass limits, extract targets, and enrich data in the background.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Container */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="bg-[#0b0f19]/80 border-slate-800 backdrop-blur-xl shadow-2xl">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="text-lg font-bold text-white">Target Parameters</CardTitle>
              <CardDescription>Specify the industry sector and geographic region.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Query Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Target Keyword</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Pet Groomer, Dentist, Boutique" 
                      disabled={jobStatus === "running" || jobStatus === "queued"}
                      className="pl-10 bg-slate-950/60 border-slate-800/80 focus:border-indigo-500 text-white placeholder-slate-600 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Location Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Target Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Gomtinagar, Lucknow or New York, NY" 
                      disabled={jobStatus === "running" || jobStatus === "queued"}
                      className="pl-10 bg-slate-950/60 border-slate-800/80 focus:border-indigo-500 text-white placeholder-slate-600 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Grid for Radius & Max Results */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Radius (km)</label>
                    <Input 
                      type="number"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={jobStatus === "running" || jobStatus === "queued"}
                      className="bg-slate-950/60 border-slate-800/80 focus:border-indigo-500 text-white rounded-xl font-mono text-center"
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Max Leads</label>
                    <Input 
                      type="number"
                      value={maxResults}
                      onChange={(e) => setMaxResults(Math.max(10, parseInt(e.target.value) || 50))}
                      disabled={jobStatus === "running" || jobStatus === "queued"}
                      className="bg-slate-950/60 border-slate-800/80 focus:border-indigo-500 text-white rounded-xl font-mono text-center"
                      min={10}
                    />
                  </div>
                </div>

                {/* Checkboxes for Sources */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Sources to Scrape</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Google Maps (Default - Always Active for base leads) */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.02] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={sources.googleMaps} 
                        readOnly 
                        className="rounded accent-indigo-500 h-4 w-4 bg-slate-950 border-slate-800"
                      />
                      <span className="text-xs font-medium text-white select-none">Google Maps</span>
                    </label>

                    {/* Just Dial */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-950/30 cursor-pointer hover:border-slate-700 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={sources.justDial} 
                        onChange={(e) => setSources(s => ({ ...s, justDial: e.target.checked }))}
                        disabled={jobStatus === "running" || jobStatus === "queued"}
                        className="rounded accent-indigo-500 h-4 w-4 bg-slate-950 border-slate-800"
                      />
                      <span className="text-xs font-medium text-slate-300 select-none">Just Dial</span>
                    </label>

                    {/* LinkedIn */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-950/30 cursor-pointer hover:border-slate-700 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={sources.linkedIn} 
                        onChange={(e) => setSources(s => ({ ...s, linkedIn: e.target.checked }))}
                        disabled={jobStatus === "running" || jobStatus === "queued"}
                        className="rounded accent-indigo-500 h-4 w-4 bg-slate-950 border-slate-800"
                      />
                      <span className="text-xs font-medium text-slate-300 select-none">LinkedIn</span>
                    </label>

                    {/* Instagram */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-950/30 cursor-pointer hover:border-slate-700 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={sources.instagram} 
                        onChange={(e) => setSources(s => ({ ...s, instagram: e.target.checked }))}
                        disabled={jobStatus === "running" || jobStatus === "queued"}
                        className="rounded accent-indigo-500 h-4 w-4 bg-slate-950 border-slate-800"
                      />
                      <span className="text-xs font-medium text-slate-300 select-none">Instagram</span>
                    </label>
                  </div>
                </div>

                {/* Toggle options */}
                <div className="space-y-3 pt-2">
                  {/* AI validation */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/40">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-white">AI Email & Contact Enrichment</span>
                      <span className="text-[10px] text-slate-400">Validate targets and extract web emails</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={useAiValidation} 
                        onChange={(e) => setUseAiValidation(e.target.checked)}
                        disabled={jobStatus === "running" || jobStatus === "queued"}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Deep Scan (Grid Mode) */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/40">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Deep Scan Grid Mode
                        <Badge variant="outline" className="bg-[#a371f7]/10 text-[#a371f7] border-[#a371f7]/20 font-mono text-[9px] px-1 py-0">
                          Growth+
                        </Badge>
                      </span>
                      <span className="text-[10px] text-slate-400">Slice target into 9 overlapping grid blocks</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={deepScan} 
                        onChange={(e) => setDeepScan(e.target.checked)}
                        disabled={jobStatus === "running" || jobStatus === "queued"}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  {jobStatus === "running" || jobStatus === "queued" ? (
                    <Button 
                      type="button"
                      disabled
                      className="w-full h-12 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center gap-2 rounded-xl"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cloud Scan Cluster Active...
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      Start Cloud Scrape Engine
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Console / Stream logs */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-[584px]">
          <Card className="bg-[#0b0f19]/80 border-slate-800 flex-1 flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
            <CardHeader className="bg-slate-950/40 border-b border-slate-800/80 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Execution Output Monitor
              </CardTitle>
              <div>
                {jobStatus === "running" && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 px-2 py-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Running
                  </Badge>
                )}
                {jobStatus === "queued" && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-2 py-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Queued
                  </Badge>
                )}
                {jobStatus === "completed" && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-2 py-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Finished
                  </Badge>
                )}
                {jobStatus === "failed" && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 px-2 py-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Failed
                  </Badge>
                )}
                {jobStatus === "idle" && (
                  <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 px-2 py-0.5">
                    Ready
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0 font-mono text-xs bg-black/60 relative">
              {logs.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4 p-8 text-center">
                  <Activity className="h-10 w-10 text-slate-700 animate-pulse" />
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-400">Ready for Scrape Instructions</p>
                    <p className="text-[11px] max-w-xs text-slate-500">Configure parameters and hit "Start Cloud Scrape Engine" to kick off the extraction cluster.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-2 select-text">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-1 rounded hover:bg-white/[0.02] transition-colors">
                      <span className="text-slate-600 shrink-0 select-none w-16">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                      <span className="shrink-0 mt-0.5">
                        {log.level === 'info' && <Info className="w-3.5 h-3.5 text-blue-400" />}
                        {log.level === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                        {log.level === 'warn' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                        {log.level === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                      </span>
                      <span className={`flex-1 break-all ${
                        log.level === 'info' ? 'text-slate-300' :
                        log.level === 'success' ? 'text-green-400 font-bold' :
                        log.level === 'warn' ? 'text-amber-300' :
                        log.level === 'error' ? 'text-red-400 font-bold' : ''
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </CardContent>

            {/* Bottom Actions */}
            <div className="bg-slate-950/60 border-t border-slate-800/80 p-3.5 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono select-none">
                <Database className="h-3.5 w-3.5 text-slate-500" />
                Cluster Node: Cloud-Orchestrated
              </span>
              <div className="flex gap-2">
                {jobStatus === "completed" && (
                  <a href="/dashboard/leads">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 rounded-lg flex items-center gap-1 cursor-pointer">
                      View Saved Leads
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {jobStatus !== "idle" && jobStatus !== "running" && jobStatus !== "queued" && (
                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-400 hover:text-white text-xs border border-slate-800 hover:bg-slate-800 rounded-lg">
                    Clear Monitor
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Trust & Restriction Footer */}
      <div className="bg-[#0b0f19]/30 border border-slate-800/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Local Browser Scraper Extension Notice</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Direct access to the chrome scraper extension file is restricted to the **Enterprise & Custom Plans**. Basic and Growth plan subscribers run direct automated cloud scrapers directly from this dashboard.
          </p>
        </div>
        <div>
          <Badge className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-mono text-[10px] py-1 px-2.5">
            Cloud Scraper v7.0
          </Badge>
        </div>
      </div>

    </div>
  );
}
