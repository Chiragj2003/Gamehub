"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/components/PlayerProvider";
import { TAG_MAX, TAG_MIN, checkTag } from "@/lib/clerk";

/**
 * Choose or change the name you appear under on the leaderboards.
 *
 * Availability is checked while you type — debounced, and always advisory. The
 * unique index in the database is what actually decides, so two people racing
 * for the same tag get a clear "taken" from the save rather than a silent
 * overwrite.
 */

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "taken" }
  | { kind: "invalid"; reason: string }
  | { kind: "saved" }
  | { kind: "error"; reason: string };

export default function TagEditor({ autoFocus = false }: { autoFocus?: boolean }) {
  const { tag, saveTag, ready } = usePlayer();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tag) setValue(tag);
  }, [tag]);

  // Debounced availability check. Skipped when the tag is already yours.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === tag) {
      setStatus({ kind: "idle" });
      return;
    }
    const shape = checkTag(trimmed);
    if (!shape.ok) {
      setStatus({ kind: "invalid", reason: shape.reason });
      return;
    }
    setStatus({ kind: "checking" });
    let cancelled = false;
    const id = setTimeout(() => {
      fetch(`/api/profile?check=${encodeURIComponent(trimmed)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { available?: boolean } | null) => {
          if (cancelled || !d) return;
          setStatus(d.available ? { kind: "free" } : { kind: "taken" });
        })
        .catch(() => {
          if (!cancelled) setStatus({ kind: "idle" });
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [value, tag]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed === tag) return;
    const shape = checkTag(trimmed);
    if (!shape.ok) {
      setStatus({ kind: "invalid", reason: shape.reason });
      return;
    }
    setBusy(true);
    const error = await saveTag(trimmed);
    setBusy(false);
    setStatus(error ? { kind: "error", reason: error } : { kind: "saved" });
  };

  const message = (() => {
    switch (status.kind) {
      case "checking":
        return { text: "Checking…", tone: "muted" as const };
      case "free":
        return { text: "Available.", tone: "ok" as const };
      case "taken":
        return { text: "Taken. Try another.", tone: "bad" as const };
      case "invalid":
        return { text: status.reason, tone: "bad" as const };
      case "error":
        return { text: status.reason, tone: "bad" as const };
      case "saved":
        return { text: "Saved. This is how you appear on leaderboards.", tone: "ok" as const };
      default:
        return null;
    }
  })();

  const unchanged = value.trim() === (tag ?? "");

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label htmlFor="player-tag" className="block text-[13px] font-medium text-ink-2">
        Player tag
      </label>
      <div className="flex gap-2">
        <input
          id="player-tag"
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. chirag_07"
          maxLength={TAG_MAX}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="player-tag-hint"
          disabled={!ready}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 font-mono text-[14px] text-ink outline-none transition-colors focus:border-brand disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || unchanged || !ready || status.kind === "taken" || status.kind === "invalid"}
          className="btn-glow h-11 shrink-0 cursor-pointer rounded-xl px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving…" : tag ? "Change" : "Claim"}
        </button>
      </div>
      <p
        id="player-tag-hint"
        className={`text-[12.5px] ${
          message?.tone === "bad" ? "text-danger" : message?.tone === "ok" ? "text-success" : "text-ink-3"
        }`}
        role={message?.tone === "bad" ? "alert" : undefined}
      >
        {message?.text ?? `${TAG_MIN}–${TAG_MAX} characters. Letters, numbers and underscores.`}
      </p>
    </form>
  );
}
