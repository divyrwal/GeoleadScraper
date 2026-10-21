"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-[#f3f4f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0c1117] border border-white/[0.08] rounded-2xl p-8 text-center shadow-2xl">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#58a6ff]/20">
          <Terminal className="h-6 w-6 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Standalone Open Source</h1>
        <p className="text-sm text-[#8b949e] mb-8 leading-relaxed">
          GeoLead runs directly on your machine or cloud infrastructure. No cloud account or external API authentication is required.
        </p>

        <div className="space-y-3">
          <Link href="/" className="w-full block">
            <Button className="w-full h-11 rounded-xl bg-white text-[#030712] hover:bg-white/90 font-bold text-xs uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Website
            </Button>
          </Link>
          <a href="https://github.com/divyrwal/GeoleadScraper" target="_blank" rel="noreferrer" className="w-full block">
            <Button variant="outline" className="w-full h-11 rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05] text-xs font-semibold">
              Get Code on GitHub
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
