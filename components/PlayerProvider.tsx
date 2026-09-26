"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";

/**
 * Who is playing, and what they are called.
 *
 * One place owns the answer so the leaderboard form, the account page and the
 * library all agree. Clerk supplies the identity; the tag is ours and lives in
 * our own database.
 *
 * The provider is split in two rather than branching on `isClerkConfigured`
 * inside one component: Clerk's hooks throw when there is no ClerkProvider
 * above them, and a hook cannot be called conditionally. Choosing between two
 * components is legal, and each one calls its hooks unconditionally.
 */

export interface Player {
  /** Clerk user id, or null when signed out or accounts are off. */
  userId: string | null;
  /** The player's unique tag, or null if they have not chosen one yet. */
  tag: string | null;
  /** False until we know both of the above. */
  ready: boolean;
  /** Claim or change the tag. Resolves to an error message, or null on success. */
  saveTag: (tag: string) => Promise<string | null>;
  refresh: () => void;
}

const PlayerContext = createContext<Player>({
  userId: null,
  tag: null,
  ready: true,
  saveTag: async () => "Accounts are not enabled.",
  refresh: () => {},
});

export function usePlayer(): Player {
  return useContext(PlayerContext);
}

/** Fetches and caches the tag for whoever is signed in. */
function useTagFor(userId: string | null, identityReady: boolean): Omit<Player, "userId"> {
  const [tag, setTag] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!identityReady) return;
    if (!userId) {
      setTag(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : { tag: null }))
      .then((d: { tag?: string | null }) => {
        if (!cancelled) setTag(d.tag ?? null);
      })
      .catch(() => {
        // The tag is a nicety; a failed lookup must not block play.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, identityReady, nonce]);

  const saveTag = useCallback(async (next: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { tag?: string; error?: string };
      if (!res.ok) return data.error ?? "Could not save your tag.";
      setTag(data.tag ?? next);
      return null;
    } catch {
      return "Could not reach the server. Try again.";
    }
  }, []);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { tag, ready, saveTag, refresh };
}

function ClerkPlayer({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const rest = useTagFor(userId ?? null, isLoaded);
  return (
    <PlayerContext.Provider value={{ userId: userId ?? null, ...rest, ready: isLoaded && rest.ready }}>
      {children}
    </PlayerContext.Provider>
  );
}

function AnonymousPlayer({ children }: { children: React.ReactNode }) {
  // Accounts are switched off in this deployment. Everything still plays; the
  // leaderboard just asks for initials the way an arcade cabinet does.
  return <>{children}</>;
}

export default function PlayerProvider({ children }: { children: React.ReactNode }) {
  return isClerkConfigured ? <ClerkPlayer>{children}</ClerkPlayer> : <AnonymousPlayer>{children}</AnonymousPlayer>;
}
