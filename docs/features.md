# Features

What TrueCost does today, feature by feature. Each section says what the renter sees, what
happens behind it, and where it stops.

Scope today: **council tax for homes in England and Wales, on the web**, plus saving and comparing
homes. This covers most of PRD Stage 1 ("Property intelligence") and Stage 2 ("Web experience"). See
[Not built yet](#not-built-yet).

---

## 1. Check a home from the landing page

**What the renter sees:** the first thing on the page is a form with two fields:

- **Where is it?** A postcode, or the address as the listing shows it.
- **Monthly rent** (optional).

Pressing **See the real monthly cost** opens the results page.

**What it accepts** (parsed by `parseAddress` in [`packages/core/src/address.ts`](../packages/core/src/address.ts)):

| Typed | Understood as |
|-------|---------------|
| `E8 3PN`, `e83pn`, `85 Kingsland Road, E8 2PB` | Full postcode |
| `Middleton Road, London, E8`, `Mare Street E8` | Street + outward code |
| `Navarino Road, Hackney, London` | Street + town |
| `Flat 2, 85 Kingsland Rd, Hackney` | Flat and house numbers removed, "Rd" read as "Road" |
| `E8` | Outward code only |
| `Hackney`, `Navarino Road`, `12345` | Rejected, with an example of what works |

On the landing page, rejected input is caught in the browser, before any request, with a message
showing both accepted formats. The search box on the results page sends it to the API, which
returns the same message.

**Why both formats:** most listings hide the full postcode. Of three real Rightmove listings checked,
one showed a full postcode, one showed "street, London, E8" and one showed "street, Hackney, London"
with no postcode at all.

---

## 2. Find the council

Done by `GET /api/lookup` ([api.md](api.md)). The renter sees the place name as the page title, the
council, and how precisely we know it.

| Input | How the council is found | How sure |
|-------|--------------------------|----------|
| Full postcode | ONS postcode directory (postcodes.io) | Exact |
| Street + outward code | Ordnance Survey road data, limited to that outward code | The road's council, plus a boundary check |
| Street + town | Ordnance Survey finds the town, then the road nearest to it | The road's council, plus a boundary check |
| Outward code only | Every council the outward code covers | The renter chooses |

**Council chooser:** when more than one council is possible, the renter sees each council's monthly
cost for the chosen band (or Band D) and the largest difference between them, e.g. "E8 covers parts of
3 councils … a difference of up to £22.53 a month". They can pick one, or enter the full postcode.

**Boundary roads:** Ordnance Survey assigns a whole road to one council. A road that *is* a boundary,
like Cleveland Street (Westminster on one side, Camden on the other), would otherwise show only one
council. So after finding a road we look at the postcodes within 75 m of it. If they belong to more
than one council, the renter is asked which side the home is on. Details in
[architecture.md](architecture.md#how-an-address-becomes-a-council).

**Not covered:** Scotland and Northern Ireland get a clear message instead of a number.

---

## 3. Council tax band

**What the renter sees:** a row of band buttons (A–H, or A–I in Wales). Each button shows that band's
monthly cost for this home and household. When no band is chosen yet, this step is highlighted with
"Start here" and the total shows a range.

**Where the band comes from:** the renter, usually copied from the listing. The page links to the
GOV.UK band checker so they can look it up themselves. We don't fetch bands automatically; see
[data-sources.md](data-sources.md#sources-we-do-not-use).

---

## 4. Who's living there

Four choices, each with its effect shown:

| Choice | Effect | Rule |
|--------|--------|------|
| Two or more adults | Full council tax | Default; it never understates the cost |
| Just me | 25% off | Single person discount |
| All full-time students | No council tax | Student exemption |
| A room in a shared house | Not included | The landlord is normally liable for council tax in an HMO |

The engine also handles mixed households (one worker with students gets 25% off) because students
are disregarded when counting adults ([`household.ts`](../packages/core/src/household.ts)).

Each choice adds practical advice, e.g. "The single person discount isn't automatic. Claim it from
Hackney council when you move in."

---

## 5. Monthly cost summary

**What the renter sees:**

- The headline monthly total: rent plus council tax.
- One line each for rent and council tax, each labelled **You entered**, **Official rate** or
  **Estimate**.
- The real bill: "Councils usually bill in 10 monthly payments, April to January, so expect about
  £183.14 a month".
- What's not included yet: energy, water and broadband.

**Rules:**

- Changing band, household or rent recalculates instantly in the browser, using the same engine
  as the server.
- **Official rate** means the published Band D for that exact place.
- **Estimate** means a council-wide average: the home is in a parish or town council, or in an area
  where the council charges "special expenses", and we can't tell which part.
- If this tax year's rates haven't been loaded yet, a warning says so.

**Phones:** the summary comes first. Once it scrolls out of view, a bar at the bottom keeps the total
visible.

---

## 6. How we worked this out

Below the results, the page shows the working step by step, e.g.:

1. E8 3PN is in Hackney. Source: Office for National Statistics postcode directory.
2. Hackney's 2026/27 Band D charge is £2,060.30 a year, including every precept. (Link to MHCLG.)
3. Band C pays 8/9 of Band D: £1,831.38 a year.
4. Single person discount of 25%: −£457.85.
5. That's £1,373.53 a year, or £114.46 a month on average.

This is the PRD's "Explain" step (§7.4) and its rule that the source and confidence of each cost must
be understandable (§9).

---

## 7. Shareable results

Everything on the results page is in the URL, e.g.
`/check?q=E8+3PN&rent=1500&band=C&who=single`. A check survives a refresh and can be bookmarked or
sent to someone. The `authority` parameter records which council the renter picked when several were
possible.

---

## 8. Live example on the landing page

"Cross one street and the bill changes by £1,158 a year" compares Westminster and Camden. The figures
are fetched from the API each time, so they can't go stale when the tax year changes. If the API is
down, the section is left out and the form still works.

---

## 9. Failure behaviour

TrueCost never shows a made-up number (PRD §14).

| Situation | What the renter sees |
|-----------|----------------------|
| API unreachable | "We couldn't reach TrueCost …" with **Try again**; no figures |
| Postcode service down | "Our address lookup isn't responding. Try again in a minute." |
| Street service down, outward code given | Falls back to listing every council in the outward code |
| Street not found | "We couldn't find Nowhere Lane near Hackney. Check the spelling, or use the postcode." |
| Rates for the current year not loaded | Warning that the figures are last year's |

---

## 10. Save and compare homes

PRD Stage 2: "Save properties · Compare properties". It answers the PRD's question for this stage:
do renters use the real monthly cost when choosing between homes?

**Saving:**
- A **Save this home** panel sits under the summary on the results page.
- The renter can give the home a name (default "Navarino Road, E8") and, optionally, paste the
  listing link for their own reference. We never open or read it.
- Only `http(s)` links are accepted.
- Once saved, the results page shows "Saved as …", and any change to band, household or rent is
  saved to that home automatically. A new search starts a fresh, unsaved check.

**Your homes** (`/homes`, linked from the header once something is saved):
- Homes are ranked by **real monthly cost** (rent plus council tax), cheapest first.
- Each home shows rent, council tax with its band and confidence label, the total, how far above the
  cheapest it is, and its position by rent alone when that differs (e.g. "#2 by rent alone").
- When the cheapest home isn't the one with the lowest rent, a note says so. For example: "Cleveland
  Street, W1T costs £24.88 a month less than Navarino Road, E8, even though its rent is £50 higher.
  That's £298.56 a year."
- Homes without a band or rent are listed last, unranked, with a link to finish them.
- Each home can be opened, renamed, or removed (with an "are you sure" step).
- **Side by side:** up to three ticked homes in a table (rent, council tax, total a month, a year,
  difference from the cheapest, household). It starts with the three cheapest. On phones it scrolls
  sideways.

**Storage:**
- Homes are kept in the browser on this device only, up to 20. Nothing is sent to our servers, and
  there's no account.
- Each home keeps a snapshot of its council and rate, so the page loads instantly without new
  lookups.
- When a new tax year's rates are loaded, each out-of-date home is looked up again, one at a time.
  If that fails, the page says which rates are being used.

The ranking rules are in [`packages/core/src/compare.ts`](../packages/core/src/compare.ts). Storage
and validation are in [`client/src/lib/savedHomes.ts`](../client/src/lib/savedHomes.ts); anything
malformed in storage is dropped rather than trusted.

---

## Limits today

- **Band:** entered by the renter. No automatic lookup and no "likely band" yet.
- **Street names:** matched exactly, apart from Rd/St/Ave-style abbreviations. A typo isn't found.
- **Broad areas:** a hint like "London" alone covers only part of a long road, so a boundary can be
  missed. "Seven Sisters Road, London" shows Hackney only; with "N4" or "Finsbury Park" it correctly
  offers Hackney and Haringey.
- **Parishes:** a street search can't tell which parish the home is in, so parished areas show an
  estimate.
- **Not modelled:** council tax reduction schemes, other disregarded groups (apprentices, carers,
  care leavers), and Scottish water and sewerage charges.
- **Speed:** a first street lookup takes 1.5–3 seconds. Repeat lookups are cached for 24 hours.

---

## Not built yet

From the PRD, in rough order:

1. **Energy estimates** from EPC data, priced at the Ofgem cap (§8.3, §8.4). Next phase; needs an
   EPC API key.
2. **Likely band** from VOA neighbourhood statistics (open data), when the listing doesn't show one.
3. **Water and broadband** estimates.
4. **Exact band by address and listing links:** needs permission from the VOA and the property portals.
5. **Scotland:** different band ratios (already in the engine), a different band register, and water
   charges.
6. **Saved homes across devices:** needs accounts and a database. Today they stay in one browser.
7. **Browser extension** (§8.6, Stage 3).
8. **Move-in onboarding:** tenancy upload, council registration, utilities, reminders (§10, Stage 4).
9. **Analytics and success metrics** (§17), including the share of renters who save more than one
   home.
