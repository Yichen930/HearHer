import { slugifyEmail, listSubmissions, addSubmission, listLinkedPatientIds } from "./storage.js";
import { buildPatientSummary } from "./summary.js";
import {
  initPortal,
  isApiMode,
  getSession,
  setLocalOnlySession,
  clearAllSession,
  refreshApiSession,
  apiRegister,
  apiLogin,
  fetchMySubmissions,
  fetchDoctorPatients,
  fetchDoctorPatientSubmissions,
  linkPatientUnified,
  apiCreateSubmission,
} from "./sessionManager.js";

function renderHeader(session) {
  const navPatient =
    session?.role === "patient"
      ? `<a href="#/patient">Patient home</a><a href="#/patient/checkin">New check-in</a>`
      : "";
  const navDoctor =
    session?.role === "doctor"
      ? `<a href="#/doctor">Doctor home</a><a href="#/doctor/link">Link patient</a><a href="#/doctor/research">Research notes</a>`
      : "";
  return `
  <header class="app-header">
    <div class="brand">Gyn Triage &amp; Education (demo)</div>
    <nav>
      <a href="#/about">About / 关于</a>
      ${session ? navPatient + navDoctor + `<button class="btn btn-ghost" type="button" id="btnLogout">Log out</button>` : `<a href="#/login">Log in</a>`}
    </nav>
  </header>`;
}

function requireSession(role) {
  const s = getSession();
  if (!s) {
    location.hash = "#/login";
    return null;
  }
  if (role && s.role !== role) {
    location.hash = s.role === "doctor" ? "#/doctor" : "#/patient";
    return null;
  }
  return s;
}

function sessionLabel(s) {
  if (!s) return "";
  return s.email || s.patientId || "";
}

async function bindLogout() {
  const btn = document.getElementById("btnLogout");
  if (btn) {
    btn.onclick = async () => {
      await clearAllSession();
      location.hash = "#/login";
    };
  }
}

function renderLogin(root) {
  const api = isApiMode();
  const dataHint = api
    ? "<strong>Server mode:</strong> accounts and check-ins are stored in a local <code>SQLite</code> file under <code>patient-doctor-portal/data/</code>. Use a strong password only for demo accounts."
    : "<strong>Offline mode:</strong> data stay in this browser only (<code>localStorage</code>). Open via <code>python server.py</code> to enable the database.";

  root.innerHTML =
    renderHeader(null) +
    `
    <main>
      <div class="card">
        <h1>Demo log in</h1>
        <p class="muted">${dataHint}</p>
        <p class="muted">Do not enter real clinical identifiers.</p>
        <form id="loginForm">
          <div class="row two">
            <div>
              <label for="role">Role</label>
              <select id="role" name="role" required>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>
            <div>
              <label for="displayName">Display name</label>
              <input id="displayName" name="displayName" type="text" autocomplete="name" placeholder="e.g. Dr. Lee / Alex" required />
            </div>
          </div>
          <div class="row">
            <div>
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required />
            </div>
          </div>
          <div class="row">
            <div>
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" placeholder="${
                api ? "min 4 characters" : "any (offline mode)"
              }" ${api ? "required minlength=\"4\"" : ""} />
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" type="submit">Log in</button>
            ${api ? `<button class="btn btn-ghost" type="button" id="btnRegister">Create account</button>` : ""}
          </div>
          <p id="loginMsg" class="muted" style="margin-top:12px;"></p>
        </form>
      </div>
    </main>`;

  const msg = () => document.getElementById("loginMsg");

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    msg().textContent = "";
    const role = document.getElementById("role").value;
    const displayName = document.getElementById("displayName").value.trim();
    const email = slugifyEmail(document.getElementById("email").value);
    const password = document.getElementById("password").value;
    if (!email) return;

    if (api) {
      if (!password || password.length < 4) {
        msg().textContent = "Password must be at least 4 characters in server mode.";
        return;
      }
      try {
        await apiLogin({ email, password });
        location.hash = role === "doctor" ? "#/doctor" : "#/patient";
      } catch (err) {
        msg().textContent = err instanceof Error ? err.message : String(err);
      }
      return;
    }

    setLocalOnlySession({
      role,
      displayName,
      patientId: email,
      doctorId: email,
    });
    location.hash = role === "doctor" ? "#/doctor" : "#/patient";
  });

  const regBtn = document.getElementById("btnRegister");
  if (regBtn) {
    regBtn.addEventListener("click", async () => {
      msg().textContent = "";
      const role = document.getElementById("role").value;
      const displayName = document.getElementById("displayName").value.trim();
      const email = slugifyEmail(document.getElementById("email").value);
      const password = document.getElementById("password").value;
      if (!email) {
        msg().textContent = "Email is required.";
        return;
      }
      if (!password || password.length < 4) {
        msg().textContent = "Password must be at least 4 characters.";
        return;
      }
      try {
        await apiRegister({ email, password, displayName, role });
        await apiLogin({ email, password });
        location.hash = role === "doctor" ? "#/doctor" : "#/patient";
      } catch (err) {
        msg().textContent = err instanceof Error ? err.message : String(err);
      }
    });
  }
}

async function renderAbout(root) {
  const session = getSession();
  root.innerHTML =
    renderHeader(session) +
    `
    <main>
      <div class="card prose">
        <h1>About this demo / 关于本演示</h1>
        <p><span class="badge badge-patient">Patient</span> Education-only check-ins generate a <strong>non-diagnostic</strong> summary to help you prepare for medical conversations.</p>
        <p><span class="badge badge-doctor">Doctor</span> View is a <strong>read-only log</strong> of linked patients’ submitted answers for documentation-style review in this prototype.</p>

        <div class="callout danger">
          <strong>Not medical advice.</strong> This site does not diagnose, treat, or prescribe. It is not FDA-cleared software and must not be used as a substitute for licensed clinical judgment, examination, imaging, or laboratory testing.
        </div>

        <h2>Compliance-oriented wording (English)</h2>
        <ul>
          <li>Outputs are <strong>informational</strong> and may be inaccurate or incomplete.</li>
          <li>Symptom overlap between conditions (for example, PCOS and endometriosis) is common; the tool does not establish a differential diagnosis.</li>
          <li>Emergency symptoms (for example, severe acute pain, heavy bleeding with instability, fever with pelvic pain, pregnancy complications) require urgent in-person care.</li>
          <li>${
            isApiMode()
              ? "In <strong>server mode</strong>, this demo stores accounts and submissions in a local SQLite file on your computer. This is still <strong>not</strong> a HIPAA-compliant production deployment."
              : "In <strong>offline mode</strong>, data in this demo are stored locally in your browser and are <strong>not</strong> a HIPAA-compliant record system."
          }</li>
        </ul>

        <div class="lang-block prose">
          <h2>合规说明（中文摘要）</h2>
          <p>本演示仅供教育与流程展示。生成内容<strong>不构成医学诊断或治疗建议</strong>，也不能替代执业医师的面诊、体检、实验室与影像学评估。</p>
          <p>妇科疾病症状可能存在重叠（例如 PCOS 与子宫内膜异位症相关表现），本工具<strong>不进行鉴别诊断</strong>。若出现急性加重、大出血、发热伴下腹痛、妊娠相关情况等，请及时就医或拨打急救。</p>
          <p>演示数据保存在浏览器本地，<strong>不属于</strong>符合 HIPAA / GDPR 等要求的医疗信息系统；真实产品需另行完成安全、隐私、临床验证与监管路径评估。</p>
        </div>

        <p class="muted">Literature-level omics modules (for example, single-cell resources) belong in a separate, clinician-gated education area with sourced figures and clear separation from triage outputs.</p>
      </div>
    </main>`;

  await bindLogout();
}

function submissionPlainText(s) {
  if (s.summaryModel && typeof s.summaryModel.plainText === "string") {
    return s.summaryModel.plainText;
  }
  if (typeof s.summary === "string") return s.summary;
  return "";
}

function formatSummaryStackHtml(summaryModel) {
  if (!summaryModel || !Array.isArray(summaryModel.blocks)) {
    return "";
  }
  const blocks = summaryModel.blocks;
  const importantTitles = blocks
    .filter((b) => b.variant === "important" && b.title)
    .map((b) => b.title);
  const keyStrip =
    importantTitles.length > 0
      ? `
    <div class="summary-key-strip">
      <div class="summary-key-strip-label">Highlights for your visit</div>
      <ul>
        ${importantTitles.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
      </ul>
    </div>`
      : "";

  const stack = blocks
    .map((b) => {
      const title = b.title
        ? `<h3 class="summary-block-title">${escapeHtml(b.title)}</h3>`
        : "";
      return `<section class="summary-block summary-${escapeHtml(b.variant)}">${title}<p class="summary-block-text">${escapeHtml(b.text)}</p></section>`;
    })
    .join("");

  return `${keyStrip}<div class="summary-stack">${stack}</div>`;
}

function formatSummaryCellHtml(s) {
  if (s.summaryModel && Array.isArray(s.summaryModel.blocks)) {
    return formatSummaryStackHtml(s.summaryModel);
  }
  return `<pre class="summary-legacy">${escapeHtml(submissionPlainText(s))}</pre>`;
}

async function renderPatientHome(root) {
  const session = requireSession("patient");
  if (!session) return;
  let subs = [];
  try {
    subs = isApiMode() ? await fetchMySubmissions() : listSubmissions(session.patientId);
  } catch {
    subs = [];
  }

  root.innerHTML =
    renderHeader(session) +
    `
    <main>
      <div class="card">
        <h1>Patient home</h1>
        <p class="muted">Signed in as <strong>${escapeHtml(session.displayName)}</strong> (${escapeHtml(sessionLabel(session))})</p>
        <div class="callout">Share your email with your clinician so they can <strong>link</strong> this demo account and view your check-in log.</div>
        <div class="btn-row">
          <a class="btn btn-primary" href="#/patient/checkin">New check-in</a>
        </div>
      </div>
      <div class="card">
        <h2>Past check-ins</h2>
        ${subs.length === 0 ? `<p class="muted">No submissions yet.</p>` : `
        <table>
          <thead><tr><th>When (local)</th><th>Preview</th></tr></thead>
          <tbody>
            ${subs.map((s) => `
              <tr>
                <td>${escapeHtml(s.submittedAt)}</td>
                <td>${escapeHtml(shortPreview(submissionPlainText(s)))}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
      </div>
    </main>`;

  await bindLogout();
}

async function renderPatientCheckin(root) {
  const session = requireSession("patient");
  if (!session) return;

  root.innerHTML =
    renderHeader(session) +
    `
    <main>
      <div class="card">
        <h1>Symptom check-in</h1>
        <p class="muted">All fields are optional except where marked; leave unknown blank.</p>
        <form id="checkinForm">
          <div class="row two">
            <div>
              <label for="age">Age (years)</label>
              <input id="age" name="age" type="text" inputmode="numeric" placeholder="e.g. 32" />
            </div>
            <div>
              <label for="cycleRegularity">Cycle regularity</label>
              <select id="cycleRegularity" name="cycleRegularity">
                <option value="">Prefer not to say</option>
                <option value="regular">Mostly regular</option>
                <option value="irregular">Often irregular</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
          <div class="row two">
            <div>
              <label for="painLevel">Pelvic pain intensity (self-rated)</label>
              <select id="painLevel" name="painLevel">
                <option value="">Prefer not to say</option>
                <option value="none">None / minimal</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
            <div>
              <label for="painTiming">Pain pattern</label>
              <select id="painTiming" name="painTiming">
                <option value="">Prefer not to say</option>
                <option value="cyclical">Worse around menses</option>
                <option value="noncyclical">Not clearly cyclical</option>
                <option value="progressive">Progressively worsening</option>
              </select>
            </div>
          </div>
          <div class="row two">
            <div>
              <label for="skinHair">Notable acne, hair thinning, or excess hair growth?</label>
              <select id="skinHair" name="skinHair">
                <option value="">Prefer not to say</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label for="bowelBladder">Bowel or bladder symptoms related to your cycle?</label>
              <select id="bowelBladder" name="bowelBladder">
                <option value="">Prefer not to say</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div class="row two">
            <div>
              <label for="fertilityConcern">Fertility concerns?</label>
              <select id="fertilityConcern" name="fertilityConcern">
                <option value="">Prefer not to say</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label for="notes">Anything else to tell your doctor (free text)</label>
              <textarea id="notes" name="notes" maxlength="2000" placeholder="Optional"></textarea>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" type="submit">Save &amp; show summary</button>
            <a class="btn btn-ghost" href="#/patient">Cancel</a>
          </div>
        </form>
      </div>
    </main>`;

  await bindLogout();

  document.getElementById("checkinForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const answers = Object.fromEntries(fd.entries());

    if (isApiMode()) {
      try {
        const record = await apiCreateSubmission(answers);
        const summaryModel = record.summaryModel;
        root.innerHTML =
          renderHeader(session) +
          `
      <main>
        <div class="card">
          <h1>Your educational summary</h1>
          <div class="callout danger"><strong>Not a diagnosis.</strong> If you have emergency symptoms, seek urgent care.</div>
          ${formatSummaryStackHtml(summaryModel)}
          <div class="btn-row">
            <a class="btn btn-primary" href="#/patient">Back to patient home</a>
            <a class="btn btn-ghost" href="#/patient/checkin">Another check-in</a>
          </div>
        </div>
      </main>`;
        await bindLogout();
      } catch (err) {
        root.innerHTML =
          renderHeader(session) +
          `<main><div class="card"><h1>Could not save</h1><p class="muted">${escapeHtml(err instanceof Error ? err.message : String(err))}</p><div class="btn-row"><a class="btn btn-primary" href="#/patient/checkin">Try again</a></div></div></main>`;
        await bindLogout();
      }
      return;
    }

    const summaryModel = buildPatientSummary(answers);
    const record = {
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      answers,
      summaryModel,
      summary: summaryModel.plainText,
    };
    addSubmission(session.patientId, record);

    root.innerHTML =
      renderHeader(session) +
      `
      <main>
        <div class="card">
          <h1>Your educational summary</h1>
          <div class="callout danger"><strong>Not a diagnosis.</strong> If you have emergency symptoms, seek urgent care.</div>
          ${formatSummaryStackHtml(summaryModel)}
          <div class="btn-row">
            <a class="btn btn-primary" href="#/patient">Back to patient home</a>
            <a class="btn btn-ghost" href="#/patient/checkin">Another check-in</a>
          </div>
        </div>
      </main>`;
    await bindLogout();
  });
}

function renderDoctorPatientCard(pid, subs) {
  return `
        <div class="card">
          <h2>Patient log: ${escapeHtml(pid)}</h2>
          ${subs.length === 0 ? `<p class="muted">No submissions from this patient yet.</p>` : `
          <table>
            <thead><tr><th>Time (ISO)</th><th>Answers (JSON)</th><th>Patient-facing summary</th></tr></thead>
            <tbody>
              ${subs.map((s) => `
                <tr>
                  <td>${escapeHtml(s.submittedAt)}</td>
                  <td><pre style="margin:0;white-space:pre-wrap;font-size:0.82rem;">${escapeHtml(JSON.stringify(s.answers, null, 2))}</pre></td>
                  <td class="doctor-summary-cell">${formatSummaryCellHtml(s)}</td>
                </tr>`).join("")}
            </tbody>
          </table>`}
        </div>`;
}

async function renderDoctorHome(root) {
  const session = requireSession("doctor");
  if (!session) return;

  let patientEmails = [];
  try {
    patientEmails = isApiMode()
      ? (await fetchDoctorPatients()).map((r) => r.patient_email)
      : listLinkedPatientIds(session.doctorId);
  } catch {
    patientEmails = [];
  }

  const cards = [];
  try {
    for (const email of patientEmails) {
      const subs = isApiMode() ? await fetchDoctorPatientSubmissions(email) : listSubmissions(email);
      cards.push(renderDoctorPatientCard(email, subs));
    }
  } catch {
    cards.push(`<div class="card"><p class="muted">Could not load patient logs.</p></div>`);
  }

  root.innerHTML =
    renderHeader(session) +
    `
    <main>
      <div class="card">
        <h1>Doctor home</h1>
        <p class="muted">Signed in as <strong>${escapeHtml(session.displayName)}</strong></p>
        <p class="muted">Linked patients: ${patientEmails.length}. Use <a href="#/doctor/link">Link patient</a> to add a patient email that matches their account.</p>
      </div>
      ${patientEmails.length === 0 ? `<div class="card"><p class="muted">No linked patients yet.</p></div>` : cards.join("")}
    </main>`;

  await bindLogout();
}

async function renderDoctorResearch(root) {
  const session = requireSession("doctor");
  if (!session) return;

  root.innerHTML =
    renderHeader(session) +
    `
    <main>
      <div class="card prose">
        <h1>Clinician-facing research notes (placeholder)</h1>
        <p class="muted">This section is intentionally separate from patient triage. It should host <strong>sourced, static educational material</strong> (figures, citations, methodology summaries), not raw patient-derived outputs.</p>
        <h2>Supplementary single-cell resources (project context)</h2>
        <p>Your workspace includes 10x-style archives for <strong>endometrium</strong> and <strong>PCOS</strong> scRNA-seq. Typical downstream steps are QC, normalization, dimensionality reduction, clustering, marker genes, and pathway analysis using established pipelines (for example Scanpy or Seurat).</p>
        <p><strong>Important limitations:</strong> endometrial tissue single-cell profiles are not equivalent to endometriosis lesion biology; interpretation requires study design context from the primary publication. These resources should not be presented to patients as diagnostic evidence.</p>
        <h2>Product guidance</h2>
        <ul>
          <li>Gate this module behind clinician authentication and institutional use policies.</li>
          <li>Version each educational page; keep an audit trail of updates.</li>
          <li>Never auto-link single-cell findings to an individual patient’s questionnaire score without a validated clinical workflow.</li>
        </ul>
        <p class="muted">Replace this placeholder with PDFs, curated figures, and PubMed links approved by your medical advisory board.</p>
      </div>
    </main>`;

  await bindLogout();
}

async function renderDoctorLink(root) {
  const session = requireSession("doctor");
  if (!session) return;

  const hint = isApiMode()
    ? "Enter the patient’s registered email. The link is stored in the server database (demo SQLite on this machine)."
    : "Enter the same email the patient used at demo login. Links are stored in this browser only (localStorage).";

  root.innerHTML =
    renderHeader(session) +
    `
    <main>
      <div class="card">
        <h1>Link a patient</h1>
        <p class="muted">${escapeHtml(hint)}</p>
        <form id="linkForm">
          <div class="row">
            <div>
              <label for="pEmail">Patient email</label>
              <input id="pEmail" name="pEmail" type="email" required />
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" type="submit">Link</button>
            <a class="btn btn-ghost" href="#/doctor">Back</a>
          </div>
          <p id="linkMsg" class="muted"></p>
        </form>
      </div>
    </main>`;

  await bindLogout();
  document.getElementById("linkForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = slugifyEmail(document.getElementById("pEmail").value);
    const res = await linkPatientUnified(session, email);
    const msg = document.getElementById("linkMsg");
    msg.textContent = res.ok ? `Linked: ${res.patientId}` : res.error;
    if (res.ok) setTimeout(() => { location.hash = "#/doctor"; }, 400);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortPreview(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > 140 ? t.slice(0, 137) + "…" : t;
}

async function router() {
  const root = document.getElementById("app");
  if (isApiMode()) {
    await refreshApiSession();
  }
  const hash = location.hash || "#/login";

  if (hash === "#/about") return await renderAbout(root);
  if (hash === "#/login") return renderLogin(root);
  if (hash === "#/patient") return await renderPatientHome(root);
  if (hash === "#/patient/checkin") return await renderPatientCheckin(root);
  if (hash === "#/doctor") return await renderDoctorHome(root);
  if (hash === "#/doctor/link") return await renderDoctorLink(root);
  if (hash === "#/doctor/research") return await renderDoctorResearch(root);

  location.hash = "#/login";
}

window.addEventListener("hashchange", () => void router());
window.addEventListener("load", async () => {
  await initPortal();
  if (!location.hash) location.hash = "#/login";
  await router();
});
