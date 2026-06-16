"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, LockKeyIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ isOpen, onOpenChange }: AuthModalProps) {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setSuccess("Success! Please check your email to confirm registration.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onOpenChange(false);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An authentication error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/5 bg-zinc-950/95 backdrop-blur-xl p-8 max-w-md rounded-2xl shadow-2xl">
        <DialogHeader className="text-center space-y-2 pb-2">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
            {isSignUp ? "Create Account" : "Access Game Hub"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            {isSignUp 
              ? "Join the club to bookmark games, save high scores, and access leaderboards."
              : "Sign in to resume library saves, check premium perks, and record runs."
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-lg text-center font-semibold animate-pulse">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-lg text-center font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-zinc-900 border border-white/5 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-neon-violet/50 focus:ring-1 focus:ring-neon-violet/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                <HugeiconsIcon icon={LockKeyIcon} className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-zinc-900 border border-white/5 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-neon-violet/50 focus:ring-1 focus:ring-neon-violet/20 transition-all font-medium"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-neon-violet transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </form>

        <p className="text-center text-[10px] text-zinc-500 font-medium pt-3">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            className="text-neon-violet hover:underline font-bold"
          >
            {isSignUp ? "Sign In" : "Sign Up Now"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
