"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-[#f3f4f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0c1117] border border-white/[0.08] rounded-2xl p-8 text-center shadow-2xl">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#58a6ff]/20">
          <Terminal className="h-6 w-6 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Get Started with GeoLead</h1>
        <p className="text-sm text-[#8b949e] mb-8 leading-relaxed">
          GeoLead is 100% open-source software. You can clone the base code directly from GitHub, or contact us to set it up for your organization.
        </p>

        <div className="space-y-3">
          <Link href="/#pricing" className="w-full block">
            <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white hover:opacity-95 font-bold text-xs uppercase tracking-wide">
              View Pricing & Setup
            </Button>
          </Link>
          <a href="https://github.com/divyrwal/GeoleadScraper" target="_blank" rel="noreferrer" className="w-full block">
            <Button variant="outline" className="w-full h-11 rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05] text-xs font-semibold">
              Get Free Code on GitHub
            </Button>
          </a>
          <Link href="/" className="w-full block pt-2">
            <span className="text-xs text-[#8b949e] hover:text-white flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Return to Website
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
