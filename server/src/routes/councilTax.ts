import { Router, Request, Response } from "express";
import {
  bandCharge,
  bandsFor,
  calculateCouncilTax,
  parseBand,
  validateHousehold,
  type Band,
  type Household,
  type Sourced,
} from "@truecost/core";
import { findAuthority, rateTable } from "../data/rates/index.js";
import { authoritySummary as summary, bandDFigure } from "../services/figures.js";

const router = Router();

// GET /api/council-tax/authorities
router.get("/authorities", (_req: Request, res: Response) => {
  const { taxYear, isCurrentYear, authorities } = rateTable();
  res.json({
    taxYear,
    isCurrentYear,
    count: authorities.length,
    authorities: authorities.map(summary).sort((a, b) => a.name.localeCompare(b.name)),
  });
});

// GET /api/council-tax/authorities/E09000012
router.get("/authorities/:gssCode", (req: Request, res: Response): void => {
  const authority = findAuthority(req.params.gssCode);
  if (!authority) {
    res.status(404).json({ error: `No billing authority with code ${req.params.gssCode}` });
    return;
  }
  const { taxYear, isCurrentYear } = rateTable();
  res.json({
    taxYear,
    isCurrentYear,
    authority,
    bandD: bandDFigure(authority),
    bands: bandsFor(authority.nation).map((band) => ({
      band,
      annual: bandCharge(authority.nation, band, authority.areaBandD),
    })),
  });
});

// GET /api/council-tax/calculate?authority=E09000012&band=C&adults=1&students=0
router.get("/calculate", (req: Request, res: Response): void => {
  const authority = findAuthority(String(req.query.authority ?? ""));
  if (!authority) {
    res.status(404).json({ error: "Unknown billing authority. Pass its GSS code, e.g. authority=E09000012" });
    return;
  }

  const band = parseBand(authority.nation, String(req.query.band ?? ""));
  if (!band) {
    res.status(400).json({ error: `Band must be one of ${bandsFor(authority.nation).join(", ")}` });
    return;
  }

  const household: Household = {
    adults: Number(req.query.adults ?? 2),
    fullTimeStudents: Number(req.query.students ?? 0),
  };
  try {
    validateHousehold(household);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid household" });
    return;
  }

  const { taxYear, isCurrentYear } = rateTable();
  const bandFigure: Sourced<Band> = { value: band, confidence: "user_provided" };
  res.json({
    taxYear,
    isCurrentYear,
    authority: summary(authority),
    band: bandFigure,
    bandD: bandDFigure(authority),
    household,
    breakdown: calculateCouncilTax({ nation: authority.nation, band, bandD: authority.areaBandD, household }),
  });
});

export default router;
