# API reference

Base URL in development: `http://localhost:5000/api`. All responses are JSON. Money is in **whole
pence** (`206030` = £2,060.30). Every response includes `taxYear` and `isCurrentYear`.

Types are defined once, in [`packages/core/src/api.ts`](../packages/core/src/api.ts), and shared
with the website.

The examples below are real responses, captured on 20 October 2026. Long `source` objects are
shortened to `…`.

---

## `GET /api/lookup`

Turns what the renter typed into a council and a Band D charge.

| Parameter | Required | Meaning |
|-----------|----------|---------|
| `q` | yes | A postcode (`E8 3PN`), street + outward code (`Mare Street, E8`), street + town (`Navarino Road, Hackney`) or an outward code (`E8`). Up to 200 characters. |
| `authority` | no | The GSS code of the council the renter picked, when the previous answer was `multiple_councils`. |

### Outcomes

| `status` | HTTP | Meaning |
|----------|------|---------|
| `resolved` | 200 | One council. Includes `place`, `authority`, `bandD`. |
| `multiple_councils` | 200 | More than one council is possible. Includes `place`, `options[]`, `otherAreas[]`. |
| `unsupported` | 200 | The place is in Scotland or Northern Ireland. Includes `place`, `message`. |
| `not_found` | 404 | The postcode, area or street wasn't found. Includes `message`. |
| `invalid` | 400 | The input can't be read as an address. Includes `message`. |
| `error` | 502 / 500 | An outside service is down (502) or something else failed (500). Includes `message`. |

`place.precision` says how the place was found: `postcode`, `outcode` or `street`.
`bandD.confidence` is `official` when the figure is exact for this place, and `estimated` when it's a
council-wide average (the `note` says why).

### Full postcode

`GET /api/lookup?q=E8%203PN`

```json
{
  "taxYear": "2026-27",
  "isCurrentYear": true,
  "status": "resolved",
  "place": { "query": "E8 3PN", "outcode": "E8", "postcode": "E8 3PN", "precision": "postcode" },
  "authority": {
    "gssCode": "E09000012",
    "name": "Hackney",
    "nation": "england",
    "areaBandD": 206030,
    "variesWithinArea": false
  },
  "bandD": {
    "value": 206030,
    "confidence": "official",
    "source": {
      "name": "…",
      "publisher": "Ministry of Housing, Communities and Local Government",
      "url": "…",
      "licence": "Open Government Licence v3.0"
    }
  }
}
```

### Postcode inside a parish

`GET /api/lookup?q=OX16%205EF`: Cherwell, Banbury parish. The Band D is an average, so it's labelled
an estimate.

```json
{
  "status": "resolved",
  "place": { "query": "OX16 5EF", "outcode": "OX16", "postcode": "OX16 5EF", "precision": "postcode", "parish": "Banbury" },
  "authority": { "gssCode": "E07000177", "name": "Cherwell", "nation": "england", "areaBandD": 258296, "variesWithinArea": true },
  "bandD": {
    "value": 258296,
    "confidence": "estimated",
    "note": "Average for Cherwell. The exact charge depends on the parish or town council the home is in."
  }
}
```

### Street and town, no postcode

`GET /api/lookup?q=Navarino%20Road%2C%20Hackney%2C%20London`

```json
{
  "status": "resolved",
  "place": { "query": "Navarino Road, Hackney, London", "precision": "street", "street": "Navarino Road", "outcode": "E8" },
  "authority": { "gssCode": "E09000012", "name": "Hackney", "nation": "england", "areaBandD": 206030, "variesWithinArea": false },
  "bandD": { "value": 206030, "confidence": "official" }
}
```

### A road on a council boundary

`GET /api/lookup?q=Cleveland%20Street%2C%20Fitzrovia`: homes on either side are in different
councils.

```json
{
  "status": "multiple_councils",
  "place": { "query": "Cleveland Street, Fitzrovia", "precision": "street", "street": "Cleveland Street", "outcode": "W1T" },
  "options": [
    {
      "authority": { "gssCode": "E09000033", "name": "Westminster", "nation": "england", "areaBandD": 104955, "variesWithinArea": true },
      "bandD": { "value": 104955, "confidence": "estimated", "note": "Average for Westminster. …" }
    },
    {
      "authority": { "gssCode": "E09000007", "name": "Camden", "nation": "england", "areaBandD": 220755, "variesWithinArea": true },
      "bandD": { "value": 220755, "confidence": "estimated", "note": "Average for Camden. …" }
    }
  ],
  "otherAreas": []
}
```

Picking one: `GET /api/lookup?q=Cleveland%20Street%2C%20Fitzrovia&authority=E09000007` returns
`"status": "resolved"` with Camden.

### Outward code only

`GET /api/lookup?q=E8` returns `multiple_councils` with Hackney, Islington and Tower Hamlets. The
first two are shown here:

```json
{
  "status": "multiple_councils",
  "place": { "query": "E8", "outcode": "E8", "precision": "outcode" },
  "options": [
    { "authority": { "gssCode": "E09000012", "name": "Hackney", "areaBandD": 206030 }, "bandD": { "value": 206030, "confidence": "official" } },
    { "authority": { "gssCode": "E09000019", "name": "Islington", "areaBandD": 210815 }, "bandD": { "value": 210815, "confidence": "official" } }
  ],
  "otherAreas": []
}
```

### Not covered, not found, invalid

```json
{ "status": "unsupported", "place": { "postcode": "EH1 1YZ", "precision": "postcode" },
  "message": "TrueCost covers England and Wales so far. Scotland is coming next." }
```
```json
{ "status": "not_found", "message": "We couldn't find ZZ1 1ZZ. Check it, or try just the first part (ZZ1)." }
```
```json
{ "status": "invalid", "message": "Enter a postcode, like E8 3PN, or the listing's address with its town, like “Navarino Road, Hackney”." }
```

### Notes

- **Speed:** a first street lookup makes up to about 10 outside requests (OS place and road
  searches, then nearby-postcode checks for the boundary) and takes about 1.5–3 seconds. Answers
  from postcodes.io and OS are cached in memory for 24 hours.
- **Street search is optional:** without `OS_API_KEY`, street inputs return `invalid` with a message
  asking for a postcode.
- **Failure handling:** if street search fails but an outward code was given, the API falls back to
  listing that outward code's councils. If the postcode service fails during the boundary check, the
  road's own council is used.
- **The renter's own values** (rent, band, household) are never sent here. The website calculates
  those locally.

---

## `GET /api/council-tax/calculate`

The full breakdown for one council, band and household. The website does this itself with
`@truecost/core`; this endpoint is for other clients and testing.

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `authority` | (required) | GSS code, e.g. `E09000012` |
| `band` | (required) | `A`–`H` (`A`–`I` in Wales). Also accepts `c` or `Band C` |
| `adults` | `2` | Adults aged 18+ living there |
| `students` | `0` | How many of those are full-time students |

`GET /api/council-tax/calculate?authority=E09000012&band=C&adults=1&students=0`

```json
{
  "taxYear": "2026-27",
  "isCurrentYear": true,
  "authority": { "gssCode": "E09000012", "name": "Hackney", "nation": "england", "areaBandD": 206030, "variesWithinArea": false },
  "band": { "value": "C", "confidence": "user_provided" },
  "bandD": { "value": 206030, "confidence": "official" },
  "household": { "adults": 1, "fullTimeStudents": 0 },
  "breakdown": {
    "nation": "england",
    "band": "C",
    "bandD": 206030,
    "ratio": { "numerator": 8, "denominator": 9 },
    "annualGross": 183138,
    "relief": { "kind": "single_person_discount", "percent": 25 },
    "annualReduction": 45785,
    "annualNet": 137353,
    "monthlyAverage": 11446,
    "tenMonthInstalment": 13735
  }
}
```

**Errors:**
- Unknown council: 404.
- A band that doesn't exist in that nation: 400 (`"Band must be one of A, B, C, D, E, F, G, H"`).
- An impossible household, such as more students than adults: 400.

---

## `GET /api/council-tax/year`

Which tax year's rates are loaded: `{ "taxYear": "2026-27", "isCurrentYear": true }`. The "Your
homes" page uses it to decide which saved homes need their rates refreshed.

## `GET /api/council-tax/authorities`

Every billing authority for the loaded tax year, sorted by name. Each has `gssCode`, `name`,
`nation`, `areaBandD` and `variesWithinArea`. 318 entries for 2026/27.

## `GET /api/council-tax/authorities/:gssCode`

One authority in full:
- `areaBandD`, and its parts: council, parish/community average, county or GLA, police, fire,
  combined authority;
- `variesWithinArea` and `hasSpecialExpenses`;
- its `source`;
- a `bands` array with the annual charge for every band.

404 if the code is unknown.

## `GET /api/health`

`{ "status": "ok", "service": "truecost-api", "timestamp": "…", "version": "1.0.0" }`
