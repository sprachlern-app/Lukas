// src/practice_vocab.js
import { el, setView } from "./render.js";
import { isTeacher } from "./state.js";

export function runVocab(items, title = "Vokabeln", mode = "cards") {
  if (!Array.isArray(items) || items.length === 0) {
    setView(el(`<p class="muted">Keine Vokabeln gefunden.</p>`));
    return;
  }

  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  const norm = (s) =>
    String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  // trennt "pen / zum Schreiben" → main + extra
  function splitMainAndExtra(s) {
    const raw = String(s || "").trim();
    const parts = raw.split(" / ");
    return {
      main: (parts[0] || "").trim(),
      extra: parts.slice(1).join(" / ").trim(),
    };
  }

  let i = 0;
  let showBack = false;

  function progressBar(total, idx) {
    return `
      <div class="progress">
        <div class="progress-bar" style="width:${((idx + 1) / total) * 100}%"></div>
      </div>
    `;
  }

  function makePrompt(item) {
    const dir = Math.random() < 0.5 ? "de2x" : "x2de";
    if (dir === "de2x") {
      return {
        question: item.lemma || "",
        answer: item.translation || "",
        example: item.example || "",
      };
    }
    return {
      question: item.translation || "",
      answer: item.lemma || "",
      example: item.example || "",
    };
  }

  function colorClass(idx) {
    return ["c1", "c2", "c3", "c4"][idx % 4];
  }

  // ===== CARDS =====
  function renderCards() {
    const item = items[i];
    const p = makePrompt(item);
    const { main, extra } = splitMainAndExtra(p.answer);

    const node = el(`
      <div class="card">
        <h2>${title}</h2>
        ${progressBar(items.length, i)}

        <div class="flashcard ${colorClass(i)}">
          <div class="label">Karte</div>

          <div class="big">${p.question}</div>

          <hr />

          ${
            showBack
              ? `
                <div class="big">${main}</div>
                ${
                  isTeacher() && extra
                    ? `<div class="muted"><b>Lehrer-Zusatz:</b> ${extra}</div>`
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

  // ===== MCQ =====
  function renderMCQ() {
    const item = items[i];
    const p = makePrompt(item);
    const { main } = splitMainAndExtra(p.answer);

    const pool = items
      .map((x) => splitMainAndExtra(x.translation || "").main)
      .filter((x) => x && norm(x) !== norm(main));

    const choices = shuffle([main, ...pool.slice(0, 3)]);

    let locked = false;

    const node = el(`
      <div class="card">
        <h2>${title}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${p.question}</div>

        <div class="stack" id="opts"></div>
      </div>
    `);

    const opts = node.querySelector("#opts");

    choices.forEach((text) => {
      const b = el(`<button class="opt">${text}</button>`);
      opts.appendChild(b);

      b.onclick = () => {
        if (locked) return;
        locked = true;

        if (norm(text) === norm(main)) {
          b.classList.add("is-correct");
        } else {
          b.classList.add("is-wrong");
        }
      };
    });

    setView(node);
  }

  // ===== WRITE =====
  function renderWrite() {
    const item = items[i];
    const p = makePrompt(item);
    const { main } = splitMainAndExtra(p.answer);

    const node = el(`
      <div class="card">
        <h2>${title}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${p.question}</div>

        <div class="row">
          <input id="inp" type="text" placeholder="Schreibe die Lösung…" />
          <button id="check">Prüfen</button>
        </div>

        <div id="feedback"></div>
      </div>
    `);

    node.querySelector("#check").onclick = () => {
      const guess = norm(node.querySelector("#inp").value);
      node.querySelector("#feedback").textContent =
        guess === norm(main)
          ? "✅ Richtig!"
          : "❌ Lösung: " + main;
    };

    setView(node);
  }

  if (mode === "mcq") return renderMCQ();
  if (mode === "write") return renderWrite();
  return renderCards();
}
