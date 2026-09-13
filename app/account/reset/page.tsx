"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon } from "@hugeicons/core-free-icons";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page for the password-reset email. The link signs the user in via
 * /auth/callback and sends them here to choose a new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setReady(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== password2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/account");
    router.refresh();
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 pb-24 pt-10">
        <GlassCard className="w-full max-w-md space-y-5 p-8">
          <div className="space-y-2 text-center">
            <div className="glass mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-brand">
              <HugeiconsIcon icon={LockKeyIcon} className="h-6 w-6" />
            </div>
            <h1 className="text-[26px] font-black tracking-[-0.03em] text-ink">Set a new password</h1>
          </div>

          {ready === null ? (
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          ) : !ready ? (
            <p className="text-center text-[14px] text-ink-2">
              This link has expired or was already used. Open the account menu, choose sign in, and tap “Forgot
              password?” to get a fresh one.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                aria-label="New password"
                autoFocus
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
              {error && (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !password}
                className="btn-glow h-11 w-full cursor-pointer rounded-full text-[14px] font-semibold disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save password"}
              </button>
            </form>
          )}
        </GlassCard>
      </main>
      <Footer />
    </>
  );
}
