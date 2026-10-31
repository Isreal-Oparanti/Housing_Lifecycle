# Decisions

The main technical and product decisions: what we chose, what we rejected, and what it costs us.
Add a new entry when a decision changes; don't rewrite history.

---

## D1. Open data only, until licensed

**Decision:** production paths use only sources licensed for commercial use: government rate tables,
the ONS postcode directory (via postcodes.io) and Ordnance Survey Open Names.

**Rejected for now:**
- Fetching bands from the GOV.UK band checker. It works, but says "not for commercial use".
- Reading Rightmove or Zoopla pages. Rightmove's terms forbid reuse, and Zoopla blocks servers.

**Cost:** the renter enters the band themselves, and pasting a listing link isn't supported.

**Revisit when:** we have a VOA licence, a licensed band reseller, or a portal partnership. The code
keeps each source behind its own adapter, so adding one won't change the website.

## D2. One shared calculation engine

**Decision:** a `@truecost/core` workspace package holds every rule: bands, discounts, money,
provenance, address parsing and coordinates. It has no I/O. The API and the website import the same
code.

**Why:** the old site duplicated the calculation in the browser, and the two copies could disagree.
Now the website can also recalculate instantly when the renter changes band, household or rent.

**How:** npm workspaces. The package exports its TypeScript source directly. Next.js compiles it via
`transpilePackages`; the server runs it with `tsx` and type-checks with `tsc --noEmit`.

## D3. Money in whole pence

Floating-point pounds drift (`1549.79 * 100 === 154978.99999999997`), and a cost tool that is a penny
out looks broken. Amounts are converted to pence when read from the source spreadsheets, and back to
pounds only for display.

## D4. Every figure carries its source and confidence

**Decision:** figures travel as `Sourced<T>`: a value, a confidence (`official`, `reported`,
`user_provided` or `estimated`), a source, and an optional plain-English note. The website labels
each line accordingly.

**Why:** PRD §9 ("a user should never confuse an estimated utility cost with an official bill") and
§14 ("we do not treat incomplete property data as certain").

**Corollary:** no silent fallbacks. If data is missing or a service is down, the renter is told. A
made-up number is never shown.

## D5. Rates come from the official spreadsheets, through a checked importer

**Decision:** the raw government files are kept in the repo under
[`server/data/raw/<year>/`](../server/data/raw/2026-27), with a `sources.json` recording the URL and
the date each was downloaded. An importer turns them into `server/src/data/rates/<year>.json`.

**Why:**
- Every figure can be traced back to its source file.
- The importer fails loudly if the spreadsheet layout changes or the published charges don't add up.

**Rejected:**
- Hand-typed tables. That's how the old data went two years stale.
- Scraping council websites.

**Yearly process:** see [runbook.md](runbook.md#update-rates-each-april). The API reports
`isCurrentYear: false` if April passes without new rates, and the website warns.

## D6. "Exact" Band D only when we know it's exact

The government publishes an average Band D for each council, including parish charges. A figure is
labelled **official** only when:

- the council charges the same everywhere (81 of 318 councils), or
- the full postcode is outside any parish **and** the council has no "special expenses". Then the
  averaged parish charge is removed.

Everything else is labelled an **estimate**, with a note explaining why.

## D7. Keep a separate API server

**Decision:** keep the Express API instead of moving it into Next.js route handlers.

**Why:**
- The browser extension (PRD §8.6) will need the same API.
- Lookups call slow outside services, which doesn't suit serverless time limits well.
- The API can be scaled and cached on its own.

**Cost:** two processes to run and deploy.

## D8. How an address becomes a council

**Order:** full postcode → street + outward code → street + town → outward code only. Details in
[architecture.md](architecture.md#how-an-address-becomes-a-council).

**Choices within it:**
- **Search a map box, not free text.** OS can only filter by map box and place type, and its
  free-text ranking returns the wrong "Middleton Road".
- **Nearest first, biggest place first.** This stops neighbouring councils' same-named roads, and
  hamlets sharing a city's name, from being offered.
- **Boundary check with postcodes.** OS gives a whole road to one council, which is wrong exactly
  on boundary roads. A 75 m radius caught both sides of the boundary roads we tested without flagging
  interior roads; 60 m and 150 m gave the same answers on those roads.
- **When in doubt, ask.** If more than one council is possible, the renter chooses. We never pick one
  silently.

**Rejected for now:** paid address autocomplete (Ideal Postcodes, getAddress.io, OS Places). It gives
the best experience, but costs a few pence per search. Worth adding once there's usage.

## D9. The renter enters the band, and sees what each band costs

**Why:** most listings show the band. Showing each band's monthly cost on its button makes the choice
informative, and makes the cost of a wrong band obvious. A GOV.UK link lets the renter check for
themselves, which is allowed (D1).

**Next:** suggest a likely band from VOA's open neighbourhood statistics, labelled as an estimate.

## D10. Results live in the URL

Postcode, rent, band, household and chosen council are all URL parameters. A check survives a
refresh and can be shared. The API is called once per place; band, household and rent changes are
recalculated in the browser.

## D11. England and Wales first

**Why:** both use the same band register (VOA) and similar rules.

- **Scotland:** different ratios (already in the engine), a different assessor, and water charges
  on the bill. Planned next.
- **Northern Ireland:** uses domestic rates, not council tax. Out of scope.

## D12. Household defaults to "two or more adults"

The full charge. It never understates the cost; discounts are one tap away.

## D13. A room in a shared house excludes council tax

When rooms are let on separate tenancies, the landlord is normally liable. We show "Usually paid by
the landlord" and add advice to check the tenancy, rather than a number that probably isn't the
renter's.

## D14. Show the 10-instalment bill

Councils bill April to January unless asked for 12, so the bills that arrive are 20% bigger than
"yearly ÷ 12". Both figures are shown: the 12-month average for budgeting, the instalment for what
actually arrives.

## D15. Upgrade to Next 16, React 19.2 and Tailwind 4 during the redesign

The redesign replaced every page anyway. Upgrading at the same time cleared all `npm audit` findings
for little extra work. We pinned Next 16.3.8 rather than 16.4.0, which was days old at the time.

## D16. Saved homes live in the browser, with a rates snapshot

**Decision:** saved homes are stored in the renter's browser (localStorage), up to 20, with no
account. Each keeps what the renter entered plus a snapshot of its council and Band D.

**Why:**
- It tests whether renters want this before we build accounts, a database and the privacy work
  they bring.
- The snapshot means the "Your homes" page loads instantly. Re-running street lookups for every home
  would cost up to about 10 outside requests each and use up the Ordnance Survey quota.
- Rates only change once a year. When `GET /api/council-tax/year` reports a newer year,
  out-of-date homes are looked up again one at a time.

**Cost:**
- Homes don't follow the renter between devices.
- Clearing browser data removes them. The page says so.

**Revisit when:** analytics show renters saving several homes and coming back. That's the signal to
add accounts.

## D17. Compare on real cost, and say when rent misleads

Homes are ranked by rent plus every known cost. Homes missing a band or rent are left unranked
rather than guessed. The one sentence we add, "costs £24.88 a month less … even though its rent is
£50 higher", appears only when the cheapest home by real cost isn't the one with the lowest rent.
That is the product's core insight, so it isn't repeated when it doesn't apply.
