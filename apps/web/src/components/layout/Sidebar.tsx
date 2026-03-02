"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Map as MapIcon,
    Users,
    BarChart3,
    Columns3,
    Copy,
    Terminal,
} from "lucide-react";

const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Pipeline", href: "/pipeline", icon: Columns3 },
    { name: "Map View", href: "/map", icon: MapIcon },
    { name: "Live Engine", href: "/live", icon: Terminal },
    { name: "Duplicates", href: "/duplicates", icon: Copy },
];

export function Sidebar() {
    const pathname = usePathname();

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

            <div className="mt-auto px-6 py-4 border-t border-border/50 bg-background/50">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">GeoLead v7.0</p>
            </div>
        </aside>
    );
}
