# HearHer — Patient & Clinician Portal

*BioHackzard*

SPA for PCOS / gynecologic **education**, **check-ins**, **support chat**, and **clinician review**. Cohort numbers in the UI come from [`../backup/`](../backup/) (synced into `js/researchData.js`).

**Routes & architecture:** [WEBSITE_LOGIC.md](WEBSITE_LOGIC.md)

## Run

**Full clone → website flow** (what is gitignored, optional analysis, optional `.env`): [../README.md#complete-workflow-after-git-clone](../README.md#complete-workflow-after-git-clone).

```bash
cd patient-doctor-portal
python3 -m pip install -r requirements-api.txt
python3 server.py
```

→ **http://127.0.0.1:8000**

Cohort numbers and Research figures ship with the repo; re-run [`../backup/scripts/run_all_analyses.py`](../backup/scripts/run_all_analyses.py) only if you add files under [`../dataset/`](../dataset/) (not in git).

| Mode | Command | Storage |
|------|---------|---------|
| **Server** (recommended) | `python3 server.py` | SQLite + `data/exports/*.csv` |
| Static only | `python3 -m http.server 5173` | `localStorage` only |

Port busy: `kill $(lsof -t -i:8000) 2>/dev/null; python3 server.py`

## Optional AI chat

```bash
cp .env.example .env   # set OPENAI_API_KEY=sk-...
```

Restart server. `/api/health` shows `"ai_chat": true` when configured; otherwise built-in supportive replies.

## Features (short)

**Patient:** Home · Support chat · Check-in + history · Learn flashcards · Community · Privacy (chat consent)

**Clinician:** Dashboard (pick active patient) · Link by email · Moderation · **Research** (cohort stats + figures) · CSV export

Support = narrative / visit prep; Check-in = structured logs for clinicians.

## CSV export (server mode)

Writes under `data/exports/` on data changes (also **Refresh exports** on dashboard). Check-ins always visible to linked doctors; **support chat** only if patient consented. See `data/exports/README.txt`.

## Reset demo

```bash
# Stop server first
python3 scripts/reset_demo.py
```

Clear browser site data for localhost, then `python3 server.py` and create fresh accounts.

## API sketch

`GET /api/health` · auth register/login · submissions · chat (+ optional `POST /api/chat/ai-reply`) · consent · clinical records · doctor exports manifest/sync/download · community posts

Full list in [WEBSITE_LOGIC.md](WEBSITE_LOGIC.md) or `server.py`.

## Layout

```
patient-doctor-portal/
├── server.py, csv_export.py, requirements-api.txt
├── index.html, css/, js/          # researchData.js = auto-generated
├── research-figures/              # analysis plots + scrna/
└── data/                          # sqlite + exports (gitignored)
```

## Disclaimer

Educational demo — not a medical device, diagnosis, or HIPAA-certified EHR.
