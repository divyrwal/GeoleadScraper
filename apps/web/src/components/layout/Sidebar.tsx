"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard,
    Map as MapIcon,
    Users,
    BarChart3,
    Columns3,
    Copy,
    Terminal,
    ListFilter,
    Star,
    LogOut,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Request Data", href: "/dashboard/request", icon: Sparkles },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Leads", href: "/dashboard/leads", icon: Users },
    { name: "Lead Sort", href: "/dashboard/lead-sort", icon: ListFilter },
    { name: "Shortlisted", href: "/dashboard/shortlisted", icon: Star },
    { name: "Pipeline", href: "/dashboard/pipeline", icon: Columns3 },
    { name: "Map View", href: "/dashboard/map", icon: MapIcon },
    { name: "Live Engine", href: "/dashboard/live", icon: Terminal },
    { name: "Duplicates", href: "/dashboard/duplicates", icon: Copy },
];

export function Sidebar() {
    const pathname = usePathname();
    const { profile, logout } = useAuth();

    return (
        <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r bg-background/95 backdrop-blur-xl shadow-sm transition-transform duration-300 md:translate-x-0 border-border">
            <div className="flex h-16 items-center px-6 border-b border-border/50 bg-background/50">
                <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#58a6ff] to-[#3fb950] text-white shadow-[0_4px_12px_rgba(88,166,255,0.25)] font-bold text-lg">
                        G
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                        GeoLead
                    </span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="mb-4 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Main Menu
                </div>
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-accent text-accent-foreground shadow-[inset_2px_0_0_0_#58a6ff]"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("mr-3 h-[18px] w-[18px] shrink-0 transition-colors", isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto px-4 py-4 border-t border-border/50 bg-background/50 flex flex-col gap-2">
                {profile && (
                    <div className="px-2 py-1 mb-2">
                        <p className="text-sm font-medium text-foreground truncate">{profile.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                )}
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                </Button>
            </div>
        </aside>
    );
}
