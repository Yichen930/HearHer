# BioHackzard / HearHer

**HearHer** — PCOS & endometriosis **education and care-coordination** demo (patient portal + clinician workspace). Grounded in hackathon supplementary data analysis; **not** a diagnostic device.

## Complete workflow (after `git clone`)

The repo **already includes** synced cohort stats (`patient-doctor-portal/js/researchData.js`) and `research-figures/`, so judges can run the site **without** raw data or re-analysis.

### 1. Run the website (required)

```bash
cd patient-doctor-portal
python3 -m pip install -r requirements-api.txt
python3 server.py
```

Open **http://127.0.0.1:8000** — register a patient and/or clinician account in the UI.

| Item | In git? | Notes |
|------|---------|--------|
| `dataset/` (hackathon Excel/CSV/ZIP) | **No** | Only to **regenerate** analysis; use the [official hackathon dataset](https://entuedu-my.sharepoint.com/:f:/g/personal/bsclub-biohack_e_ntu_edu_sg/IgDu4xUT2v2MRIVfnFuXmmSwAf3BwLHa0QjqJ5TzpMMg2Vg?e=uogCWv) (download → copy into `dataset/`) |
| `patient-doctor-portal/data/` (SQLite, CSV exports) | **No** | Created on first server run |
| `.env` / `patient-doctor-portal/.env` | **No** | Optional; copy from `.env.example` for OpenAI support chat |

Use **`python3 server.py`** (not static `http.server`) so Research scRNA figures and APIs work. Details: [patient-doctor-portal/README.md](patient-doctor-portal/README.md).

### 2. Optional — regenerate analysis from raw data

Only if you want fresh `researchData.js` + figures. **Official dataset:** [SharePoint folder](https://entuedu-my.sharepoint.com/:f:/g/personal/bsclub-biohack_e_ntu_edu_sg/IgDu4xUT2v2MRIVfnFuXmmSwAf3BwLHa0QjqJ5TzpMMg2Vg?e=uogCWv) — same files the authors used; not your own data.

```bash
# From repo root
mkdir -p dataset
# Download from the link above, then copy into dataset/ (see backup/README.md for filenames):
#   (Main_Dataset)_PCOS_data_without_infertility.xlsx
#   (Supplementary_Dataset)_structured_endometriosis_data.csv
#   (Supplementary_Dataset)_*_single_cell_data.zip

python3 -m pip install pandas numpy scipy scikit-learn matplotlib openpyxl
python3 -m pip install -r backup/requirements-scrna.txt
python3 backup/scripts/run_all_analyses.py
```

Then repeat **step 1** and hard-refresh the browser. Sync + verify run at the end of `run_all_analyses.py`.

### 3. Optional — AI support chat

```bash
cd patient-doctor-portal
cp .env.example .env   # set OPENAI_API_KEY=sk-...
python3 server.py
```

Without `.env`, support chat uses built-in fallback replies.

## What’s in the repo

| Path | Purpose |
|------|---------|
| [`patient-doctor-portal/`](patient-doctor-portal/) | Web app (FastAPI + SPA) |
| [`dataset/`](dataset/) | Raw Excel / CSV / ZIP (gitignored; [official download](https://entuedu-my.sharepoint.com/:f:/g/personal/bsclub-biohack_e_ntu_edu_sg/IgDu4xUT2v2MRIVfnFuXmmSwAf3BwLHa0QjqJ5TzpMMg2Vg?e=uogCWv)) |
| [`backup/`](backup/) | Analysis scripts, reports, portal sync |

## Data analysis (feeds the app)

Hackathon cohorts → offline pipelines → **auto-sync** into `researchData.js` + `research-figures/` (verify step fails if out of date).

| Pipeline | Result (headline) |
|----------|-------------------|
| PCOS tabular (n=541) | Logistic regression 5-fold CV, **ROC-AUC ~0.94** |
| PCOS vs endometriosis (177 vs 4,079) | Harmonized compare, classifier **AUC ~0.73** |
| scRNA inventory | **~81k** cells (endometrium + PCOS libraries) |
| scRNA deep (Scanpy) | UMAP/clusters; endometrium cell types; PCOS Mc26 forskolin vs control |

```bash
# From repo root — after placing files in dataset/
python3 -m pip install pandas numpy scipy scikit-learn matplotlib openpyxl
python3 -m pip install -r backup/requirements-scrna.txt
python3 backup/scripts/run_all_analyses.py
```

→ [backup/README.md](backup/README.md)

## Product highlights (for judges)

- **Research-backed UI** — cohort stats, PCOS vs endo comparison, scRNA figures on **Doctor → Research**
- **Visit prep, not diagnosis** — check-ins use population **reference** language; Rotterdam-style overlap is educational only
- **Dual capture** — **Support** (narrative chat) vs **Check-in** (structured, clinician-friendly)
- **Consent-gated chat** — clinicians see support messages only if the patient allows
- **Runs locally** — SQLite + CSV export; optional OpenAI for support chat

**Limits:** No HIPAA/FDA claims; scRNA is cohort-level exploration; check-in % are not personal risk scores.

## Docs

- App setup & features: [patient-doctor-portal/README.md](patient-doctor-portal/README.md)
- Routes & modules: [patient-doctor-portal/WEBSITE_LOGIC.md](patient-doctor-portal/WEBSITE_LOGIC.md)
- Analysis & sync: [backup/README.md](backup/README.md)

## Disclaimer

Demo only — not medical advice, not HIPAA-compliant, not for clinical diagnosis.
