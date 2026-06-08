"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { GamepadIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const categories = [
    { name: "Arcade Classics", href: "/#featured" },
    { name: "Retro Remakes", href: "/#featured" },
    { name: "Mind Puzzles", href: "/#featured" },
    { name: "Action & Skill", href: "/#featured" },
  ];

  const platform = [
    { name: "Leaderboards", href: "/leaderboards" },
    { name: "Premium Tier", href: "/premium" },
    { name: "Source Code", href: "https://github.com" },
  ];

  const legal = [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Cookie Settings", href: "/cookies" },
  ];

  return (
    <footer className="w-full border-t border-white/5 bg-zinc-950/80 backdrop-blur-md pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Footer Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 xl:gap-12 pb-12 border-b border-white/5">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 group self-start">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-violet to-neon-cyan shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-transform group-hover:scale-105">
                <HugeiconsIcon icon={GamepadIcon} className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-black uppercase tracking-wider text-white">
                GAME<span className="text-neon-violet">HUB</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
              Diving deep into arcade nostalgia with next-generation aesthetics. Play, compete, and climb the global charts right from your browser.
            </p>
          </div>

          {/* Categories Col */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Categories</h4>
            <ul className="flex flex-col gap-2.5">
              {categories.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Col */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Platform</h4>
            <ul className="flex flex-col gap-2.5">
              {platform.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Col */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-white">Stay Updated</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Get notified of new game releases, seasonal leaderboards, and exclusive premium events.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-white/8 bg-zinc-900/60 py-2 pl-9 pr-3 text-xs text-zinc-300 placeholder-zinc-500 focus:border-neon-violet/50 focus:bg-zinc-900/80 focus:outline-none transition-all duration-300"
                />
                <HugeiconsIcon icon={Mail01Icon} className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full rounded-full bg-zinc-100 text-zinc-950 font-bold hover:bg-white active:scale-98 transition-all duration-200"
              >
                {subscribed ? "Subscribed!" : "Subscribe"}
              </Button>
            </form>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            &copy; 2026 Game Hub. Built with Next.js, Framer Motion, and Phaser. All rights reserved.
          </p>
          <div className="flex gap-6">
            {legal.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
