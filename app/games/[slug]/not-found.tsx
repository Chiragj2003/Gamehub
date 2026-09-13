import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, GamepadIcon } from "@hugeicons/core-free-icons";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";

export default function GameNotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page flex items-center justify-center py-24">
        <div className="max-w-md w-full px-4 text-center">
          <GlassCard className="border-line p-12 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-line text-danger">
              <HugeiconsIcon icon={GamepadIcon} className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-[-0.02em] text-ink">
                Game Not Found
              </h2>
              <p className="text-sm text-ink-2 mt-2">
                The game you are trying to play does not exist or has been removed from our catalog.
              </p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-brand hover:text-ink transition-colors uppercase tracking-wider justify-center">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
              Return to Catalog
            </Link>
          </GlassCard>
        </div>
      </main>
      <Footer />
    </>
  );
}
