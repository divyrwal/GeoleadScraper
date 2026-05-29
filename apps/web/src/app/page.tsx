"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
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
  AlertCircle
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"extension" | "dashboard" | "enrich">("extension");
  
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
              <span className="text-[10px] font-mono text-[#8b949e] tracking-widest uppercase -mt-1">v7.0 AI</span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8b949e]">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="h-9 px-5 rounded-lg bg-gradient-to-r from-[#58a6ff] to-[#79c0ff] text-[#030712] font-semibold text-xs tracking-wide uppercase hover:opacity-90 transition-opacity shadow-lg shadow-[#58a6ff]/10">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="h-9 px-4 rounded-lg text-sm text-[#8b949e] hover:text-white font-medium hover:bg-white/[0.03]">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-9 px-5 rounded-lg bg-white text-[#030712] font-semibold text-xs tracking-wide uppercase hover:bg-white/95 transition-all shadow-md">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
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
            Bypass Google Maps limits with advanced geographical grid-scanning. Extract local businesses, enrich with AI email lookups, and score conversion potential—all in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link href={user ? "/dashboard" : "/signup"}>
              <Button className="h-12 px-7 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white font-bold text-sm tracking-wide uppercase hover:opacity-95 transition-opacity group w-full shadow-lg shadow-[#58a6ff]/10">
                {user ? "Open Dashboard" : "Start Scraping Free"}
                <ArrowRight className="ml-2 h-4.5 w-4.5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="h-12 px-7 rounded-xl border-white/[0.08] bg-white/[0.02] text-sm text-[#c9d1d9] hover:bg-white/[0.06] hover:text-white transition-all w-full flex items-center justify-center gap-2">
                <Play className="h-4 w-4 text-[#58a6ff] fill-[#58a6ff]" />
                See How It Works
              </Button>
            </a>
          </div>

          <div className="mt-6 flex items-center gap-6 text-xs text-[#8b949e] font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#3fb950]" />
              No credit card required
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#3fb950]" />
              Free 50 leads on signup
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
                GeoLead Extension v7.0
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
                  Active Scraper
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
                        <span className="text-[10px] text-[#8b949e] font-mono mt-0.5">
                          {lead.phone || "No phone"} • {lead.website || "No website"}
                        </span>
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
            Bypass local database limitations and scrape directly from active geographic targets.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
          {/* Step 1 */}
          <div className="p-10 bg-[#0c1117] group hover:bg-[#161b22]/50 transition-colors duration-300">
            <div className="text-xs font-mono text-[#58a6ff] font-bold mb-6 tracking-widest uppercase">STAGE 01</div>
            <div className="h-11 w-11 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
              <Globe className="h-5.5 w-5.5 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Define Scan Grid</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Target a city, district, or ZIP code. Our engine splits the area into a precise, overlapping grid to bypass search-feed limits and catch every listing.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-10 bg-[#0c1117] group hover:bg-[#161b22]/50 transition-colors duration-300">
            <div className="text-xs font-mono text-[#58a6ff] font-bold mb-6 tracking-widest uppercase">STAGE 02</div>
            <div className="h-11 w-11 rounded-xl bg-[#a371f7]/10 border border-[#a371f7]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-5.5 w-5.5 text-[#a371f7]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Dynamic Scraping & Deduplication</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Watch cards load dynamically in real-time. The scraper bypasses DOM virtualization, maps correct data fields, and automatically blocks duplicate entries.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-10 bg-[#0c1117] group hover:bg-[#161b22]/50 transition-colors duration-300">
            <div className="text-xs font-mono text-[#58a6ff] font-bold mb-6 tracking-widest uppercase">STAGE 03</div>
            <div className="h-11 w-11 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
              <BarChart3 className="h-5.5 w-5.5 text-[#06b6d4]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">AI Scoring & CRM Sync</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Enrich profiles with websites, socials, and contact detail lookups. Leads are scored by local AI models and synced directly to your MongoDB dashboard.
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
                  <span className="text-sm font-bold text-white">Advanced Grid-Scraping Engine</span>
                </div>
                <p className="text-xs text-[#8b949e] mt-2 leading-relaxed">
                  Bypass standard Google Maps 120-listing cutoff. Slice geographical borders into grids to discover 100% of local shops.
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
                  <span className="text-sm font-bold text-white">Central CRM Pipeline Dashboard</span>
                </div>
                <p className="text-xs text-[#8b949e] mt-2 leading-relaxed">
                  Consolidate leads instantly from extension sweeps. Tag, filter, shortlist, and export to clean CSV files in one click.
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
                  <span className="text-sm font-bold text-white">AI Enrichment & Local Lead Scoring</span>
                </div>
                <p className="text-xs text-[#8b949e] mt-2 leading-relaxed">
                  Run websites through an AI validation pipeline to extract emails, social profiles, and rank leads using a custom quality score.
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
                    GeoLead Extension Panel
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
                  <span className="font-bold text-[#3fb950] block mt-1">✓ Virtual Scroll Bypass Engaged</span>
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
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
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

      {/* ── Pricing Section ─────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-[#58a6ff] mb-4 font-mono">PRICING</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Simple pricing, massive results
          </h2>
          <p className="text-sm text-[#8b949e] max-w-md mx-auto mt-3">
            Start for free, upgrade only when you are ready to scale out your cold sales pipeline.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Plan 1: Basic */}
          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl flex flex-col relative overflow-hidden group hover:border-[#58a6ff]/20 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-1">Basic Plan</h3>
            <p className="text-xs text-[#8b949e] mb-6">Best for targeted lists & quick outreach</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-extrabold text-white">$10</span>
              <span className="text-xs text-[#8b949e]">/ month</span>
            </div>

            <ul className="space-y-4 text-sm text-[#8b949e] mb-8 flex-grow">
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                <span className="text-white font-semibold">500 Leads</span> of your choice
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Adaptive Grid Scanning (3x3 grid)
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Basic CSV Exporting
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Real-time Place ID Deduplication
              </li>
            </ul>

            <Link href={user ? "/dashboard" : "/signup"}>
              <Button className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.1] hover:text-white transition-all font-semibold">
                {user ? "Open Dashboard" : "Choose Basic"}
              </Button>
            </Link>
          </div>

          {/* Plan 2: Professional (AI-Based) */}
          <div className="p-8 bg-[#0c1117] border border-[#58a6ff]/40 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl shadow-[#58a6ff]/5">
            <div className="absolute top-0 right-0 bg-[#58a6ff] text-[#030712] font-mono font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-lg">
              Optimized Quality
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">Growth Plan</h3>
            <p className="text-xs text-[#8b949e] mb-6">Best for sales growth & dynamic campaigns</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-extrabold text-white">$100</span>
              <span className="text-xs text-[#8b949e]">/ month</span>
            </div>

            <ul className="space-y-4 text-sm text-[#8b949e] mb-8 flex-grow">
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                <span className="text-white font-bold">5,000 Leads</span> / month
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                <span className="text-[#58a6ff] font-bold">AI-Based Results</span> & validation
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Optimized Lead Quality Scoring
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Full Website Email & Social Enrichment
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Deep Scan Grids (up to 5x5 grid)
              </li>
            </ul>

            <Link href={user ? "/dashboard" : "/signup"}>
              <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white hover:opacity-95 transition-opacity font-bold uppercase tracking-wide text-xs">
                {user ? "Open Dashboard" : "Choose Growth"}
              </Button>
            </Link>
          </div>

          {/* Plan 3: Custom Enterprise */}
          <div className="p-8 bg-[#0c1117] border border-white/[0.06] rounded-2xl flex flex-col relative overflow-hidden group hover:border-[#a371f7]/20 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-1">Enterprise Leads</h3>
            <p className="text-xs text-[#8b949e] mb-6">Best for custom parameters at scale</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-extrabold text-white">Custom</span>
              <span className="text-xs text-[#8b949e]">pricing</span>
            </div>

            <ul className="space-y-4 text-sm text-[#8b949e] mb-8 flex-grow">
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                <span className="text-white font-semibold">Custom Leads & Parameters</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Dedicated Scraping Infrastructure
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                Webhook Integration & CRM Sync
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-[#3fb950] shrink-0" />
                24/7 SLA Priority Support
              </li>
            </ul>

            <Link href="mailto:enterprise@geolead.com?subject=Custom Enterprise Lead Scraping Quote">
              <Button className="w-full h-11 rounded-xl bg-[#161b22] border border-white/[0.08] text-white hover:bg-white/[0.05] transition-all font-semibold">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06] relative z-10" />

      {/* ── Interactive CTA ─────────────────────────── */}
      <section className="relative z-10 py-32 px-6 text-center">
        <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[350px] h-[350px] bg-[#58a6ff]/5 rounded-full blur-[60px] pointer-events-none" />

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
          Ready to supercharge your local outreach?
        </h2>
        <p className="text-[#8b949e] text-base mb-10 max-w-md mx-auto leading-relaxed">
          Create a free account, load your Chrome extension, and run your first geographical search in less than two minutes.
        </p>
        
        <Link href={user ? "/dashboard" : "/signup"}>
          <Button className="h-13 px-9 rounded-xl bg-white text-[#030712] font-extrabold text-sm tracking-wide uppercase hover:bg-white/95 transition-all shadow-lg hover:shadow-white/5 group">
            Get started for free
            <ArrowRight className="ml-2 h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
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

          <div className="flex items-center gap-6 text-xs text-[#8b949e]">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors font-mono">v7.0 Stable</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
