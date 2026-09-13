import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeContent from "@/components/HomeContent";
import { getAllGames } from "@/lib/games";

export const revalidate = 300;

export default async function Home() {
  const games = await getAllGames();
  const categories = new Set(games.map((g) => g.category)).size;

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <section className="relative pb-20 pt-24 sm:pb-28 sm:pt-36">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="mb-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-2">
              {games.length} games · {categories} categories · free
            </p>

            <h1 className="text-balance text-[44px] font-black leading-[1.02] tracking-[-0.045em] text-ink sm:text-[64px] lg:text-[80px]">
              Play. Compete.{" "}
              <span className="bg-gradient-to-br from-brand to-brand-2 bg-clip-text text-transparent">Repeat.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
              Ten classic arcade and puzzle games, rebuilt for the browser. No downloads, no sign-up. Tap and play.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="#games"
                className="btn-glow inline-flex h-12 items-center justify-center rounded-full px-8 text-[15px] font-semibold"
              >
                Browse games
              </Link>
              <Link
                href="/leaderboard"
                className="btn-quiet inline-flex h-12 items-center justify-center rounded-full px-8 text-[15px] font-semibold"
              >
                Leaderboards
              </Link>
            </div>
          </div>
        </section>

        <HomeContent games={games} />
      </main>

      <Footer />
    </>
  );
}
