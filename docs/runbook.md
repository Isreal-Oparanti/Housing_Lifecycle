# Runbook

How to run TrueCost, keep it up to date, test it, and what's left before launch.

---

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
```

Run that once, from the repo root. It installs every workspace.

```bash
npm run dev:server
```

The API runs on http://localhost:5000.

```bash
npm run dev:client
```

The website runs on http://localhost:3000.

### Environment

Copy `server/.env.example` to `server/.env`:

| Variable | Needed | Meaning |
|----------|--------|---------|
| `PORT` | no | API port, default 5000 |
| `CORS_ORIGIN` | no | Comma-separated websites allowed to call the API. Default `http://localhost:3000` |
| `OS_API_KEY` | for street search | Ordnance Survey Names API key. Without it, only postcodes and outward codes work |
| `POSTCODES_IO_URL` | no | Override the postcodes.io address (e.g. a self-hosted copy) |

The website reads `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).

`server/.env` is git-ignored. Never commit a key.

---

## Commands

Run these from the repo root.

| Command | Does |
|---------|------|
| `npm test` | Every test in core, server and website (181 tests) |
| `npm run typecheck` | Type-checks every workspace |
| `npm run build -w truecost-client` | Production build of the website |
| `npm run import:rates -- 2026-27` | Rebuilds the rates JSON from the raw spreadsheets |
| `npm run check:council-names -w truecost-server` | Checks OS council spellings still match our councils (needs `OS_API_KEY`) |

---

## Update rates each April

MHCLG and the Welsh Government publish the new year's levels in late March. Until the new year is
loaded, the API returns `isCurrentYear: false` from 1 April and the website warns renters.

1. Download the new files into `server/data/raw/<year>/`, e.g. `server/data/raw/2027-28/`:
   - **England:** *Council Tax levels set by local authorities in England <year>*, the "Table 10 Local
     Authority Level Data" spreadsheet on gov.uk.
   - **Wales:** *Council Tax levels: April <year> to March <year+1>*, the XLSX on gov.wales.
2. Copy last year's `sources.json` into the new folder and update the file names, URLs and
   `retrieved` date.
3. Run `npm run import:rates -- 2027-28`.
   - It stops with a clear error if a column moved, a council's parts don't add up to its total, or
     a Welsh council name is new.
   - Fix the cause. Don't edit the output.
4. In [`server/src/data/rates/index.ts`](../server/src/data/rates/index.ts), import the new JSON and
   make it `latest`. Keep the old file.
5. Update the published figures in
   [`server/src/data/rates/rates.test.ts`](../server/src/data/rates/rates.test.ts) (Hackney,
   Westminster, Manchester, Cardiff) from the new tables, then run `npm test`.
6. If councils were reorganised, check `findAuthorityByName` still matches the ONS and OS spellings.
   The council-name check below does this.

---

## Manage the Ordnance Survey key

### Rotate the OS key

Do this before launch: the current key and its secret were shared in plain text on 17 October.

1. In the OS Data Hub, open the TrueCost project and regenerate the key.
2. Replace `OS_API_KEY` in `server/.env` and in the hosting provider's settings.
3. Restart the API.

### Go live

New OS projects start in **development** mode (50 requests a minute). Switch the project to **live**
(600 a minute) before real users arrive. A busy minute in development mode returns HTTP 429, which
renters see as "Our address lookup isn't responding".

---

## How it's tested

**Automated** (`npm test`):

| Area | File | Checks |
|------|------|--------|
| Bands | `packages/core/src/bands.test.ts` | Ratios per nation; Hackney Band C £1,831.38; Wales Band I; Scotland Band E |
| Discounts | `household.test.ts` | Single, couple, students, mixed households, impossible households |
| Calculation | `councilTax.test.ts` | Net, discount, 12-month and 10-instalment figures to the penny |
| Exact or average | `rates.test.ts` | Leeds city centre exact; parished and special-expense areas estimated |
| Address reading | `address.test.ts`, `postcode.test.ts` | Real listing formats, flat numbers, abbreviations, rejects |
| Coordinates | `geo.test.ts` | Within 5 m of ONS positions in London, Leeds, Edinburgh, Truro, Cardiff |
| Imported rates | `server/src/data/rates/rates.test.ts` | 296 + 22 councils; published Band D figures; parts add up for every council |
| Lookups | `server/src/services/locate.test.ts` | Postcode, parish, Wales, Scotland, outward codes, council name spellings |
| Street search | `locateStreet.test.ts` | Real OS responses (fixtures); nearest road; biggest place; Welsh names; boundary roads; outages |
| OS adapter | `server/src/adapters/osNames.test.ts` | Request format; caching; the key never appears in errors |
| Comparison | `packages/core/src/compare.test.ts` | Ranking by real cost, rent rank, the "cheaper than it looks" note, incomplete homes, ties |
| Saved homes | `client/src/lib/savedHomes.test.ts` | Storage validation, unsafe links rejected, the 20-home limit, cost per saved home |

**Manual checks done before each release so far:**
- Live lookups for the listing formats in [features.md](features.md).
- Walking through the website in a browser, desktop and phone width.
- Stopping the API to check error states.
- Running the production build.

### Council-name check

Run this after a council reorganisation or a new tax year:

```bash
npm run check:council-names -w truecost-server
```

[`server/scripts/check-council-names.ts`](../server/scripts/check-council-names.ts) searches OS Names
for every council in the rates file. It then lists:

- OS spellings that match none of our councils. Scottish councils and English counties are expected
  here.
- Any of our councils that no OS spelling reaches. It exits with an error if there are any.

It makes about 320 requests, so run it on a live OS project. The last run, on 17 October, reached
all 318 councils.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| "Port 5000 is in use" | Another copy of the API is running. Stop it, or set `PORT` |
| Street search says "isn't switched on yet" | `OS_API_KEY` is missing, or the API was started before `.env` existed. Restart it |
| "Our address lookup isn't responding" | postcodes.io or OS is down, or the OS rate limit was hit (check for 429s in the API log) |
| Figures carry a "last year's rates" warning | April has passed without importing the new year. See above |
| Website shows "We couldn't reach TrueCost" | The API isn't running, or `NEXT_PUBLIC_API_URL` / `CORS_ORIGIN` don't match |

---

## Before launch

- [ ] Rotate the OS key and switch the OS project to live.
- [ ] **Rate-limit `/api/lookup`.** It currently has no limit, so anyone could use up the OS quota.
- [ ] Deploy the API and website. Set `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` for the real addresses.
- [ ] Shared cache (e.g. Redis) if running more than one API instance. The cache is in memory now.
- [ ] Error tracking and basic request logging, without storing what renters type.
- [ ] Legal sign-off on the data approach in [data-sources.md](data-sources.md), and a privacy notice.
- [ ] Analytics for the PRD's success metrics (§17).
