// src/practice_vocab.js
import { el, setView } from "./render.js";

// mode: "cards" | "mcq" | "write"
// Direction: A/C: wir mischen automatisch (Wort->Bedeutung oder Bedeutung->Wort)
export function runVocab(items, title = "Vokabeln", mode = "cards") {
  if (!Array.isArray(items) || items.length === 0) {
    setView(el(`<p class="muted">Keine Vokabeln gefunden.</p>`));
    return;
  }

  // kleine Helfer
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  let i = 0;
  let showBack = false;

  function progressBar(total, idx) {
    return `
      <div class="progress">
        <div class="progress-bar" style="width:${((idx + 1) / total) * 100}%"></div>
      </div>
    `;
  }

  function normalize(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[“”„"]/g, '"');
  }

  // A + C: Mischrichtung (zufällig pro Karte/Item)
  function makePrompt(item) {
    const dir = Math.random() < 0.5 ? "de2x" : "x2de";
    if (dir === "de2x") {
      return {
        question: item.lemma || "",
        answer: item.translation || "",
        hint: item.de_hint || "",
        example: item.example || "",
        dir,
      };
    }
    return {
      question: item.translation || "",
      answer: item.lemma || "",
      hint: item.de_hint || "",
      example: item.example || "",
      dir,
    };
  }

  // MCQ: generiert Distraktoren aus anderen Items
  function buildMCQChoices(correct, allItems, field) {
    const pool = allItems
      .map((x) => (x[field] || "").trim())
      .filter((x) => x && x !== correct);
    const distractors = shuffle([...new Set(pool)]).slice(0, 3);
    return shuffle([correct, ...distractors]);
  }

  function renderCards() {
    const item = items[i];
    const p = makePrompt(item);

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${escapeHTML(p.question)}</div>
        <div class="muted">${escapeHTML(p.hint)}</div>

        <hr />

        ${
          showBack
            ? `
              <div class="big">${escapeHTML(p.answer)}</div>
              <div class="muted">${escapeHTML(p.example)}</div>
            `
            : `<div class="muted">Tippe auf „Umdrehen“.</div>`
        }

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

  function renderMCQ() {
    const item = items[i];
    const p = makePrompt(item);

    // wir fragen: Frage = p.question, richtige Lösung = p.answer
    // Distraktoren ziehen wir aus passendem Feld:
    const field = p.dir === "de2x" ? "translation" : "lemma";
    const correct = (p.answer || "").trim();
    const choices = buildMCQChoices(correct, items, field);

    let locked = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${escapeHTML(p.question)}</div>
        <div class="muted">${escapeHTML(p.hint)}</div>

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

      btns.forEach((b) => {
        b.classList.add("is-disabled", "is-neutral");
      });

      // richtige finden
      const idxCorrect = choices.findIndex((c) => normalize(c) === normalize(correct));
      if (idxCorrect >= 0) {
        btns[idxCorrect].classList.remove("is-neutral");
        btns[idxCorrect].classList.add("is-correct");
      }

      // falsche markieren
      if (normalize(chosen) !== normalize(correct)) {
        const idxChosen = choices.findIndex((c) => normalize(c) === normalize(chosen));
        if (idxChosen >= 0) {
          btns[idxChosen].classList.remove("is-neutral");
          btns[idxChosen].classList.add("is-wrong");
        }
        feedback.textContent = "❌ Nicht ganz.";
      } else {
        feedback.textContent = "✅ Richtig!";
      }
    }

    btns.forEach((b, idx) => {
      b.onclick = () => mark(choices[idx]);
    });

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
        <div class="muted">${escapeHTML(p.hint)}</div>

        <div class="row">
          <input id="inp" type="text" style="flex:1; font-size:1.2rem; padding:14px 16px; border-radius:16px; border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: white;" placeholder="Schreibe die Lösung…" />
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
      const guess = normalize(inp.value);
      const ok = guess && guess === normalize(correct);

      if (ok) {
        feedback.textContent = "✅ Richtig!";
      } else {
        feedback.textContent = `❌ Nicht ganz. Lösung: ${correct}`;
      }
    }

    node.querySelector("#check").onclick = check;
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });

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

  // Router
  if (mode === "mcq") return renderMCQ();
  if (mode === "write") return renderWrite();
  return renderCards();
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}
