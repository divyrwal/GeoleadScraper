"use client";

import React, { createContext, useContext, useState } from "react";

export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "approved" | "suspended";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: any;
}

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const defaultProfile: UserProfile = {
  uid: "guest-user",
  email: "guest@geolead.local",
  displayName: "Guest User",
  role: "admin",
  status: "approved",
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: { uid: "guest-user", email: "guest@geolead.local" },
  profile: defaultProfile,
  loading: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Standalone offline AuthProvider for zero-API standalone website
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user] = useState<any>({ uid: "guest-user", email: "guest@geolead.local" });
  const [profile] = useState<UserProfile | null>(defaultProfile);
  const [loading] = useState(false);

  const logout = async () => {};

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
