import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { GamepadIcon } from "@hugeicons/core-free-icons";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <GlassCard className="w-full max-w-md space-y-6 p-12 text-center">
          <div className="glass mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-brand">
            <HugeiconsIcon icon={GamepadIcon} className="h-8 w-8" />
          </div>
          <div>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-3">404</p>
            <h1 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-ink">Nothing here</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              That page doesn&apos;t exist, or it moved. The games are all one tap away.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="btn-glow inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-semibold">
              All games
            </Link>
            <Link href="/leaderboard" className="btn-quiet inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-semibold">
              Leaderboards
            </Link>
          </div>
        </GlassCard>
      </main>
      <Footer />
    </>
  );
}
