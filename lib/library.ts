"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlayer } from "@/components/PlayerProvider";

/**
 * The player's saved games.
 *
 * Signed out, the list lives in localStorage on this device. Signed in, it
 * lives in the database and follows the account. On sign-in, anything saved
 * locally is merged into the account once so nothing is lost, then the local
 * copy is kept in sync as a cache for instant rendering.
 */

const STORAGE_KEY = "game_hub_library_ids";
const MERGED_KEY = "game_hub_library_merged_for";
/** Fired whenever the library changes, so every Save button and the library page update together. */
const EVENT = "library-updated";

function readLocal(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]).filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage disabled; the in-memory state still works for this page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useLibrary() {
  const { userId, ready: playerReady } = usePlayer();
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  // Track auth, and pull the server copy when a user is present.
  useEffect(() => {
    let cancelled = false;

    const syncFromServer = async (uid: string) => {
      // First sign-in on this device: push local saves up before reading back.
      const local = readLocal();
      let mergedFor: string | null = null;
      try {
        mergedFor = localStorage.getItem(MERGED_KEY);
      } catch {
        // ignore
      }
      if (local.length > 0 && mergedFor !== uid) {
        await fetch("/api/user/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameIds: local }),
        }).catch(() => {});
        try {
          localStorage.setItem(MERGED_KEY, uid);
        } catch {
          // ignore
        }
      }

      try {
        const res = await fetch("/api/user/library");
        if (res.ok) {
          const data = (await res.json()) as { gameIds: number[] };
          if (!cancelled) {
            setIds(data.gameIds);
            writeLocal(data.gameIds);
          }
        }
      } catch {
        // Offline: keep whatever is cached locally.
      }
    };

    // Show what is on the device straight away, then reconcile with the
    // account copy once Clerk has said who is signed in.
    setIds(readLocal());

    if (!playerReady) return;
    setReady(true);
    if (userId) syncFromServer(userId);

    const onChange = () => setIds(readLocal());
    window.addEventListener(EVENT, onChange);

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
    };
  }, [userId, playerReady]);

  const has = useCallback((gameId: number) => ids.includes(gameId), [ids]);

  const toggle = useCallback(
    async (gameId: number) => {
      const current = readLocal();
      const saved = current.includes(gameId);
      const next = saved ? current.filter((id) => id !== gameId) : [...current, gameId];
      // Optimistic: update the UI now, reconcile with the server after.
      writeLocal(next);

      if (!userId) return;
      try {
        await fetch("/api/user/library", {
          method: saved ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        });
      } catch (e) {
        console.warn("Library sync failed; change kept locally:", e);
      }
    },
    [userId]
  );

  return { ids, has, toggle, ready, signedIn: userId !== null };
}
