"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { getSupabase } from "@/lib/supabase/client";
import { useLibrary } from "@/lib/library";

type Notice = { kind: "ok" | "error"; text: string } | null;

export default function AccountPage() {
  const router = useRouter();
  const { ids } = useLibrary();

  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [delNotice, setDelNotice] = useState<Notice>(null);
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    getSupabase()
      .then((supabase) => supabase.auth.getUser())
      .then(({ data }) => setUser(data.user ?? null));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);
    if (password.length < 8) return setPwNotice({ kind: "error", text: "Use at least 8 characters." });
    if (password !== password2) return setPwNotice({ kind: "error", text: "The two passwords don't match." });
    setPwBusy(true);
    const supabase = await getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setPwBusy(false);
    if (error) return setPwNotice({ kind: "error", text: error.message });
    setPassword("");
    setPassword2("");
    setPwNotice({ kind: "ok", text: "Password changed." });
  };

  const signOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDelNotice(null);
    setDelBusy(true);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete the account.");
      // The server cleared the session; drop any local account cache too.
      try {
        localStorage.removeItem("game_hub_library_merged_for");
      } catch {
        // ignore
      }
      await (await getSupabase()).auth.signOut().catch(() => {});
      router.push("/?deleted=1");
      router.refresh();
    } catch (err) {
      setDelNotice({ kind: "error", text: err instanceof Error ? err.message : "Could not delete the account." });
      setDelBusy(false);
    }
  };

  const provider = user?.app_metadata?.provider ?? "email";
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 pt-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All games
          </Link>

          <div className="mb-10 space-y-3 text-center">
            <div className="glass mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-brand">
              <HugeiconsIcon icon={UserCircleIcon} className="h-7 w-7" />
            </div>
            <h1 className="text-[40px] font-black tracking-[-0.04em] text-ink sm:text-[56px]">Account</h1>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-2">
              Your sign-in, your library, and the option to leave.
            </p>
          </div>

          {user === undefined ? (
            <GlassCard className="p-8">
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
            </GlassCard>
          ) : user === null ? (
            <GlassCard className="space-y-4 p-8 text-center">
              <p className="text-[15px] text-ink">You&apos;re not signed in.</p>
              <p className="text-[14px] text-ink-2">
                Use the account icon in the header to sign in or create an account. Without one, your library and best
                scores live on this device only.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-6">
              <GlassCard className="p-8">
                <h2 className="text-[17px] font-bold text-ink">Signed in as</h2>
                <dl className="mt-4 grid grid-cols-1 gap-4 text-[14px] sm:grid-cols-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Email</dt>
                    <dd className="mt-1 break-all font-medium text-ink">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Sign-in</dt>
                    <dd className="mt-1 font-medium capitalize text-ink">{provider}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Since</dt>
                    <dd className="mt-1 font-medium text-ink">{joined ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5 text-[14px]">
                  <span className="text-ink-2">
                    <span className="font-semibold text-ink">{ids.length}</span> {ids.length === 1 ? "game" : "games"} in your library
                  </span>
                  <Link href="/library" className="font-medium text-brand underline-offset-4 hover:underline">
                    Open library
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="btn-quiet ml-auto h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold"
                  >
                    Sign out
                  </button>
                </div>
              </GlassCard>

              {provider === "email" && (
                <GlassCard className="p-8">
                  <h2 className="text-[17px] font-bold text-ink">Change password</h2>
                  <form onSubmit={changePassword} className="mt-4 space-y-3">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      aria-label="New password"
                      className="h-11 w-full rounded-2xl border border-line bg-muted px-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="Repeat new password"
                      aria-label="Repeat new password"
                      className="h-11 w-full rounded-2xl border border-line bg-muted px-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
                    />
                    {pwNotice && (
                      <p role="status" className={`text-[13px] font-medium ${pwNotice.kind === "ok" ? "text-success" : "text-danger"}`}>
                        {pwNotice.text}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={pwBusy || !password}
                      className="btn-glow h-10 cursor-pointer rounded-full px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pwBusy ? "Saving…" : "Save password"}
                    </button>
                  </form>
                </GlassCard>
              )}

              <GlassCard className="border-danger/25 p-8">
                <h2 className="text-[17px] font-bold text-danger">Delete account</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                  This removes your email, your sign-in, and your saved library — permanently. Leaderboard entries are
                  not linked to accounts (three initials and a score), so they stay. Scores saved on this device stay
                  in this browser.
                </p>
                <form onSubmit={deleteAccount} className="mt-5 space-y-3">
                  <label htmlFor="confirm" className="block text-[12px] font-medium text-ink-2">
                    Type <span className="font-mono font-bold text-ink">DELETE</span> to confirm
                  </label>
                  <input
                    id="confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value.toUpperCase())}
                    autoComplete="off"
                    className="h-11 w-full rounded-2xl border border-line bg-muted px-4 font-mono text-[15px] uppercase tracking-[0.2em] text-ink focus:border-danger focus:outline-none sm:max-w-xs"
                  />
                  {delNotice && (
                    <p role="alert" className="text-[13px] font-medium text-danger">
                      {delNotice.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={confirm !== "DELETE" || delBusy}
                    className="pressable h-10 cursor-pointer rounded-full bg-danger px-5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {delBusy ? "Deleting…" : "Delete my account"}
                  </button>
                </form>
              </GlassCard>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
