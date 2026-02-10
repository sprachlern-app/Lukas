// src/app.js
import { loadCSV } from "./csv.js";
import { setView, el } from "./render.js";
import { runVocab } from "./practice_vocab.js";
import { runGrammar } from "./practice_grammar.js";

const DATA_BASE = "./data/";

async function boot() {
  try {
    // 1) manifest laden
    const manifest = await loadCSV(DATA_BASE + "manifest.csv");

    // 2) aktiv + sortiert
    const modules = manifest
      .filter((m) => (m.enabled ?? "1") !== "0")
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));

    // 3) Menü bauen
    buildMenu(modules);

    // 4) Start: erstes Modul öffnen
    if (modules.length === 0) {
      setView(el(`<p class="muted">Keine Module aktiv. Prüfe data/manifest.csv.</p>`));
      return;
    }
    await openModule(modules[0], modules);
  } catch (err) {
    setView(el(`<pre class="card">Fehler:\n${escapeHTML(String(err))}</pre>`));
  }
}

function buildMenu(modules) {
  const menu = document.getElementById("menu");
  if (!menu) return;

  menu.innerHTML = "";

  modules.forEach((m) => {
    const btn = el(`<button class="menu-btn">${escapeHTML(m.title || m.id)}</button>`);
    btn.onclick = () => openModule(m, modules);
    menu.appendChild(btn);
  });
}

async function openModule(moduleRow) {
  const { type, title, file, mode } = moduleRow;

  setView(el(`<p class="muted">Lade: ${escapeHTML(title || "")}…</p>`));

  // CSV-Daten für dieses Modul laden
  const data = await loadCSV(DATA_BASE + file);

  // Nach Typ passende "Practice"-Engine starten
  if (type === "vocab") {
    runVocab(data, title, mode);
    return;
  }

  if (type === "grammar") {
    runGrammar(data, title, mode);
    return;
  }

  setView(el(`<p class="muted">Unbekannter Modultyp: ${escapeHTML(type)}</p>`));
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}

boot();

