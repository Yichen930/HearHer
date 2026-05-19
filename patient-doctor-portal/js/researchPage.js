import {
  PCOS_COHORT,
  PCOS_TOP_CORRELATIONS,
  PCOS_MODEL_COEF_POSITIVE,
  PCOS_VS_ENDO,
  PCOS_VS_ENDO_DIFF_TESTS,
  DIFFERENTIATION_RULES,
  SCRNA_INVENTORY,
  SCRNA_LIBRARY_INVENTORY,
  SCRNA_DEEP_SCOPE,
  RESEARCH_FIGURES,
  RESEARCH_DATA_SOURCES,
  CONDITION_EDUCATION,
  SYMPTOM_DIFFERENTIATION,
} from "./researchData.js";
import { renderLabLookupSection, initLabLookup } from "./researchLabLookup.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPValue(p) {
  if (p == null || Number.isNaN(p)) return "—";
  if (p < 0.001) return p < 1e-6 ? "<1e-6" : p.toExponential(1);
  return p.toFixed(4);
}

function renderResearchToc() {
  const links = [
    ["research-scope", "Scope"],
    ["research-sources", "Data sources"],
    ["research-cohort", "PCOS cohort"],
    ["research-compare", "PCOS vs endo"],
    ["research-lab", "Lab lookup"],
    ["research-scrna", "Single-cell"],
    ["research-education", "Education"],
  ];
  return `<nav class="research-toc" aria-label="Research sections">
    ${links
      .map(
        ([id, label]) =>
          `<button type="button" class="research-toc-link" data-research-jump="${escapeHtml(id)}">${escapeHtml(label)}</button>`
      )
      .join("")}
  </nav>`;
}

const RESEARCH_TOP_ID = "research-top";

export function scrollToResearchSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const header = document.querySelector("header.app-header");
  const offset = (header?.getBoundingClientRect().height ?? 72) + 16;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

/** In-page jumps only — hash links break the #/doctor/research SPA route. */
export function initResearchToc() {
  document.querySelectorAll(".research-toc [data-research-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      scrollToResearchSection(btn.getAttribute("data-research-jump"));
    });
  });
  document.querySelectorAll(".research-back-to-top").forEach((btn) => {
    btn.addEventListener("click", () => {
      scrollToResearchSection(RESEARCH_TOP_ID);
    });
  });
}

function renderBackToTop() {
  return `<p class="research-zone-foot">
    <button type="button" class="research-back-to-top">Back to top</button>
  </p>`;
}

function renderResearchZone(id, title, tone, bodyHtml, subtitle = "") {
  return `<section id="${escapeHtml(id)}" class="research-zone research-zone--${tone}">
    <header class="research-zone-head">
      <h2>${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="research-zone-sub">${escapeHtml(subtitle)}</p>` : ""}
    </header>
    <div class="research-zone-body">${bodyHtml}${renderBackToTop()}</div>
  </section>`;
}

function renderMetricTable(rows) {
  return `<div class="research-table-wrap"><table class="research-table research-table--compact">
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${rows
      .map(
        ([label, value]) =>
          `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
      )
      .join("")}</tbody>
  </table></div>`;
}

function renderFigure(fig, caption) {
  return `<figure class="research-figure">
    <img src="${escapeHtml(fig.src)}" alt="${escapeHtml(fig.alt)}" loading="lazy" width="640" />
    <figcaption>${escapeHtml(caption)}</figcaption>
  </figure>`;
}

function renderFigureGrid(figures) {
  return `<div class="research-figure-grid">${figures
    .map((f) => renderFigure(f, f.caption))
    .join("")}</div>`;
}

function renderScopeBanner() {
  return `<div class="research-scope-banner" role="note">
    <h2 class="research-scope-title">What this page shows (and what it does not)</h2>
    <ul class="research-scope-list">
      <li><strong>Population reference only</strong> — numbers come from published <em>supplementary</em> PCOS, endometriosis, and single-cell research cohorts, not from labs run on patients who use this app.</li>
      <li><strong>No blood tests or single-cell profiling</strong> — HearHer does not measure any app user’s cells. Linked patients appear only on the <strong>Dashboard</strong> (check-ins, optional chat, diagnoses).</li>
      <li><strong>Not individual diagnosis</strong> — models and tables support education and research context; clinical decisions require examination, imaging, and laboratories.</li>
    </ul>
  </div>`;
}

function renderDataSources() {
  const rows = RESEARCH_DATA_SOURCES.map(
    (s) => `<tr>
      <th scope="row">${escapeHtml(s.label)}</th>
      <td>${escapeHtml(s.description)}</td>
      <td>${escapeHtml(String(s.n))}</td>
      <td>${escapeHtml(s.method)}</td>
    </tr>`
  ).join("");
  return `<p class="muted research-sources-intro">Figures and tables on this page summarize peer-reviewed supplementary datasets. They are not generated from your linked patients’ check-ins.</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Dataset</th><th>Description</th><th>Scale</th><th>Methods (summary)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function renderTabularCohortSection() {
  const c = PCOS_COHORT;
  const stats = `
    <div class="research-stat-grid research-stat-grid--4">
      <div class="research-stat"><span class="research-stat-value">${c.n}</span><span class="research-stat-label">Rows</span></div>
      <div class="research-stat"><span class="research-stat-value">${c.pcosLabeledCount}</span><span class="research-stat-label">PCOS-labeled</span></div>
      <div class="research-stat"><span class="research-stat-value">${Math.round(c.cvRocAuc * 100)}%</span><span class="research-stat-label">CV ROC-AUC</span></div>
      <div class="research-stat"><span class="research-stat-value">${Math.round(c.cvF1 * 100)}%</span><span class="research-stat-label">CV F1</span></div>
    </div>`;

  const cvMetrics = renderMetricTable([
    ["5-fold CV accuracy", `${Math.round(c.cvAccuracy * 100)}%`],
    ["Precision (PCOS class)", `${Math.round(c.cvPrecision * 100)}%`],
    ["Recall (PCOS class)", `${Math.round(c.cvRecall * 100)}%`],
    ["Features (columns)", String(c.columnCount)],
    ["Non-PCOS / PCOS", `${c.n - c.pcosLabeledCount} / ${c.pcosLabeledCount}`],
  ]);

  const [[tn, fp], [fn, tp]] = c.cvConfusionMatrix;
  const confusion = `<p class="research-mini-label">5-fold CV confusion matrix (aggregated)</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact research-confusion">
      <thead><tr><th></th><th>Pred. non-PCOS</th><th>Pred. PCOS</th></tr></thead>
      <tbody>
        <tr><th scope="row">Actual non-PCOS</th><td>${tn}</td><td>${fp}</td></tr>
        <tr><th scope="row">Actual PCOS</th><td>${fn}</td><td>${tp}</td></tr>
      </tbody>
    </table></div>`;

  const corrRows = PCOS_TOP_CORRELATIONS.map(
    (r) =>
      `<tr><td>${escapeHtml(r.feature)}</td><td>${r.corr >= 0 ? "+" : ""}${r.corr.toFixed(3)}</td></tr>`
  ).join("");
  const correlations = `<p class="research-mini-label">Top Pearson correlations with PCOS label</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Feature</th><th>r</th></tr></thead>
      <tbody>${corrRows}</tbody>
    </table></div>`;

  const coefRows = PCOS_MODEL_COEF_POSITIVE.map(
    (r) => `<tr><td>${escapeHtml(r.feature)}</td><td>+${r.coef.toFixed(3)}</td></tr>`
  ).join("");
  const coefficients = `<p class="research-mini-label">Logistic regression — top positive coefficients (scaled features)</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Feature</th><th>Coef.</th></tr></thead>
      <tbody>${coefRows}</tbody>
    </table></div>`;

  const figures = renderFigureGrid([
    {
      src: RESEARCH_FIGURES.pcosCoefficients,
      alt: "Top logistic regression coefficients for PCOS",
      caption: "Top model coefficients (tabular PCOS cohort).",
    },
    {
      src: RESEARCH_FIGURES.pcosPredictionDist,
      alt: "Distribution of predicted PCOS probabilities",
      caption: "Predicted probability distribution by true class.",
    },
  ]);

  const caveat = `<p class="muted research-cohort-caveat">CV metrics are in-cohort only (not external validation) and must not be used to score individual patients in this app.</p>`;

  return stats + caveat + cvMetrics + confusion + correlations + coefficients + figures;
}

function renderCompareSection() {
  const v = PCOS_VS_ENDO;
  const stats = `
    <div class="research-stat-grid research-stat-grid--4">
      <div class="research-stat"><span class="research-stat-value">${v.pcosN}</span><span class="research-stat-label">PCOS confirmed</span></div>
      <div class="research-stat"><span class="research-stat-value">${v.endoN.toLocaleString()}</span><span class="research-stat-label">Endo confirmed</span></div>
      <div class="research-stat"><span class="research-stat-value">${Math.round(v.differentiationAuc * 100)}%</span><span class="research-stat-label">Differentiation AUC</span></div>
      <div class="research-stat"><span class="research-stat-value">${Math.round(v.differentiationAccuracy * 100)}%</span><span class="research-stat-label">Accuracy</span></div>
    </div>`;

  const diffRows = PCOS_VS_ENDO_DIFF_TESTS.map(
    (r) =>
      `<tr>
        <th scope="row">${escapeHtml(r.field)}</th>
        <td>${escapeHtml(r.pcos)}</td>
        <td>${escapeHtml(r.endo)}</td>
        <td>${formatPValue(r.pValue)}</td>
      </tr>`
  ).join("");
  const diffTable = `<p class="research-mini-label">Harmonized-field comparison (confirmed cases)</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Field</th><th>PCOS</th><th>Endometriosis</th><th>p-value</th></tr></thead>
      <tbody>${diffRows}</tbody>
    </table></div>`;

  const rules = `<p class="research-mini-label">Data-level differentiation notes</p>
    <ul class="research-list">${DIFFERENTIATION_RULES.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`;

  const figures = renderFigureGrid([
    {
      src: RESEARCH_FIGURES.compareFeatures,
      alt: "Matched feature comparison PCOS vs endometriosis",
      caption: "Harmonized features: group means / rates.",
    },
    {
      src: RESEARCH_FIGURES.compareCoefficients,
      alt: "Disease differentiation classifier coefficients",
      caption: "Logistic classifier coefficients (PCOS vs endo label).",
    },
  ]);

  return stats + diffTable + rules + figures;
}

function renderScRnaDeepScopeNote() {
  const scope = SCRNA_DEEP_SCOPE || {};
  const runs = (scope.deepRunLabels || [])
    .map((label) => `<li>${escapeHtml(label)}</li>`)
    .join("");
  const invN =
    scope.inventoryLibraries ??
    SCRNA_INVENTORY.endometriumLibraries + SCRNA_INVENTORY.pcosLibraries;
  const deepN = scope.deepRunsOnPortal ?? 2;
  const summary =
    scope.summary ||
    "All published libraries are inventoried below. UMAP and clustering on this page cover endometrium and the Mc26 control/forskolin pair.";
  return `<div class="scrna-deep-scope callout">
    <p><strong>${deepN} deep analyses on this page</strong> · ${invN} libraries inventoried below</p>
    <p>${escapeHtml(summary)}</p>
    ${runs ? `<p class="research-mini-label">UMAP / clustering shown here</p><ul class="research-list">${runs}</ul>` : ""}
    <p class="muted"><a href="/research-figures/scrna/inventory_report.html" target="_blank" rel="noopener">Open full inventory report</a> (all libraries). More Scanpy runs: <code>backup/scripts/scrna_deep_analysis.py</code>.</p>
  </div>`;
}

function renderScRnaInventoryTable() {
  const inventory = SCRNA_LIBRARY_INVENTORY || [];
  const rows = inventory
    .map((r) => {
      const badge = r.deepOnPortal
        ? `<span class="scrna-badge scrna-badge--deep">Deep dive</span>`
        : `<span class="scrna-badge scrna-badge--inventory">Inventory</span>`;
      const arm = r.arm ? escapeHtml(r.arm) : "—";
      return `<tr>
      <td>${escapeHtml(r.dataset)}</td>
      <td>${escapeHtml(r.library)}</td>
      <td>${arm}</td>
      <td>${r.cells.toLocaleString()}</td>
      <td>${r.nnzPerCell.toLocaleString()}</td>
      <td>${badge}</td>
    </tr>`;
    })
    .join("");
  return `<p class="research-mini-label">All supplementary 10x libraries (published cohorts)</p>
    <div class="research-table-wrap research-table-wrap--scroll"><table class="research-table research-table--compact scrna-inventory-table">
      <thead><tr><th>Dataset</th><th>Library</th><th>Arm</th><th>Cells</th><th>Mean UMIs/cell</th><th>On this page</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function renderScRnaSection() {
  const s = SCRNA_INVENTORY;
  const stats = `
    <div class="research-stat-grid research-stat-grid--4">
      <div class="research-stat"><span class="research-stat-value">${s.endometriumLibraries}</span><span class="research-stat-label">Endo libraries</span></div>
      <div class="research-stat"><span class="research-stat-value">${s.pcosLibraries}</span><span class="research-stat-label">PCOS libraries</span></div>
      <div class="research-stat"><span class="research-stat-value">${(s.endometriumCells + s.pcosCells).toLocaleString()}</span><span class="research-stat-label">Total cells</span></div>
      <div class="research-stat"><span class="research-stat-value">${s.genesPerMatrix.toLocaleString()}</span><span class="research-stat-label">Genes / matrix</span></div>
    </div>
    <ul class="research-list">
      <li><strong>Endometrium</strong> (eutopic): ${s.endometriumCells.toLocaleString()} cells across ${s.endometriumLibraries} libraries.</li>
      <li><strong>PCOS ovarian</strong>: ${s.pcosCells.toLocaleString()} cells across ${s.pcosLibraries} libraries (10 donors × control / forskolin arms).</li>
      <li>Mean detected UMIs per cell ~${Math.round(s.meanNnzPerCellEndo)} (endo) / ~${Math.round(s.meanNnzPerCellPcos)} (PCOS).</li>
    </ul>`;

  const deepSlot = `<div id="scrna-deep-slot" class="scrna-deep-loading muted">Loading UMAP and clustering figures…</div>`;

  const workflows = `<details class="research-details">
    <summary>Literature-aligned analysis workflows (reference)</summary>
    <h4 class="research-mini-label">Endometrium</h4>
    <ol class="research-steps">
      <li>Cell types — stromal, epithelial, immune, endothelial marker sets.</li>
      <li>Cycle phase — proliferative vs secretory programs.</li>
      <li>Endometriosis-associated inflammation and progesterone-resistance signatures (study context).</li>
    </ol>
    <h4 class="research-mini-label">PCOS ovarian</h4>
    <ol class="research-steps">
      <li>Integrate donors; annotate granulosa, theca, immune, stromal.</li>
      <li>Compare control vs forskolin (cAMP) arms; PCOS vs control where labeled in source study.</li>
      <li>Pseudo-bulk DE per donor per cell type; pathway and cell–cell communication follow-up.</li>
    </ol>
  </details>`;

  return (
    renderScRnaDeepScopeNote() +
    stats +
    renderScRnaInventoryTable() +
    `<h3 class="research-scrna-deep-title">Deep dives (UMAP, clusters, marker heatmaps)</h3>` +
    deepSlot +
    workflows
  );
}

function renderEducationSection() {
  return `<h3 class="research-mini-label">Condition reference</h3>
    <div class="research-condition-grid">${renderConditionCards()}</div>
    <h3 class="research-mini-label">Symptom differentiation</h3>
    ${renderSymptomTable()}`;
}

function renderConditionCards() {
  return CONDITION_EDUCATION.map(
    (c) => `<article class="research-condition-card">
      <h3>${escapeHtml(c.name)}</h3>
      <p>${escapeHtml(c.summary)}</p>
      <p class="research-mini-label">Mechanisms (population / literature)</p>
      <p class="research-mechanisms">${escapeHtml(c.mechanisms)}</p>
      <p class="research-mini-label">Common symptoms</p>
      <ul>${c.commonSymptoms.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <p class="research-mini-label">When to refer / escalate</p>
      <p class="muted">${escapeHtml(c.whenToSeekCare)}</p>
    </article>`
  ).join("");
}

function renderSymptomTable() {
  return `<div class="research-table-wrap"><table class="research-table">
    <thead><tr><th>Topic</th><th>PCOS pattern</th><th>Endometriosis pattern</th><th>Other causes</th></tr></thead>
    <tbody>${SYMPTOM_DIFFERENTIATION.map(
      (row) =>
        `<tr><th scope="row">${escapeHtml(row.topic)}</th><td>${escapeHtml(row.pcos)}</td><td>${escapeHtml(row.endo)}</td><td>${escapeHtml(row.other)}</td></tr>`
    ).join("")}</tbody>
  </table></div>`;
}

export function renderResearchPageHead() {
  const s = SCRNA_INVENTORY;
  return `<header id="${RESEARCH_TOP_ID}" class="card research-page-head" tabindex="-1">
    <div class="research-page-head-top">
      <div class="research-page-head-brand">
        <span class="badge badge-doctor">Research library</span>
        <h1>Clinician research &amp; analysis library</h1>
        <p class="muted">Published supplementary cohort statistics, models, full single-cell inventory, and UMAP deep dives — separate from linked patients on the dashboard.</p>
      </div>
    </div>
    <div class="research-page-head-stats" aria-label="Dataset scale">
      <div class="research-head-stat"><span class="research-head-stat-value">${PCOS_COHORT.n}</span><span class="research-head-stat-label">PCOS tabular rows</span></div>
      <div class="research-head-stat"><span class="research-head-stat-value">${(s.endometriumCells + s.pcosCells).toLocaleString()}</span><span class="research-head-stat-label">scRNA cells inventoried</span></div>
      <div class="research-head-stat"><span class="research-head-stat-value">2</span><span class="research-head-stat-label">UMAP deep dives on this page</span></div>
    </div>
  </header>`;
}

export function renderDoctorResearchBody() {
  return [
    renderResearchToc(),
    renderResearchZone(
      "research-scope",
      "Data scope",
      "scope",
      renderScopeBanner(),
      "Supplementary cohorts ≠ patients in this portal"
    ),
    renderResearchZone(
      "research-sources",
      "Analysis provenance",
      "sources",
      renderDataSources(),
      "Published supplementary datasets"
    ),
    renderResearchZone(
      "research-cohort",
      "Tabular PCOS cohort",
      "cohort",
      renderTabularCohortSection(),
      "Population benchmarks — logistic model & correlations"
    ),
    renderResearchZone(
      "research-compare",
      "PCOS vs endometriosis",
      "compare",
      renderCompareSection(),
      "Harmonized overlapping fields — confirmed cases"
    ),
    renderResearchZone(
      "research-lab",
      "Lab & measure lookup",
      "lab-lookup",
      renderLabLookupSection(),
      "Match a result to PCOS cohort reference means"
    ),
    renderResearchZone(
      "research-scrna",
      "Single-cell analysis",
      "scrna",
      renderScRnaSection(),
      "Full library inventory + representative UMAP / clustering"
    ),
    renderResearchZone(
      "research-education",
      "Clinical education",
      "education",
      renderEducationSection(),
      "Mechanisms, referral cues, and symptom patterns"
    ),
    `<div class="callout danger research-disclaimer">Do not present scRNA pathway plots or cohort model metrics as results for a linked patient. Eutopic endometrium ≠ endometriosis lesion biology without study context.</div>`,
  ].join("");
}

function renderOneScRnaDeepRun(run) {
  const clusters = (run.clusters || [])
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.cluster)}</td><td>${c.n_cells}</td><td>${c.pct}%</td><td>${escapeHtml(c.top_marker_set)}</td></tr>`
    )
    .join("");
  const scores = Object.entries(run.mean_marker_scores || {})
    .filter(([, v]) => v != null)
    .map(([k, v]) => `<li>${escapeHtml(k)}: ${v}</li>`)
    .join("");
  const figs = [];
  if (run.portal_umap) {
    figs.push({
      src: run.portal_umap,
      alt: `UMAP ${run.label}`,
      caption: `${run.label} — Leiden clusters and dominant marker-set label (UMAP).`,
    });
  }
  if (run.portal_heatmap) {
    figs.push({
      src: run.portal_heatmap,
      alt: `Marker heatmap ${run.label}`,
      caption: `${run.label} — mean marker-set scores by cluster.`,
    });
  }
  const cf = run.forskolin_comparison
    ? `<p class="research-mini-label">Forskolin vs control (same donor subset)</p>
       <ul class="research-list">
         <li>Donor ${escapeHtml(run.forskolin_comparison.donor)}: ${run.forskolin_comparison.cells_control} control cells, ${run.forskolin_comparison.cells_forskolin} forskolin cells.</li>
         <li>Mean log expression (androgen biosynthesis genes): control ${run.forskolin_comparison.mean_log_expr_androgen_biosynthesis_genes.control.toFixed(3)}, forskolin ${run.forskolin_comparison.mean_log_expr_androgen_biosynthesis_genes.forskolin.toFixed(3)}.</li>
         <li class="muted">${escapeHtml(run.forskolin_comparison.interpretation)}</li>
       </ul>`
    : "";

  return `<article class="scrna-deep-run">
    <h3>${escapeHtml(run.label)}</h3>
    <p class="muted">${Number(run.cells_after_qc).toLocaleString()} cells after QC · ${run.n_clusters} Leiden clusters · ${run.genes_after_hvg} highly variable genes</p>
    ${scores ? `<p class="research-mini-label">Mean marker-set scores (cohort)</p><ul class="research-list">${scores}</ul>` : ""}
    ${cf}
    ${
      clusters
        ? `<p class="research-mini-label">Clusters</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Cluster</th><th>Cells</th><th>%</th><th>Top marker set</th></tr></thead>
      <tbody>${clusters}</tbody>
    </table></div>`
        : ""
    }
    ${figs.length ? renderFigureGrid(figs) : ""}
  </article>`;
}

function renderScRnaDeepManifest(manifest) {
  const runs = manifest.analyses || [];
  if (!runs.length) {
    return `<p class="muted">No extended single-cell runs are available yet.</p>`;
  }
  return runs.map((r) => renderOneScRnaDeepRun(r)).join("");
}

export async function hydrateScRnaDeep() {
  const slot = document.getElementById("scrna-deep-slot");
  if (!slot) return;
  try {
    const res = await fetch("/research-figures/scrna/scrna_deep_summary.json", {
      cache: "no-store",
    });
    if (!res.ok) {
      slot.innerHTML =
        "<p class=\"muted\">Extended UMAP and clustering figures appear here after supplementary single-cell archives are analyzed. Inventory counts above remain available.</p>";
      return;
    }
    const manifest = await res.json();
    slot.innerHTML = renderScRnaDeepManifest(manifest);
  } catch {
    slot.innerHTML =
      "<p class=\"muted\">Could not load extended single-cell results. Try refreshing the page.</p>";
  }
}
