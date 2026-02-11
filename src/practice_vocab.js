// src/practice_vocab.js
import { el, setView } from "./render.js";
import { isTeacher } from "./state.js"; // Hinweis nur für Lehrkraft (wenn gewünscht)

export function runVocab(items, title = "Vokabeln", mode = "cards") {
  if (!Array.isArray(items) || items.length === 0) {
    setView(el(`<p class="muted">Keine Vokabeln gefunden.</p>`));
    return;
  }

  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  const norm = (s) =>
    String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  let i = 0;
  let showBack = false;

  function progressBar(total, idx) {
    return `
      <div class="progress">
        <div class="progress-bar" style="width:${((idx + 1) / total) * 100}%"></div>
      </div>
    `;
  }

  // A + C: Richtung mischen (Deutsch->Bedeutung ODER Bedeutung->Deutsch)
  function makePrompt(item) {
    const dir = Math.random() < 0.5 ? "de2x" : "x2de";
    if (dir === "de2x") {
      return {
        question: item.lemma || "",
        answer: item.translation || "",
        example: item.example || "",
        hint: item.de_hint || "",
        dir,
      };
    }
    return {
      question: item.translation || "",
      answer: item.lemma || "",
      example: item.example || "",
      hint: item.de_hint || "",
      dir,
    };
  }

  function colorClass(idx) {
    return ["c1", "c2", "c3", "c4"][idx % 4];
  }

  function renderCards() {
    const item = items[i];
    const p = makePrompt(item);

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="flashcard ${colorClass(i)}">
          <div class="label">Karte</div>

          <div class="big">${escapeHTML(p.question)}</div>

          <hr />

          ${
            showBack
              ? `
                <div class="big">${escapeHTML(p.answer)}</div>
                <div class="muted">${escapeHTML(p.example)}</div>
                ${
                  isTeacher() && p.hint
                    ? `<div class="muted"><b>Lehrerhinweis:</b> ${escapeHTML(p.hint)}</div>`
                    : ``
                }
              `
              : `<div class="muted">Tippe auf „Umdrehen“.</div>`
          }
        </div>

        <div class="row">
          <button id="prev">←</button>
          <button id="flip">Umdrehen</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    node.querySelector("#prev").onclick = () => {
      i = (i - 1 + items.length) % items.length;
      showBack = false;
      renderCards();
    };
    node.querySelector("#next").onclick = () => {
      i = (i + 1) % items.length;
      showBack = false;
      renderCards();
    };
    node.querySelector("#flip").onclick = () => {
      showBack = !showBack;
      renderCards();
    };

    setView(node);
  }

  function buildMCQChoices(correct, allItems, field) {
    const pool = allItems
      .map((x) => (x[field] || "").trim())
      .filter((x) => x && norm(x) !== norm(correct));
    const distractors = shuffle([...new Set(pool)]).slice(0, 3);
    return shuffle([correct, ...distractors]);
  }

  function renderMCQ() {
    const item = items[i];
    const p = makePrompt(item);

    const field = p.dir === "de2x" ? "translation" : "lemma";
    const correct = (p.answer || "").trim();
    const choices = buildMCQChoices(correct, items, field);

    let locked = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${escapeHTML(p.question)}</div>

        <div class="stack" id="opts"></div>
        <div id="feedback" class="muted"></div>

        <div class="row">
          <button id="prev">←</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    const opts = node.querySelector("#opts");
    const feedback = node.querySelector("#feedback");

    const btns = choices.map((text) => {
      const b = el(`<button class="opt">${escapeHTML(text)}</button>`);
      opts.appendChild(b);
      return b;
    });

    function mark(chosen) {
      if (locked) return;
      locked = true;

      btns.forEach((b) => b.classList.add("is-disabled", "is-neutral"));

      const idxCorrect = choices.findIndex((c) => norm(c) === norm(correct));
      if (idxCorrect >= 0) {
        btns[idxCorrect].classList.remove("is-neutral");
        btns[idxCorrect].classList.add("is-correct");
      }

      if (norm(chosen) !== norm(correct)) {
        const idxChosen = choices.findIndex((c) => norm(c) === norm(chosen));
        if (idxChosen >= 0) {
          btns[idxChosen].classList.remove("is-neutral");
          btns[idxChosen].classList.add("is-wrong");
        }
        feedback.textContent = "❌ Nicht ganz.";
      } else {
        feedback.textContent = "✅ Richtig!";
      }

      // de_hint NICHT anzeigen (nur evtl. später als Lehrkraft-Button)
    }

    btns.forEach((b, idx) => (b.onclick = () => mark(choices[idx])));

    node.querySelector("#prev").onclick = () => {
      i = (i - 1 + items.length) % items.length;
      renderMCQ();
    };
    node.querySelector("#next").onclick = () => {
      i = (i + 1) % items.length;
      renderMCQ();
    };

    setView(node);
  }

  function renderWrite() {
    const item = items[i];
    const p = makePrompt(item);
    const correct = (p.answer || "").trim();

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${escapeHTML(p.question)}</div>

        <div class="row">
          <input id="inp" type="text"
            style="flex:1; font-size:1.2rem; padding:14px 16px; border-radius:16px;
                   border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: white;"
            placeholder="Schreibe die Lösung…" />
          <button id="check">Prüfen</button>
        </div>

        <div id="feedback" class="muted"></div>

        <div class="row">
          <button id="prev">←</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    const inp = node.querySelector("#inp");
    const feedback = node.querySelector("#feedback");

    function check() {
      const ok = norm(inp.value) && norm(inp.value) === norm(correct);
      feedback.textContent = ok ? "✅ Richtig!" : `❌ Nicht ganz. Lösung: ${correct}`;
    }

    node.querySelector("#check").onclick = check;
    inp.addEventListener("keydown", (e) => e.key === "Enter" && check());

    node.querySelector("#prev").onclick = () => {
      i = (i - 1 + items.length) % items.length;
      renderWrite();
    };
    node.querySelector("#next").onclick = () => {
      i = (i + 1) % items.length;
      renderWrite();
    };

    setView(node);
    inp.focus();
  }

  if (mode === "mcq") return renderMCQ();
  if (mode === "write") return renderWrite();
  return renderCards();
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}
