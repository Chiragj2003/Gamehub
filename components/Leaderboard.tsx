"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Trophy, CalendarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { type LocalScoreEntry, getLocalScores } from "@/lib/localScores";

interface ScoreEntry {
  playerName: string;
  score: number;
  createdAt: string;
}

interface LeaderboardProps {
  gameId: number;
  gameSlug: string;
}

type Status = "loading" | "ok" | "offline";

/**
 * The global top 10 for a game, with the player's own device-local best shown
 * separately underneath. The two are never mixed: an empty global board is
 * shown as empty rather than padded with local scores, so what appears under
 * "Leaderboard" is always what everyone else sees too.
 */
export default function Leaderboard({ gameId, gameSlug }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [local, setLocal] = useState<LocalScoreEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/scores?gameId=${gameId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setScores((await res.json()) as ScoreEntry[]);
      setStatus("ok");
    } catch (e) {
      console.warn("Leaderboard unavailable:", e);
      setStatus("offline");
    }
  }, [gameId]);

  const loadLocal = useCallback(() => setLocal(getLocalScores(gameSlug)), [gameSlug]);

  useEffect(() => {
    fetchScores();
    loadLocal();

    window.addEventListener("leaderboard-updated", fetchScores);
    window.addEventListener("local-scores-updated", loadLocal);
    const interval = setInterval(fetchScores, 30_000);

    return () => {
      window.removeEventListener("leaderboard-updated", fetchScores);
      window.removeEventListener("local-scores-updated", loadLocal);
      clearInterval(interval);
    };
  }, [fetchScores, loadLocal]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const rankStyle = (rank: number) =>
    ({
      1: "text-amber-400 font-extrabold border-amber-500/20 bg-amber-500/5",
      2: "text-zinc-300 font-bold border-zinc-500/20 bg-zinc-500/5",
      3: "text-amber-700 font-bold border-amber-800/20 bg-amber-800/5",
    })[rank] ?? "text-zinc-400 border-white/3 bg-zinc-950/20";

  const personalBest = local[0];

  return (
    <div className="space-y-6 rounded-xl border border-white/5 bg-zinc-900/10 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Trophy} className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">Leaderboard</h3>
        </div>
        {status === "offline" && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Offline</span>
        )}
      </div>

      {status === "loading" ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ))}
        </div>
      ) : status === "offline" ? (
        <div className="py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Couldn&apos;t reach the leaderboard
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">Your scores are still saved on this device.</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">No scores yet</p>
          <p className="mt-1 text-[10px] text-zinc-600">Be the first on the board.</p>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {scores.map((entry, idx) => {
            const rank = idx + 1;
            return (
              <li
                key={`${entry.playerName}-${entry.createdAt}-${idx}`}
                className={`flex items-center justify-between rounded-lg border p-2 text-xs transition-all hover:bg-zinc-950/40 ${rankStyle(rank)}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold">#{rank}</span>
                  <span className="font-mono font-semibold tracking-wider">{entry.playerName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-right font-mono font-black text-white">
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                    <HugeiconsIcon icon={CalendarIcon} className="h-3 w-3 shrink-0" />
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {personalBest && (
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Your best on this device
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold text-zinc-300">{personalBest.playerName}</span>
              <span className="font-mono font-black text-white">{personalBest.score.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
