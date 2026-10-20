# TrueCost System Architecture

## Overview

An npm workspaces monorepo:

```
TrueCost/
├── packages/core/          # @truecost/core: calculation rules shared by API and web
│   └── src/                # bands, household discounts, money (pence), provenance, rate types
├── server/                 # Express API (TypeScript, run with tsx)
│   ├── data/raw/<year>/    # Official source spreadsheets + sources.json manifest
│   ├── scripts/            # import-rates.ts: raw spreadsheets → src/data/rates/<year>.json
│   └── src/
│       ├── adapters/       # External data sources (postcodes.io), behind narrow interfaces
│       ├── data/rates/     # Generated rate tables and the loader
│       ├── services/       # Location lookup, figures with provenance
│       └── routes/         # /api/health, /api/lookup, /api/council-tax
├── client/                 # Next.js 16 web app (Tailwind 4)
│   └── src/
│       ├── app/            # / (landing with the form), /check (results)
│       ├── components/     # report/ holds the results page pieces
│       └── lib/            # API client, URL state for /check
└── docs/
```

## Web app flow

1. `/`: postcode, or the street and town from a listing, plus optional rent → `/check?q=…&rent=…`.
2. `/check` calls `/api/lookup` once per place. Band, household and rent are then
   recalculated in the browser with `@truecost/core`, so changes are instant.
3. All state lives in the URL (`q`, `rent`, `band`, `who`, `authority`), so a check can be
   refreshed, bookmarked or shared.

## How an address becomes a council

1. **Full postcode** → postcodes.io gives the council, and the parish when there is one. Exact.
2. **Street + outward code** → OS Names searches a map box around the outward code's centre and keeps
   roads in that outward code.
3. **Street + town** → OS Names finds the town (biggest kind of place first, English or Welsh name),
   then searches boxes of 2.5, 5 and 7 km around it, nearest match first.
4. **Boundary check** (2 and 3). OS gives a whole road to one council, but a road on a boundary has
   homes in both (Cleveland Street: Westminster and Camden). So the road's position is converted from
   National Grid to latitude/longitude and postcodes.io lists the postcodes within 75 m. If they belong
   to more councils than OS named, the renter is asked which side they're on.
5. **Outward code only** → every council the outward code covers, for the renter to choose.

Limits: street names are matched exactly (after expanding Rd, St, etc.); a very broad area such as
"London" can cover only part of a long road, so listings with a neighbourhood or outward code resolve
boundaries better. Street search needs `OS_API_KEY`; without it, only postcodes and outward codes work.

## Data licensing

Only Open Government Licence sources are used in production paths: MHCLG and Welsh
Government rate tables, the ONS Postcode Directory via postcodes.io, and Ordnance Survey's
OS Names API (OS Open Names, "free for all to use for any purpose", attribution required;
600 requests a minute on a live project, 50 in development). The VOA band
checker ("not for commercial use") and property portal pages (terms forbid reuse) are
deliberately not integrated until permission or a licence is in place.

## Principles

- **Calculation is pure and shared.** `@truecost/core` has no I/O. The API uses it to
  calculate; the web app imports the same types (and can recalculate locally).
- **Money is integer pence.** Convert only when reading source data and when formatting.
- **Every figure carries provenance.** `Sourced<T>` holds the value, a confidence
  (`official`, `reported`, `user_provided`, `estimated`) and its source. The UI must
  never show an estimate as if it were a bill (PRD §9, §14).
- **No silent fallbacks.** If data is missing or a service is down, say so. Never
  substitute a made-up number.
- **External data sits behind adapters**, so providers can change without touching
  the UI (PRD §11).

## API

Base URL in development: `http://localhost:5000/api`

| Endpoint | Purpose |
|----------|---------|
| `GET /lookup?q=…` | Postcode (`E8 3PN`), street and outward code (`Mare Street, E8`) or street and town (`Navarino Road, Hackney`) → council, parish and Band D with provenance. When more than one council is possible the result is `multiple_councils`; pass `&authority=<GSS code>` to pick one |
| `GET /council-tax/authorities` | All billing authorities with average Band D for the loaded tax year |
| `GET /council-tax/authorities/:gssCode` | One authority: components, source, charge per band |
| `GET /council-tax/calculate?authority=E09000012&band=C&adults=1&students=0` | Council tax breakdown for a household |

Every response includes `taxYear` and `isCurrentYear`.

## Configuration

- `server/.env`: `PORT`, `CORS_ORIGIN` (comma-separated)
- `client`: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000`)
