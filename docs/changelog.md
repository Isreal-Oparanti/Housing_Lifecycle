# Changelog: the journey and the fixes

How TrueCost got from the first scaffold to today, what was wrong at each stage, and every fix with
its cause. Newest work is last, so it reads as a story.

---

## Where we started (5 October 2026)

Commits `d791b67`, `6419a2a`, `be66a18`: an Express API, a Next.js landing page, and a "rate
calculator sandbox".

Reviewed against the PRD on 11 October, it had problems at three levels.

**Product.** The renter had to choose their council from a dropdown and pick their band. That is the
research the PRD says TrueCost exists to remove (PRD §2, §7). The page was mostly marketing copy, with
a toy calculator further down.

**Accuracy.** It showed numbers that weren't true, which PRD §14 rules out:

- When the API was down, the page silently made up a result, using a default Band D of £1,500 for
  any council it didn't know.
- Rates were for 2024/25, two tax years out of date, and covered only 10 councils.
- Scotland used the English band fractions. Scotland's bands E–H changed in 2017.
- Wales had no Band I.
- The page said "verified against Valuation Office Agency formulas" and showed a bar of council
  names that implied partnerships. Neither was true.
- Parish charges were ignored.

**Engineering.**

- Every figure was a bare number with no source or confidence, which PRD §9 requires.
- Money was handled as floating-point pounds.
- The calculation was duplicated in the browser.
- The API URL was hard-coded.
- Nothing was tested.

---

## Stage 0: What data can we legally use? (11 October)

Before building, we tested each data source the product would need.

| Source | Works? | Can we use it commercially? |
|--------|--------|-----------------------------|
| postcodes.io (ONS postcode directory) | Yes | Yes, Open Government Licence |
| MHCLG and Welsh Government rate tables | Yes | Yes, Open Government Licence |
| GOV.UK band checker (VOA) | Yes. One postcode returned 30 homes in 6 bands | **No**: "This data is not to be used for commercial use" |
| Rightmove listing pages | Yes: full postcode, rent, band and deposit sit in the page data | **No**: the page data carries Rightmove's own terms forbidding reuse |
| Zoopla listing pages | No: HTTP 403 to servers | n/a |

**Decision:** build on open data only. See [decisions.md](decisions.md#d1-open-data-only-until-licensed).

---

## Stage 1: Calculation engine and official rates (11 October)

- **Shared engine:** created `@truecost/core` ([`packages/core`](../packages/core)). It holds the
  band fractions for all three nations, household discounts, money in pence, the 10-instalment bill
  and provenance types. The API and the website both use it.
- **Official rates:** downloaded the 2026/27 rate spreadsheets from MHCLG (England, 296 councils) and
  the Welsh Government (22 councils).
- **Importer** ([`server/scripts/import-rates.ts`](../server/scripts/import-rates.ts)): turns the
  spreadsheets into a checked JSON file. It refuses to write output if a column moves or a council's
  charges don't add up to its published total.
- **Average or exact:** each council records whether its Band D varies within its area. Only 81 of
  the 318 councils charge the same everywhere; in the rest the published figure is an average.
- **New API:** `/api/council-tax/authorities` and `/calculate`. Every response says which tax year it
  uses and whether that year is the current one.
- **Old page made honest:** removed the made-up fallback and the false claims, and fixed the outdated
  hero figures.

## Stage 2: Postcode lookup and redesign (11 October)

- **Postcode lookup:** `GET /api/lookup` turns a postcode into a council, and a parish when there is
  one, using postcodes.io. A postcode outside any parish gets the exact Band D, without the averaged
  parish charge.
- **Outward codes:** for "E8", the API returns every council the area covers and the website lets
  the renter choose.
- **Website rebuilt:**
  - The form is the first thing on the landing page.
  - The new results page has a band picker that shows each band's cost, a household picker and a
    summary with confidence labels.
  - A step-by-step explanation shows the working.
  - All state is kept in the URL.
  - The layout is mobile-first.
- **Upgrades:** Next 16, React 19.2 and Tailwind 4. `npm audit` went from 12 findings to 0.

## Stage 3: Street search (17 October)

The founder asked whether renters can actually get a postcode from a listing. Mostly they can't, so a
street plus town had to work.

- **Street search** using the Ordnance Survey Names API (open data, free key). Supports
  "street, outward code" and "street, town" ([`server/src/adapters/osNames.ts`](../server/src/adapters/osNames.ts)).
- **Council names:** checked OS's spellings against all 318 councils. Every council now matches.

## Stage 4: Boundary roads (17 October)

- **The problem:** testing on real data showed that OS assigns a whole road to one council.
  Cleveland Street, the Westminster–Camden boundary, came back as "Westminster". That is the PRD's
  boundary problem (§2, §8.5), answered silently and wrongly.
- **The fix:**
  - Convert each matched road section's position to latitude and longitude
    ([`packages/core/src/geo.ts`](../packages/core/src/geo.ts), accurate to 2 m).
  - Ask postcodes.io which postcodes are within 75 m.
  - If they belong to more than one council, the renter chooses.
- **Verified on real roads:**
  - Cleveland Street now offers Westminster and Camden.
  - Seven Sisters Road offers Hackney and Haringey.
  - Navarino Road and Holloway Road stay single-council.

## New logo (20 October)

The original logo was a generic house icon from the first scaffold. It was replaced with the
"stacked costs" mark, chosen from four concepts: a house whose body is three bars for rent, council
tax and bills.

It's used in the header and footer, the browser tab icon, the iPhone home-screen icon and the
link-preview image, which didn't exist before. See [brand.md](brand.md).

## Committed (20 October)

Branch `feat/council-tax-engine-and-street-search`, in four commits covering core, server, client
and docs. 151 automated tests.

## Stage 5: Save and compare (31 October)

PRD Stage 2's remaining features. See [features.md](features.md#10-save-and-compare-homes).

**Order:** we discussed doing energy first, because it adds the most to the total. Save and compare
went first instead: it needs no new data or keys, and it tests whether renters use the real cost to
choose at all.

**What was built:**
- Saving from the results page, with automatic updates after changes.
- The "Your homes" page, ranked by real monthly cost.
- The "cheaper than it looks" note.
- The side-by-side table of up to three homes.
- Yearly rate refresh, using `GET /api/council-tax/year`.

**Verified in the browser:**
- Saving, the unsafe-link rejection, automatic updates, ranking and the note.
- The worked example: £1,627.74 against £1,652.62, so £24.88 a month or £298.56 a year.
- A deliberately out-of-date home refreshed to 2026/27.
- Removing a home.
- Desktop and phone layouts, with no horizontal overflow.

**Tests:** 30 new (ranking rules, storage validation, link safety, cost maths). 181 automated tests
in total, and the website now has its own test runner.

**Security:** new advisories since the last upgrade (Next.js 16.0–16.4.0, critical; body-parser,
high; qs, moderate). Upgraded to Next 16.4.3, body-parser 1.20.9 and qs 6.16.2. `npm audit`: 0.

---

## Fix log

Every defect found along the way, why it happened, and how it was fixed and checked.

### Accuracy

| Problem | Cause | Fix | Checked by |
|---------|-------|-----|------------|
| Made-up council tax when the API was down | Client-side fallback with a £1,500 default Band D | Removed. The page shows an error and no figures | Stopped the API and reloaded the page |
| Rates two years old, 10 councils | Hand-typed sample table | Official 2026/27 spreadsheets for all 318 councils, with an importer | Tests check Hackney £2,060.30, Westminster £1,049.55, Manchester £2,312.04 and Cardiff £2,013.18 against the published tables |
| Scotland bands E–H wrong | English fractions reused | 473/360, 585/360, 705/360, 882/360 (2017 Order) | `bands.test.ts` |
| Wales missing Band I | Not modelled | Band I = 21/9 | `bands.test.ts`; Cardiff Band I checked in the browser |
| False "verified against VOA" claim, council logo bar, "Lowest in UK" badge | Marketing copy | Removed. Sources are named next to figures instead | Page review |
| Penny errors | Floating-point pounds (`1549.79 * 100 = 154978.99999999997`) | Integer pence everywhere | `money.test.ts` |
| Parish averages shown as exact | No notion of variation within a council | `variesWithinArea`, `hasSpecialExpenses` and `bandDForPlace`. Exact only when it's known to be exact | `rates.test.ts` (Leeds city centre exact; Banbury estimate) |
| Test assumed Westminster's unparished areas were exact | Westminster also charges special expenses | Test corrected; special expenses tracked separately | Imported data inspected |
| Bill shown as yearly ÷ 12 only | Councils bill over 10 months | Added the 10-instalment amount | `councilTax.test.ts` |

### Address and council lookup

| Problem | Cause | Fix | Checked by |
|---------|-------|-----|------------|
| "Flat B2, Mare Street" read as Birmingham (B2) | Any postcode-like token was accepted | An outward code only counts at the end of the text | `postcode.test.ts` |
| Most listings rejected | Only postcodes accepted, but listings hide them | Street + outward code and street + town via OS Names | Real listing formats tested live |
| OS filter requests failing with HTTP 400 | OS only filters by map box and place type, with several values in one `fq` | Map-box search; filtering by outward code and council done in our code | Live API tests |
| "Middleton Road E8" found Middleton Roads elsewhere | Free-text search doesn't treat "E8" as a postcode area | Search a box around the outward code's centre and keep roads in that outward code | Live: resolves to Hackney |
| "Kingsland Road, Hackney" also offered Newham | A 7 km box reached a different Kingsland Road | Search 2.5 km, then 5 km, then 7 km from the town and stop at the first match | Live, plus `locateStreet.test.ts` |
| "High Street, Oxford" offered 7 councils | Hamlets called "Oxford" in Staffordshire were searched too | Search the biggest kind of place first (city, town, suburb, village, hamlet) | Live, plus tests |
| Welsh places and streets not found | OS lists them under their Welsh name (Casnewydd) with the English name second | Match either name | Live: "Queen Street, Newport" |
| Councils not recognised | OS spellings differ: "City of Bristol", "Caerdydd - Cardiff", "Bro Morgannwg - the Vale of Glamorgan", "City and County of the City of London" | Name variants tried in order | Checked OS spellings for all 318 councils: every council matches |
| "Oxfordshire isn't covered" shown for an English road | Some OS road sections only name the county | Sections with no district are ignored | Tests |
| Boundary roads given one council | OS assigns a whole road to one council | Check postcodes within 75 m of the road | Live: Cleveland Street, Seven Sisters Road |
| "Royal Mile, Edinburgh" said "not found" | No road match, so the Scotland check never ran | The country of the matched town is used too | Tests and live |

### Server

| Problem | Cause | Fix |
|---------|-------|-----|
| `OS_API_KEY` empty at start-up | Route modules read the environment before `dotenv.config()` ran, because ES module imports run first | `import "dotenv/config"` is the first import in [`index.ts`](../server/src/index.ts) |
| A failed lookup could crash the request | Express 4 doesn't catch errors thrown in async handlers | Every failure path ends the response (502 for upstream outages, 500 otherwise) |
| Risk of leaking the OS key in errors or logs | The key is part of the request URL | The key is excluded from cache keys and error messages. Tested in `osNames.test.ts` |
| Any website could call the API | `cors()` with no options | Only origins in `CORS_ORIGIN` are allowed |

### Website

| Problem | Cause | Fix |
|---------|-------|-----|
| Potential endless fetch loop | `bandsFor()` returned a new array on every render and was used as an effect dependency | `useMemo`, keyed on the nation |
| Price range wrapped onto two lines | Headline sized for a single figure | Smaller, no-wrap style for ranges |
| Total shown twice on phones | The bottom bar was always visible | The bar appears only after the summary scrolls away |
| Browser offered the user's own postcode | `autoComplete="postal-code"` on a field that takes any address | `autoComplete="off"` |
| Landing example would go stale each April | Hard-coded figures | Fetched live from the API |
| Tax year shown as "2026-27" | Data format | Shown as "2026/27", as councils write it |
| "Choose the band" link hidden under the header | No scroll offset on the target heading | Scroll margin on the step headings |

### Dependencies

| Problem | Fix |
|---------|-----|
| Critical advisory in vitest 3 (tinypool) | vitest 4.1.11 |
| High advisories in Tailwind 3 and Next 15's bundled postcss | Next 16.3.8 and Tailwind 4.3.3. `npm audit`: 0 |
| Critical Next.js advisories published after that upgrade (remote code execution via SVG image optimisation and `use cache`; Server Actions DoS), plus body-parser and qs | Next 16.4.3, body-parser 1.20.9, qs 6.16.2 (31 October). `npm audit`: 0 |

---

## Operational notes

- **OS key shared in plain text.** On 17 October the OS key and its secret were shared in plain text
  outside the project's secret store. They were never committed: a scan of all 78 committed files
  found neither. Rotate both before launch; see [runbook.md](runbook.md#rotate-the-os-key).
