# TrueCost (Housing Lifecycle)

**Documentation:** [docs/README.md](docs/README.md): features, the build journey and fixes,
decisions, API, data sources and the runbook.

> Make the true recurring cost of renting a home visible before commitment.

TrueCost calculates the real monthly cost of renting a UK home, starting with
Council Tax for every billing authority in England and Wales.

---

## Project Structure

```text
TrueCost/
├── packages/core/   # Shared calculation rules (bands, discounts, money, provenance)
├── server/          # Express API + official rate data and importer
├── client/          # Next.js web app
└── docs/            # Architecture and council tax rules
```

---

## Getting Started

Requires Node.js 20+.

```bash
npm install          # once, from the repo root (npm workspaces)
npm run dev:server   # API on http://localhost:5000
npm run dev:client   # Web app on http://localhost:3000
```

Other commands, run from the root:

```bash
npm test             # core + server tests
npm run typecheck    # all workspaces
npm run import:rates -- 2026-27   # rebuild rates from data/raw/2026-27
```

---

## Phase 1 Roadmap: Council Tax Intelligence
- [x] Shared calculation engine: England, Wales (Band I) and Scotland band rules, discounts, 10-instalment billing
- [x] 2026/27 rates for all 318 billing authorities in England and Wales, imported from official sources
- [x] Every figure carries its source and confidence
- [x] Postcode or outward code → council and parish, with exact Band D where the address is outside any parish
- [x] Form-first web experience: postcode and rent → monthly cost, band and household pickers, sources explained
- [x] Street search: "Navarino Road, Hackney" or "Mare Street, E8" → council, with a boundary check (needs `OS_API_KEY`)
- [ ] Likely band from neighbourhood statistics when the listing doesn't show it (VOA open data)
- [ ] Exact band by address, and listing link support (Rightmove, Zoopla), subject to permission
- [x] Save and compare homes: ranked by real monthly cost, side by side, kept on the device
- [ ] Energy estimates from EPC data (next)
- [ ] Water and broadband estimates
