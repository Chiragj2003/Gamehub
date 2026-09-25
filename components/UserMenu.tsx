"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon, Trophy, Logout01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const handleSignOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    router.refresh();
  };

  // Extract initials or use email prefix
  const getInitials = () => {
    if (user.user_metadata?.full_name) {
      const parts = user.user_metadata.full_name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    return (user.email?.[0] || "U").toUpperCase();
  };

  const getUsername = () => {
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "Player";
  };

  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full border border-line hover:border-brand/30 hover:bg-surface p-0 overflow-hidden flex items-center justify-center transition-all cursor-pointer"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={getUsername()}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand to-brand-2 text-ink-on-brand text-xs font-black">
              {getInitials()}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 border-line bg-surface p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2">
          <div className="flex flex-col space-y-0.5">
            <p className="text-xs font-bold text-ink truncate">{getUsername()}</p>
            <p className="text-[10px] text-ink-2 font-medium truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 cursor-pointer text-ink hover:text-ink px-2.5 py-2 text-xs">
            <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4 text-ink-2" />
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/library" className="flex items-center gap-2 cursor-pointer text-ink hover:text-ink px-2.5 py-2 text-xs">
            <HugeiconsIcon icon={StarIcon} className="h-4 w-4 text-ink-2" />
            <span>My Library</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/leaderboard" className="flex items-center gap-2 cursor-pointer text-ink hover:text-ink px-2.5 py-2 text-xs">
            <HugeiconsIcon icon={Trophy} className="h-4 w-4 text-ink-2" />
            <span>Leaderboards</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-danger focus:bg-danger/10 focus:text-danger px-2.5 py-2 text-xs"
        >
          <HugeiconsIcon icon={Logout01Icon} className="h-4 w-4 text-danger" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
