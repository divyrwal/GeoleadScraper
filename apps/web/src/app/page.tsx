"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  MapPin, 
  Brain, 
  BarChart3, 
  Sparkles, 
  Globe, 
  Filter, 
  Check, 
  Play, 
  Zap, 
  Layers, 
  Search, 
  CheckCircle,
  Database,
  CheckCircle2,
  AlertCircle,
  Code2,
  Building2,
  ShieldCheck,
  Mail,
  Copy,
  ExternalLink,
  Terminal
} from "lucide-react";

// Mock database of businesses to cycle in our live simulation
const MOCK_SCRAPES = [
  { name: "Snoopi Pet Shop", category: "Pet Store", phone: "+91 98390 12345", website: "snoopipets.com", score: 94, status: "Saved", emails: 2 },
  { name: "Arora Pets & Clinic", category: "Veterinarian", phone: "+91 94150 54321", website: "arorapets.in", score: 88, status: "Saved", emails: 1 },
  { name: "Pets Planet Lucknow", category: "Pet Groomer", phone: "+91 98892 99887", website: "petsplanet.co.in", score: 92, status: "Saved", emails: 3 },
  { name: "Nitin's Dog Grooming", category: "Pet Groomer", phone: "+91 94520 88224", website: "nitinsgrooming.in", score: 85, status: "Duplicate", emails: 0 },
  { name: "Kanha Pet Shop & Care", category: "Pet Store", phone: "+91 93351 12009", website: "kanhapetcare.com", score: 87, status: "Saved", emails: 2 },
  { name: "Pets Adda Gomtinagar", category: "Pet Store", phone: "+91 99355 44882", website: null, score: 76, status: "Saved", emails: 0 },
  { name: "Lucknow Kennel Club", category: "Dog Breeder", phone: "+91 98390 77112", website: "lucknowkennels.org", score: 91, status: "Saved", emails: 4 },
  { name: "Doggy Daycare Center", category: "Pet Boarding", phone: "+91 91200 44332", website: "doggydaycare.com", score: 89, status: "Saved", emails: 1 }
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"extension" | "dashboard" | "enrich">("extension");
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    navigator.clipboard.writeText("geolead@arcadealliancenetwork.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };
  
  // Real-time animation states for our hero simulation
  const [liveLeads, setLiveLeads] = useState<any[]>([]);
  const [currentLeadCount, setCurrentLeadCount] = useState(48);
  const [savedCount, setSavedCount] = useState(36);
  const [dupesCount, setDupesCount] = useState(12);
  const [activeZone, setActiveZone] = useState(1);
  const [radarPulse, setRadarPulse] = useState(true);

  // Cycle the live simulation every 3 seconds
  useEffect(() => {
    // Initial load
    setLiveLeads(MOCK_SCRAPES.slice(0, 3));
    let mockIndex = 3;

    const interval = setInterval(() => {
      // 1. Advance the active grid zone (1 to 9)
      setActiveZone(prev => (prev % 9) + 1);
      setRadarPulse(true);
      setTimeout(() => setRadarPulse(false), 800);

      // 2. Add next mock business to the top of the feed
      const nextBusiness = MOCK_SCRAPES[mockIndex];
      setLiveLeads(prev => {
        const updated = [nextBusiness, ...prev];
        return updated.slice(0, 3); // Only display top 3
      });

      // 3. Update stats counters
      if (nextBusiness.status === "Saved") {
        setSavedCount(s => s + 1);
        setCurrentLeadCount(c => c + 1);
      } else {
        setDupesCount(d => d + 1);
        setCurrentLeadCount(c => c + 1);
      }

      mockIndex = (mockIndex + 1) % MOCK_SCRAPES.length;
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-[#f3f4f6] flex flex-col antialiased selection:bg-[#58a6ff]/30 selection:text-white relative overflow-hidden font-sans">
      
      {/* ── Background Glow Mesh (Glassmorphism Depth) ── */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-radial-gradient from-[#58a6ff]/15 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[60%] h-[60%] rounded-full bg-radial-gradient from-[#a371f7]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-radial-gradient from-[#06b6d4]/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Grid Overlay for high-tech SaaS look */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#030712]/75 backdrop-blur-md transition-all duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center shadow-lg shadow-[#58a6ff]/10 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-extrabold text-base tracking-tight">GL</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-[#58a6ff] transition-colors">GeoLead</span>
              <span className="text-[10px] font-mono text-[#8b949e] tracking-widest uppercase -mt-1">v7.0 Open</span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#8b949e]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing & License</a>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="https://github.com/divyrwal/GeoleadScraper" 
              target="_blank" 
              rel="noreferrer"
            >
              <Button variant="ghost" className="h-9 px-3.5 rounded-lg text-xs font-mono text-[#8b949e] hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-[#58a6ff]" />
                GitHub
              </Button>
            </a>
            <a href="#pricing">
              <Button className="h-9 px-4 rounded-lg bg-white text-[#030712] font-semibold text-xs tracking-wide uppercase hover:bg-white/95 transition-all shadow-md">
                Get Code / Setup
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-16 grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Headline & Value Prop */}
        <div className="lg:col-span-6 flex flex-col text-left">
          
          {/* AI Banner Badge */}
          <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#8b949e] tracking-wide mb-8 hover:bg-white/[0.06] transition-colors">
            <Sparkles className="h-3.5 w-3.5 text-[#58a6ff] animate-pulse" />
            <span className="text-white font-bold">Deep Scan 7.0</span> • Bypass Google Maps 120-limits
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-[1.05] text-white">
            Find local leads.
            <br />
            <span className="bg-gradient-to-r from-[#58a6ff] via-[#79c0ff] to-[#a371f7] bg-clip-text text-transparent drop-shadow-sm">
              Automate your growth.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#8b949e] max-w-xl leading-relaxed font-normal">
            A self-hosted, map-based local lead generation & enrichment engine. Run it directly on your machine with our free open-source base code, get a full organization setup for $300, or purchase the complete code license for $999.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <a 
              href="https://github.com/divyrwal/GeoleadScraper" 
              target="_blank" 
              rel="noreferrer"
            >
              <Button className="h-12 px-7 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white font-bold text-sm tracking-wide uppercase hover:opacity-95 transition-opacity group w-full shadow-lg shadow-[#58a6ff]/10 flex items-center justify-center gap-2">
                <Terminal className="h-4.5 w-4.5" />
                Get Base Code (Free)
                <ExternalLink className="h-3.5 w-3.5 opacity-60 ml-0.5" />
              </Button>
            </a>
            <a href="#pricing">
              <Button variant="outline" className="h-12 px-7 rounded-xl border-white/[0.08] bg-white/[0.02] text-sm text-[#c9d1d9] hover:bg-white/[0.06] hover:text-white transition-all w-full flex items-center justify-center gap-2">
                <Play className="h-4 w-4 text-[#58a6ff] fill-[#58a6ff]" />
                View Plans & Setup
              </Button>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#8b949e] font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#3fb950]" />
              Zero API required
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#3fb950]" />
              Free base code (MIT License)
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#3fb950]" />
              $300 Turnkey Org Setup
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#3fb950]" />
              $999 Complete License
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Scraper Simulation Mockup */}
        <div className="lg:col-span-6 w-full flex justify-center relative">
          
          {/* Glowing Aura Behind Mockup */}
          <div className="absolute inset-0 bg-[#58a6ff]/5 rounded-3xl blur-[40px] pointer-events-none" />

          {/* Interactive Extension Window Mockup */}
          <div className="w-full max-w-[460px] bg-[#0c1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden font-sans select-none flex flex-col relative z-10 transition-transform duration-500 hover:scale-[1.01]">
            
            {/* Mock Header (Browser Sidepanel look) */}
            <div className="h-10 bg-[#161b22] border-b border-white/[0.06] px-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#f85149]/80 block" />
                <span className="w-3 h-3 rounded-full bg-[#d29922]/80 block" />
                <span className="w-3 h-3 rounded-full bg-[#3fb950]/80 block" />
              </div>
              <div className="bg-[#0d1117]/80 rounded-md border border-white/[0.05] text-[10px] text-[#8b949e] px-4 py-0.5 font-mono tracking-wide w-[200px] text-center select-none truncate">
                GeoLead Cloud Scraper v7.0
              </div>
              <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            </div>

            {/* Simulated Live Scan Details */}
            <div className="p-4 bg-[#12171e] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-[#8b949e] tracking-wider">Active Search</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Search className="h-3 w-3 text-[#58a6ff]" />
                  &quot;pet shop&quot; in &quot;Lucknow&quot;
                </span>
              </div>
              <div className="bg-[#21262d] rounded-lg px-2.5 py-1 text-right">
                <span className="text-[9px] uppercase font-mono text-[#8b949e] block">Grid Size</span>
                <span className="text-[11px] font-bold text-[#58a6ff] block -mt-0.5">3 × 3 Grid Scan</span>
              </div>
            </div>

            {/* Interactive Grid Map & Active Radar Sweep */}
            <div className="p-4 bg-[#0d1117]/65 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#58a6ff]" />
                  Geographical Scan Grid
                </span>
                <span className="text-[10px] font-mono font-bold text-[#58a6ff] px-2 py-0.5 bg-[#58a6ff]/10 rounded border border-[#58a6ff]/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#58a6ff] animate-ping" />
                  Zone {activeZone} / 9 Active
                </span>
              </div>

              {/* 3x3 Scanning Grid Display */}
              <div className="grid grid-cols-3 gap-2 bg-[#161b22] p-2.5 rounded-xl border border-white/[0.06] relative overflow-hidden">
                {[...Array(9)].map((_, i) => {
                  const zoneNum = i + 1;
                  const isScanning = zoneNum === activeZone;
                  const isCompleted = zoneNum < activeZone;
                  
                  return (
                    <div 
                      key={i} 
                      className={`h-10 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all duration-500 relative border ${
                        isScanning
                          ? "bg-[#58a6ff]/10 border-[#58a6ff] text-white shadow-inner shadow-[#58a6ff]/20 scale-[0.98]"
                          : isCompleted
                          ? "bg-[#3fb950]/5 border-[#3fb950]/30 text-[#3fb950]"
                          : "bg-[#0d1117] border-white/[0.04] text-[#484f58]"
                      }`}
                    >
                      {isScanning ? (
                        <>
                          <span className={`absolute inset-0 bg-[#58a6ff]/20 rounded-lg ${radarPulse ? 'animate-ping' : ''}`} />
                          <span className="relative z-10 flex items-center gap-0.5 text-[#58a6ff]">
                            <Zap className="h-3 w-3 fill-[#58a6ff] animate-pulse" />
                            Z{zoneNum}
                          </span>
                        </>
                      ) : isCompleted ? (
                        <span className="flex items-center gap-0.5">
                          <Check className="h-3 w-3" />
                          Z{zoneNum}
                        </span>
                      ) : (
                        <span>Z{zoneNum}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Stats Dashboard Counters */}
            <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#161b22] border border-white/[0.05] rounded-xl p-2">
                <span className="text-[9px] uppercase font-mono text-[#8b949e] block">Total Scraped</span>
                <span className="text-sm font-black text-white block mt-0.5 transition-all duration-300">
                  {currentLeadCount}
                </span>
              </div>
              <div className="bg-[#161b22] border border-[#3fb950]/15 rounded-xl p-2">
                <span className="text-[9px] uppercase font-mono text-[#8b949e] block">Saved to CRM</span>
                <span className="text-sm font-black text-[#3fb950] block mt-0.5 transition-all duration-300">
                  {savedCount}
                </span>
              </div>
              <div className="bg-[#161b22] border border-[#ff7b72]/15 rounded-xl p-2">
                <span className="text-[9px] uppercase font-mono text-[#8b949e] block">Deduplicated</span>
                <span className="text-sm font-black text-[#ff7b72] block mt-0.5 transition-all duration-300">
                  {dupesCount}
                </span>
              </div>
            </div>

            {/* Live Scraper Output Flow (Real-time popped leads list) */}
            <div className="px-4 pb-4 bg-[#0d1117] flex flex-col gap-2 relative">
              <div className="w-full h-px bg-white/[0.06] mb-1" />
              <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono tracking-wider uppercase mb-1">
                <span>Extraction Live Feed</span>
                <span className="text-[#3fb950] flex items-center gap-1 font-bold animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3fb950]" />
                  Active Cloud Node
                </span>
              </div>

              {/* List Wrapper */}
              <div className="flex flex-col gap-2 min-h-[148px]">
                {liveLeads.map((lead, idx) => {
                  const isSaved = lead.status === "Saved";
                  return (
                    <div 
                      key={lead.name}
                      className={`p-2.5 rounded-xl border transition-all duration-500 animate-slide-up flex items-center justify-between ${
                        idx === 0 
                          ? "bg-white/[0.04] border-[#58a6ff]/30 shadow-sm"
                          : "bg-white/[0.01] border-white/[0.04] opacity-75"
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white max-w-[170px] truncate">{lead.name}</span>
                          <span className="text-[8px] bg-[#161b22] border border-white/[0.08] text-[#8b949e] px-1 py-0.5 rounded font-mono">
                            {lead.category}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                          {/* Masked Phone with subtle border */}
                          <span className="text-[9px] text-[#8b949e] font-mono select-none tracking-wide bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.2 rounded">
                            {lead.phone ? `${lead.phone.slice(0, 6)} •••• •••` : "No phone"}
                          </span>
                          <span className="text-white/10 text-[9px]">•</span>
                          {/* Masked Website with subtle border */}
                          <span className="text-[9px] text-[#8b949e] font-mono select-none tracking-wide bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.2 rounded">
                            {lead.website ? `${lead.website.split('.')[0].slice(0, 3)}••••••.com` : "No website"}
                          </span>
                          
                          {/* Premium badge on details */}
                          {(lead.phone || lead.website) && (
                            <span className="text-[8px] font-mono font-bold text-[#a371f7] bg-[#a371f7]/10 px-1 py-0.2 rounded border border-[#a371f7]/20 flex items-center gap-0.5 select-none animate-pulse">
                              🔒 Premium
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Quality Score Indicator */}
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-mono text-[#8b949e]">AI Score</span>
                          <span className={`text-[11px] font-extrabold font-mono mt-0.5 ${
                            lead.score >= 90 ? 'text-[#3fb950]' : 'text-[#d29922]'
                          }`}>
                            {lead.score}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 border ${
                          isSaved 
                            ? 'bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]' 
                            : 'bg-[#ff7b72]/10 border-[#ff7b72]/30 text-[#ff7b72]'
                        }`}>
                          {isSaved ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                          {lead.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Status Panel */}
            <div className="bg-[#161b22] border-t border-white/[0.06] p-3 flex items-center justify-between text-xs text-[#8b949e]">
              <span className="flex items-center gap-1.5 font-mono">
                <Database className="h-3.5 w-3.5 text-[#58a6ff]" />
                Auto-saving to MongoDB
              </span>
              <span className="font-mono text-[10px] text-[#3fb950] font-bold">
                API Live Connection established
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Client / Trust Logos Section ────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12 text-center">
        <p className="text-xs font-semibold tracking-wider text-[#8b949e] uppercase mb-6 font-mono">TRUSTED BY MODERN REPS AND RECRUITERS AT</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-35 hover:opacity-50 transition-opacity duration-300 text-sm font-bold text-white tracking-widest uppercase font-mono">
          <span>Stripe</span>
          <span>Hubspot</span>
          <span>Salesforce</span>
          <span>Brex</span>
          <span>Vercel</span>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── How it works ────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-[#58a6ff] mb-4 font-mono">Workflow</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Three steps to qualified lead lists
          </h2>
          <p className="text-sm text-[#8b949e] max-w-md mx-auto mt-3">
            Bypass feed limitations and extract targeted businesses on demand via our cloud servers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
          {/* Step 1 */}
          <div className="p-10 bg-[#0c1117] group hover:bg-[#161b22]/50 transition-colors duration-300">
            <div className="text-xs font-mono text-[#58a6ff] font-bold mb-6 tracking-widest uppercase">STAGE 01</div>
            <div className="h-11 w-11 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
              <Globe className="h-5.5 w-5.5 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Request Lead Targets</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Submit your target industry and location (e.g., dentist in Boston) via your cloud dashboard. Specify scan grid size, radius, and enrichment criteria.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-10 bg-[#0c1117] group hover:bg-[#161b22]/50 transition-colors duration-300">
            <div className="text-xs font-mono text-[#58a6ff] font-bold mb-6 tracking-widest uppercase">STAGE 02</div>
            <div className="h-11 w-11 rounded-xl bg-[#a371f7]/10 border border-[#a371f7]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-5.5 w-5.5 text-[#a371f7]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Automated Cloud Scraper Sweep</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Our cluster of headless cloud scrapers handles proxy rotation and virtual DOM scroll bypasses to exhaustively extract every listing without local CPU usage.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-10 bg-[#0c1117] group hover:bg-[#161b22]/50 transition-colors duration-300">
            <div className="text-xs font-mono text-[#58a6ff] font-bold mb-6 tracking-widest uppercase">STAGE 03</div>
            <div className="h-11 w-11 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
              <BarChart3 className="h-5.5 w-5.5 text-[#06b6d4]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">AI Validation & Download</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Profiles are enriched with website emails and socials, scored by local AI models for deal warmth, and delivered directly to your web CRM for export.
            </p>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── Product Feature Showcases (Interactive Tabs) ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Side: Descriptions */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <p className="text-xs font-bold tracking-widest uppercase text-[#58a6ff] mb-4 font-mono">Capabilities</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-8 leading-tight">
              A comprehensive system built for scale
            </h2>
            
            {/* Feature Tab buttons */}
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setActiveTab("extension")}
                className={`p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                  activeTab === "extension"
                    ? "bg-white/[0.04] border-[#58a6ff]/40 shadow-md shadow-[#58a6ff]/5"
                    : "border-transparent opacity-60 hover:opacity-100 hover:bg-white/[0.01]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4.5 w-4.5 text-[#58a6ff]" />
                  <span className="text-sm font-bold text-white">On-Demand Cloud Scraper</span>
                </div>
                <p className="text-xs text-[#8b949e] mt-2 leading-relaxed">
                  No code, no extension downloads. Request any local niche and our cloud containers will handle proxy rotation, bypass maps limits, and deliver structured data.
                </p>
              </button>

              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white/[0.04] border-[#a371f7]/40 shadow-md shadow-[#a371f7]/5"
                    : "border-transparent opacity-60 hover:opacity-100 hover:bg-white/[0.01]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="h-4.5 w-4.5 text-[#a371f7]" />
                  <span className="text-sm font-bold text-white">Central CRM & Request Hub</span>
                </div>
                <p className="text-xs text-[#8b949e] mt-2 leading-relaxed">
                  Submit requests and manage campaign queues directly from your central web dashboard. Clean, tag, segment, and export leads in a single click.
                </p>
              </button>

              <button 
                onClick={() => setActiveTab("enrich")}
                className={`p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                  activeTab === "enrich"
                    ? "bg-white/[0.04] border-[#06b6d4]/40 shadow-md shadow-[#06b6d4]/5"
                    : "border-transparent opacity-60 hover:opacity-100 hover:bg-white/[0.01]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Brain className="h-4.5 w-4.5 text-[#06b6d4]" />
                  <span className="text-sm font-bold text-white">AI Contact Enrichment & Scoring</span>
                </div>
                <p className="text-xs text-[#8b949e] mt-2 leading-relaxed">
                  Automatically pull verified emails, Instagram, and LinkedIn handles. Our AI models rank prospects by conversion probability to optimize outreach success.
                </p>
              </button>
            </div>
          </div>

          {/* Right Side: Tab Interface Visual Mockups */}
          <div className="lg:col-span-7 bg-[#0c1117] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative min-h-[380px] flex items-center justify-center">
            
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10 block" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10 block" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10 block" />
            </div>

            {/* TAB CONTENT: Extension Mock */}
            {activeTab === "extension" && (
              <div className="w-full max-w-[400px] bg-[#12171e] rounded-xl border border-white/[0.08] p-4 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 bg-[#3fb950] rounded-full animate-ping" />
                    GeoLead Cloud Scraper Node #3
                  </span>
                  <span className="text-[10px] font-mono text-[#8b949e]">Running Zone 3/9</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#0d1117] p-2.5 rounded-lg border border-white/[0.05] flex justify-between items-center text-xs">
                    <span className="text-[#8b949e]">Target query</span>
                    <span className="font-bold text-white">&quot;dentist&quot;</span>
                  </div>
                  <div className="bg-[#0d1117] p-2.5 rounded-lg border border-white/[0.05] flex justify-between items-center text-xs">
                    <span className="text-[#8b949e]">Lead buffer status</span>
                    <span className="font-bold text-[#58a6ff]">89 leads ready</span>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#3fb950]/20 rounded-xl p-3 text-center text-xs">
                  <span className="text-[#8b949e] block">Live Status</span>
                  <span className="font-bold text-[#3fb950] block mt-1">✓ Cloud Proxy Rotation Engaged</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CRM Dashboard Mock */}
            {activeTab === "dashboard" && (
              <div className="w-full bg-[#12171e] rounded-xl border border-white/[0.08] p-4 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#a371f7]" />
                    GeoLead Lead Manager (CRM)
                  </span>
                  <span className="text-[10px] bg-[#a371f7]/10 text-[#a371f7] px-2 py-0.5 rounded border border-[#a371f7]/20 font-mono">
                    239 Leads Total
                  </span>
                </div>

                {/* Simulated Lead list table */}
                <div className="space-y-2.5">
                  {[
                    { name: "Apex Dental Clinic", rating: "4.8", reviews: 129, phone: "Available", status: "Shortlisted" },
                    { name: "Smiles R Us Dental", rating: "4.5", reviews: 88, phone: "Available", status: "Interested" },
                    { name: "Metro City Ortho", rating: "4.2", reviews: 54, phone: "Missing", status: "New" }
                  ].map((row, idx) => (
                    <div key={idx} className="bg-[#0d1117] p-2.5 rounded-lg border border-white/[0.04] flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{row.name}</span>
                        <span className="text-[10px] text-[#8b949e] font-mono mt-0.5">
                          ★ {row.rating} ({row.reviews} reviews) • Phone: {row.phone}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                        row.status === 'Shortlisted' 
                          ? 'bg-[#3fb950]/10 border-[#3fb950]/20 text-[#3fb950]' 
                          : row.status === 'Interested'
                          ? 'bg-[#58a6ff]/10 border-[#58a6ff]/20 text-[#58a6ff]'
                          : 'bg-[#8b949e]/10 border-white/[0.06] text-[#8b949e]'
                      }`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: AI Scoring Mock */}
            {activeTab === "enrich" && (
              <div className="w-full max-w-[400px] bg-[#12171e] rounded-xl border border-white/[0.08] p-4 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Brain className="h-4.5 w-4.5 text-[#06b6d4]" />
                    Local AI Enrichment Engine
                  </span>
                  <span className="text-[10px] text-[#06b6d4] font-bold font-mono">Running pipeline...</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs bg-[#0d1117] p-2.5 rounded-lg border border-white/[0.05]">
                    <span className="text-[#8b949e]">Social Handles Scraped</span>
                    <span className="text-white font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-[#3fb950]" />
                      Facebook, Instagram, LinkedIn
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-[#0d1117] p-2.5 rounded-lg border border-white/[0.05]">
                    <span className="text-[#8b949e]">Email Lookup Success</span>
                    <span className="text-white font-bold text-[#06b6d4]">info@apexdental.com</span>
                  </div>
                </div>

                <div className="bg-[#06b6d4]/10 border border-[#06b6d4]/20 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-[#8b949e]">AI Quality Score</span>
                  <span className="font-black text-[#06b6d4] text-sm">96 / 100 (Highly Qualified)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── Features List Grid ─────────────────────── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-[#58a6ff] mb-4 font-mono">Key Features</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Everything you need to close local deals
          </h2>
          <p className="text-sm text-[#8b949e] max-w-md mx-auto mt-3">
            Smarter extraction built on top of high-performance localized infrastructure.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: MapPin,
              title: "Adaptive scan grids",
              desc: "Bypass Google Maps feed cutoffs by slicing target regions into precise rows and cols automatically.",
            },
            {
              icon: Brain,
              title: "Local AI lead scoring",
              desc: "A built-in AI pipeline evaluates websites and coordinates to rank your leads by deal conversion potential.",
            },
            {
              icon: Globe,
              title: "Geocoding fallback",
              desc: "OpenStreetMap Nominatim API fallbacks guarantee that detailed sub-localities (like neighborhoods) resolve smoothly.",
            },
            {
              icon: Filter,
              title: "Highly customized filters",
              desc: "Filter down prospects by category, reviews, rating tiers, price levels, operating hours, and missing details.",
            },
            {
              icon: BarChart3,
              title: "Analytics dashboard",
              desc: "Track total scraped count, active scrape campaigns, and lead score averages across all your operations.",
            },
            {
              icon: Sparkles,
              title: "Real-time deduplication",
              desc: "Continuous place ID and phone number matching safeguards against duplicates, keeping your CRM records tidy.",
            },
          ].map((feature) => (
            <div key={feature.title} className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl hover:border-[#58a6ff]/30 hover:bg-[#161b22]/30 transition-all duration-300 group">
              <feature.icon className="h-6 w-6 text-[#58a6ff] mb-5 group-hover:scale-105 transition-transform duration-300" />
              <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-[#8b949e] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── How It Works Section ────────────────────── */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-[#58a6ff] mb-4 font-mono">WORKFLOW</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            How GeoLead works in 3 simple steps
          </h2>
          <p className="text-sm text-[#8b949e] max-w-lg mx-auto mt-3">
            Run the extraction locally in your browser. Zero third-party API keys required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl relative overflow-hidden group hover:border-[#58a6ff]/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/20 text-[#58a6ff] font-mono font-bold flex items-center justify-center mb-6 text-sm">
              01
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Load Unpacked Extension</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Load the Chrome Extension from <code className="text-[#58a6ff] text-xs bg-white/[0.04] px-1.5 py-0.5 rounded">apps/extension</code> directly in Chrome Developer Mode. No web store approval or billing setup needed.
            </p>
          </div>

          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl relative overflow-hidden group hover:border-[#58a6ff]/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-[#79c0ff]/10 border border-[#79c0ff]/20 text-[#79c0ff] font-mono font-bold flex items-center justify-center mb-6 text-sm">
              02
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Target & Deep Scan</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Enter target keywords (e.g. "Dentists in Austin") into the sidepanel. The engine navigates Google Maps, executes grid scans, and extracts rich contact profiles.
            </p>
          </div>

          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl relative overflow-hidden group hover:border-[#58a6ff]/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-[#a371f7]/10 border border-[#a371f7]/20 text-[#a371f7] font-mono font-bold flex items-center justify-center mb-6 text-sm">
              03
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Local AI Scoring & Export</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Leads are automatically evaluated and scored from 0-100. Export clean, deduplicated prospect lists with phone numbers and emails straight to CSV.
            </p>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── Architecture Section ────────────────────── */}
      <section id="architecture" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-[#58a6ff] mb-4 font-mono">ARCHITECTURE</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Modular, decoupled codebase
          </h2>
          <p className="text-sm text-[#8b949e] max-w-lg mx-auto mt-3">
            Clean TypeScript and JavaScript monorepo designed for full developer freedom and self-hosting.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl hover:border-white/[0.15] transition-all">
            <div className="flex items-center gap-2 mb-4 text-[#58a6ff]">
              <Layers className="h-5 w-5" />
              <span className="font-mono text-xs font-bold">apps/extension</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Chrome Extension</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
              Manifest V3 scraper with sidebar UI, DOM traversal scripts, rate-limit controllers, and Google Maps coordinate nav engines.
            </p>
            <span className="text-[10px] font-mono text-[#3fb950] bg-[#3fb950]/10 border border-[#3fb950]/20 px-2 py-0.5 rounded">
              Runs in-browser
            </span>
          </div>

          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl hover:border-white/[0.15] transition-all">
            <div className="flex items-center gap-2 mb-4 text-[#79c0ff]">
              <Terminal className="h-5 w-5" />
              <span className="font-mono text-xs font-bold">apps/api</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Node.js Engine</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
              Local pipeline for email discovery, Place ID deduplication, Ollama AI pitch generation, and background batch processors.
            </p>
            <span className="text-[10px] font-mono text-[#79c0ff] bg-[#79c0ff]/10 border border-[#79c0ff]/20 px-2 py-0.5 rounded">
              Local / Self-hosted
            </span>
          </div>

          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl hover:border-white/[0.15] transition-all">
            <div className="flex items-center gap-2 mb-4 text-[#a371f7]">
              <Globe className="h-5 w-5" />
              <span className="font-mono text-xs font-bold">apps/web</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Next.js UI & Web</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
              Modern dark-mode website and client dashboard with interactive simulation, CRM lead tables, map pins, and presentation views.
            </p>
            <span className="text-[10px] font-mono text-[#a371f7] bg-[#a371f7]/10 border border-[#a371f7]/20 px-2 py-0.5 rounded">
              Zero API required
            </span>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── Pricing & Licensing Section ──────────────── */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#58a6ff]/20 bg-[#58a6ff]/10 text-xs font-semibold text-[#58a6ff] tracking-wide mb-4 font-mono">
            PRICING & LICENSING
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Flexible options for every team
          </h2>
          <p className="text-sm sm:text-base text-[#8b949e] max-w-2xl mx-auto mt-4 leading-relaxed">
            Get the free base code to set up on your own, let our team deploy a complete turnkey setup for your organization for $300, or own the complete code license for $999.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {/* Option 1: Free Base Code */}
          <div className="p-8 bg-[#0c1117] border border-white/[0.08] rounded-2xl flex flex-col relative overflow-hidden group hover:border-[#58a6ff]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#58a6ff]">
                <Code2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#8b949e]">
                Self-Hosted
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Base Code</h3>
            <p className="text-xs text-[#8b949e] mb-6 leading-relaxed">
              Directly access the base codebase for free. Best for developers and teams ready to self-host and configure the scraper themselves.
            </p>

            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-white">$0</span>
              <span className="text-xs text-[#8b949e] uppercase font-mono">/ Free Forever</span>
            </div>
            <p className="text-[11px] text-[#e3b341] font-medium mb-8 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Manual setup & config required
            </p>

            <ul className="space-y-3.5 text-sm text-[#8b949e] mb-8 flex-grow">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-white">Direct access to base source code</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Google Maps extraction & coordinate search</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Local execution scripts & web UI</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Self-hosted on your own hardware or cloud</span>
              </li>
              <li className="flex items-start gap-2.5 text-[#8b949e]/70">
                <Check className="h-4 w-4 text-[#8b949e]/50 shrink-0 mt-0.5" />
                <span>Community guides & documentation</span>
              </li>
              <li className="flex items-start gap-2.5 text-[#e3b341]/90 text-xs pt-1">
                <span className="font-mono text-[#e3b341] font-bold">ℹ</span>
                <span>You manage setup, dependencies & environment</span>
              </li>
            </ul>

            <div className="pt-2">
              <a 
                href="https://github.com/divyrwal/GeoleadScraper" 
                target="_blank" 
                rel="noreferrer"
                className="w-full"
              >
                <Button className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1] hover:text-white transition-all font-semibold flex items-center justify-center gap-2">
                  <Terminal className="h-4 w-4 text-[#58a6ff]" />
                  Get Base Code (Free)
                  <ExternalLink className="h-3.5 w-3.5 opacity-60 ml-0.5" />
                </Button>
              </a>
              <p className="text-[11px] text-center text-[#8b949e] mt-2.5">
                Clone repo & run with your own configuration
              </p>
            </div>
          </div>

          {/* Option 2: Full Setup for Your Organization ($300) */}
          <div className="p-8 bg-[#0c1117] border-2 border-[#58a6ff]/60 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl shadow-[#58a6ff]/10 group">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#58a6ff] to-[#79c0ff] text-[#030712] font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-md">
              Most Popular • Done-For-You
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff]">
                <Building2 className="h-5 w-5" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Organization Setup</h3>
            <p className="text-xs text-[#8b949e] mb-6 leading-relaxed">
              Get a full setup deployed directly for your organization. Zero headache — our engineers handle end-to-end installation and configuration.
            </p>

            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-4xl sm:text-5xl font-black text-white">$300</span>
              <span className="text-xs text-[#8b949e] uppercase font-mono">/ One-time fee</span>
            </div>
            <p className="text-[11px] text-[#58a6ff] font-medium mb-8 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Complete white-glove setup for your organization
            </p>

            <ul className="space-y-3.5 text-sm text-[#8b949e] mb-8 flex-grow">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-white font-medium">Full setup customized for your organization</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-white">Cloud server & database provisioning</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Custom domain, SSL certificates & auth setup</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Chrome extension & scraper pipeline integration</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Proxy calibration & anti-detection safeguards</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-[#79c0ff]">Full testing, verification & team handover</span>
              </li>
            </ul>

            <div className="pt-2">
              <a 
                href="mailto:geolead@arcadealliancenetwork.com?subject=Inquiry:%20Full%20Organization%20Setup%20($300)&body=Hello%20GeoLead%20Team,%0A%0AI%20would%20like%20to%20get%20the%20Full%20Setup%20for%20our%20organization%20for%20$300.%20Please%20let%20me%20know%20the%20onboarding%20steps.%0A%0AOrganization%20Name:%0AContact%20Person:%0AEmail%20/%20Phone:%0ANotes%20/%20Requirements:"
                className="w-full"
              >
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white hover:opacity-95 transition-opacity font-bold uppercase tracking-wide text-xs shadow-lg shadow-[#58a6ff]/20 flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" />
                  Get Full Setup ($300)
                </Button>
              </a>
              <p className="text-[11px] text-center text-[#8b949e] mt-2.5">
                To buy, contact: <span className="text-[#58a6ff] font-mono">geolead@arcadealliancenetwork.com</span>
              </p>
            </div>
          </div>

          {/* Option 3: Complete Code License ($999) */}
          <div className="p-8 bg-[#0c1117] border border-[#a371f7]/40 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[#a371f7]/70 transition-all duration-300">
            <div className="absolute top-0 right-0 bg-[#a371f7]/15 border-b border-l border-[#a371f7]/30 text-[#d2a8ff] font-mono font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Complete License
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#a371f7]/10 border border-[#a371f7]/30 flex items-center justify-center text-[#a371f7]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Complete Code License</h3>
            <p className="text-xs text-[#8b949e] mb-6 leading-relaxed">
              Acquire the official commercial license for the complete codebase with unrestricted source code ownership and commercial rights.
            </p>

            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-4xl sm:text-5xl font-black text-white">$999</span>
              <span className="text-xs text-[#8b949e] uppercase font-mono">/ Full License</span>
            </div>
            <p className="text-[11px] text-[#a371f7] font-medium mb-8 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              100% full source ownership & commercial rights
            </p>

            <ul className="space-y-3.5 text-sm text-[#8b949e] mb-8 flex-grow">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-white font-medium">Commercial license of the complete code</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-white">Full source: Web App, API backend & Chrome Extension</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Unrestricted rights: modify, white-label, rebrand</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Deep Scan 7.0 multi-grid engines & bypass algorithms</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span>Built-in local AI enrichment & lead scoring modules</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                <span className="text-[#d2a8ff]">Priority engineering repository transfer & direct support</span>
              </li>
            </ul>

            <div className="pt-2">
              <a 
                href="mailto:geolead@arcadealliancenetwork.com?subject=Inquiry:%20Complete%20Code%20License%20($999)&body=Hello%20GeoLead%20Team,%0A%0AI%20would%20like%20to%20purchase%20the%20Complete%20Code%20License%20for%20$999.%20Please%20send%20over%20the%20commercial%20license%20agreement%20and%20payment%20instructions.%0A%0ACompany%20/%20Licensee%20Name:%0AContact%20Person:%0AEmail%20/%20Phone:%0ABusiness%20Website:"
                className="w-full"
              >
                <Button className="w-full h-11 rounded-xl bg-[#161b22] border border-[#a371f7]/50 text-white hover:bg-[#a371f7]/20 hover:border-[#a371f7] transition-all font-semibold flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#a371f7]" />
                  Buy Complete License ($999)
                </Button>
              </a>
              <p className="text-[11px] text-center text-[#8b949e] mt-2.5">
                To buy, contact: <span className="text-[#a371f7] font-mono">geolead@arcadealliancenetwork.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Contact & Purchasing Information Banner ─── */}
        <div className="mt-12 max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-[#0c1117] via-[#12171e] to-[#0c1117] border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#58a6ff]/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex items-start gap-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#58a6ff]/20 to-[#a371f7]/20 border border-white/[0.1] flex items-center justify-center shrink-0 text-[#58a6ff]">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold text-white">How to purchase or get started</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
                  Fast Response
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8b949e] leading-relaxed max-w-lg">
                To order the <strong className="text-white">$300 Organization Setup</strong> or purchase the <strong className="text-white">$999 Complete Code License</strong>, contact our team directly at:
              </p>
              <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs sm:text-sm bg-black/40 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[#58a6ff]">
                <span>geolead@arcadealliancenetwork.com</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
            <a 
              href="mailto:geolead@arcadealliancenetwork.com?subject=GeoLead%20Purchase%20Inquiry%20($300%20Setup%20or%20$999%20License)&body=Hi%20GeoLead%20Team,%0A%0AI%20am%20interested%20in%20purchasing:%0A[ ] $300 Full Setup for Organization%0A[ ] $999 Complete Code License%0A%0AOrganization%20/%20Buyer%20Name:%0AContact%20Email:%0APhone:"
              className="flex-1 md:flex-none"
            >
              <Button className="w-full h-10 px-5 rounded-lg bg-white text-[#030712] font-semibold text-xs tracking-wide uppercase hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-md">
                <Mail className="h-4 w-4" />
                Email to Buy
              </Button>
            </a>
            <Button 
              variant="outline" 
              onClick={handleCopyEmail}
              className="flex-1 md:flex-none h-10 px-5 rounded-lg border-white/[0.1] bg-white/[0.02] text-xs text-[#c9d1d9] hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-2"
            >
              {copiedEmail ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#3fb950]" />
                  <span className="text-[#3fb950] font-semibold">Email Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Address</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── Interactive CTA ─────────────────────────── */}
      <section className="relative z-10 py-28 px-6 text-center">
        <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[350px] h-[350px] bg-[#58a6ff]/5 rounded-full blur-[60px] pointer-events-none" />

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
          Ready to supercharge your local outreach?
        </h2>
        <p className="text-[#8b949e] text-base mb-8 max-w-xl mx-auto leading-relaxed">
          Get started for free with the base code, let our team set it up for your organization for just $300, or acquire the complete commercial code license for $999.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a href="mailto:geolead@arcadealliancenetwork.com?subject=GeoLead%20Inquiry">
            <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white font-bold text-sm tracking-wide uppercase hover:opacity-95 transition-opacity shadow-lg shadow-[#58a6ff]/20 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact geolead@arcadealliancenetwork.com
            </Button>
          </a>
          <a href="#pricing">
            <Button variant="outline" className="h-12 px-7 rounded-xl border-white/[0.1] bg-white/[0.02] text-sm text-[#c9d1d9] hover:bg-white/[0.06] hover:text-white transition-all">
              Compare Options
            </Button>
          </a>
        </div>
        <p className="text-xs text-[#8b949e] font-mono">
          Questions or custom inquiries? Write directly to <a href="mailto:geolead@arcadealliancenetwork.com" className="text-[#58a6ff] hover:underline">geolead@arcadealliancenetwork.com</a>
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10 bg-[#030712]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center">
              <span className="text-[11px] font-extrabold text-[#58a6ff]">GL</span>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">GeoLead</span>
            <span className="text-[11px] text-[#484f58] font-mono">| &copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#8b949e]">
            <a href="mailto:geolead@arcadealliancenetwork.com" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#58a6ff]" />
              geolead@arcadealliancenetwork.com
            </a>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing & Options</Link>
            <a href="https://github.com/divyrwal/GeoleadScraper" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              GitHub Base Code
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <span className="text-[#484f58] font-mono">v7.0 Stable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
