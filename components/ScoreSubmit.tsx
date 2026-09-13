"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, CheckmarkCircle01Icon, Share01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-strong w-full max-w-md space-y-6 rounded-3xl p-8">
        <div className="space-y-2 text-center">
          <div className="glass mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-brand">
            <HugeiconsIcon icon={SparklesIcon} className="h-6 w-6" />
          </div>
          <h2 className="text-[26px] font-black tracking-[-0.03em] text-ink">
            {submitted ? "On the board" : "Game over"}
          </h2>
          <p className="text-[14px] text-ink-2">
            You scored <span className="font-mono font-bold text-ink">{score.toLocaleString()}</span> points.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="initials"
                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3"
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
                className="h-12 w-full rounded-2xl border border-line bg-muted px-4 text-center font-mono text-xl font-bold uppercase tracking-[0.3em] text-ink transition-all focus:border-brand focus:outline-none"
                disabled={submitting}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-center text-[12px] font-medium text-danger"
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="btn-quiet h-11 flex-1 rounded-full text-[14px] font-semibold text-ink-2 hover:text-ink"
                disabled={submitting}
              >
                Skip
              </Button>
              <Button
                type="submit"
                className="btn-glow h-11 flex-1 rounded-full text-[14px] font-semibold"
                disabled={name.trim().length < 3 || submitting}
              >
                {submitting ? "Submitting…" : "Submit score"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center justify-center gap-2 py-2 text-success">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-10 w-10" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em]">Added to the leaderboard</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleShare}
                variant="outline"
                className="btn-quiet flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold"
              >
                <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
                {copied ? "Copied" : "Share"}
              </Button>
              {onPlayAgain && (
                <Button
                  onClick={onPlayAgain}
                  className="btn-glow h-11 flex-1 cursor-pointer rounded-full text-[14px] font-semibold"
                >
                  Play again
                </Button>
              )}
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
