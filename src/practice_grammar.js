// src/practice_grammar.js
import { el, setView } from "./render.js";
import { isTeacher } from "./state.js";

export function runGrammar(rows, title = "Grammatik") {
  if (!Array.isArray(rows) || rows.length === 0) {
    setView(el(`<p class="muted">Keine Grammatik-Aufgaben gefunden.</p>`));
    return;
  }

  const tasks = rows.filter((r) => (r.task_type || "mcq").toLowerCase() === "mcq");
  if (tasks.length === 0) {
    setView(el(`<p class="muted">Keine MCQ-Aufgaben gefunden.</p>`));
    return;
  }

  let i = 0;

  function render() {
    const t = tasks[i];
    const correctKey = (t.answer || "").toUpperCase().trim();

    const options = [
      ["A", t.option_a],
      ["B", t.option_b],
      ["C", t.option_c],
      ["D", t.option_d],
    ].filter(([, val]) => (val ?? "").trim() && val !== "-");

    let locked = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>

        <div class="progress">
          <div class="progress-bar" style="width:${((i + 1) / tasks.length) * 100}%"></div>
        </div>

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

    const optsEl = node.querySelector("#opts");
    const feedback = node.querySelector("#feedback");

    // Buttons erzeugen + merken
    const btns = new Map(); // key -> button
    options.forEach(([key, val]) => {
      const b = el(`<button class="opt">${key}: ${escapeHTML(val)}</button>`);
      btns.set(key, b);
      optsEl.appendChild(b);
    });

    function lockAndMark(chosenKey) {
      if (locked) return;
      locked = true;

      // alle erstmal neutralisieren
      for (const [key, b] of btns.entries()) {
        b.classList.add("is-disabled");
        b.classList.add("is-neutral");
      }

      // richtige Antwort hervorheben
      const correctBtn = btns.get(correctKey);
      if (correctBtn) {
        correctBtn.classList.remove("is-neutral");
        correctBtn.classList.add("is-correct");
      }

      // wenn falsch gewählt: gewählte Taste rot
      if (chosenKey && chosenKey !== correctKey) {
        const chosenBtn = btns.get(chosenKey);
        if (chosenBtn) {
          chosenBtn.classList.remove("is-neutral");
          chosenBtn.classList.add("is-wrong");
        }
      }

      const correct = chosenKey === correctKey;
      const base = correct ? "✅ Richtig!" : "❌ Nicht ganz.";

      const expl = (t.explain || "").trim();
      const teacherExtra = isTeacher()
        ? ` Richtig: ${escapeHTML(correctKey || "")}.${expl ? " " + expl : ""}`
        : "";

      feedback.textContent = base + teacherExtra;
    }

    // Klick-Handler setzen
    for (const [key, b] of btns.entries()) {
      b.onclick = () => lockAndMark(key);
    }

    node.querySelector("#prev").onclick = () => {
      i = (i - 1 + tasks.length) % tasks.length;
      render();
    };

    node.querySelector("#next").onclick = () => {
      i = (i + 1) % tasks.length;
      render();
    };

    setView(node);
  }

  render();
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}
