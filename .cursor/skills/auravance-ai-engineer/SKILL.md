---
name: auravance-ai-engineer
description: >-
  Guides work on the Auravance React dashboard and its contract with the
  FastAPI backend. Use when editing this frontend, monitoring UI, root-cause
  screens, master data pages, Vite proxy, or API client calls. The API, models,
  and RAG service live in the sibling repo auravance-backend.
---

# Auravance AI Engineer (frontend)

This repository is **only** the React + Vite dashboard. The FastAPI service,
models, MQTT/ingest work, and RAG pipeline belong in `auravance-backend`.
Do not copy backend sources into this repo.

## Product north star

Use this wording verbatim when describing the product. Do not paraphrase it in
READMEs, PRs, or comments unless the user asks:

- Built a full-stack AI platform (React, FastAPI) for real-time equipment monitoring and failure prediction using XGBoost and LSTM, improving detection accuracy by 30%.
- Engineered scalable event-driven IoT ingestion pipelines using MQTT and Python for high-frequency sensor telemetry with low latency and high reliability.
- Designed scalable ETL and event-driven MQTT pipelines processing 1M+ sensor records/day, enabling predictive maintenance, anomaly detection, and RUL insights with sub-minute latency.
- Built a RAG-based root cause analysis system over equipment manuals to generate explainable diagnostics and maintenance recommendations.

Those bullets are the **target capability**. The dashboard must not claim MQTT,
XGBoost, or LSTM are live unless the backend repo actually serves them.

## Contracts the UI depends on

Do not invent new field names. Match `auravance-backend` `app/models/schemas.py`.

**Telemetry channels:** `temperature_c`, `vibration_rms`, `pressure_bar`, `current_a`.

**Prediction:** `anomaly_score`, `anomaly_label` (`normal` | `warning` | `high-risk`),
`failure_probability_72h`, `estimated_rul_hours`, `dominant_signal`, model versions.

**Replay:** keep showing `source_context` ground truth next to model output.

**Diagnostics:** `POST /diagnostics/root-cause` with `asset_id`, `symptom_summary`,
`recent_alert_ids`. Display `grounded_summary`, causes, actions, evidence.

**Auth:** attach the stored Bearer token on every `readJson` call
(`localStorage` key `auravance.currentUser`). Ingest key is backend-only.

## Repo map

```
src/App.jsx       entire dashboard (no router)
src/styles.css
src/main.jsx
vite.config.js    proxies /api → http://127.0.0.1:8000
```

Default API base: `import.meta.env.VITE_API_BASE_URL ?? "/api/v1"`.

## Workflow

1. If the change is an API or model contract, implement it in `auravance-backend` first (or say so).
2. Update `src/App.jsx` callers of `readJson` / `writeJson`.
3. Verify Monitoring, Root Cause Analysis, and any master-data page that shares the changed state.
4. Local run: backend on :8000, then `npm run dev` here.

## Local run

```bash
# auravance-backend
uvicorn app.main:app --reload

# this repo
npm install && npm run dev
```

## Additional resources

Backend contracts and ML/RAG rules live in
`auravance-backend/.cursor/skills/auravance-ai-engineer/`.
Copy [architecture.md](architecture.md) only as a UI-side reminder of payloads.
