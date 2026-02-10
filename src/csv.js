// src/csv.js
// V1.0: CSV von GitHub Pages laden + in Array von Objekten parsen

export async function loadCSV(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CSV konnte nicht geladen werden (${res.status}): ${url}`);
  }
  const text = await res.text();
  return parseCSV(text);
}

// Minimaler CSV-Parser mit Unterstützung für:
// - Komma als Trenner
// - Anführungszeichen "..." (inkl. "" als Escape für ein ")
// - CRLF/LF Zeilenenden
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    // komplett leere Zeilen ignorieren
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      // "" innerhalb von Quotes = ein echtes "
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && c === ",") {
      pushCell();
      continue;
    }

    if (!inQuotes && c === "\n") {
      pushCell();
      pushRow();
      continue;
    }

    if (!inQuotes && c === "\r") {
      // CR ignorieren (bei CRLF)
      continue;
    }

    cell += c;
  }

  // letzte Zelle/Zeile sichern
  pushCell();
  pushRow();

  const header = (rows.shift() || []).map((h) => h.trim());
  return rows.map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

