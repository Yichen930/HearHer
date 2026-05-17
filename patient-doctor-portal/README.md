# Patient + doctor demo portal

Static front end: **no build step**, **no npm**. You can run it in two ways:

| Mode | Command | Storage |
|------|---------|---------|
| **Offline** | `python -m http.server 5173` | Browser **localStorage** only |
| **Server + SQLite** | `python server.py` | **`data/portal.sqlite3`** on disk + sessions |

Neither mode is production-ready or HIPAA-compliant.

## Option A — Offline (localStorage)

```powershell
cd "C:\Users\uik07687\OneDrive - Aumovio SE\Desktop\hack\patient-doctor-portal"
python -m http.server 5173
```

Open `http://localhost:5173`. Log in **without** caring about password (any value). Data never leaves the browser.

## Option B — SQLite database (recommended demo)

Install API dependencies once:

```powershell
cd "C:\Users\uik07687\OneDrive - Aumovio SE\Desktop\hack\patient-doctor-portal"
python -m pip install -r requirements-api.txt
python server.py
```

Open `http://127.0.0.1:8000`. The UI detects `/api/health` and switches to **server mode**:

- Use **Create account** (or register via API) with password **≥ 4 characters**.
- Accounts, sessions, doctor–patient links, and submissions are stored under `data/portal.sqlite3` (created automatically).

Stop the old `http.server` on port 5173 if it is still running to avoid confusion.

## Try the two interfaces

1. **Patient**: Register/log in as **Patient**, complete **New check-in**, read the **educational summary** (non-diagnostic).
2. **Doctor**: Register/log in as **Doctor**, **Link patient** with the patient’s **registered email**, then **Doctor home** shows the **submission log** (JSON answers + patient-facing summary blocks).
3. **Research notes**: Doctor menu → **Research notes** — placeholder for literature-level content (separate from triage).

## About page

`#/about` — English + 中文 compliance-oriented wording; storage bullet updates automatically in server vs offline mode.

## Production checklist (still not done)

HTTPS, hardened auth, RBAC, audit logging, consent & retention, backups, encryption at rest, threat modeling, and regulatory path for any clinical decision support.
