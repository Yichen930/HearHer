import * as backend from "./backend.js";
import {
  clearSession as clearLocalSession,
  getSession as getLocalSession,
  linkPatient,
  listLinkedPatientIds,
  listSubmissions,
  setSession as setLocalSession,
  slugifyEmail,
} from "./storage.js";

/** @typedef {{ mode: "api", role: string, displayName: string, email: string, userId: number, patientId: string, doctorId: string }} ApiSession */
/** @typedef {{ mode?: "local", role: string, displayName: string, patientId: string, doctorId: string }} LocalSession */

let useApi = false;
/** @type {ApiSession | LocalSession | null} */
let cachedApiUser = null;

function mapApiUser(user) {
  const email = user.email;
  return {
    mode: "api",
    role: user.role,
    displayName: user.display_name,
    email,
    userId: user.id,
    patientId: email,
    doctorId: email,
  };
}

export function isApiMode() {
  return useApi;
}

export async function initPortal() {
  useApi = await backend.probeBackend();
  cachedApiUser = null;
  if (useApi) {
    await refreshApiSession();
  }
}

export async function refreshApiSession() {
  if (!useApi) return false;
  const t = backend.getApiToken();
  if (!t) {
    cachedApiUser = null;
    return false;
  }
  try {
    const me = await backend.apiFetch("/me");
    cachedApiUser = mapApiUser(me.user);
    return true;
  } catch {
    backend.clearApiToken();
    cachedApiUser = null;
    return false;
  }
}

/**
 * @returns {ApiSession | LocalSession | null}
 */
export function getSession() {
  if (useApi) return cachedApiUser;
  return getLocalSession();
}

export function setLocalOnlySession(session) {
  setLocalSession(session);
}

export async function clearAllSession() {
  if (useApi && backend.getApiToken()) {
    try {
      await backend.apiFetch("/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    backend.clearApiToken();
    cachedApiUser = null;
  }
  clearLocalSession();
}

export async function apiRegister({ email, password, displayName, role }) {
  await backend.apiFetch("/register", {
    method: "POST",
    body: JSON.stringify({
      email: slugifyEmail(email),
      password,
      display_name: displayName,
      role,
    }),
  });
}

export async function apiLogin({ email, password }) {
  const res = await backend.apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email: slugifyEmail(email), password }),
  });
  backend.setApiToken(res.token);
  cachedApiUser = mapApiUser(res.user);
}

export async function fetchMySubmissions() {
  if (!useApi) return listSubmissions(getLocalSession().patientId);
  return await backend.apiFetch("/submissions/mine");
}

export async function fetchDoctorPatients() {
  if (!useApi) return listLinkedPatientIds(getLocalSession().doctorId).map((email) => ({ patient_email: email }));
  return await backend.apiFetch("/doctor/patients");
}

export async function fetchDoctorPatientSubmissions(patientEmail) {
  if (!useApi) {
    return listSubmissions(patientEmail);
  }
  const enc = encodeURIComponent(slugifyEmail(patientEmail));
  return await backend.apiFetch(`/doctor/patients/${enc}/submissions`);
}

export async function apiCreateSubmission(answers) {
  return await backend.apiFetch("/submissions", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function apiLinkPatient(patientEmail) {
  const email = slugifyEmail(patientEmail);
  if (!email) return { ok: false, error: "Patient email is required." };
  try {
    await backend.apiFetch("/links", {
      method: "POST",
      body: JSON.stringify({ patient_email: email }),
    });
    return { ok: true, patientId: email };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function linkPatientUnified(session, patientEmail) {
  if (useApi) return apiLinkPatient(patientEmail);
  return linkPatient(session.doctorId, patientEmail);
}
