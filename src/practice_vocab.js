// src/practice_vocab.js
import { el, setView } from "./render.js";

// mode ist in V1.0 optional (kommt aus manifest.csv), wir ignorieren es erstmal
export function runVocab(items, title = "Vokabeln", mode = "flashcards") {
  if (!Array.isArray(items) || items.length === 0) {
    setView(el(`<p class="muted">Keine Vokabeln gefunden.</p>`));
    return;
  }

  let i = 0;
  let showBack = false;

  function render() {
    const item = items[i];

    const node = el(`
      <div class="card">
        <h2>${escapeHTML(title)}</h2>

        <div class="big">${escapeHTML(item.lemma || "")}</div>
        <div class="muted">${escapeHTML(item.de_hint || "")}</div>

        <hr />

        ${
          showBack
            ? `
              <div class="big">${escapeHTML(item.translation || "")}</div>
              <div class="muted">${escapeHTML(item.example || "")}</div>
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
      render();
    };

    node.querySelector("#next").onclick = () => {
      i = (i + 1) % items.length;
      showBack = false;
      render();
    };

    node.querySelector("#flip").onclick = () => {
      showBack = !showBack;
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

