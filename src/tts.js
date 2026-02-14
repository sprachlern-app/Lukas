// src/tts.js
let voicesCache = [];

export function initTTS() {
  if (!("speechSynthesis" in window)) return;
  const load = () => { voicesCache = window.speechSynthesis.getVoices() || []; };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function getGermanVoices() {
  return (voicesCache || []).filter(v => (v.lang || "").toLowerCase().startsWith("de"));
}

export function speakDE(text, voiceIndex = 0) {
  if (!("speechSynthesis" in window)) return;
  const t = String(text || "").trim();
  if (!t) return;

  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(t);
  u.lang = "de-DE";
  u.rate = 0.95;

  const de = getGermanVoices();
  if (de[voiceIndex]) u.voice = de[voiceIndex];
  else if (de[0]) u.voice = de[0];

  window.speechSynthesis.speak(u);
}
