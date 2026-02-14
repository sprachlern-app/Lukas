// src/practice_vocab.js
import { el, setView } from "./render.js";
import { isTeacher } from "./state.js";
import { speakDE } from "./tts.js";

export function runVocab(allItems, title = "Vokabeln", mode = "cards") {
  if (!Array.isArray(allItems) || allItems.length === 0) {
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

  // ===== Set-Auswahl vorbereiten =====
  const sets = [
    ...new Set(allItems.map((x) => String(x.set_id || "").trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "de"));

  let selectedSet = sets[0] || "all"; // default: erstes Set (oder all)
  let roundOn = false;
  let roundSize = 10;

  let items = []; // aktuell aktive Liste (Set + ggf. 10er)
  let i = 0;

  function getSetItems() {
    if (!selectedSet || selectedSet === "all") return allItems.slice();
    return allItems.filter((x) => String(x.set_id || "").trim() === selectedSet);
  }

  function rebuildItems() {
    const base = getSetItems();
    const picked = roundOn ? shuffle(base).slice(0, Math.min(roundSize, base.length)) : base;
    items = picked.length ? picked : base; // falls Set leer wäre
    i = 0;
  }

  // beim Start initialisieren
  rebuildItems();

  // Pools für Distraktoren (immer aus AKTUELLEM Items-Set, damit MCQ sinnvoll bleibt)
  function makePools(currentItems) {
    const lemmaPool = shuffle(
      [...new Set(currentItems.map((x) => splitMainExtra(x.lemma).main).filter(Boolean))]
    );
    const transPool = shuffle(
      [...new Set(currentItems.map((x) => splitMainExtra(x.translation).main).filter(Boolean))]
    );
    return { lemmaPool, transPool };
  }

  // A + C: Richtung gemischt pro Item
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

  // ===== UI-Leiste (Set + 10er-Runde) =====
  function controlBarHTML() {
    const setOptions = [
      `<option value="all"${selectedSet === "all" ? " selected" : ""}>Alle Sets</option>`,
      ...sets.map(
        (s) => `<option value="${escapeHTML(s)}"${selectedSet === s ? " selected" : ""}>${escapeHTML(s)}</option>`
      ),
    ].join("");

    return `
      <div class="row" style="align-items:center; gap:10px;">
        <label class="muted" style="font-weight:700;">Set:</label>
        <select id="setSelect"
          style="font-size:1.1rem; padding:10px 12px; border-radius:14px;
                 border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: white;">
          ${setOptions}
        </select>

        <button id="roundBtn" type="button">${roundOn ? "🎯 10er-Runde: AN" : "🎯 10er-Runde: AUS"}</button>
        <button id="reshuffleBtn" type="button">🔁 Neu mischen</button>

        <span class="muted" style="margin-left:auto;">
          ${items.length} ${roundOn ? "(in Runde)" : "(im Set)"}
        </span>
      </div>
    `;
  }

  function wireControls(node, rerenderFn) {
    const setSelect = node.querySelector("#setSelect");
    const roundBtn = node.querySelector("#roundBtn");
    const reshuffleBtn = node.querySelector("#reshuffleBtn");

    if (setSelect) {
      setSelect.onchange = () => {
        selectedSet = setSelect.value || "all";
        rebuildItems();
        rerenderFn();
      };
    }

    if (roundBtn) {
      roundBtn.onclick = () => {
        roundOn = !roundOn;
        rebuildItems();
        rerenderFn();
      };
    }

    if (reshuffleBtn) {
      reshuffleBtn.onclick = () => {
        // nur die aktuelle Liste neu ziehen (besonders für 10er)
        rebuildItems();
        rerenderFn();
      };
    }
  }

  // ===== CARDS =====
  function renderCards() {
    if (!items.length) {
      setView(el(`<p class="muted">Keine Vokabeln im gewählten Set.</p>`));
      return;
    }

    const item = items[i];
    const p = makePrompt(item);
    const { main: answerMain, extra: answerExtra } = splitMainExtra(p.answerRaw);
    const teacherHint = (item.de_hint || "").trim();

    let showBack = false;

   const node = el(`
  <div class="card">
    <h2>${escapeHTML(title)}</h2>
    ${controlBarHTML()}
    ${progressBar(items.length, i)}

    <div class="flashcard ${colorClass(i)}">
      <div class="label">Karte</div>
      <div class="big">${escapeHTML(p.question)}</div>

      <div class="row">
        <button id="speak1" type="button">🔊 Vorlesen</button>
      </div>

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

node.querySelector("#speak1")?.addEventListener("click", () => {
  speakDE(p.question, 0);
});
setView(node);

// ===== CARDS =====
  function renderCards() {
    if (!items.length) {
      setView(el(`<p class="muted">Keine Vokabeln im gewählten Set.</p>`));
      return;
    }

    const item = items[i];
    const p = makePrompt(item);
    const { main: answerMain, extra: answerExtra } = splitMainExtra(p.answerRaw);
    const teacherHint = (item.de_hint || "").trim();

    let showBack = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${controlBarHTML()}
        ${progressBar(items.length, i)}

        <div class="flashcard ${colorClass(i)}">
          <div class="label">Karte</div>
          <div class="big">${escapeHTML(p.question)}</div>
          <div class="row">
            <button id="speak1" type="button">🔊 Vorlesen</button>
          </div>

          <hr />

          <div id="backArea" class="muted">Tippe auf „Umdrehen“.</div>
        </div>

        <div class="row">
          <button id="prev">←</button>
          <button id="flip">Umdrehen</button>
          <button id="next">→</button>
        </div>

  // 👉 HIER kommt der Klick-Handler rein
  node.querySelector("#speak1")?.addEventListener("click", () => {
    speakDE(p.question, 0);
  });

  // vorhandene Button-Handler
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

  setView(node);
}

        <div class="muted">${i + 1} / ${items.length}</div>
      </div>
    `);

    wireControls(node, renderCards);

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
    if (!items.length) {
      setView(el(`<p class="muted">Keine Vokabeln im gewählten Set.</p>`));
      return;
    }

    const item = items[i];
    const p = makePrompt(item);
    const { main: correctMain, extra: correctExtra } = splitMainExtra(p.answerRaw);

    const { lemmaPool, transPool } = makePools(items);
    const pool = p.dir === "de2x" ? transPool : lemmaPool;

    const distractors = pool.filter((x) => norm(x) !== norm(correctMain)).slice(0, 3);
    const choices = shuffle([correctMain, ...distractors]);

    let locked = false;
    let reveal = false;

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${controlBarHTML()}
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

    wireControls(node, renderMCQ);

    const opts = node.querySelector("#opts");
    const feedback = node.querySelector("#feedback");

    const teacherRow = node.querySelector("#teacherRow");
    const revealBtn = node.querySelector("#revealBtn");
    if (isTeacher()) {
      teacherRow.style.display = "flex";
      revealBtn.onclick = () => {
        reveal = true;
        revealBtn.disabled = true;
        revealBtn.textContent = "Lösung angezeigt";
        if (correctExtra) {
          feedback.textContent = (feedback.textContent || "").trim() + `  (Zusatz: ${correctExtra})`;
        }
      };
    }

    const keys = ["A", "B", "C", "D"];
const btns = choices.map((text, idx) => {
  const key = keys[idx] || "";
  const b = el(`<button class="opt">${key}: ${escapeHTML(text)}</button>`);
  opts.appendChild(b);
  return b;
});

    function lockAndMark(chosenText) {
      if (locked) return;
      locked = true;

      btns.forEach((b) => b.classList.add("is-disabled", "is-neutral"));

      const idxCorrect = choices.findIndex((c) => norm(c) === norm(correctMain));
      if (idxCorrect >= 0) {
        btns[idxCorrect].classList.remove("is-neutral");
        btns[idxCorrect].classList.add("is-correct");
      }

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

      if (isTeacher() && reveal && correctExtra) {
        feedback.textContent = (feedback.textContent || "").trim() + `  (Zusatz: ${correctExtra})`;
      }
    }

    btns.forEach((b, idx) => (b.onclick = () => lockAndMark(choices[idx])));

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
    if (!items.length) {
      setView(el(`<p class="muted">Keine Vokabeln im gewählten Set.</p>`));
      return;
    }

    const item = items[i];
    const p = makePrompt(item);
    const { main: correctMain, extra: correctExtra } = splitMainExtra(p.answerRaw);

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>
        ${controlBarHTML()}
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

    wireControls(node, renderWrite);

    const inp = node.querySelector("#inp");
    const feedback = node.querySelector("#feedback");

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
        feedback.textContent = "❌ Nicht ganz.";
      }
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
