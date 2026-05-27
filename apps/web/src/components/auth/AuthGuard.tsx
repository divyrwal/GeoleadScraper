"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  requireGuest?: boolean; // For login/signup pages
  blockIfApproved?: boolean; // For the pending page
}

export function AuthGuard({
  children,
  requireAuth = false,
  requireApproval = false,
  requireAdmin = false,
  requireGuest = false,
  blockIfApproved = false,
}: AuthGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Helper to evaluate authorization
    const checkAuth = () => {
      if (requireGuest) {
        if (user && profile) {
          if (profile.status === "pending") {
            router.replace("/pending");
          } else {
            router.replace("/dashboard");
          }
          return false;
        }
        return true;
      }

      if (requireAuth || requireApproval || requireAdmin || blockIfApproved) {
        if (!user) {
          router.replace("/login");
          return false;
        }
        if (!profile) {
          // Waiting for profile to load (should be fast, but could be null if deleted)
          return false;
        }
      }

      if (requireAdmin) {
        if (profile?.role !== "admin") {
          router.replace("/dashboard");
          return false;
        }
      }

      if (requireApproval) {
        if (profile?.status !== "approved" && profile?.role !== "admin") {
          router.replace("/pending");
          return false;
        }
      }

      if (blockIfApproved) {
        if (profile?.status === "approved" || profile?.role === "admin") {
          router.replace("/dashboard");
          return false;
        }
      }

      return true;
    };

    const isAuthorized = checkAuth();
    if (isAuthorized) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }
  }, [
    user,
    profile,
    loading,
    router,
    pathname,
    requireAuth,
    requireApproval,
    requireAdmin,
    requireGuest,
    blockIfApproved,
  ]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
