"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const PhaserTestComponent = dynamic(
  () => import("@/components/PhaserTestComponent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex w-[800px] h-[600px] items-center justify-center bg-zinc-950 text-zinc-500 border border-white/5 rounded-xl animate-pulse">
        Initializing Phaser Test Canvas...
      </div>
    ),
  }
);

export default function PhaserTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white uppercase tracking-widest font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-2">
          Phaser Engine Test
        </h1>
        <p className="text-xs text-zinc-400 max-w-sm">
          This test page verifies that Phaser loads and renders correctly on the client side with SSR disabled.
        </p>
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-black">
        <PhaserTestComponent />
      </div>
    </main>
  );
}
