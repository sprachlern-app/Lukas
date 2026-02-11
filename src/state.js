// src/state.js
const KEY = "teacher_mode_v1";
const PASSCODE = "daz5"; // <- kannst du ändern

export function isTeacher() {
  return localStorage.getItem(KEY) === "1";
}

export function setTeacher(on) {
  localStorage.setItem(KEY, on ? "1" : "0");
}

export function teacherLogin() {
  const code = prompt("Lehrkraft-Code eingeben:");
  if ((code || "").trim() === PASSCODE) {
    setTeacher(true);
    window.dispatchEvent(new Event("teacher-mode-changed"));
    return { ok: true, teacher: true };
  }
  window.dispatchEvent(new Event("teacher-mode-changed"));
  return { ok: false, teacher: false };
}

export function teacherLogout() {
  setTeacher(false);
  window.dispatchEvent(new Event("teacher-mode-changed"));
  return { ok: true, teacher: false };
}

// Notfall: setzt den Lehrmodus komplett zurück
export function resetTeacherHard() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("teacher-mode-changed"));
}
