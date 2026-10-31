/**
 * Checks that the way Ordnance Survey spells councils still maps onto our rate
 * table. Run after a council reorganisation or a new tax year:
 *
 *   npm run check:council-names
 *
 * For every council in the loaded rates it searches OS Names for the council's
 * name and records every district or county spelling OS returns. It then lists
 * OS spellings that match none of our councils (Scottish councils and English
 * counties are expected) and any of our councils that no OS spelling reaches,
 * which is the real problem to fix in findAuthorityByName.
 *
 * Needs OS_API_KEY in server/.env. Makes about 320 requests at roughly six a
 * second, so it needs a live OS project (600 a minute); a development project
 * (50 a minute) may be throttled, and throttled searches are reported as warnings.
 */
import "dotenv/config";
import { findAuthorityByName, rateTable } from "../src/data/rates/index.js";

const key = process.env.OS_API_KEY;
if (!key) {
  console.error("OS_API_KEY is not set in server/.env");
  process.exit(1);
}

const BATCH = 6;
const PAUSE_MS = 1000;

interface OsEntry {
  DISTRICT_BOROUGH?: string | null;
  COUNTY_UNITARY?: string | null;
}

async function councilSpellings(query: string): Promise<string[]> {
  const params = new URLSearchParams({ query, maxresults: "100", key: key! });
  try {
    const response = await fetch(`https://api.os.uk/search/names/v1/find?${params}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.warn(`  ${query}: OS returned ${response.status}`);
      return [];
    }
    const body = (await response.json()) as { results?: { GAZETTEER_ENTRY: OsEntry }[] };
    return (body.results ?? []).flatMap(({ GAZETTEER_ENTRY: entry }) =>
      [entry.DISTRICT_BOROUGH, entry.COUNTY_UNITARY].filter((name): name is string => Boolean(name)),
    );
  } catch {
    console.warn(`  ${query}: OS unreachable`);
    return [];
  }
}

async function main(): Promise<void> {
  const { authorities, taxYear } = rateTable();
  console.log(`Checking ${authorities.length} councils (${taxYear}) against OS Names…`);

  const spellings = new Set<string>();
  const reached = new Set<string>();
  for (let i = 0; i < authorities.length; i += BATCH) {
    const batch = authorities.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((authority) => councilSpellings(authority.name)));
    for (const name of results.flat()) {
      spellings.add(name);
      const authority = findAuthorityByName(name);
      if (authority) reached.add(authority.gssCode);
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }

  const unmatched = [...spellings].filter((name) => !findAuthorityByName(name)).sort();
  const unreached = authorities.filter((authority) => !reached.has(authority.gssCode));

  console.log(`\nOS spellings seen: ${spellings.size}`);
  console.log(`OS spellings matching none of our councils: ${unmatched.length} (Scottish councils and English counties are expected)`);
  for (const name of unmatched) console.log(`  - ${name}`);
  console.log(`\nOur councils no OS spelling reached: ${unreached.length}`);
  for (const authority of unreached) console.log(`  - ${authority.name} (${authority.gssCode})`);

  if (unreached.length > 0) {
    console.log("\nAdd the OS spelling for these to nameCandidates in server/src/data/rates/index.ts.");
    process.exit(1);
  }
}

main();
