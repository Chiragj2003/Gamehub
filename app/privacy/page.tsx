import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShieldKeyIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Game Hub stores, what it doesn't, and how to delete it. No ads, no tracking.",
};

const UPDATED = "14 September 2026";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 pt-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All games
          </Link>

          <div className="mb-10 space-y-3 text-center">
            <div className="glass mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-brand">
              <HugeiconsIcon icon={ShieldKeyIcon} className="h-7 w-7" />
            </div>
            <h1 className="text-[40px] font-black tracking-[-0.04em] text-ink sm:text-[56px]">Privacy Policy</h1>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-2">
              No ads, no trackers, no selling anything. Here is exactly what the site keeps and why.
            </p>
            <p className="text-[12px] text-ink-3">Last updated {UPDATED}</p>
          </div>

          <GlassCard className="space-y-8 p-8 sm:p-10">
            <Section title="Playing without an account">
              <p>
                You can use the whole site without signing in. In that case, the only things stored are on your own
                device, in your browser&apos;s local storage: your theme choice (light or dark), the games you save to
                your library, and your best scores for each game so they show even when you are offline. None of this
                leaves your browser, and clearing your browser data removes it.
              </p>
            </Section>

            <Section title="Play sessions and leaderboards">
              <p>
                When you press Play, the site opens a play session on our server. The session records which game was
                started, when, and how long it lasted. If you choose to post a score, the session also stores the score
                and the three initials you enter. The initials and score appear on the public leaderboard for that
                game; nothing else about the session is public.
              </p>
              <p>
                We use these records to validate scores (a score is only accepted for a real session, and only if it
                is possible in the time played) and to see which games people start and finish. Sessions are not
                linked to an account unless you are signed in when you play.
              </p>
            </Section>

            <Section title="If you create an account">
              <p>
                An account stores your email address, a securely hashed password (or a reference to the sign-in
                provider you used, such as Google), the date you joined, and the list of games you have saved to your
                library. We use your email only to sign you in and to send account-related messages such as a password
                reset. We never send marketing email.
              </p>
              <p>
                Accounts and the database behind them are hosted by Supabase. Access to your data is restricted by
                row-level security so that only you can read or change your own library.
              </p>
            </Section>

            <Section title="What we don't do">
              <ul className="list-disc space-y-1.5 pl-5">
                <li>No advertising, and no advertising networks or pixels.</li>
                <li>No analytics services, fingerprinting, or cross-site tracking.</li>
                <li>No selling, renting, or sharing of your data with anyone.</li>
                <li>No cookies beyond the one that keeps you signed in when you have an account.</li>
              </ul>
            </Section>

            <Section title="Server logs and rate limiting">
              <p>
                Like any website, our hosting provider (Vercel) keeps short-lived request logs that include your IP
                address, used to run the site and investigate problems. Score submissions and session creation are
                rate-limited by IP address to prevent abuse; that counter is kept in memory and is not stored
                permanently.
              </p>
            </Section>

            <Section title="Deleting your data">
              <p>
                You can remove games from your library at any time from the game page. To delete your account and
                everything tied to it — your email, your sign-in, and your saved library — open{" "}
                <Link href="/account" className="font-medium text-brand underline-offset-4 hover:underline">
                  your account page
                </Link>{" "}
                and choose “Delete account”. It takes effect immediately and cannot be undone. Leaderboard entries are
                never linked to an account — they carry only three initials and a score — so they remain and cannot
                be traced back to you.
              </p>
            </Section>

            <Section title="Children">
              <p>
                Game Hub is a general-audience site and does not knowingly collect personal information from children
                under 13. Playing without an account stores nothing about you on our servers beyond an anonymous play
                session.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If this policy changes in a way that affects what we collect or how we use it, we will update the date
                at the top of this page. See also the{" "}
                <Link href="/terms" className="font-medium text-brand underline-offset-4 hover:underline">
                  Terms of Service
                </Link>
                .
              </p>
            </Section>
          </GlassCard>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
