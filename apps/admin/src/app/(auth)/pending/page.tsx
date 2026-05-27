"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Clock } from "lucide-react";

export default function PendingPage() {
  const { logout } = useAuth();

  return (
    <AuthGuard blockIfApproved={true}>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[40rem] w-[40rem] bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse" />
        </div>
        
        <Card className="w-full max-w-md relative border-border/50 shadow-2xl bg-background/60 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 relative">
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Approval Pending</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground pb-6">
            An administrator is currently reviewing your account. You will automatically be redirected to the dashboard once approved.
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <Button variant="ghost" onClick={logout} className="text-muted-foreground hover:text-foreground">
              Sign in with a different account
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AuthGuard>
  );
}
