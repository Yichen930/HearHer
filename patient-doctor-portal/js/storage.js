/**
 * Demo persistence via localStorage. Not suitable for real PHI.
 */
const NS = "pdportal_v1";

export function getSession() {
  const raw = localStorage.getItem(`${NS}:session`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session == null) {
    localStorage.removeItem(`${NS}:session`);
    return;
  }
  localStorage.setItem(`${NS}:session`, JSON.stringify(session));
}

export function clearSession() {
  setSession(null);
}

function patientKey(patientId) {
  return `${NS}:patient:${patientId}:submissions`;
}

export function listSubmissions(patientId) {
  const raw = localStorage.getItem(patientKey(patientId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addSubmission(patientId, record) {
  const list = listSubmissions(patientId);
  list.unshift(record);
  localStorage.setItem(patientKey(patientId), JSON.stringify(list));
}

export function doctorLinksKey(doctorId) {
  return `${NS}:doctor:${doctorId}:linkedPatients`;
}

export function listLinkedPatientIds(doctorId) {
  const raw = localStorage.getItem(doctorLinksKey(doctorId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function linkPatient(doctorId, patientEmail) {
  const email = (patientEmail || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Patient email is required." };
  const key = doctorLinksKey(doctorId);
  const cur = listLinkedPatientIds(doctorId);
  if (!cur.includes(email)) {
    cur.push(email);
    localStorage.setItem(key, JSON.stringify(cur));
  }
  return { ok: true, patientId: email };
}

export function slugifyEmail(email) {
  return (email || "").trim().toLowerCase();
}
