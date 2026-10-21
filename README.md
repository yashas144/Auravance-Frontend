# Auravance Frontend

React + Vite monitoring dashboard for the Auravance predictive maintenance platform.

The API, models, and RAG service live in the sibling repo `auravance-backend`. This app does not embed backend code.

## Local development

Start the backend first (from `auravance-backend`):

```bash
pip install -e .
uvicorn app.main:app --reload
```

Then in this repo:

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000`, so the app uses `/api/v1` by default.

To point at another API process, copy `.env.example` to `.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## What it shows

- Demo asset list
- Live telemetry cards
- Trend charts
- Failure probability and RUL
- Alerts
- Root cause diagnostics
- Master data and maintenance execution screens

## Production

Build with the Cloud Run API URL (include `/api/v1`):

```bash
VITE_API_BASE_URL=https://<cloud-run-host>/api/v1 npm run build
```

Firebase Hosting deploy steps are in `auravance-backend/terraform/README-DEPLOY.md`.
