"use client";

import { Bell, Search, Settings, HelpCircle, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

export function Header() {
    const { profile, logout } = useAuth();

    // Generate initials from display name
    const getInitials = (name: string) => {
        if (!name) return "A";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/75 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-1 items-center gap-4 md:gap-8">
                <div className="relative w-full max-w-[400px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search leads, locations..."
                        className="w-full bg-input/50 pl-9 md:w-[300px] lg:w-[400px] transition-all focus:md:w-[400px] border-border/50"
                    />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(88,166,255,0.8)]" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-border/50">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gradient-to-br from-[#a855f7] to-[#3b82f6] text-white font-medium">
                                    {getInitials(profile?.displayName || "Admin")}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 border-border/50 shadow-2xl" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-foreground">
                                    {profile?.displayName || "Loading..."}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground truncate">
                                    {profile?.email || ""}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem 
                            className="focus:bg-destructive/10 focus:text-destructive cursor-pointer text-destructive"
                            onClick={() => logout()}
                        >
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
