"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The AuthGuard will automatically handle the redirection!
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // We still need to ensure they have a profile if they login before signing up,
      // but if we don't do the complex admin logic here, they might bypass the "first user" logic if they login first.
      // So let's just make sure their document exists. If it doesn't, they are technically signing up!
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Technically they signed up via login. 
        // We set them as pending user. They should have used the Signup page to be evaluated as first user.
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || "Unknown User",
          role: "user",
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

    } catch (err: any) {
      console.error(err);
      setError("Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireGuest={true}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Left Panel - Visual Branding (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-zinc-950 text-white">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/15 rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
          </div>
          
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-90 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#3fb950] text-white shadow-[0_4px_24px_rgba(88,166,255,0.4)] font-bold text-xl">
                G
              </div>
              <span className="text-2xl font-bold tracking-tight">GeoLead</span>
            </Link>
          </div>
          
          <div className="relative z-10 max-w-md">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Welcome back.</h2>
            <p className="text-lg text-zinc-400">
              Continue where you left off. Manage your local prospects, run AI enrichments, and close more deals.
            </p>
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8 lg:p-12 relative">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] lg:hidden" />
          
          <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Mobile Logo */}
            <div className="flex lg:hidden justify-center mb-8">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#3fb950] text-white shadow-[0_4px_24px_rgba(88,166,255,0.4)] font-bold text-xl">
                  G
                </div>
              </Link>
            </div>

            <div className="space-y-2 mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
              <p className="text-muted-foreground">Enter your credentials to access your dashboard</p>
            </div>

            {error && (
              <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-sm animate-in fade-in">
                {error}
              </div>
            )}
            
            <Button variant="outline" className="w-full h-12 mb-6 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-muted" onClick={handleGoogleAuth} disabled={loading}>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11 bg-input/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 bg-input/50"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-medium mt-2 shadow-[0_0_15px_rgba(88,166,255,0.2)] hover:shadow-[0_0_25px_rgba(88,166,255,0.4)] transition-shadow" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
