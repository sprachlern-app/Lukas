// src/render.js

// HTML-String -> echtes DOM-Element
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Inhalt in #view austauschen
export function setView(node) {
  const view = document.getElementById("view");
  if (!view) return;
  view.innerHTML = "";
  view.appendChild(node);
}

