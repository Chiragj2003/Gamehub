"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

/**
 * Catches anything thrown while rendering a page so the visitor sees the
 * site's own message with a way forward, not a blank screen.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-24">
      <GlassCard className="w-full max-w-md space-y-6 p-12 text-center">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-3">Something broke</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-ink">This page hit an error</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Nothing you did — it&apos;s on our side. Try again, or head back to the games.
          </p>
          {error.digest && <p className="mt-3 font-mono text-[11px] text-ink-3">ref {error.digest}</p>}
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className="btn-glow inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-6 text-[14px] font-semibold">
            Try again
          </button>
          <Link href="/" className="btn-quiet inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-semibold">
            All games
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}
