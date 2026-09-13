"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun03Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`btn-quiet flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-2 hover:text-ink ${className}`}
    >
      <span className="relative block h-4 w-4">
        <HugeiconsIcon
          icon={Sun03Icon}
          className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        />
        <HugeiconsIcon
          icon={Moon02Icon}
          className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
        />
      </span>
    </button>
  );
}
