import { Router, Request, Response } from "express";
import { calculateCouncilTax } from "../services/councilTaxService.js";
import { SAMPLE_COUNCIL_RATES, BAND_MULTIPLIERS } from "../data/councilTaxRates.js";

const router = Router();

// GET /api/council-tax/councils - list supported local authorities
router.get("/councils", (_req: Request, res: Response) => {
  res.json({
    count: SAMPLE_COUNCIL_RATES.length,
    councils: SAMPLE_COUNCIL_RATES,
    supportedBands: Object.keys(BAND_MULTIPLIERS),
  });
});

// GET /api/council-tax/calculate?council=Westminster&band=C&discount=single_person
router.get("/calculate", (req: Request, res: Response): void => {
  try {
    const council = (req.query.council as string) || "Westminster";
    const band = (req.query.band as string) || "D";
    const discount = (req.query.discount as "none" | "single_person" | "student_exemption") || "none";

    const result = calculateCouncilTax(council, band, discount);
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to calculate council tax",
    });
  }
});

export default router;
