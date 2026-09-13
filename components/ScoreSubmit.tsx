"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, CheckmarkCircle01Icon, Share01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { saveLocalScore } from "@/lib/localScores";

interface ScoreSubmitProps {
  gameId: number;
  gameSlug: string;
  gameTitle?: string;
  score: number;
  /** Server-issued session for this run; null if the server was unreachable. */
  sessionId: string | null;
  onClose: () => void;
  onPlayAgain?: () => void;
}

export default function ScoreSubmit({
  gameId,
  gameSlug,
  gameTitle,
  score,
  sessionId,
  onClose,
  onPlayAgain,
}: ScoreSubmitProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toUpperCase();
    if (cleanName.length < 3) return;

    setSubmitting(true);
    setError(null);

    // Always keep the score on this device, whatever the server says.
    saveLocalScore(gameSlug, cleanName, score);
    window.dispatchEvent(new Event("local-scores-updated"));

    if (!sessionId) {
      setError("Couldn't reach the server when this run started, so it can't go on the leaderboard. It's saved on this device.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/games/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, score, playerName: cleanName, slug: gameSlug, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not submit your score. It's saved on this device.");
        return;
      }

      setSubmitted(true);
      window.dispatchEvent(new Event("leaderboard-updated"));
    } catch {
      setError("You appear to be offline. Your score is saved on this device.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    const label = gameTitle || gameSlug.replace(/-/g, " ");
    const text = `I just scored ${score.toLocaleString()} in ${label} on Game Hub. Can you beat it?`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Could not copy to clipboard:", e);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <GlassCard glowColor="cyan" className="w-full max-w-md space-y-6 border border-neon-cyan/30 p-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-zinc-950">
            <HugeiconsIcon icon={SparklesIcon} className="h-6 w-6 text-neon-cyan" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            {submitted ? "On the board" : "Game Over"}
          </h2>
          <p className="text-xs text-zinc-400">
            You scored{" "}
            <span className="font-black text-neon-cyan">{score.toLocaleString()}</span> points.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="initials"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-500"
              >
                Enter initials (3 letters)
              </label>
              <input
                type="text"
                id="initials"
                maxLength={3}
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                placeholder="AAA"
                autoFocus
                required
                className="h-11 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 text-center font-mono text-lg font-bold uppercase tracking-widest text-white transition-all focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/20"
                disabled={submitting}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-[11px] font-medium text-rose-300"
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-10 flex-1 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white"
                disabled={submitting}
              >
                Skip
              </Button>
              <Button
                type="submit"
                className="h-10 flex-1 rounded-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-neon-cyan"
                disabled={name.trim().length < 3 || submitting}
              >
                {submitting ? "Submitting…" : "Submit score"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center justify-center gap-2 py-2 text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-10 w-10" />
              <span className="text-xs font-bold uppercase tracking-widest">Added to the leaderboard</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border-white/15 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/5"
              >
                <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
                {copied ? "Copied" : "Share"}
              </Button>
              {onPlayAgain && (
                <Button
                  onClick={onPlayAgain}
                  className="h-10 flex-1 cursor-pointer rounded-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-neon-violet"
                >
                  Play again
                </Button>
              )}
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer text-[11px] font-semibold text-zinc-500 transition-colors hover:text-white"
            >
              Done
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
