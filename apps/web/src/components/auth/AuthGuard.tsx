"use client";

import React from "react";

export interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  requireGuest?: boolean;
  blockIfApproved?: boolean;
}

// Standalone AuthGuard: bypasses backend auth checks for zero-API standalone website
export function AuthGuard({ children }: AuthGuardProps) {
  return <>{children}</>;
}
