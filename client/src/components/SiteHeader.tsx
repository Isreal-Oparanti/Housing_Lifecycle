import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium text-ink-soft sm:gap-2">
          <Link href="/#how-it-works" className="hidden rounded-lg px-3 py-2 hover:text-ink sm:block">
            How it works
          </Link>
          <Link href="/#sources" className="hidden rounded-lg px-3 py-2 hover:text-ink sm:block">
            Sources
          </Link>
          <Link
            href="/#check"
            className="rounded-lg bg-ink px-3.5 py-2 text-white transition-colors hover:bg-ink-soft"
          >
            Check a home
          </Link>
        </nav>
      </div>
    </header>
  );
}
