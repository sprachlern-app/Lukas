// src/practice_vocab.js
import { el, setView } from "./render.js";
import { isTeacher } from "./state.js";

export function runVocab(items, title = "Vokabeln", mode = "cards") {
  if (!Array.isArray(items) || items.length === 0) {
    setView(el(`<p class="muted">Keine Vokabeln gefunden.</p>`));
    return;
  }

  // Helpers
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[“”„"]/g, '"');

  // trennt "pen / zum Schreiben" -> {main:"pen", extra:"zum Schreiben"}
  function splitMainExtra(s) {
    const raw = String(s || "").trim();
    const parts = raw.split(" / ");
    return {
      main: (parts[0] || "").trim(),
      extra: parts.slice(1).join(" / ").trim(),
    };
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
    ));
  }

  function progressBar(total, idx) {
    return `
      <div class="progress">
        <div class="progress-bar" style="width:${((idx + 1) / total) * 100}%"></div>
      </div>
    `;
  }

  function colorClass(idx) {
    return ["c1", "c2", "c3", "c4"][idx % 4];
  }

  // A + C: Richtung gemischt pro Item
  // dir = "de2x" (lemma -> translation) oder "x2de" (translation -> lemma)
  function makePrompt(item) {
    const dir = Math.random() < 0.5 ? "de2x" : "x2de";
    if (dir === "de2x") {
      return {
        dir,
        question: (item.lemma || "").trim(),
        answerRaw: (item.translation || "").trim(),
        example: (item.example || "").trim(),
      };
    }
    return {
      dir,
      question: (item.translation || "").trim(),
      answerRaw: (item.lemma || "").trim(),
      example: (item.example || "").trim(),
    };
  }

  // Pools für Distraktoren (immer Hauptteil ohne Zusatz)
  const lemmaPool = shuffle(
    [...new Set(items.map((x) => splitMainExtra(x.lemma).main).filter(Boolean))]
  );
  const transPool = shuffle(
    [...new Set(items.map((x) => splitMainExtra(x.translation).main).filter(Boolean))]
  );

  let i = 0;

  // ===== CARDS =====
  function renderCards() {
    const item = items[i];
    const p = makePrompt(item);

    const { main: answerMain, extra: answerExtra } = splitMainExtra(p.answerRaw);

    // de_hint soll NICHT direkt sichtbar sein
    const teacherHint = (item.de_hint || "").trim();

    let showBack = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="flashcard ${colorClass(i)}">
          <div class="label">Karte</div>

          <div class="big">${escapeHTML(p.question)}</div>

          <hr />

          <div id="backArea" class="muted">Tippe auf „Umdrehen“.</div>
        </div>

        <div class="row">
          <button id="prev">←</button>
          <button id="flip">Umdrehen</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    const backArea = node.querySelector("#backArea");

    function paintBack() {
      if (!showBack) {
        backArea.className = "muted";
        backArea.textContent = "Tippe auf „Umdrehen“.";
        return;
      }
      backArea.className = "";
      backArea.innerHTML = `
        <div class="big">${escapeHTML(answerMain)}</div>
        ${p.example ? `<div class="muted">${escapeHTML(p.example)}</div>` : ""}
        ${
          isTeacher() && answerExtra
            ? `<div class="muted"><b>Lehrer-Zusatz:</b> ${escapeHTML(answerExtra)}</div>`
            : ""
        }
        ${
          isTeacher() && teacherHint
            ? `<div class="muted"><b>Lehrerhinweis:</b> ${escapeHTML(teacherHint)}</div>`
            : ""
        }
      `;
    }

    node.querySelector("#prev").onclick = () => {
      i = (i - 1 + items.length) % items.length;
      renderCards();
    };
    node.querySelector("#next").onclick = () => {
      i = (i + 1) % items.length;
      renderCards();
    };
    node.querySelector("#flip").onclick = () => {
      showBack = !showBack;
      paintBack();
    };

    paintBack();
    setView(node);
  }

  // ===== MCQ =====
  function renderMCQ() {
    const item = items[i];
    const p = makePrompt(item);

    const { main: correctMain, extra: correctExtra } = splitMainExtra(p.answerRaw);

    // Richtung: wenn Frage=lemma, Antworten aus translation-Pool; sonst aus lemma-Pool
    const pool = p.dir === "de2x" ? transPool : lemmaPool;

    // Distraktoren: 3 andere
    const distractors = pool.filter((x) => norm(x) !== norm(correctMain)).slice(0, 3);
    const choices = shuffle([correctMain, ...distractors]);

    let locked = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${progressBar(items.length, i)}

        <div class="big">${escapeHTML(p.question)}</div>

        <div class="stack" id="opts"></div>
        <div id="feedback" class="muted"></div>

        <div class="row" id="teacherRow" style="display:none">
          <button id="revealBtn">Lösung anzeigen</button>
        </div>

        <div class="row">
          <button id="prev">←</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    const opts = node.querySelector("#opts");
    const feedback = node.querySelector("#feedback");

    const teacherRow = node.querySelector("#teacherRow");
    const revealBtn = node.querySelector("#revealBtn");

    let reveal = false;
    if (isTeacher()) {
      teacherRow.style.display = "flex";
      revealBtn.onclick = () => {
        reveal = true;
        revealBtn.disabled = true;
        revealBtn.textContent = "Lösung angezeigt";
        // nur Lehrkraft: ggf. Zusatz anzeigen
        if (correctExtra) {
          feedback.textContent = (feedback.textContent || "").trim() + `  (Zusatz: ${correctExtra})`;
        }
      };
    }

    // Buttons erzeugen
    const btns = choices.map((text) => {
      const b = el(`<button class="opt">${escapeHTML(text)}</button>`);
      opts.appendChild(b);
      return b;
    });

    function lockAndMark(chosenText) {
      if (locked) return;
      locked = true;

      // alle deaktivieren + neutral
      btns.forEach((b) => b.classList.add("is-disabled", "is-neutral"));

      // richtige grün
      const idxCorrect = choices.findIndex((c) => norm(c) === norm(correctMain));
      if (idxCorrect >= 0) {
        btns[idxCorrect].classList.remove("is-neutral");
        btns[idxCorrect].classList.add("is-correct");
      }

      // gewählte rot, falls falsch
      if (norm(chosenText) !== norm(correctMain)) {
        const idxChosen = choices.findIndex((c) => norm(c) === norm(chosenText));
        if (idxChosen >= 0) {
          btns[idxChosen].classList.remove("is-neutral");
          btns[idxChosen].classList.add("is-wrong");
        }
        feedback.textContent = "❌ Nicht ganz.";
      } else {
        feedback.textContent = "✅ Richtig!";
      }

      // Lehrkraft-Info NICHT automatisch (wie bei Grammatik, Variante B)
      if (isTeacher() && reveal && correctExtra) {
        feedback.textContent = (feedback.textContent || "").trim() + `  (Zusatz: ${correctExtra})`;
      }
    }

    btns.forEach((b, idx) => {
      b.onclick = () => lockAndMark(choices[idx]);
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

  // ===== WRITE =====
  function renderWrite() {
    const item = items[i];
    const p = makePrompt(item);
    const { main: correctMain, extra: correctExtra } = splitMainExtra(p.answerRaw);

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

        <div class="row" id="teacherRow" style="display:none">
          <button id="revealBtn">Lösung anzeigen</button>
        </div>

        <div class="row">
          <button id="prev">←</button>
          <button id="next">→</button>
        </div>

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    const inp = node.querySelector("#inp");
    const feedback = node.querySelector("#feedback");

    // Lehrerbutton (Variante B)
    const teacherRow = node.querySelector("#teacherRow");
    const revealBtn = node.querySelector("#revealBtn");
    if (isTeacher()) {
      teacherRow.style.display = "flex";
      revealBtn.onclick = () => {
        feedback.textContent = `✅ Lösung: ${correctMain}` + (correctExtra ? `  (Zusatz: ${correctExtra})` : "");
        revealBtn.disabled = true;
        revealBtn.textContent = "Lösung angezeigt";
      };
    }

    function check() {
      const guess = norm(inp.value);
      if (guess && guess === norm(correctMain)) {
        feedback.textContent = "✅ Richtig!";
      } else {
        feedback.textContent = `❌ Nicht ganz.`;
        // Schüler sehen nicht automatisch die Lösung (wie bei euch gewünscht) – nur Lehrkraft über Button
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
