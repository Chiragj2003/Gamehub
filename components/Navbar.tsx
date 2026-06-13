"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { GamepadIcon, Trophy, Search01Icon, Menu01Icon, SparklesIcon, UserCircleIcon, StarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import SearchBar from "@/components/SearchBar";
import { Volume2 } from "lucide-react";
import AudioSettings from "@/components/AudioSettings";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";
import UserMenu from "@/components/UserMenu";


export default function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const navItems = [
    { name: "Games", href: "/", icon: GamepadIcon },
    { name: "Library", href: "/library", icon: StarIcon },
    { name: "Leaderboards", href: "/leaderboard", icon: Trophy },
    { name: "Premium", href: "/premium", icon: SparklesIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neon-violet to-neon-cyan shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-transform group-hover:scale-105">
              <HugeiconsIcon icon={GamepadIcon} className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent group-hover:from-neon-violet group-hover:to-neon-cyan transition-all duration-300">
              GAME<span className="text-neon-violet text-glow-violet">HUB</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={item.icon} className="h-4 w-4 text-zinc-400" />
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-violet shadow-[0_0_10px_var(--neon-violet)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions / Right Side */}
          <div className="flex items-center gap-2">
            
            {/* Search Component */}
            <div className="hidden sm:block">
              <Suspense fallback={<div className="w-48 xl:w-64 h-8 bg-zinc-950/20 rounded-full animate-pulse" />}>
                <SearchBar className="w-48 xl:w-64" />
              </Suspense>
            </div>

            {/* Mobile Search Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-zinc-400 hover:text-white"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
            </Button>

            {/* Audio settings popover trigger */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAudioOpen(!audioOpen)}
                className={`rounded-full border border-white/5 transition-all ${
                  audioOpen ? "border-neon-cyan/30 bg-zinc-950/60 text-neon-cyan" : "hover:border-neon-cyan/30 hover:bg-zinc-950/60 text-zinc-400 hover:text-neon-cyan"
                }`}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
              {audioOpen && (
                <div className="absolute right-0 top-12 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <AudioSettings onClose={() => setAudioOpen(false)} />
                </div>
              )}
            </div>

            {/* Profile Avatar Trigger */}
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAuthOpen(true)}
                className="rounded-full border border-white/5 hover:border-neon-violet/30 hover:bg-zinc-950/60 transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={UserCircleIcon} className="h-5 w-5 text-zinc-400 hover:text-neon-violet transition-colors" />
              </Button>
            )}

            <AuthModal isOpen={authOpen} onOpenChange={setAuthOpen} />


            {/* Mobile Navigation Drawer */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-zinc-400 hover:text-white">
                  <HugeiconsIcon icon={Menu01Icon} className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 border-l border-white/5 bg-background p-6">
                <SheetHeader className="text-left pb-6 border-b border-white/5">
                  <SheetTitle className="text-lg font-black tracking-wider uppercase">
                    GAME<span className="text-neon-violet">HUB</span>
                  </SheetTitle>
                  <SheetDescription className="text-zinc-500 text-xs">
                    Premium retro and arcade gaming portal
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold text-zinc-300 hover:bg-zinc-950/60 hover:text-white transition-all border border-transparent hover:border-white/5"
                    >
                      <HugeiconsIcon icon={item.icon} className="h-5 w-5 text-zinc-400" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
                <div className="absolute bottom-6 left-6 right-6 pt-6 border-t border-white/5">
                  <p className="text-center text-[10px] text-zinc-600">
                    &copy; 2026 Game Hub. All rights reserved.
                  </p>
                </div>
              </SheetContent>
            </Sheet>

          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {searchOpen && (
          <div className="sm:hidden border-t border-white/5 py-3 px-1 animate-in fade-in duration-200">
            <Suspense fallback={<div className="w-full h-8 bg-zinc-950/20 rounded-full animate-pulse" />}>
              <SearchBar placeholder="Search games..." />
            </Suspense>
          </div>
        )}

      </div>
    </header>
  );
}
