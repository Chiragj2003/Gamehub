"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, useClerk, useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import TagEditor from "@/components/TagEditor";
import { useLibrary } from "@/lib/library";
import { isClerkConfigured } from "@/lib/clerk";

type Notice = { kind: "ok" | "error"; text: string } | null;

/**
 * Your account: who you are signed in as, the tag you play under, and the
 * controls to leave.
 *
 * Passwords, email and sign-out are Clerk's to own now — its own UI handles
 * those far better than a hand-rolled form, and it keeps this page about the
 * one thing that is ours: the player tag.
 */
/**
 * The signed-in body of the page.
 *
 * Split out because Clerk's hooks throw when no ClerkProvider is above them,
 * and with accounts switched off there isn't one. A hook cannot be called
 * conditionally, but a component can be rendered conditionally.
 */
function ClerkAccount() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { ids } = useLibrary();

  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete the account.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Could not delete the account." });
      setBusy(false);
    }
  };

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <GlassCard className="mt-8 text-center">
        <h2 className="text-[17px] font-bold text-ink">Sign in to claim a tag</h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-2">
          An account gets you a name on the leaderboards instead of three initials, and a library that
          follows you between devices.
        </p>
        <SignInButton mode="modal">
          <button type="button" className="btn-glow mt-5 h-11 cursor-pointer rounded-full px-6 text-[14px] font-semibold">
            Sign in
          </button>
        </SignInButton>
      </GlassCard>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <GlassCard>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-ink-2">
            <HugeiconsIcon icon={UserCircleIcon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-ink">Signed in as</h2>
            <p className="truncate text-[13.5px] text-ink-2">
              {user?.primaryEmailAddress?.emailAddress ?? user?.username ?? "your account"}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openUserProfile()}
            className="btn-quiet h-10 cursor-pointer rounded-full px-4 text-[13px] font-semibold"
          >
            Email and password
          </button>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="btn-quiet h-10 cursor-pointer rounded-full px-4 text-[13px] font-semibold"
          >
            Sign out
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-[17px] font-bold text-ink">Your tag</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          This is the name on every leaderboard you reach. It has to be unique, and you can change it
          whenever you like.
        </p>
        <TagEditor />
      </GlassCard>

      <GlassCard>
        <h2 className="text-[17px] font-bold text-ink">Library</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          {ids.length === 0
            ? "You have not saved any games yet."
            : `${ids.length} saved ${ids.length === 1 ? "game" : "games"}, synced to this account.`}
        </p>
        <Link
          href="/library"
          className="btn-quiet mt-4 inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold"
        >
          Open library
        </Link>
      </GlassCard>

      <GlassCard>
        <h2 className="text-[17px] font-bold text-danger">Delete account</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          This removes your account, your tag and your saved games, and cannot be undone. Scores already on
          the leaderboards stay — they are a name and a number, and pulling them would leave gaps in
          everyone else&apos;s rankings.
        </p>
        <form onSubmit={deleteAccount} className="mt-5 space-y-3">
          <label htmlFor="confirm-delete" className="block text-[13px] font-medium text-ink-2">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 font-mono text-[14px] text-ink outline-none focus:border-danger"
          />
          <button
            type="submit"
            disabled={confirm !== "DELETE" || busy}
            className="h-11 w-full cursor-pointer rounded-xl border border-danger/30 bg-danger/10 text-[13px] font-bold uppercase tracking-wider text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete my account"}
          </button>
          {notice && (
            <p role="alert" className={`text-[12.5px] ${notice.kind === "error" ? "text-danger" : "text-success"}`}>
              {notice.text}
            </p>
          )}
        </form>
      </GlassCard>
    </div>
  );
}

export default function AccountPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 pt-8 sm:pt-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All games
          </Link>

          <h1 className="text-[40px] font-black tracking-[-0.04em] text-ink sm:text-[56px]">Account</h1>

          {isClerkConfigured ? (
            <ClerkAccount />
          ) : (
            <GlassCard className="mt-8">
              <h2 className="text-[17px] font-bold text-ink">Accounts are off</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                This deployment has no account service configured. Every game still plays, and your scores and saved
                games are kept on this device.
              </p>
            </GlassCard>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
