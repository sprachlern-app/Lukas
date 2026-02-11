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
    let reveal = false; // Lehrkraft-Lösung sichtbar?

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>

        <div class="progress">
          <div class="progress-bar" style="width:${((i + 1) / tasks.length) * 100}%"></div>
        </div>

        <div class="big">${escapeHTML(t.prompt || "")}</div>

        <div class="stack" id="opts"></div>
        <div id="feedback" class="muted"></div>

        <div class="row" id="teacherRow" style="display:none">
          <button id="revealBtn">Lösung anzeigen</button>
        </div>

        <div class="row">
          <button id="prev">←</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${tasks.length}</div>
      </div>
    `);

    const optsEl = node.querySelector("#opts");
    const feedback = node.querySelector("#feedback");

    const teacherRow = node.querySelector("#teacherRow");
    const revealBtn = node.querySelector("#revealBtn");

    // Lehrkraft-Button nur im Lehrermodus anzeigen
    if (isTeacher()) {
      teacherRow.style.display = "flex";
      revealBtn.onclick = () => {
        reveal = true;
        applyReveal();
      };
    }

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

      // alle deaktivieren + neutral
      for (const b of btns.values()) {
        b.classList.add("is-disabled");
        b.classList.add("is-neutral");
      }

      // richtige Antwort grün
      const correctBtn = btns.get(correctKey);
      if (correctBtn) {
        correctBtn.classList.remove("is-neutral");
        correctBtn.classList.add("is-correct");
      }

      // falls falsch gewählt: gewählte rot
      if (chosenKey && chosenKey !== correctKey) {
        const chosenBtn = btns.get(chosenKey);
        if (chosenBtn) {
          chosenBtn.classList.remove("is-neutral");
          chosenBtn.classList.add("is-wrong");
        }
      }

      const correct = chosenKey === correctKey;
      feedback.textContent = correct ? "✅ Richtig!" : "❌ Nicht ganz.";

      // Lehrkraft sieht Erklärung NICHT automatisch (Variante B)
      // -> nur nach Klick auf "Lösung anzeigen"
    }

    function applyReveal() {
      if (!isTeacher()) return;
      if (!reveal) return;

      const expl = (t.explain || "").trim();
      const line1 = correctKey ? `Richtig: ${correctKey}.` : "";
      const line2 = expl ? ` ${expl}` : "";
      feedback.textContent = (feedback.textContent || "").trim() + (line1 || line2 ? `  ${line1}${line2}` : "");
      revealBtn.disabled = true;
      revealBtn.textContent = "Lösung angezeigt";
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
    // Wenn Lehrkraftmodus umgeschaltet wird: Bildschirm neu zeichnen
    const onTeacherChange = () => render();
    window.addEventListener("teacher-mode-changed", onTeacherChange, { once: true });

    setView(node);
  }

  render();
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}
