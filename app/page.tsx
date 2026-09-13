import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeContent from "@/components/HomeContent";
import { getAllGames } from "@/lib/games";

// The catalog changes only when the seed runs; serve it from cache and
// refresh in the background rather than hitting the database per visit.
export const revalidate = 300;

export default async function Home() {
  const games = await getAllGames();
  const categories = new Set(games.map((g) => g.category)).size;

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-background">
        <section className="relative border-b border-white/5 pb-16 pt-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="mb-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Play. Compete. <span className="text-neon-violet">Repeat.</span>
            </h1>

            <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-zinc-400">
              Classic arcade and puzzle games, rebuilt for the browser. No downloads, no ads, just play.
            </p>

            <div className="flex items-center justify-center gap-3">
              <a href="#games">
                <button className="h-11 cursor-pointer rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  Browse Games
                </button>
              </a>
              <a href="/library">
                <button className="h-11 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-7 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/8">
                  My Library
                </button>
              </a>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
              <div>
                <span className="text-lg font-bold text-white">{games.length}</span>
                <span className="ml-1.5">Games</span>
              </div>
              <div className="h-5 w-px bg-white/10" />
              <div>
                <span className="text-lg font-bold text-white">{categories}</span>
                <span className="ml-1.5">Categories</span>
              </div>
              <div className="h-5 w-px bg-white/10" />
              <div>
                <span className="text-lg font-bold text-white">Free</span>
                <span className="ml-1.5">Forever</span>
              </div>
            </div>
          </div>
        </section>

        <HomeContent games={games} />
      </main>

      <Footer />
    </>
  );
}
