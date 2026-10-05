# TrueCost (Housing Lifecycle)

> Make the true recurring cost of renting a home visible before commitment.

TrueCost provides rental cost intelligence by calculating accurate monthly outgoings starting with Council Tax intelligence across UK local authorities.

---

## Project Structure

```text
TrueCost/
├── client/          # Next.js frontend web application (React, Tailwind CSS, TypeScript)
├── server/          # Express API server (Node.js, TypeScript)
├── docs/            # Architecture, API specifications, and Council Tax guides
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v20+ or v24+)
- npm

### 1. Running the Backend Server
```bash
cd server
npm install
npm run dev
```
The API server will run at `http://localhost:5000`.

### 2. Running the Frontend Web App
```bash
cd client
npm install
npm run dev
```
The web application will run at `http://localhost:3000`.

---

## Phase 1 Roadmap: Council Tax Intelligence
- [x] Initial client & server scaffold
- [ ] Local Authority rates database & Council Tax Bands (A-H) calculation engine
- [ ] REST API endpoints for property & band lookup
- [ ] Interactive Web UI with Single Person Discount and Student Exemption calculations
