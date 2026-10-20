import { BadgeCheck, FileSearch, MapPin, Receipt, Users } from "lucide-react";
import { BoundaryExample } from "@/components/BoundaryExample";
import { CheckForm } from "@/components/CheckForm";

const PROOF_POINTS = [
  { icon: BadgeCheck, text: "This year's official rates for all 318 councils in England and Wales" },
  { icon: Users, text: "Discounts for living alone or as students, applied for you" },
  { icon: FileSearch, text: "Every figure shows where it came from" },
];

const STEPS = [
  {
    icon: MapPin,
    title: "Enter the address and rent",
    body: "Copy the postcode from the listing. Many hide it, so the street and town work too, like “Navarino Road, Hackney”.",
  },
  {
    icon: Receipt,
    title: "Add the council tax band",
    body: "Most listings show it. Pick it and see the cost instantly, or look it up on GOV.UK if it isn't listed.",
  },
  {
    icon: BadgeCheck,
    title: "See what you'll really pay",
    body: "Rent plus council tax as one monthly figure, adjusted for who's living there, with every number explained.",
  },
];

export default function Home() {
  return (
    <main>
      <section id="check" className="relative scroll-mt-16 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-soft blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-x-16 lg:pb-24 lg:pt-20">
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand-line">
              For renters in England and Wales
            </p>
            <h1 className="font-display text-[2.6rem] leading-[1.04] tracking-tight sm:text-6xl">
              The rent isn&apos;t the whole bill.
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-soft">
              Enter the postcode or street from any listing, and the rent. We&apos;ll add the council tax for that exact
              council and show you what the home really costs each month.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <CheckForm />
          </div>

          <ul className="space-y-3 lg:col-start-1 lg:row-start-2 lg:self-start">
            {PROOF_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-ink-soft">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-official" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BoundaryExample />

      <section id="how-it-works" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="rounded-3xl bg-white p-6 ring-1 ring-line">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-muted">Step {index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sources" className="scroll-mt-16 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:py-20">
          <div className="space-y-4">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Where the numbers come from</h2>
            <p className="text-ink-soft">
              We never fill a gap with a guess. If something is an average or an estimate, we say so next to the number.
            </p>
          </div>
          <dl className="divide-y divide-line rounded-3xl ring-1 ring-line">
            <div className="p-6">
              <dt className="font-semibold">Council tax rates</dt>
              <dd className="mt-1 text-ink-soft">
                Published every March by the Ministry of Housing, Communities and Local Government and the Welsh
                Government, for every council, including police, fire and parish charges.
              </dd>
            </div>
            <div className="p-6">
              <dt className="font-semibold">Which council a home is in</dt>
              <dd className="mt-1 text-ink-soft">The Office for National Statistics postcode directory.</dd>
            </div>
            <div className="p-6">
              <dt className="font-semibold">The property&apos;s band</dt>
              <dd className="mt-1 text-ink-soft">
                From the listing: most now show it under &ldquo;Council tax&rdquo;. You can confirm it on GOV.UK&apos;s
                council tax band checker.
              </dd>
            </div>
            <div className="p-6">
              <dt className="font-semibold">Coming next</dt>
              <dd className="mt-1 text-ink-soft">Energy, water and broadband estimates, and comparing homes side by side.</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
