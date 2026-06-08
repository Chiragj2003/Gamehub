"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Trophy, CalendarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { type LocalScoreEntry, getLocalScores } from "@/lib/gameRegistry";

interface ScoreEntry {
  playerName: string;
  score: number;
  createdAt?: string | Date;
  date?: string; // local fallback field
}

interface LeaderboardProps {
  gameId: number;
  gameSlug: string;
}

export default function Leaderboard({ gameId, gameSlug }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/scores?gameId=${gameId}&slug=${gameSlug}`);
      if (res.ok) {
        const data = await res.json() as ScoreEntry[];
        if (data && data.length > 0) {
          setScores(data);
          return;
        }
      }
      // Fall back to localStorage scores if API returns empty or database offline
      const local = getLocalScores(gameSlug) as LocalScoreEntry[];
      setScores(local.map(l => ({
        playerName: l.playerName,
        score: l.score,
        createdAt: l.date
      })));
    } catch (e) {
      console.warn("Failed to fetch leaderboard from API, falling back to local storage:", e);
      const local = getLocalScores(gameSlug) as LocalScoreEntry[];
      setScores(local.map(l => ({
        playerName: l.playerName,
        score: l.score,
        createdAt: l.date
      })));
    } finally {
      setLoading(false);
    }
  }, [gameId, gameSlug]);

  useEffect(() => {
    fetchScores();

    // Listen to local score updates
    window.addEventListener("local-scores-updated", fetchScores);

    // Poll every 30 seconds
    const interval = setInterval(fetchScores, 30000);

    return () => {
      window.removeEventListener("local-scores-updated", fetchScores);
      clearInterval(interval);
    };
  }, [fetchScores]);

  const formatDate = (dateVal?: string | Date) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getDifficultyColor = () => {
    switch (gameSlug) {
      case "neon-snake":
        return "text-neon-green text-glow-green";
      case "space-defender":
        return "text-neon-cyan text-glow-cyan";
      case "memory-matrix":
        return "text-neon-violet text-glow-violet";
      default:
        return "text-amber-400";
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Trophy} className={`h-5 w-5 ${getDifficultyColor()}`} />
        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Leaderboards</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ))}
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">No high scores registered</p>
          <p className="text-[10px] text-zinc-600 mt-1">Be the first to submit yours!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {scores.map((entry, idx) => {
            const rank = idx + 1;
            const rankColors = {
              1: "text-amber-400 font-extrabold border-amber-500/20 bg-amber-500/5",
              2: "text-zinc-300 font-bold border-zinc-500/20 bg-zinc-500/5",
              3: "text-amber-700 font-bold border-amber-800/20 bg-amber-800/5"
            }[rank] || "text-zinc-400 border-white/3 bg-zinc-950/20";

            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-xs p-2 rounded-lg border transition-all hover:bg-zinc-950/40 ${rankColors}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold">#{rank}</span>
                  <span className="font-semibold font-mono tracking-wider">{entry.playerName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black font-mono text-white text-right">
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                    <HugeiconsIcon icon={CalendarIcon} className="h-3 w-3 shrink-0" />
                    {formatDate(entry.createdAt || entry.date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
