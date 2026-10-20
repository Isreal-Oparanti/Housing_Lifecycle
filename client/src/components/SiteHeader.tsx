import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="TrueCost home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">TrueCost</span>
    </Link>
  );
}

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
