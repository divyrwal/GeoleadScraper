"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, Activity, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/lib/api";

interface LogEntry {
    timestamp: string;
    jobId?: string;
    level: "info" | "success" | "warn" | "error";
    message: string;
}

export default function LiveTrackingPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Construct the SSE URL
        const streamUrl = `${API_URL}/api/search/stream`;
        const eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
            console.log("Connected to SSE stream");
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'success', message: 'System: Real-time event stream connected successfully.' }]);
                    return;
                }

                if (data.type === 'log') {
                    setLogs((prev) => [...prev, data]);
                }

                if (data.type === 'log_history') {
                    setLogs((prev) => [...prev, ...data.logs]);
                }
            } catch (err) {
                console.error("Failed to parse SSE message", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE connection error", err);
            setIsConnected(false);
            setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'error', message: 'System: Connection to live stream lost. Attempting to reconnect...' }]);
        };

        return () => {
            // Cleanup on unmount
            eventSource.close();
        };
    }, []);

    // Auto-scroll to bottom of the terminal on new logs
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    return (
        <div className="p-8 pb-20 max-w-6xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Terminal className="text-blue-500" />
                        Autopilot Mission Control
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Real-time orchestration tracking across distributed scraped sources.
                    </p>
                </div>
                <div>
                    {isConnected ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 px-4 py-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live Stream Active
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 px-4 py-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Stream Disconnected
                        </Badge>
                    )}
                </div>
            </div>

            <Card className="bg-slate-900 border-slate-800 flex-1 flex flex-col overflow-hidden shadow-2xl shadow-indigo-500/10">
                <CardHeader className="bg-slate-950/50 border-b border-slate-800 py-3">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Engine Execution Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0 font-mono text-sm bg-black/40">
                    {logs.length === 0 && (
                        <div className="flex h-full items-center justify-center text-slate-600">
                            Waiting for orchestration events...
                        </div>
                    )}
                    <div className="p-4 space-y-2">
                        {logs.map((log, i) => (
                            <div key={i} className="flex items-start gap-4 hover:bg-white/5 p-1 rounded transition-colors group">
                                <div className="text-slate-500 shrink-0 text-xs mt-1 w-20">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                                </div>
                                <div className="shrink-0 mt-0.5">
                                    {log.level === 'info' && <Info className="w-4 h-4 text-blue-400" />}
                                    {log.level === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                                    {log.level === 'warn' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                                    {log.level === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-slate-600 mr-2 text-xs">
                                        {log.jobId ? `[Job ${log.jobId.slice(0, 8)}]` : ''}
                                    </span>
                                    <span className={`
                                    ${log.level === 'info' ? 'text-slate-300' : ''}
                                    ${log.level === 'success' ? 'text-green-300 font-semibold' : ''}
                                    ${log.level === 'warn' ? 'text-amber-300' : ''}
                                    ${log.level === 'error' ? 'text-red-400 font-bold' : ''}
                                    `}>
                                        {log.message}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
