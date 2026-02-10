// src/practice_grammar.js
import { el, setView } from "./render.js";

// mode ist in V1.0 optional (kommt aus manifest.csv), wir ignorieren es erstmal
export function runGrammar(rows, title = "Grammatik", mode = "mcq") {
  if (!Array.isArray(rows) || rows.length === 0) {
    setView(el(`<p class="muted">Keine Grammatik-Aufgaben gefunden.</p>`));
    return;
  }

  // V1.0: Wir nehmen nur mcq-Aufgaben (falls später andere Typen dazukommen)
  const tasks = rows.filter((r) => (r.task_type || "mcq").toLowerCase() === "mcq");
  if (tasks.length === 0) {
    setView(el(`<p class="muted">Keine MCQ-Aufgaben gefunden.</p>`));
    return;
  }

  let i = 0;

  function render() {
    const t = tasks[i];

    const options = [
      ["A", t.option_a],
      ["B", t.option_b],
      ["C", t.option_c],
      ["D", t.option_d],
    ].filter(([, val]) => (val ?? "").trim() && val !== "-");

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>

        <div class="big">${escapeHTML(t.prompt || "")}</div>

        <div class="stack" id="opts"></div>
        <div id="feedback" class="muted"></div>

        <div class="row">
          <button id="prev">←</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${tasks.length}</div>
      </div>
    `);

    const opts = node.querySelector("#opts");
    const feedback = node.querySelector("#feedback");

    options.forEach(([key, val]) => {
      const b = el(`<button class="opt">${key}: ${escapeHTML(val)}</button>`);
      b.onclick = () => {
        const correct

