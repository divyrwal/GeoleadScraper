"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, MapPin, Brain, BarChart3, Sparkles, Globe, Filter } from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf3] flex flex-col antialiased">

      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0e14]/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-[#0a0e14] font-extrabold text-sm tracking-tight">GL</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">GeoLead</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="h-9 px-5 rounded-lg bg-white text-[#0a0e14] font-medium text-sm hover:bg-white/90 transition-colors">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="h-9 px-4 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] font-medium">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-9 px-5 rounded-lg bg-white text-[#0a0e14] font-medium text-sm hover:bg-white/90 transition-colors">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="flex flex-col items-center pt-28 pb-24 px-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[#8b949e] text-xs font-medium tracking-wide uppercase mb-10">
          <Sparkles className="h-3.5 w-3.5 text-[#58a6ff]" />
          Now with AI enrichment
        </div>

        <h1 className="text-center text-5xl sm:text-6xl md:text-[4.5rem] font-extrabold tracking-[-0.035em] leading-[1.08] max-w-3xl">
          Find local leads.
          <br />
          <span className="text-[#8b949e]">Close more deals.</span>
        </h1>

        <p className="mt-7 text-center text-lg text-[#8b949e] max-w-xl leading-relaxed font-normal">
          Scrape businesses from maps, enrich with AI, and manage your pipeline — all from one dashboard.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Link href={user ? "/dashboard" : "/signup"}>
            <Button className="h-12 px-7 rounded-lg bg-white text-[#0a0e14] font-semibold text-base hover:bg-white/90 transition-colors group">
              {user ? "Go to Dashboard" : "Start for free"}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-[#484f58]">No credit card required</p>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06]" />

      {/* ── How it works ────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-medium tracking-widest uppercase text-[#58a6ff] mb-4">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Three steps to your first lead list</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Step 1 */}
          <div className="p-10 border-b md:border-b-0 md:border-r border-white/[0.06] group">
            <div className="text-xs font-mono text-[#484f58] mb-6">01</div>
            <div className="h-10 w-10 rounded-lg border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-[#58a6ff]/30 transition-colors">
              <Globe className="h-5 w-5 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pick a region</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Draw on the map or search a location. Target any city, neighborhood, or zip code worldwide.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-10 border-b md:border-b-0 md:border-r border-white/[0.06] group">
            <div className="text-xs font-mono text-[#484f58] mb-6">02</div>
            <div className="h-10 w-10 rounded-lg border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-[#58a6ff]/30 transition-colors">
              <Filter className="h-5 w-5 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Scrape & enrich</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              The engine extracts businesses and AI enriches each lead with emails, socials, and a quality score.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-10 group">
            <div className="text-xs font-mono text-[#484f58] mb-6">03</div>
            <div className="h-10 w-10 rounded-lg border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-[#58a6ff]/30 transition-colors">
              <BarChart3 className="h-5 w-5 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Close deals</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Shortlist, tag, and move leads through your pipeline. Export to CSV or connect your CRM.
            </p>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06]" />

      {/* ── Features Grid ──────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-medium tracking-widest uppercase text-[#58a6ff] mb-4">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need, nothing you don&apos;t</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
          {[
            {
              icon: MapPin,
              title: "Map-based targeting",
              desc: "Visual region selection with real-time business density indicators.",
            },
            {
              icon: Brain,
              title: "AI lead scoring",
              desc: "Automatically rank leads by relevance, quality, and conversion potential.",
            },
            {
              icon: Globe,
              title: "Multi-region scraping",
              desc: "Run parallel scrapes across multiple locations in a single session.",
            },
            {
              icon: Filter,
              title: "Smart filters",
              desc: "Filter by category, rating, hours, reviews, and dozens of custom fields.",
            },
            {
              icon: BarChart3,
              title: "Analytics dashboard",
              desc: "Track scraping volume, enrichment rates, and pipeline conversion at a glance.",
            },
            {
              icon: Sparkles,
              title: "Auto deduplication",
              desc: "Intelligent matching prevents duplicate entries across all your scrapes.",
            },
          ].map((feature) => (
            <div key={feature.title} className="p-8 bg-[#0a0e14] hover:bg-white/[0.02] transition-colors">
              <feature.icon className="h-5 w-5 text-[#58a6ff] mb-4" />
              <h3 className="text-sm font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-sm text-[#8b949e] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="w-full border-t border-white/[0.06]" />

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="py-28 px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Ready to start scraping?</h2>
        <p className="text-[#8b949e] text-base mb-8 max-w-md mx-auto">
          Create a free account and run your first scrape in under two minutes.
        </p>
        <Link href={user ? "/dashboard" : "/signup"}>
          <Button className="h-12 px-8 rounded-lg bg-white text-[#0a0e14] font-semibold text-base hover:bg-white/90 transition-colors">
            {user ? "Open Dashboard" : "Get started free"}
          </Button>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white/60">GL</span>
            </div>
            <span className="text-sm text-[#484f58]">&copy; {new Date().getFullYear()} GeoLead</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-[#484f58]">
            <Link href="#" className="hover:text-[#8b949e] transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-[#8b949e] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
