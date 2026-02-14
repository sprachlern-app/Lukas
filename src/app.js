// src/app.js
import { loadCSV } from "./csv.js";
import { setView, el } from "./render.js";
import { runVocab } from "./practice_vocab.js";
import { runGrammar } from "./practice_grammar.js";
import { isTeacher, teacherLogin, teacherLogout, resetTeacherHard } from "./state.js";
import { initTTS } from "./tts.js";initTTS();


const DATA_BASE = "./data/";

async function boot() {
  wireTeacherButton();

  try {
    const manifest = await loadCSV(DATA_BASE + "manifest.csv");

    const modules = manifest
      .filter((m) => (m.enabled ?? "1") !== "0")
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));

    buildMenu(modules);

    if (modules.length === 0) {
      setView(el(`<p class="muted">Keine Module aktiv. Prüfe data/manifest.csv.</p>`));
      return;
    }

    await openModule(modules[0]);
  } catch (err) {
    setView(el(`<pre class="card">Fehler:\n${escapeHTML(String(err))}</pre>`));
  }
}

function wireTeacherButton() {
  const btn = document.getElementById("teacherBtn");
  if (!btn) return;

  const paint = () => {
    const on = isTeacher();
    btn.classList.toggle("on", on);
    btn.textContent = on ? "✅ Lehrkraft" : "🔒 Lehrkraft";
  };

  // Extra: URL-Reset (einmalig)
  const params = new URLSearchParams(location.search);
  if (params.get("resetTeacher") === "1") {
    resetTeacherHard();
    // Hinweis im UI
    alert("Lehrmodus wurde zurückgesetzt.");
  }

  paint();

  // Wenn Modus wechselt, Button neu zeichnen
  window.addEventListener("teacher-mode-changed", paint);

  btn.onclick = (ev) => {
    // NOT-AUS: Shift + Klick => sofort raus + Speicher löschen
    if (ev.shiftKey) {
      resetTeacherHard();
      teacherLogout();
      paint();
      alert("Lehrmodus AUS (Not-Aus).");
      return;
    }

    const res = isTeacher() ? teacherLogout() : teacherLogin();
    paint();
    if (!res.ok) alert("Code falsch.");
  };
}

function buildMenu(modules) {
  const menu = document.getElementById("menu");
  if (!menu) return;

  // teacherBtn bleibt drin – wir hängen nur Module dahinter an
  const teacherBtn = document.getElementById("teacherBtn");

  // alles außer teacherBtn entfernen
  [...menu.querySelectorAll("button")].forEach((b) => {
    if (teacherBtn && b === teacherBtn) return;
    b.remove();
  });

  modules.forEach((m) => {
    const btn = el(`<button class="menu-btn">${escapeHTML(m.title || m.id)}</button>`);
    btn.onclick = () => openModule(m);
    menu.appendChild(btn);
  });
}

async function openModule(m) {
  const type = (m.type || "").trim();
  const title = (m.title || "").trim();
  const file = (m.file || "").trim();
  const mode = (m.mode || "").trim();

  if (!file) {
    setView(el(`<p class="muted">manifest.csv: Bei "${escapeHTML(m.id)}" fehlt "file".</p>`));
    return;
  }

  setView(el(`<p class="muted">Lade: ${escapeHTML(title || m.id)}…</p>`));

  const data = await loadCSV(DATA_BASE + file);

  if (type === "vocab") {
    runVocab(data, title || "Vokabeln", mode || "flashcards");
    return;
  }

  if (type === "grammar") {
    runGrammar(data, title || "Grammatik", mode || "mcq");
    return;
  }

  setView(el(`<p class="muted">Unbekannter Modultyp: ${escapeHTML(type || "(leer)")}</p>`));
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}

boot();
