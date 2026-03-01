"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  MapPin,
  Flame,
  CheckCircle2,
  TrendingUp,
  Thermometer,
  Snowflake,
  Phone,
  Globe,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardStats } from "@geolead/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.getStats()
      .then((result) => { if (result.success) setStats(result.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
      { title: "Total Leads", value: stats.totalLeads.toLocaleString(), icon: Users, description: `${stats.newThisWeek} new this week`, color: "text-blue-600" },
      { title: "With Phone", value: (stats.withPhone ?? 0).toLocaleString(), icon: Phone, description: `${stats.totalLeads > 0 ? Math.round(((stats.withPhone ?? 0) / stats.totalLeads) * 100) : 0}% of total`, color: "text-green-600" },
      { title: "With Website", value: (stats.withWebsite ?? 0).toLocaleString(), icon: Globe, description: `${stats.totalLeads > 0 ? Math.round(((stats.withWebsite ?? 0) / stats.totalLeads) * 100) : 0}% of total`, color: "text-blue-500" },
      { title: "Contacted", value: stats.contactedCount.toLocaleString(), icon: CheckCircle2, description: `${stats.contactRate}% contact rate`, color: "text-purple-600" },
    ]
    : [];

  const formatTimeAgo = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here&apos;s an overview of your lead generation progress.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm hover:shadow-orange-500/10 transition-shadow">
                <Flame className="h-6 w-6 text-orange-500 mb-2" />
                <span className="text-2xl font-bold font-mono text-foreground">{stats?.hotLeads ?? 0}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Hot</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm hover:shadow-yellow-500/10 transition-shadow">
                <Thermometer className="h-6 w-6 text-yellow-500 mb-2" />
                <span className="text-2xl font-bold font-mono text-foreground">{stats?.warmLeads ?? 0}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Warm</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm hover:shadow-blue-500/10 transition-shadow">
                <Snowflake className="h-6 w-6 text-blue-400 mb-2" />
                <span className="text-2xl font-bold font-mono text-foreground">{stats?.coldLeads ?? 0}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Cold</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentLeads && stats.recentLeads.length > 0 ? (
                stats.recentLeads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{lead.business_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.category || "Uncategorized"} • {lead.address || "No address"}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {lead.created_at ? formatTimeAgo(lead.created_at) : "—"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs">Start scraping to see leads here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
