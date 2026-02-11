// src/csv.js
// V1.0: CSV von GitHub Pages laden + in Array von Objekten parsen
// Robust: erkennt automatisch , oder ; als Trenner

export async function loadCSV(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CSV konnte nicht geladen werden (${res.status}): ${url}`);
  }
  let text = await res.text();

  // BOM entfernen (kommt manchmal bei UTF-8 aus Excel vor)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  return parseCSV(text);
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  // Delimiter automatisch erkennen: , oder ;
  const delimiter = detectDelimiter(lines[0]);

  const rows = [];
  for (const line of lines) {
    rows.push(parseLine(line, delimiter));
  }

  const header = rows.shift().map(h => h.trim());
  return rows.map(r => {
    const obj = {};
    header.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
    return obj;
  });
}

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  // wenn ; häufiger ist, nimm ;
  return semiCount > commaCount ? ";" : ",";
}

function parseLine(line, delimiter) {
  const out = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && c === delimiter) {
      out.push(cell);
      cell = "";
      continue;
    }

    cell += c;
  }
  out.push(cell);
  return out;
}
