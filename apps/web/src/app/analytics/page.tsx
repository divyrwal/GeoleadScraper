"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Flame, Thermometer, Snowflake, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const SCORE_COLORS = { hot: "#f97316", warm: "#eab308", cold: "#3b82f6", unscored: "#94a3b8" };

interface AnalyticsData {
    scoreDistribution: { label: string, count: number }[];
    categoryBreakdown: { category: string, count: number }[];
    timeline: { date: string, count: number, withPhone: number, withWebsite: number }[];
    searchQueries: { query: string, count: number }[];
    contactRate: { total: number, contacted: number, rate: number };
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAnalytics().then(r => { if (r.success) setData(r.data as unknown as AnalyticsData); }).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading analytics...
        </div>
    );

    if (!data) return <div className="text-center py-20 text-muted-foreground">No analytics data available</div>;

    const scoreData = data.scoreDistribution || [];
    const categoryData = data.categoryBreakdown || [];
    const timelineData = data.timeline || [];
    const searchData = data.searchQueries || [];
    const contactRate = data.contactRate || { total: 0, contacted: 0, rate: 0 };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">Insights and metrics from your lead database.</p>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scoreData.map((s: { label: string, count: number }) => {
                    const Icon = s.label === "hot" ? Flame : s.label === "warm" ? Thermometer : s.label === "cold" ? Snowflake : Users;
                    return (
                        <Card key={s.label} className="border-none shadow-sm">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${SCORE_COLORS[s.label as keyof typeof SCORE_COLORS] || SCORE_COLORS.unscored}15` }}>
                                        <Icon className="h-5 w-5" style={{ color: SCORE_COLORS[s.label as keyof typeof SCORE_COLORS] || SCORE_COLORS.unscored }} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{s.count}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{s.label || "Unscored"} Leads</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                <Card className="border-none shadow-sm">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{contactRate.rate}%</p>
                                <p className="text-xs text-muted-foreground">Contact Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution Pie */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />Score Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {scoreData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={scoreData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ name, value }: { name?: string, value?: number }) => `${name}: ${value}`}>
                                        {scoreData.map((entry: { label: string, count: number }, i: number) => (
                                            <Cell key={i} fill={SCORE_COLORS[entry.label as keyof typeof SCORE_COLORS] || SCORE_COLORS.unscored} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-muted-foreground text-center py-10">No score data</p>}
                    </CardContent>
                </Card>

                {/* Top Categories Bar Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Top Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={categoryData} layout="vertical" margin={{ left: 60 }}>
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-muted-foreground text-center py-10">No category data</p>}
                    </CardContent>
                </Card>

                {/* Timeline Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Leads Over Time (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {timelineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="count" name="Total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="withPhone" name="With Phone" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" />
                                    <Line type="monotone" dataKey="withWebsite" name="With Website" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-muted-foreground text-center py-10">No timeline data yet — scrape some leads first!</p>}
                    </CardContent>
                </Card>

                {/* Search Queries */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Search Queries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {searchData.length > 0 ? (
                            <div className="space-y-2">
                                {searchData.map((q: { query: string, count: number }, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-1.5">
                                        <span className="text-sm truncate flex-1">{q.query}</span>
                                        <Badge variant="secondary" className="ml-2">{q.count}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground text-center py-10">No searches yet</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
