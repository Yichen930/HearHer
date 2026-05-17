import {
  LAB_COHORT_REFERENCE,
  PCOS_COHORT,
  PCOS_TOP_CORRELATIONS,
  PCOS_MODEL_COEF_POSITIVE,
} from "./researchData.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPValue(p) {
  if (p == null || Number.isNaN(p)) return "—";
  if (typeof p === "string") return p;
  if (p < 0.001) return p < 1e-6 ? "<1e-6" : p.toExponential(1);
  return String(p);
}

function findLabById(id) {
  return LAB_COHORT_REFERENCE.find((l) => l.id === id);
}

function numericLabByInputName(fragment) {
  return LAB_COHORT_REFERENCE.find(
    (l) => l.kind === "numeric" && l.searchTerms?.some((t) => t.includes(fragment))
  );
}

function compareValueToCohort(value, meanNonPcos, meanPcos) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const dPcos = Math.abs(v - meanPcos);
  const dNon = Math.abs(v - meanNonPcos);
  if (dPcos < dNon * 0.85) {
    return `Closer to PCOS-labeled cohort mean (${meanPcos}) than non-PCOS mean (${meanNonPcos}).`;
  }
  if (dNon < dPcos * 0.85) {
    return `Closer to non-PCOS cohort mean (${meanNonPcos}) than PCOS-labeled mean (${meanPcos}).`;
  }
  return `Between cohort means (non-PCOS ${meanNonPcos}, PCOS-labeled ${meanPcos}).`;
}

function buildCorrelationNote(feature) {
  const row = PCOS_TOP_CORRELATIONS.find((r) => r.feature === feature);
  if (!row) return "";
  const strength =
    Math.abs(row.corr) >= 0.4 ? "strong" : Math.abs(row.corr) >= 0.2 ? "moderate" : "weak";
  return `Correlation with PCOS label (n=${PCOS_COHORT.n}): ${row.corr} (${strength}).`;
}

function buildModelNote(feature) {
  const row = PCOS_MODEL_COEF_POSITIVE.find((r) => r.feature === feature);
  if (!row) return "";
  return `Positive logistic-model coefficient in cohort (educational): ${row.coef}.`;
}

function buildDerivedResult(lh, fsh) {
  const lhN = Number(lh);
  const fshN = Number(fsh);
  if (!Number.isFinite(lhN) || !Number.isFinite(fshN) || fshN <= 0) {
    return `<p class="callout warn">Enter valid LH and FSH (FSH &gt; 0).</p>`;
  }
  const ratio = lhN / fshN;
  const lhLab = numericLabByInputName("LH(mIU/mL)");
  const fshLab = numericLabByInputName("FSH(mIU/mL)");
  let html = `<div class="lab-lookup-result-card">
    <h3>LH/FSH ratio</h3>
    <p class="lab-lookup-highlight"><strong>${ratio.toFixed(2)}</strong></p>
    <p class="muted">Educational only. Ratio &gt;2 is often discussed in PCOS workups—not diagnostic alone.</p>`;
  if (ratio > 2) {
    html += `<p class="lab-lookup-flag">Above 2 — discuss with hyperandrogenism signs and cycle pattern.</p>`;
  }
  if (lhLab && fshLab) {
    html += `<ul class="research-list">
      <li>LH means: non-PCOS ${lhLab.meanNonPcos}, PCOS-labeled ${lhLab.meanPcos}</li>
      <li>FSH means: non-PCOS ${fshLab.meanNonPcos}, PCOS-labeled ${fshLab.meanPcos}</li>
    </ul>`;
  }
  return `${html}</div>`;
}
function buildNumericResult(lab, valueRaw) {
  let html = `<div class="lab-lookup-result-card">
    <h3>${escapeHtml(lab.feature)}</h3>
    <p class="muted">Main PCOS cohort (n=${PCOS_COHORT.n}) — population reference only.</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Group</th><th>Cohort mean</th></tr></thead>
      <tbody>
        <tr><th scope="row">Not PCOS-labeled</th><td>${lab.meanNonPcos}</td></tr>
        <tr><th scope="row">PCOS-labeled</th><td>${lab.meanPcos}</td></tr>
      </tbody>
    </table></div>
    <p><strong>Between-group p-value:</strong> ${formatPValue(lab.pValue)}</p>`;
  const corrNote = buildCorrelationNote(lab.feature);
  const modelNote = buildModelNote(lab.feature);
  if (corrNote) html += `<p>${escapeHtml(corrNote)}</p>`;
  if (modelNote) html += `<p>${escapeHtml(modelNote)}</p>`;
  if (lab.endoCompare) {
    html += `<p class="research-mini-label">PCOS vs endometriosis comparison</p>
      <p>${escapeHtml(lab.endoCompare.field)} — PCOS ~${lab.endoCompare.pcos}, endo ~${lab.endoCompare.endo} (see section below).</p>`;
  }
  if (valueRaw !== "" && valueRaw != null) {
    const cmp = compareValueToCohort(valueRaw, lab.meanNonPcos, lab.meanPcos);
    if (cmp) {
      html += `<p class="lab-lookup-flag"><strong>Your value (${escapeHtml(valueRaw)}):</strong> ${escapeHtml(cmp)}</p>`;
    }
  }
  if (lab.hint) {
    html += `<p class="research-mini-label">Note</p><p>${escapeHtml(lab.hint)}</p>`;
  }
  html += `<p class="muted lab-lookup-foot">Not a substitute for your lab reference ranges or clinical judgment.</p></div>`;
  return html;
}

function buildBinaryResult(lab, answer) {
  let html = `<div class="lab-lookup-result-card">
    <h3>${escapeHtml(lab.feature)}</h3>
    <p class="muted">Sign in PCOS cohort (n=${PCOS_COHORT.n}).</p>
    <p><strong>Association with PCOS label:</strong> p=${formatPValue(lab.pValue)}, Cramér's V=${lab.cramersV}</p>`;
  const corrNote = buildCorrelationNote(lab.feature);
  if (corrNote) html += `<p>${escapeHtml(corrNote)}</p>`;
  if (answer === "yes") {
    html += `<p class="lab-lookup-flag">Reported <strong>yes</strong> — more common among PCOS-labeled participants in this cohort.</p>`;
  } else if (answer === "no") {
    html += `<p>Reported <strong>no</strong> — less common in PCOS-labeled group in chi-square analysis.</p>`;
  }
  if (lab.hint) html += `<p>${escapeHtml(lab.hint)}</p>`;
  html += `</div>`;
  return html;
}

function lookupLab(labId, valueRaw, binaryAnswer) {
  const lab = findLabById(labId);
  if (!lab) return `<p class="callout warn">Select a test from the list.</p>`;
  if (lab.kind === "derived") {
    const lh = document.getElementById("lab-lh-input")?.value;
    const fsh = document.getElementById("lab-fsh-input")?.value;
    return buildDerivedResult(lh, fsh);
  }
  if (lab.kind === "binary") return buildBinaryResult(lab, binaryAnswer);
  return buildNumericResult(lab, valueRaw);
}

export function renderLabLookupSection() {
  const options = LAB_COHORT_REFERENCE.map(
    (l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.feature)}</option>`
  ).join("");
  return `<div class="lab-lookup-panel">
    <p class="muted">Map a lab or measure to <strong>cohort statistics</strong> from the main PCOS dataset. Optionally enter a value to compare to group means (educational only).</p>
    <div class="lab-lookup-form">
      <label class="lab-lookup-label" for="lab-test-select">Test or measure</label>
      <select id="lab-test-select" class="lab-lookup-select" aria-label="Select lab test">
        <option value="">— Select —</option>
        ${options}
      </select>
      <label class="lab-lookup-label" for="lab-test-search">Quick filter</label>
      <input type="search" id="lab-test-search" class="lab-lookup-input" placeholder="e.g. AMH, LH, BMI…" autocomplete="off" />
      <div id="lab-value-fields">
        <label class="lab-lookup-label" for="lab-test-value">Patient value (optional)</label>
        <input type="number" step="any" id="lab-test-value" class="lab-lookup-input" placeholder="Numeric result" />
      </div>
      <div id="lab-binary-field" class="hidden">
        <span class="lab-lookup-label">Present?</span>
        <label class="lab-lookup-radio"><input type="radio" name="lab-binary" value="yes" /> Yes</label>
        <label class="lab-lookup-radio"><input type="radio" name="lab-binary" value="no" /> No</label>
      </div>
      <div id="lab-derived-fields" class="hidden">
        <label class="lab-lookup-label" for="lab-lh-input">LH (mIU/mL)</label>
        <input type="number" step="any" id="lab-lh-input" class="lab-lookup-input" />
        <label class="lab-lookup-label" for="lab-fsh-input">FSH (mIU/mL)</label>
        <input type="number" step="any" id="lab-fsh-input" class="lab-lookup-input" />
      </div>
      <button type="button" class="btn btn-primary" id="lab-lookup-btn">Show cohort context</button>
    </div>
    <div id="lab-lookup-result" class="lab-lookup-result" aria-live="polite"></div>
  </div>`;
}

function updateLabFormFields(lab) {
  const valueFields = document.getElementById("lab-value-fields");
  const binaryField = document.getElementById("lab-binary-field");
  const derivedFields = document.getElementById("lab-derived-fields");
  if (!valueFields || !binaryField || !derivedFields) return;

  valueFields.classList.toggle("hidden", !lab || lab.kind !== "numeric");
  binaryField.classList.toggle("hidden", !lab || lab.kind !== "binary");
  derivedFields.classList.toggle("hidden", !lab || lab.kind !== "derived");
}

function runLabLookup() {
  const select = document.getElementById("lab-test-select");
  const result = document.getElementById("lab-lookup-result");
  if (!select || !result) return;

  const lab = findLabById(select.value);
  const valueRaw = document.getElementById("lab-test-value")?.value ?? "";
  const binaryEl = document.querySelector('input[name="lab-binary"]:checked');
  const binaryAnswer = binaryEl ? binaryEl.value : "";

  result.innerHTML = lookupLab(select.value, valueRaw, binaryAnswer);
}

export function initLabLookup() {
  const select = document.getElementById("lab-test-select");
  const search = document.getElementById("lab-test-search");
  const btn = document.getElementById("lab-lookup-btn");
  if (!select || !btn) return;

  const allOptions = Array.from(select.options).map((o) => ({
    value: o.value,
    text: o.textContent,
  }));

  select.addEventListener("change", () => {
    updateLabFormFields(findLabById(select.value));
    document.getElementById("lab-lookup-result").innerHTML = "";
  });

  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const current = select.value;
      select.innerHTML = '<option value="">— Select —</option>';
      for (const opt of allOptions) {
        if (!opt.value) continue;
        if (!q || opt.text.toLowerCase().includes(q)) {
          const el = document.createElement("option");
          el.value = opt.value;
          el.textContent = opt.text;
          select.appendChild(el);
        }
      }
      if (current && [...select.options].some((o) => o.value === current)) {
        select.value = current;
      }
    });
  }

  btn.addEventListener("click", runLabLookup);

  select.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runLabLookup();
  });
}
