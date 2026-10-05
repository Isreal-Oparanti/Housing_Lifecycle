# TrueCost System Architecture

## Overview
TrueCost is designed as a clean two-tier application:

- **Frontend (`client/`)**: Next.js 15 (React 19, Tailwind CSS, TypeScript). Handles user interface, address input, and cost breakdowns.
- **Backend (`server/`)**: Node.js + Express (TypeScript). Handles Council Tax rate calculations, local authority lookups, discount rules, and future data integrations.

```
TrueCost/
├── client/                     # Web Application
│   ├── src/
│   │   ├── app/                # Pages and layouts
│   │   ├── components/         # Reusable UI widgets
│   │   └── lib/                # API client functions
│   ├── package.json
│   └── tsconfig.json
│
├── server/                     # API Server
│   ├── src/
│   │   ├── data/               # Seed data (Council Tax schedules)
│   │   ├── routes/             # REST endpoints (/api/health, /api/council-tax)
│   │   ├── services/           # Calculation & lookup engines
│   │   └── index.ts            # Entrypoint
│   ├── package.json
│   └── tsconfig.json
│
└── docs/                       # Project Documentation
```

## Communication Protocol
- The client communicates with the server via REST JSON endpoints.
- Base URL in local development: `http://localhost:5000/api`
- CORS is enabled on the server to allow local cross-origin development between port 3000 and 5000.
