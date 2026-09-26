"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import SearchOverlay from "@/components/SearchOverlay";
import { isClerkConfigured } from "@/lib/clerk";

/**
 * Clerk's widgets are conditional UI that a signed-out first visit never
 * needs, so they load on demand rather than in every page's first bundle.
 */
const AuthControls = dynamic(() => import("@/components/AuthControls"), { ssr: false });

const NAV = [
  { name: "Games", href: "/" },
  { name: "Library", href: "/library" },
  { name: "Leaderboards", href: "/leaderboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);


  return (
    <>
      {/* Fixed so content scrolls beneath and is frosted; the spacer keeps layout honest. */}
      <header className="glass fixed inset-x-0 top-0 z-50 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="pressable flex items-center rounded-lg text-[19px] font-black tracking-[-0.03em] text-ink">
            Game<span className="text-brand">Hub</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`pressable rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-200 ${
                    active ? "bg-muted text-ink" : "text-ink-2 hover:bg-muted hover:text-ink"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search games"
              className="btn-quiet flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-ink-2 hover:text-ink sm:pr-2"
            >
              <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
              <span className="hidden text-[13px] sm:inline">Search</span>
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3 lg:inline">⌘K</kbd>
            </button>

            <ThemeToggle />

            {isClerkConfigured && <AuthControls />}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="btn-quiet flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-2 hover:text-ink md:hidden"
                >
                  <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-strong w-[86vw] max-w-sm border-y-0 border-r-0 p-0 text-ink">
                <SheetHeader className="border-b border-line px-6 pb-5 pt-6 text-left">
                  <SheetTitle className="text-[22px] font-black tracking-[-0.03em] text-ink">
                    Game<span className="text-brand">Hub</span>
                  </SheetTitle>
                  <SheetDescription className="text-[13px] text-ink-2">
                    Eleven classic games. No downloads.
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3" aria-label="Menu">
                  {NAV.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`pressable rounded-2xl px-4 py-3.5 text-[16px] font-semibold transition-colors ${
                          active ? "bg-muted text-ink" : "text-ink-2 hover:bg-muted hover:text-ink"
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setSearchOpen(true);
                    }}
                    className="pressable flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[16px] font-semibold text-ink-2 transition-colors hover:bg-muted hover:text-ink"
                  >
                    <HugeiconsIcon icon={Search01Icon} className="h-4 w-4" />
                    Search games
                  </button>
                </nav>
                <div className="mt-auto flex items-center justify-between border-t border-line px-6 py-4">
                  <span className="text-[12px] text-ink-3">Appearance</span>
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div className="h-16" aria-hidden="true" />

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
