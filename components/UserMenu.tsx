"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
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
import { StarIcon, Trophy, Logout01Icon } from "@hugeicons/core-free-icons";

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
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
          className="relative h-9 w-9 rounded-full border border-white/5 hover:border-neon-violet/30 hover:bg-zinc-950/60 p-0 overflow-hidden flex items-center justify-center transition-all cursor-pointer"
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
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neon-violet to-neon-cyan text-white text-xs font-black">
              {getInitials()}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 border-white/5 bg-zinc-950/95 backdrop-blur-xl p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2">
          <div className="flex flex-col space-y-0.5">
            <p className="text-xs font-bold text-white truncate">{getUsername()}</p>
            <p className="text-[10px] text-zinc-500 font-medium truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/library" className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white px-2.5 py-2 text-xs">
            <HugeiconsIcon icon={StarIcon} className="h-4 w-4 text-zinc-400" />
            <span>My Library</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/leaderboard" className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white px-2.5 py-2 text-xs">
            <HugeiconsIcon icon={Trophy} className="h-4 w-4 text-zinc-400" />
            <span>Leaderboards</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 px-2.5 py-2 text-xs"
        >
          <HugeiconsIcon icon={Logout01Icon} className="h-4 w-4 text-rose-400" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
