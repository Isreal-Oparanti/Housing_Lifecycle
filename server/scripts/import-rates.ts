/**
 * Builds src/data/rates/<year>.json from the official spreadsheets in
 * data/raw/<year>/, as described by data/raw/<year>/sources.json.
 *
 * Run once a year, after MHCLG and the Welsh Government publish the new
 * levels in late March:
 *
 *   npm run import:rates -- 2027-28
 *
 * The script refuses to write output if a column is missing or the published
 * components do not add up to the published total, so a changed spreadsheet
 * layout fails loudly instead of producing wrong rates.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { poundsToPence, type AuthorityRate, type Source, type TaxYear } from "@truecost/core";
import { readOdsSheet, readXlsxSheet, type Sheet } from "./lib/spreadsheet.js";

interface SourceEntry {
  file: string;
  sheet: string;
  name: string;
  publisher: string;
  pageUrl: string;
  fileUrl: string;
  licence: string;
  retrieved: string;
}

interface Manifest {
  taxYear: TaxYear;
  england: SourceEntry;
  wales: SourceEntry;
}

/** Components may be off by a penny or two from the total because each is rounded separately. */
const ROUNDING_TOLERANCE_PENCE = 2;

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function toSource(entry: SourceEntry): Source {
  return { name: entry.name, publisher: entry.publisher, url: entry.pageUrl, licence: entry.licence };
}

/** "[z]" means not applicable and "[x]" unavailable; for a precept component both mean none. */
function componentPence(cell: string | undefined): number {
  if (cell === undefined || cell === "" || cell === "[z]" || cell === "[x]") return 0;
  return requiredPence(cell);
}

function requiredPence(cell: string | undefined): number {
  const pounds = Number(cell);
  if (cell === undefined || cell === "" || !Number.isFinite(pounds)) {
    throw new Error(`Expected an amount, got "${cell}"`);
  }
  return poundsToPence(pounds);
}

function column(header: string[], description: string, matches: (heading: string) => boolean): number {
  const index = header.findIndex(matches);
  if (index === -1) throw new Error(`Column not found: ${description}`);
  return index;
}

function headerRowIndex(sheet: Sheet, firstHeading: string): number {
  const index = sheet.findIndex((row) => row.some((cell) => normalise(cell) === firstHeading));
  if (index === -1) throw new Error(`Header row with "${firstHeading}" not found`);
  return index;
}

function checkComponents(rate: AuthorityRate): void {
  const sum = Object.values(rate.components).reduce((total, pence) => total + pence, 0);
  if (Math.abs(sum - rate.areaBandD) > ROUNDING_TOLERANCE_PENCE) {
    throw new Error(`${rate.name}: components sum to ${sum}p but Band D is ${rate.areaBandD}p`);
  }
}

function importEngland(rawDir: string, taxYear: TaxYear, entry: SourceEntry): AuthorityRate[] {
  const sheet = readOdsSheet(readFileSync(join(rawDir, entry.file)), entry.sheet);
  const headerRow = headerRowIndex(sheet, "ONS Code");
  const header = sheet[headerRow].map(normalise);
  const currentYear = (prefix: string) => (h: string) => h.startsWith(prefix) && h.endsWith("(current year)");
  const majorPrecept = (kind: string) => (h: string) => h.startsWith("16.") && h.endsWith(`(${kind})`);

  const col = {
    code: column(header, "ONS Code", (h) => h === "ONS Code"),
    name: column(header, "Authority", (h) => h === "Authority"),
    withLocalPrecepts: column(header, "8. Band D including local precepts", currentYear("8. Average")),
    withoutLocalPrecepts: column(header, "9. Band D excluding local precepts", currentYear("9. Average")),
    specialExpenses: column(header, "1a. Special expenses", currentYear("1a.")),
    countyOrGla: column(header, "16. County or GLA", majorPrecept("county or GLA")),
    police: column(header, "16. Police", majorPrecept("police")),
    fire: column(header, "16. Fire", majorPrecept("fire")),
    combinedAuthority: column(header, "16. Combined authority", majorPrecept("combined authority")),
    areaBandD: column(header, "17. Area Band D", (h) => h.startsWith("17. Average")),
    preceptingParishes: column(header, "20. Precepting parishes", (h) => h.startsWith("20. Number of Precepting")),
  };

  const source = toSource(entry);
  return sheet
    .slice(headerRow + 1)
    .filter((row) => /^E0[6-9]\d{6}$/.test(row[col.code] ?? ""))
    .map((row): AuthorityRate => {
      const withoutLocal = requiredPence(row[col.withoutLocalPrecepts]);
      const hasSpecialExpenses = componentPence(row[col.specialExpenses]) > 0;
      const rate: AuthorityRate = {
        gssCode: row[col.code],
        name: normalise(row[col.name]),
        nation: "england",
        taxYear,
        areaBandD: requiredPence(row[col.areaBandD]),
        components: {
          billingAuthority: withoutLocal,
          localPrecepts: requiredPence(row[col.withLocalPrecepts]) - withoutLocal,
          countyOrGla: componentPence(row[col.countyOrGla]),
          police: componentPence(row[col.police]),
          fire: componentPence(row[col.fire]),
          combinedAuthority: componentPence(row[col.combinedAuthority]),
        },
        variesWithinArea: Number(row[col.preceptingParishes] || 0) > 0 || hasSpecialExpenses,
        hasSpecialExpenses,
        source,
      };
      checkComponents(rate);
      return rate;
    });
}

/** The Welsh tables name authorities but carry no codes. Checked against postcodes.io. */
const WALES_GSS_CODES: Record<string, string> = {
  "Isle of Anglesey": "W06000001",
  Gwynedd: "W06000002",
  Conwy: "W06000003",
  Denbighshire: "W06000004",
  Flintshire: "W06000005",
  Wrexham: "W06000006",
  Ceredigion: "W06000008",
  Pembrokeshire: "W06000009",
  Carmarthenshire: "W06000010",
  Swansea: "W06000011",
  "Neath Port Talbot": "W06000012",
  Bridgend: "W06000013",
  "Vale of Glamorgan": "W06000014",
  Cardiff: "W06000015",
  "Rhondda Cynon Taf": "W06000016",
  Caerphilly: "W06000018",
  "Blaenau Gwent": "W06000019",
  Torfaen: "W06000020",
  Monmouthshire: "W06000021",
  Newport: "W06000022",
  Powys: "W06000023",
  "Merthyr Tydfil": "W06000024",
};

function importWales(rawDir: string, taxYear: TaxYear, entry: SourceEntry): AuthorityRate[] {
  const sheet = readXlsxSheet(readFileSync(join(rawDir, entry.file)), entry.sheet);
  const headerRow = headerRowIndex(sheet, "Authority");
  const header = sheet[headerRow].map(normalise);
  const col = {
    name: column(header, "Authority", (h) => h === "Authority"),
    areaBandD: column(header, "Overall average band D", (h) => h.startsWith("Overall average band D")),
    county: column(header, "County council element", (h) => h.startsWith("County council element")),
    community: column(header, "Community council element", (h) => h.startsWith("Community council element")),
    police: column(header, "Police authority element", (h) => h.startsWith("Police authority element")),
  };

  const source = toSource(entry);
  const rates: AuthorityRate[] = [];
  for (const row of sheet.slice(headerRow + 1)) {
    const name = normalise(row[col.name] ?? "");
    if (name === "" || name === "Wales average") continue;
    const gssCode = WALES_GSS_CODES[name];
    if (!gssCode) throw new Error(`Wales: unknown authority "${name}". Add its GSS code to WALES_GSS_CODES.`);
    const rate: AuthorityRate = {
      gssCode,
      name,
      nation: "wales",
      taxYear,
      areaBandD: requiredPence(row[col.areaBandD]),
      components: {
        billingAuthority: requiredPence(row[col.county]),
        localPrecepts: componentPence(row[col.community]),
        countyOrGla: 0,
        police: requiredPence(row[col.police]),
        fire: 0,
        combinedAuthority: 0,
      },
      variesWithinArea: componentPence(row[col.community]) > 0,
      hasSpecialExpenses: false,
      source,
    };
    checkComponents(rate);
    rates.push(rate);
  }

  const expected = Object.keys(WALES_GSS_CODES).length;
  if (rates.length !== expected) throw new Error(`Wales: expected ${expected} authorities, found ${rates.length}`);
  return rates;
}

function main(): void {
  const taxYear = process.argv[2];
  if (!taxYear || !/^\d{4}-\d{2}$/.test(taxYear)) {
    console.error("Usage: npm run import:rates -- <tax year, e.g. 2026-27>");
    process.exit(1);
  }

  const rawDir = join(serverRoot, "data", "raw", taxYear);
  const manifest = JSON.parse(readFileSync(join(rawDir, "sources.json"), "utf8")) as Manifest;
  if (manifest.taxYear !== taxYear) throw new Error(`sources.json is for ${manifest.taxYear}, not ${taxYear}`);

  const england = importEngland(rawDir, manifest.taxYear, manifest.england);
  const wales = importWales(rawDir, manifest.taxYear, manifest.wales);
  const authorities = [...england, ...wales].sort((a, b) => a.gssCode.localeCompare(b.gssCode));

  const codes = new Set(authorities.map((a) => a.gssCode));
  if (codes.size !== authorities.length) throw new Error("Duplicate GSS codes in output");

  const outDir = join(serverRoot, "src", "data", "rates");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${taxYear}.json`);
  const output = {
    taxYear: manifest.taxYear,
    sources: [manifest.england, manifest.wales].map(({ name, fileUrl, retrieved }) => ({ name, fileUrl, retrieved })),
    authorities,
  };
  writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`Wrote ${authorities.length} authorities (${england.length} England, ${wales.length} Wales) to ${outFile}`);
}

main();
