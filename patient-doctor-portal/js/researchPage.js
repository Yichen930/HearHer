import {
  PCOS_COHORT,
  PCOS_TOP_CORRELATIONS,
  PCOS_MODEL_COEF_POSITIVE,
  PCOS_VS_ENDO,
  PCOS_VS_ENDO_DIFF_TESTS,
  DIFFERENTIATION_RULES,
  SCRNA_INVENTORY,
  SCRNA_LIBRARY_SAMPLES,
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

function renderResearchZone(title, tone, bodyHtml, subtitle = "") {
  return `<section class="research-zone research-zone--${tone}">
    <header class="research-zone-head">
      <h2>${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="research-zone-sub">${escapeHtml(subtitle)}</p>` : ""}
    </header>
    <div class="research-zone-body">${bodyHtml}</div>
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

  return stats + cvMetrics + confusion + correlations + coefficients + figures;
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
      <li><strong>Endometrium</strong> (eutopic, endometriosis study context): ${s.endometriumCells.toLocaleString()} cells — inventory only; not PCOS ovarian tissue.</li>
      <li><strong>PCOS ovarian</strong>: ${s.pcosCells.toLocaleString()} cells across published donor libraries (control vs forskolin stimulation arms in the original study).</li>
      <li>Mean detected UMIs per cell ~${Math.round(s.meanNnzPerCellEndo)} (endo) / ~${Math.round(s.meanNnzPerCellPcos)} (PCOS). Extended clustering for selected libraries is in the section below.</li>
    </ul>`;

  const sampleRows = SCRNA_LIBRARY_SAMPLES.map(
    (r) =>
      `<tr>
        <td>${escapeHtml(r.dataset)}</td>
        <td>${escapeHtml(r.library)}</td>
        <td>${r.cells.toLocaleString()}</td>
        <td>${Math.round(r.nnzPerCell).toLocaleString()}</td>
      </tr>`
  ).join("");
  const samples = `<p class="research-mini-label">Representative sample libraries</p>
    <div class="research-table-wrap"><table class="research-table research-table--compact">
      <thead><tr><th>Dataset</th><th>Library</th><th>Cells</th><th>Mean UMIs/cell</th></tr></thead>
      <tbody>${sampleRows}</tbody>
    </table></div>`;

  return stats + samples;
}

function renderWorkflowSteps(stepsHtml) {
  return stepsHtml;
}

const ENDO_WORKFLOW = `<ol class="research-steps">
  <li><strong>Cell types</strong> — stromal (DCN, LUM, COL1A1), epithelial (EPCAM, KRT8/18), immune (PTPRC), endothelial (VWF, PECAM1).</li>
  <li><strong>Cycle phase</strong> — proliferative (MKI67, TOP2A, PCNA) vs secretory (PAEP, GPX3, MSMB).</li>
  <li><strong>Hormonal treatment</strong> — decidualization (IGFBP1, PRL) with inactive epithelium.</li>
  <li><strong>Endometriosis signals</strong> — inflammation (CXCL12, IL6, CCL2, ICAM1), progesterone resistance (low PGR targets).</li>
  <li><strong>Compare conditions</strong> — pseudo-bulk DE, GSEA, CellChat/CellPhoneDB, compositional abundance.</li>
</ol>`;

const PCOS_WORKFLOW = `<ol class="research-steps">
  <li>Integrate 10 donors (Harmony/BBKNN); annotate granulosa, theca, immune, stromal.</li>
  <li>Compare PCOS vs normal controls; forskolin (cAMP) response; interaction term PCOS×treatment.</li>
  <li>Pseudo-bulk DE per patient per cell type (avoid per-cell Wilcoxon across donors).</li>
  <li>Pathways: ovarian steroidogenesis, cAMP signaling; cell–cell communication in hyperandrogenemia.</li>
</ol>`;

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

export function renderDoctorResearchBody() {
  return [
    renderResearchZone(
      "Data scope",
      "scope",
      renderScopeBanner(),
      "Supplementary cohorts ≠ patients in this portal"
    ),
    renderResearchZone(
      "Analysis provenance",
      "sources",
      renderDataSources(),
      "Published supplementary datasets"
    ),
    renderResearchZone(
      "Lab & measure lookup",
      "lab-lookup",
      renderLabLookupSection(),
      "Match a result to PCOS cohort reference means"
    ),
    renderResearchZone(
      "Tabular PCOS cohort",
      "cohort",
      renderTabularCohortSection(),
      "Population benchmarks — logistic model & correlations"
    ),
    renderResearchZone(
      "PCOS vs endometriosis",
      "compare",
      renderCompareSection(),
      "Harmonized overlapping fields — confirmed cases"
    ),
    renderResearchZone(
      "Single-cell inventory (10x)",
      "scrna",
      renderScRnaSection(),
      "Published 10x single-cell resources — inventory summary"
    ),
    renderResearchZone(
      "Extended single-cell analysis",
      "scrna-deep",
      `<div id="scrna-deep-slot" class="scrna-deep-loading muted">Loading extended single-cell results…</div>`,
      "QC, clustering, UMAP, and marker-set scores on supplementary libraries"
    ),
    renderResearchZone(
      "Endometrium scRNA — planned workflow",
      "endo",
      renderWorkflowSteps(ENDO_WORKFLOW),
      "Planned analysis — figures not shown here"
    ),
    renderResearchZone(
      "PCOS ovarian scRNA — planned workflow",
      "pcos",
      renderWorkflowSteps(PCOS_WORKFLOW),
      "Granulosa / theca / forskolin design"
    ),
    renderResearchZone(
      "Condition reference",
      "education",
      `<div class="research-condition-grid">${renderConditionCards()}</div>`,
      "Clinician-facing mechanisms & referral cues"
    ),
    renderResearchZone(
      "Symptom differentiation",
      "symptoms",
      renderSymptomTable(),
      "Pattern library — not individual diagnoses"
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
