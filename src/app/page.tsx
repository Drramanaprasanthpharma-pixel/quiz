import Link from "next/link";
import { Zap, QrCode, Trophy, Timer } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-signal font-display text-lg font-bold text-white">
            B
          </span>
          <span className="font-display text-xl font-semibold">Buzzr</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-paper transition hover:border-white/40"
          >
            Host login
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 md:grid-cols-2 md:items-center md:pt-20">
        <div>
          <h1 className="text-stage font-display font-semibold">
            Get a room full of phones answering the same question at once.
          </h1>
          <p className="mt-6 max-w-md text-lg text-paper/70">
            Buzzr is a live quiz you host from one screen and everyone else plays from their
            pocket. No app to install, no account to make — just a PIN or a QR code.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin/login"
              className="rounded-full bg-signal px-6 py-3 font-semibold text-white transition hover:bg-signal-light"
            >
              Host a quiz
            </Link>
            <Link
              href="/join"
              className="rounded-full bg-white/10 px-6 py-3 font-semibold text-paper transition hover:bg-white/20"
            >
              Enter a game PIN
            </Link>
          </div>
        </div>

        <div className="rounded-panel border border-white/10 bg-ink-soft p-6">
          <p className="mb-4 text-sm uppercase tracking-wide text-paper/50">Game PIN</p>
          <p className="font-display text-6xl font-bold tracking-widest text-gold">482 913</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {["You get this one", "Nailed it", "So close", "Next time"].map((label, i) => (
              <div
                key={label}
                className={`shape-${i % 2 === 0 ? "diamond" : "hexagon"} flex h-16 items-center justify-center bg-white/10 px-3 text-center text-sm font-medium`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-ink-soft/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<QrCode className="h-5 w-5" />}
            title="Scan to join"
            body="Project the lobby QR code. Players scan it, type a nickname, and they're in — no download."
          />
          <Feature
            icon={<Timer className="h-5 w-5" />}
            title="Timed questions"
            body="Every question has its own countdown. Answers lock automatically the second time's up."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Speed scoring"
            body="Correct answers score more the faster they're locked in, calculated server-side."
          />
          <Feature
            icon={<Trophy className="h-5 w-5" />}
            title="Live leaderboard"
            body="Standings update after every question, with a podium and full results at the end."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-signal/20 text-signal-light">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-paper/60">{body}</p>
    </div>
  );
}
