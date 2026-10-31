# Data sources

Where every number comes from, under what licence, how we get it, and what can go wrong. The footer
of the website carries the required attributions.

---

## Sources we use

### Council tax rates: England

- **Publisher:** Ministry of Housing, Communities and Local Government (MHCLG).
- **Dataset:** *Council Tax levels set by local authorities in England*, Table 10 (local authority
  level data), published every March for the year starting in April.
- **Licence:** Open Government Licence v3.0. Commercial use allowed, with attribution.
- **What we take:** for each of the 296 billing authorities:
  - the area Band D including every precept (line 17);
  - its parts: council, parish average, county or GLA, police, fire, combined authority;
  - the number of precepting parishes;
  - special expenses.
- **How:** downloaded once a year into
  [`server/data/raw/2026-27/`](../server/data/raw/2026-27), then imported (see
  [runbook.md](runbook.md#update-rates-each-april)).
- **Watch out for:**
  - the published Band D is an **average** wherever there are parishes or special expenses;
  - council reorganisations change codes (e.g. Cumberland, North Yorkshire and Somerset in 2023).
    The import fails loudly if columns move.

### Council tax rates: Wales

- **Publisher:** Welsh Government.
- **Dataset:** *Council Tax levels*, Table 1, published every March.
- **Licence:** Open Government Licence v3.0.
- **What we take:** for each of the 22 councils, the overall average Band D, and its county,
  community council and police parts.
- **Watch out for:**
  - the table has names but no codes. Codes are mapped in the importer, checked against
    postcodes.io;
  - every Welsh council has community councils, so Welsh figures are always averages.

### Postcodes and nearby postcodes: postcodes.io

- **What it is:** a free public API over the ONS Postcode Directory.
- **Licence:** Open Government Licence. Attribution: "Contains OS data © Crown copyright and database
  right; contains Royal Mail data © Royal Mail copyright and database right; source: Office for
  National Statistics".
- **What we use:**
  - `/postcodes/{postcode}`: council GSS code, parish, country.
  - `/outcodes/{outcode}`: the councils an outward code covers, and its centre on the National Grid.
  - `/postcodes?lat=&lon=&radius=`: postcodes near a point, for the boundary check.
- **Limits:** no key; fair use. We cache answers for 24 hours (up to 5,000 entries) with a 5-second
  timeout.
- **Watch out for:** outward code results give council **names**, not codes, so they're matched by
  name (the ONS spellings are handled).

### Roads and towns: Ordnance Survey Names API

- **What it is:** OS Open Names (roads, towns, villages, suburbs) as an API.
- **Licence:** OS OpenData / Open Government Licence. OS describes the API as "free for all to use
  for any purpose". Attribution: "Contains OS data © Crown copyright and database right".
- **Access:** a free OS Data Hub key in `OS_API_KEY`. The key never reaches the browser.
- **Limits:** 600 requests a minute per project in **live** mode and 50 in **development** mode;
  HTTP 429 above that. A street lookup usually uses 2–4 OS requests (one place search,
  then a road search for each matching place). Cached for 24 hours, with an 8-second
  timeout.
- **Quirks we handle:**
  - It can only filter by map box (`BBOX`) and place type (`LOCAL_TYPE`), not by outward code or
    council.
  - Welsh places and roads are listed under the Welsh name (`NAME1`), with the English name in
    `NAME2`.
  - Council names differ from MHCLG's: "City of Bristol", "Caerdydd - Cardiff",
    "Bro Morgannwg - the Vale of Glamorgan", "City and County of the City of London". All 318
    councils match at least one OS spelling.
  - Some road sections name only the county; these are ignored.
  - **A whole road is assigned to one council, even when it is the boundary.** We check postcodes
    beside the road to catch this.

---

## Sources we do not use

Checked on 11 October 2026. Each one would make the product better, and each needs permission first.

| Source | What it would give us | Why not |
|--------|----------------------|---------|
| GOV.UK "Check your council tax band" (VOA) | The exact band for every address in a postcode | The service states: "This data is not to be used for commercial use". We link renters to it instead, so they look it up themselves. |
| Rightmove listing pages | Full postcode, rent, band, deposit, floor area, EPC image | The page data includes Rightmove's notice that it is for Rightmove's use only and that other use breaches their terms. |
| Zoopla listing pages | The same | Servers are blocked (HTTP 403). The terms would be the same issue. |

**Routes to unlock them:**
- **VOA:** ask for a data licence, or use a commercial provider that resells band data (check
  their licence chain).
- **Portals:** a data partnership, or the browser extension reading the page the renter already has
  open. That needs its own legal view.

---

## Planned next

| Source | For | Licence |
|--------|-----|---------|
| VOA *Council Tax: stock of properties* (CTSOP 3.1: bands by property type for each small neighbourhood) | Suggesting a likely band when the listing has none | Official statistics, Open Government Licence |
| EPC register | Energy estimates (PRD §8.4) | Open Government Licence; terms to be checked |
