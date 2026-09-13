import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { LegalDocument01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export const metadata: Metadata = {
  title: "Terms of Service — Game Hub",
  description: "The rules for playing on Game Hub: free games, fair leaderboards, and what happens to your account.",
};

const UPDATED = "14 September 2026";

export default function TermsPage() {
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
              <HugeiconsIcon icon={LegalDocument01Icon} className="h-7 w-7" />
            </div>
            <h1 className="text-[40px] font-black tracking-[-0.04em] text-ink sm:text-[56px]">Terms of Service</h1>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-2">
              The short version: the games are free, the leaderboards are fair, and your account is yours.
            </p>
            <p className="text-[12px] text-ink-3">Last updated {UPDATED}</p>
          </div>

          <GlassCard className="space-y-8 p-8 sm:p-10">
            <Section title="What Game Hub is">
              <p>
                Game Hub is a free website where you can play ten classic arcade and puzzle games in your browser. There
                is nothing to download, nothing to buy, and no advertising. You can play without an account. An account
                is optional and only adds a library that follows you between devices.
              </p>
            </Section>

            <Section title="Using the site">
              <p>
                Play as much as you like. Don&apos;t do anything that interferes with other people&apos;s ability to
                play — that includes trying to overload the site, probing it for weaknesses, or automating requests to
                it.
              </p>
            </Section>

            <Section title="Leaderboards and fair play">
              <p>
                Leaderboards exist so people can compare real runs. Every score is checked on our servers before it is
                accepted: a run must have been started through the site, the play time is measured by us rather than
                reported by your device, and a score that is impossible for the game or the time played is rejected.
                Submissions are rate-limited.
              </p>
              <p>
                Submitting a score you did not earn — by editing requests, running a bot, or any other means — is
                against these terms. We may remove such scores and block further submissions from the source without
                notice. Initials shown on a leaderboard are limited to three letters or digits and are visible to
                everyone.
              </p>
            </Section>

            <Section title="Accounts">
              <p>
                An account needs an email address and a password, or a sign-in through a provider we support. You are
                responsible for keeping your sign-in details private. You can delete your account at any time, which
                removes your saved library and any data tied to your account; see the{" "}
                <Link href="/privacy" className="font-medium text-brand underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>{" "}
                for what that covers. We may close accounts that are used to break these terms.
              </p>
            </Section>

            <Section title="The games">
              <p>
                The games on Game Hub are original implementations of classic genres, written for this site. Their
                names describe the style of play; they are not affiliated with or endorsed by the publishers of any
                games they resemble. The site&apos;s code, designs, and text belong to Game Hub. You may not copy or
                redistribute them as your own.
              </p>
            </Section>

            <Section title="No guarantees">
              <p>
                Game Hub is provided as it is, free of charge. We work to keep it available and correct, but we
                don&apos;t promise it will always be online, error-free, or that a score you submit will be kept
                forever. To the extent the law allows, we are not liable for any loss arising from your use of the
                site.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If these terms change in a way that matters, we will update the date at the top of this page.
                Continuing to use the site after a change means you accept the updated terms.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about these terms? Open an issue on the{" "}
                <a
                  href="https://github.com/Chiragj2003/Gamehub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand underline-offset-4 hover:underline"
                >
                  Game Hub repository
                </a>
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
