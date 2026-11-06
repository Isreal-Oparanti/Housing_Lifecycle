import { createOsNames, StreetDirectoryUnavailable } from "@/server/adapters/osNames";
import { createPostcodesIo, PostcodeDirectoryUnavailable } from "@/server/adapters/postcodesIo";
import { rateTable } from "@/server/data/rates";
import { createLocator } from "@/server/services/locate";

export const dynamic = "force-dynamic";

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
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const q = (query.get("q") ?? "").slice(0, 200);
  const authority = query.get("authority") ?? undefined;
  try {
    const result = await locate(q, authority || undefined);
    const { taxYear, isCurrentYear } = rateTable();
    return Response.json({ taxYear, isCurrentYear, ...result }, { status: STATUS_CODES[result.status] });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    const unavailable = error instanceof PostcodeDirectoryUnavailable || error instanceof StreetDirectoryUnavailable;
    return Response.json(
      {
        status: "error",
        message: unavailable
          ? "Our address lookup isn't responding. Try again in a minute."
          : "Something went wrong looking up that address.",
      },
      { status: unavailable ? 502 : 500 },
    );
  }
}
