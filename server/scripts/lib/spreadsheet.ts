import { strFromU8, unzipSync } from "fflate";

/**
 * Minimal readers for the two formats government statistics are published in
 * (.ods and .xlsx). Both are zip archives of machine-generated XML, so a
 * tag scanner is enough; we only need cell values as strings, row by row.
 */
export type Sheet = string[][];

function unzipEntry(file: Uint8Array, name: string): string | undefined {
  const entries = unzipSync(file, { filter: (entry) => entry.name === name });
  const data = entries[name];
  return data ? strFromU8(data) : undefined;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeEntities(match[1]) : undefined;
}

/** Drops trailing empty cells, which ODS often repeats thousands of times. */
function trimRow(row: string[]): string[] {
  let end = row.length;
  while (end > 0 && row[end - 1] === "") end--;
  return row.slice(0, end);
}

export function readOdsSheet(file: Uint8Array, sheetName: string): Sheet {
  const xml = unzipEntry(file, "content.xml");
  if (!xml) throw new Error("Not an ODS file: content.xml missing");

  const start = [...xml.matchAll(/<table:table\b([^>]*)>/g)].find(
    ([, attrs]) => attr(attrs, "table:name") === sheetName,
  )?.index;
  if (start === undefined) throw new Error(`Sheet "${sheetName}" not found`);
  const end = xml.indexOf("</table:table>", start);
  const table = xml.slice(start, end);

  const rows: Sheet = [];
  const rowPattern = /<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/g;
  const cellPattern =
    /<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g;

  for (const [, rowAttrs, rowBody = ""] of table.matchAll(rowPattern)) {
    const row: string[] = [];
    for (const [, cellAttrs, cellBody = ""] of rowBody.matchAll(cellPattern)) {
      const repeat = Number(attr(cellAttrs, "table:number-columns-repeated") ?? 1);
      const value =
        attr(cellAttrs, "office:value") ??
        decodeEntities(
          cellBody
            .replace(/<office:annotation\b[\s\S]*?<\/office:annotation>/g, "")
            .replace(/<text:s\b[^>]*\/>/g, " ")
            .replace(/<text:line-break\/>/g, "\n")
            .replace(/<\/text:p>\s*<text:p\b[^>]*>/g, "\n")
            .replace(/<[^>]+>/g, ""),
        );
      // Huge repeats are only ever padding; cap them so a blank cell can't allocate megabytes.
      const times = value === "" ? Math.min(repeat, 256) : repeat;
      for (let i = 0; i < times; i++) row.push(value);
    }
    const trimmed = trimRow(row);
    const repeatRows = Number(attr(rowAttrs, "table:number-rows-repeated") ?? 1);
    for (let i = 0; i < (trimmed.length === 0 ? 1 : repeatRows); i++) rows.push(trimmed);
  }
  return rows;
}

function columnIndex(cellRef: string): number {
  const letters = cellRef.match(/^[A-Z]+/)?.[0] ?? "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

export function readXlsxSheet(file: Uint8Array, sheetName: string): Sheet {
  const workbook = unzipEntry(file, "xl/workbook.xml");
  const rels = unzipEntry(file, "xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new Error("Not an XLSX file: workbook missing");

  const sheetTag = [...workbook.matchAll(/<sheet\b([^>]*)\/>/g)].find(
    ([, attrs]) => attr(attrs, "name") === sheetName,
  );
  if (!sheetTag) throw new Error(`Sheet "${sheetName}" not found`);
  const relId = attr(sheetTag[1], "r:id");
  const relTag = [...rels.matchAll(/<Relationship\b([^>]*)\/>/g)].find(([, attrs]) => attr(attrs, "Id") === relId);
  const target = relTag && attr(relTag[1], "Target");
  if (!target) throw new Error(`Sheet "${sheetName}" has no target`);
  const sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;

  const sharedStrings: string[] = [];
  const sharedXml = unzipEntry(file, "xl/sharedStrings.xml");
  if (sharedXml) {
    for (const [, body] of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      sharedStrings.push(decodeEntities([...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join("")));
    }
  }

  const sheetXml = unzipEntry(file, sheetPath);
  if (!sheetXml) throw new Error(`Sheet file ${sheetPath} missing`);

  const rows: Sheet = [];
  for (const [, body = ""] of sheetXml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: string[] = [];
    for (const [, cellAttrs, cellBody = ""] of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const type = attr(cellAttrs, "t");
      const raw = cellBody.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && raw !== undefined) value = sharedStrings[Number(raw)] ?? "";
      else if (type === "inlineStr")
        value = decodeEntities([...cellBody.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
      else if (raw !== undefined) value = decodeEntities(raw);
      const index = columnIndex(attr(cellAttrs, "r") ?? "");
      while (row.length < index) row.push("");
      row[index] = value;
    }
    rows.push(trimRow(row));
  }
  return rows;
}
