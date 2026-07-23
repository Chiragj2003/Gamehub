"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  const links = [
    { name: "Games", href: "/" },
    { name: "Library", href: "/library" },
    { name: "Leaderboards", href: "/leaderboard" },
  ];

  return (
    <footer className="w-full border-t border-white/5 bg-background pt-10 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-black tracking-tight text-white">
              Game<span className="text-primary">Hub</span>
            </Link>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs leading-relaxed">
              Classic arcade and puzzle games, rebuilt for the browser.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-6">
            {links.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            &copy; 2026 Game Hub. Built with Next.js. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/terms" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
