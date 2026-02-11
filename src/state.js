// src/state.js
const KEY = "teacher_mode_v1";
const PASSCODE = "daz5"; // <- kannst du ändern

export function isTeacher() {
  return localStorage.getItem(KEY) === "1";
}

export function setTeacher(on) {
  localStorage.setItem(KEY, on ? "1" : "0");
}

export function toggleTeacherWithPrompt() {
  if (isTeacher()) {
    setTeacher(false);
    return { ok: true, teacher: false };
  }
  const code = prompt("Lehrkraft-Code eingeben:");
  if ((code || "").trim() === PASSCODE) {
    setTeacher(true);
    return { ok: true, teacher: true };
  }
  return { ok: false, teacher: false };
}
