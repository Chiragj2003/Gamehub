"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { GamepadIcon, Trophy, Search01Icon, Menu01Icon, SparklesIcon, UserCircleIcon, StarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import SearchBar from "@/components/SearchBar";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";
import UserMenu from "@/components/UserMenu";


export default function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
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
    { name: "Games", href: "/" },
    { name: "Library", href: "/library" },
    { name: "Leaderboards", href: "/leaderboard" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          
          {/* Logo — text only, clean */}
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="text-lg font-black tracking-tight text-white">
              Game<span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Desktop Navigation — no icons, just text */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-white bg-white/8"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            
            {/* Search */}
            <div className="hidden sm:block">
              <Suspense fallback={<div className="w-44 h-8 bg-zinc-900/30 rounded-lg animate-pulse" />}>
                <SearchBar className="w-44 xl:w-56" />
              </Suspense>
            </div>

            {/* Mobile Search */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-zinc-400 hover:text-white h-8 w-8"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
            </Button>

            {/* Profile */}
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAuthOpen(true)}
                className="h-8 w-8 rounded-full border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4 text-zinc-400" />
              </Button>
            )}

            <AuthModal isOpen={authOpen} onOpenChange={setAuthOpen} />

            {/* Mobile Nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-zinc-400 hover:text-white h-8 w-8">
                  <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 border-l border-white/5 bg-background p-6">
                <SheetHeader className="text-left pb-4 border-b border-white/5">
                  <SheetTitle className="text-lg font-black tracking-tight">
                    Game<span className="text-primary">Hub</span>
                  </SheetTitle>
                  <SheetDescription className="text-zinc-500 text-xs">
                    Classic games, reimagined.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-all"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="absolute bottom-6 left-6 right-6 pt-4 border-t border-white/5">
                  <p className="text-center text-[10px] text-zinc-600">
                    &copy; 2026 Game Hub
                  </p>
                </div>
              </SheetContent>
            </Sheet>

          </div>
        </div>

        {/* Mobile Search Expansion */}
        {searchOpen && (
          <div className="sm:hidden border-t border-white/5 py-2.5 px-1">
            <Suspense fallback={<div className="w-full h-8 bg-zinc-900/30 rounded-lg animate-pulse" />}>
              <SearchBar placeholder="Search games..." />
            </Suspense>
          </div>
        )}

      </div>
    </header>
  );
}
