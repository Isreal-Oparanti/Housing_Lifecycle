import Link from "next/link";

/**
 * The TrueCost mark: a house built from its costs. The three bars are rent,
 * council tax and bills, darkest to lightest, under the roof. The same
 * geometry is used for the favicon (src/app/icon.svg) and the share image.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#F3EEFF" />
      <path d="M10 21 L24 10 L38 21 Z" fill="#6D28D9" stroke="#6D28D9" strokeWidth="2" strokeLinejoin="round" />
      <rect x="12" y="23" width="24" height="5" rx="1.5" fill="#4C1D95" />
      <rect x="12" y="30" width="24" height="5" rx="1.5" fill="#7C3AED" />
      <rect x="12" y="37" width="24" height="5" rx="1.5" fill="#C4B5FD" />
    </svg>
  );
}

/** Mark and wordmark, linking home. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="TrueCost home">
      <LogoMark size={34} className="shrink-0" />
      <span className="text-lg font-bold tracking-tight text-ink">TrueCost</span>
    </Link>
  );
}
