import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

function token() {
  try {
    return JSON.parse(window.localStorage.getItem("auravance.currentUser") || "{}").token || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const access = token();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.detail ? ` — ${payload.detail}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Request failed (${response.status})${detail}`);
  }
  return response.json();
}

export default function DefectManagement({ assets = [], onNavigate }) {
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [modes, setModes] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [observe, setObserve] = useState({ asset_id: assets[0]?.asset_id || "", failure_mode: "", note: "" });

  async function refresh() {
    const [rows, anomalyRows] = await Promise.all([api("/defects/cases"), api("/anomalies?limit=50")]);
    setCases(rows);
    setAnomalies(anomalyRows);
    if (selectedId) {
      setDetail(await api(`/defects/cases/${selectedId}`));
    }
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    api(`/defects/cases/${selectedId}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [selectedId]);

  useEffect(() => {
    const asset = assets.find((item) => item.asset_id === (observe.asset_id || assets[0]?.asset_id));
    api(`/defects/failure-modes?asset_type=${encodeURIComponent(asset?.asset_type || "pump")}`)
      .then(setModes)
      .catch(() => setModes([]));
  }, [observe.asset_id, assets]);

  async function act(path, body) {
    setBusy(true);
    setError("");
    try {
      const updated = await api(path, { method: "POST", body: body ? JSON.stringify(body) : "{}" });
      setDetail(updated);
      setSelectedId(updated.defect_id);
      setNote("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="section-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h2>Defect management</h2>
          <p className="section-copy">
            An anomaly is an unusual reading. A defect is a suspected or confirmed equipment problem.
            Auravance does not open a defect from a single spike (startup, load change, or a bad sensor).
            Correlation, a failed inspection, or a technician observation can open a suspected case.
            RAG diagnoses are hypotheses until a technician confirms them.
          </p>
        </div>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="stats-grid">
        <section className="stat-card">
          <span className="stat-label">Anomalies (recent)</span>
          <strong className="stat-value">{anomalies.length}</strong>
          <span className="stat-subvalue">Not the same as defects</span>
        </section>
        <section className="stat-card">
          <span className="stat-label">Suspected</span>
          <strong className="stat-value">{cases.filter((row) => row.lifecycle_status === "suspected").length}</strong>
          <span className="stat-subvalue">Awaiting verification</span>
        </section>
        <section className="stat-card">
          <span className="stat-label">Confirmed</span>
          <strong className="stat-value">{cases.filter((row) => row.lifecycle_status === "confirmed").length}</strong>
          <span className="stat-subvalue">Inspection or technician</span>
        </section>
        <section className="stat-card">
          <span className="stat-label">Closed / rejected</span>
          <strong className="stat-value">
            {cases.filter((row) => ["closed", "rejected", "false_alarm"].includes(row.lifecycle_status)).length}
          </strong>
          <span className="stat-subvalue">Includes false alarms</span>
        </section>
      </section>

      <section className="crud-layout">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Cases</p>
          </div>
          <div className="record-list">
            {cases.map((row) => (
              <article key={row.defect_id} className={`record-card ${selectedId === row.defect_id ? "selected" : ""}`}>
                <button type="button" className="record-card-main" onClick={() => setSelectedId(row.defect_id)}>
                  <strong>
                    {row.defect_id} · {row.lifecycle_status}
                  </strong>
                  <p>
                    {row.asset_name} · {row.failure_mode || row.defect_code}
                  </p>
                  <span>
                    {row.origin} · {row.severity} · {row.discovered_on}
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel form-panel">
          {detail ? (
            <>
              <div className="panel-header">
                <p className="eyebrow">{detail.origin}</p>
                <h3>
                  {detail.failure_mode || detail.defect_code} on {detail.asset_name}
                </h3>
              </div>
              <p className="section-copy">{detail.description}</p>
              <p className="section-copy">
                Lifecycle <strong>{detail.lifecycle_status}</strong>
                {detail.confidence ? ` · diagnostic confidence ${detail.confidence} (qualitative, not a calibrated %)` : ""}
                {detail.work_order_id ? ` · work order ${detail.work_order_id}` : ""}
              </p>
              {detail.verification ? <p className="section-copy">Verification: {detail.verification}</p> : null}

              <p className="eyebrow">Linked anomalies</p>
              {(detail.anomalies || []).length === 0 ? (
                <p className="section-copy">No telemetry anomalies linked. Register or inspection origin is allowed.</p>
              ) : (
                (detail.anomalies || []).map((row) => (
                  <p key={row.anomaly_id} className="section-copy">
                    {row.anomaly_id}: {row.channel} · {row.anomaly_label} · {row.source} — {row.message}
                  </p>
                ))
              )}

              <p className="eyebrow">Diagnoses (hypotheses)</p>
              {(detail.diagnoses || []).map((row) => (
                <article key={row.diagnosis_id} className="evidence-item">
                  <strong>{row.suspected_mode}</strong>
                  <p>{row.summary}</p>
                  <span>
                    {row.confidence} · {row.generation_mode}
                  </span>
                </article>
              ))}

              <label className="form-field">
                <span>Technician note</span>
                <textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
              <div className="form-actions">
                <button type="button" className="secondary-button" disabled={busy} onClick={() => act(`/defects/cases/${detail.defect_id}/diagnose`)}>
                  RAG hypothesis
                </button>
                <button type="button" className="primary-button" disabled={busy} onClick={() => act(`/defects/cases/${detail.defect_id}/review`, { action: "confirm", note })}>
                  Confirm
                </button>
                <button type="button" className="secondary-button" disabled={busy} onClick={() => act(`/defects/cases/${detail.defect_id}/review`, { action: "reject", note })}>
                  Reject
                </button>
                <button type="button" className="secondary-button" disabled={busy} onClick={() => act(`/defects/cases/${detail.defect_id}/review`, { action: "false_alarm", note })}>
                  False alarm
                </button>
                <button type="button" className="secondary-button" disabled={busy} onClick={() => act(`/defects/cases/${detail.defect_id}/work-order`)}>
                  Open work order
                </button>
                <button type="button" className="secondary-button" disabled={busy} onClick={() => act(`/defects/cases/${detail.defect_id}/close`, { note })}>
                  Close
                </button>
                {detail.asset_id && onNavigate ? (
                  <button type="button" className="subtle-button" onClick={() => onNavigate("monitoring", { assetId: detail.asset_id })}>
                    Open monitoring
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p>Select a case, or record a technician observation below.</p>
          )}

          <div className="panel-header">
            <p className="eyebrow">Technician observation</p>
            <h3>Create without a telemetry anomaly</h3>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Asset</span>
              <select
                value={observe.asset_id}
                onChange={(event) => setObserve((current) => ({ ...current, asset_id: event.target.value }))}
              >
                {(assets.length ? assets : [{ asset_id: "", name: "Select", asset_type: "pump" }]).map((asset) => (
                  <option key={asset.asset_id} value={asset.asset_id}>
                    {asset.name || asset.asset_id}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Failure mode catalog</span>
              <select
                value={observe.failure_mode}
                onChange={(event) => setObserve((current) => ({ ...current, failure_mode: event.target.value }))}
              >
                <option value="">Suggested from profile</option>
                {modes.map((mode) => (
                  <option key={mode.code} value={mode.code}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Note</span>
              <textarea
                rows="3"
                value={observe.note}
                onChange={(event) => setObserve((current) => ({ ...current, note: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              disabled={busy || !observe.asset_id}
              onClick={() => act("/defects/cases/observations", observe)}
            >
              Record suspected defect
            </button>
          </div>
        </section>
      </section>
    </>
  );
}
