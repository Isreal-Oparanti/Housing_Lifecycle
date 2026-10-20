import { Router, Request, Response } from "express";
import { createOsNames, StreetDirectoryUnavailable } from "../adapters/osNames.js";
import { createPostcodesIo, PostcodeDirectoryUnavailable } from "../adapters/postcodesIo.js";
import { rateTable } from "../data/rates/index.js";
import { createLocator } from "../services/locate.js";

const router = Router();

// Street search needs a free OS Data Hub key (OS Names API). Without one the
// service still works from postcodes and outward codes.
const osKey = process.env.OS_API_KEY;
if (!osKey) console.warn("OS_API_KEY is not set: street search is off. Postcode lookups still work.");
const locate = createLocator(createPostcodesIo(), osKey ? createOsNames(osKey) : undefined);

const STATUS_CODES = { resolved: 200, multiple_councils: 200, unsupported: 200, not_found: 404, invalid: 400 } as const;

// GET /api/lookup?q=E8%203PN                       (full postcode)
// GET /api/lookup?q=Navarino%20Road,%20Hackney      (street and town)
// GET /api/lookup?q=Mare%20Street,%20E8             (street and outward code)
// GET /api/lookup?q=E8&authority=E09000012          (renter picked one of several councils)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const query = String(req.query.q ?? "").slice(0, 200);
  const authority = req.query.authority ? String(req.query.authority) : undefined;
  try {
    const result = await locate(query, authority);
    const { taxYear, isCurrentYear } = rateTable();
    res.status(STATUS_CODES[result.status]).json({ taxYear, isCurrentYear, ...result });
  } catch (error) {
    // Express 4 doesn't catch async errors, so every failure must end the response here.
    console.error(error instanceof Error ? error.message : error);
    const unavailable = error instanceof PostcodeDirectoryUnavailable || error instanceof StreetDirectoryUnavailable;
    res.status(unavailable ? 502 : 500).json({
      status: "error",
      message: unavailable
        ? "Our address lookup isn't responding. Try again in a minute."
        : "Something went wrong looking up that address.",
    });
  }
});

export default router;
