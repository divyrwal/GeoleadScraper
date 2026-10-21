"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-[#f3f4f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0c1117] border border-white/[0.08] rounded-2xl p-8 text-center shadow-2xl">
        <div className="h-12 w-12 rounded-xl bg-[#3fb950]/10 border border-[#3fb950]/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-6 w-6 text-[#3fb950]" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Standalone Website</h1>
        <p className="text-sm text-[#8b949e] mb-8 leading-relaxed">
          GeoLead operates as an open-source tool with zero account or approval requirements.
        </p>

        <Link href="/" className="w-full block">
          <Button className="w-full h-11 rounded-xl bg-white text-[#030712] hover:bg-white/90 font-bold text-xs uppercase tracking-wide">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
