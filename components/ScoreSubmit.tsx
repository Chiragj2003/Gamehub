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
  sessionId: string | null;
  /** Seconds of play, sent so the server can reject impossible score rates. */
  durationSeconds?: number;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export default function ScoreSubmit({
  gameId,
  gameSlug,
  gameTitle,
  score,
  sessionId,
  durationSeconds,
  onClose,
  onSubmitSuccess
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
    try {
      // Save locally first so the score survives the database being offline.
      saveLocalScore(gameSlug, cleanName, score);
      window.dispatchEvent(new Event("local-scores-updated"));

      const res = await fetch("/api/games/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          score,
          playerName: cleanName,
          slug: gameSlug,
          sessionId: sessionId || undefined,
          durationSeconds
        })
      });

      if (!res.ok) {
        // A rejection here is a validation failure, not a network problem —
        // surface it rather than showing a success state that did not happen.
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not submit your score. Please try again.");
        return;
      }

      setSubmitted(true);
      onSubmitSuccess?.();
    } catch (err) {
      console.warn("Score submission failed; the score was saved locally:", err);
      setError("You appear to be offline. Your score was saved on this device.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    const label = gameTitle || gameSlug.replace(/-/g, " ");
    const text = `I just scored ${score.toLocaleString()} points in ${label} on Game Hub! Can you beat my high score?`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Could not copy to clipboard:", e);
    }
  };

  const borderClass = "border-neon-cyan/30";

  const textClass = "text-neon-cyan text-glow-cyan";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <GlassCard
        glowColor="cyan"
        className={`w-full max-w-md border p-8 space-y-6 ${borderClass}`}
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-white/5">
            <HugeiconsIcon icon={SparklesIcon} className={`h-6 w-6 ${textClass}`} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            {submitted ? "Score Submitted!" : "Game Over!"}
          </h2>
          <p className="text-xs text-zinc-400">
            You scored <span className={`font-black ${textClass}`}>{score.toLocaleString()}</span> points.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Enter Initials (3 Letters)
              </label>
              <input
                type="text"
                id="name"
                maxLength={3}
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                placeholder="AAA"
                required
                className="w-full h-11 px-4 rounded-lg bg-zinc-950 border border-white/10 text-white font-mono text-center text-lg uppercase font-bold tracking-widest focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
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
                className="flex-1 h-10 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white"
                disabled={submitting}
              >
                Skip
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-neon-cyan transition-all"
                disabled={name.trim().length < 3 || submitting}
              >
                {submitting ? "Submitting..." : "Submit Score"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center justify-center py-4 text-emerald-400 gap-2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-10 w-10 animate-bounce" />
              <span className="text-xs font-bold uppercase tracking-widest">Added to Leaderboards</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 h-10 rounded-full border-white/15 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
                {copied ? "Copied!" : "Copy Share Link"}
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 h-10 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:bg-neon-violet transition-all cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
