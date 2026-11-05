import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#0db8de", "#ff7a1a", "#ff4f6d", "#ffd166", "#1c7dec", "#7c5cbf", "#2bb673"];

function hourLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function ChartCard({ title, hint, children, onOpen }) {
  return (
    <section className="panel chart-panel">
      <div className="panel-header chart-panel-header">
        <div>
          <p className="eyebrow">Plant view</p>
          <h3>{title}</h3>
        </div>
        {onOpen ? (
          <button type="button" className="subtle-button" onClick={onOpen}>
            Open
          </button>
        ) : null}
      </div>
      {hint ? <p className="section-copy">{hint}</p> : null}
      <div className="executive-chart">{children}</div>
    </section>
  );
}

export default function ExecutiveDashboard({
  summary,
  loading,
  error,
  plantId,
  windowHours,
  onPlantChange,
  onWindowChange,
  onRefresh,
  onNavigate,
}) {
  const plants = summary?.plants ?? [];
  const kpis = summary?.kpis;
  const pieData = useMemo(() => (summary?.assets_by_type ?? []).filter((row) => row.value > 0), [summary]);
  const sourceData = useMemo(() => (summary?.alerts_by_source ?? []).filter((row) => row.value > 0), [summary]);

  return (
    <>
      <header className="hero">
        <div>
          <h1 className="eyebrow">Auravance Control Center</h1>
          <p>Plant executive view</p>
          <p className="hero-copy">
            Fleet health, open work, and field inspections for the selected plant. 72-hour failure
            probability is model output (or rules fallback). Inspection pass/fail is not a prediction.
          </p>
        </div>
        <div className="hero-status executive-filters">
          <label className="form-field">
            <span>Plant</span>
            <select value={plantId} onChange={(event) => onPlantChange(event.target.value)}>
              {plants.length > 1 ? <option value="">All plants</option> : null}
              {plants.map((plant) => (
                <option key={plant.plant_id} value={plant.plant_id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Trend window</span>
            <select value={String(windowHours)} onChange={(event) => onWindowChange(Number(event.target.value))}>
              <option value="24">Last 24 hours</option>
              <option value="48">Last 48 hours</option>
              <option value="72">Last 72 hours</option>
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {kpis?.scoring_fallback_active ? (
        <div className="status-chip executive-fallback">Scoring fallback is active for at least one asset (rules, not a loaded model).</div>
      ) : null}

      <section className="stats-grid">
        <section className="stat-card">
          <span className="stat-label">Assets in scope</span>
          <strong className="stat-value">{kpis?.assets ?? "--"}</strong>
          <span className="stat-subvalue">{summary?.plant_name || "All plants"}</span>
        </section>
        <section className="stat-card tone-critical">
          <span className="stat-label">Open alerts</span>
          <strong className="stat-value">{kpis?.open_alerts ?? "--"}</strong>
          <span className="stat-subvalue">Current open items</span>
        </section>
        <section className="stat-card tone-critical">
          <span className="stat-label">High-risk assets</span>
          <strong className="stat-value">{kpis?.high_risk_assets ?? "--"}</strong>
          <span className="stat-subvalue">Latest anomaly label</span>
        </section>
        <section className="stat-card">
          <span className="stat-label">Open work orders</span>
          <strong className="stat-value">{kpis?.open_work_orders ?? "--"}</strong>
          <span className="stat-subvalue">Not completed or closed</span>
        </section>
        <section className="stat-card">
          <span className="stat-label">Pending inspections</span>
          <strong className="stat-value">{kpis?.pending_inspections ?? "--"}</strong>
          <span className="stat-subvalue">Draft checklists</span>
        </section>
        <section className="stat-card">
          <span className="stat-label">Last ingest</span>
          <strong className="stat-value stat-value-text">
            {kpis?.last_ingest_at ? new Date(kpis.last_ingest_at).toLocaleTimeString() : "No data"}
          </strong>
          <span className="stat-subvalue">Run replay if charts are empty</span>
        </section>
      </section>

      <section className="executive-grid">
        <ChartCard title="Fleet mix" hint="Profile groups: cooling-system → pump; drive/conveyor → motor.">
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  onClick={(entry) => onNavigate("monitoring")}
                >
                  {pieData.map((row, index) => (
                    <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No assets in this plant filter.</div>
          )}
        </ChartCard>

        <ChartCard title="Open alerts by severity" hint="Current open alerts, not a 24-hour count." onOpen={() => onNavigate("monitoring")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.alerts_by_severity ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#ff4f6d" radius={[8, 8, 0, 0]} onClick={() => onNavigate("monitoring")} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Alert source"
          hint="Telemetry alerts come from ingest scoring. Field inspection alerts are walkaround findings."
          onOpen={() => onNavigate("inspections")}
        >
          {sourceData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={90} onClick={(entry) => onNavigate(entry?.name === "field_inspection" ? "inspections" : "monitoring")}>
                  {sourceData.map((row, index) => (
                    <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No open alerts.</div>
          )}
        </ChartCard>

        <ChartCard title="Work orders by status" onOpen={() => onNavigate("workorders")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.work_orders_by_status ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#ff7a1a" radius={[8, 8, 0, 0]} onClick={() => onNavigate("workorders")} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Inspection results"
          hint="Pass/fail is the checklist outcome. Drafts are incomplete walkarounds."
          onOpen={() => onNavigate("inspections")}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.inspections_by_result ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0db8de" radius={[8, 8, 0, 0]} onClick={() => onNavigate("inspections")} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Defects by status" onOpen={() => onNavigate("defects")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.defects_by_status ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#7c5cbf" radius={[8, 8, 0, 0]} onClick={() => onNavigate("defects")} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="executive-grid executive-grid-wide">
        <ChartCard title="Alert trend" hint={`Hourly new alerts in the last ${summary?.window_hours ?? windowHours} hours.`}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary?.alert_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
              <XAxis dataKey="hour" tickFormatter={hourLabel} minTickGap={24} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={hourLabel} />
              <Line type="monotone" dataKey="value" stroke="#ff4f6d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ingest volume" hint="Telemetry rows stored in the selected window. Empty until replay or MQTT is running.">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary?.ingest_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
              <XAxis dataKey="hour" tickFormatter={hourLabel} minTickGap={24} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={hourLabel} />
              <Line type="monotone" dataKey="value" stroke="#0db8de" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Highest 72h failure probability</p>
          <h3>Assets to inspect first</h3>
        </div>
        <p className="section-copy">
          Ranked from the latest score for each asset (Isolation Forest / tabular or sequence models when
          artifacts load, otherwise rules). Click a row to open Monitoring.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(220, (summary?.top_risk_assets?.length || 1) * 36)}>
          <BarChart
            layout="vertical"
            data={(summary?.top_risk_assets ?? []).map((row) => ({
              ...row,
              riskPct: Math.round((row.failure_probability_72h || 0) * 100),
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,32,49,0.12)" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="name" width={140} />
            <Tooltip formatter={(value) => [`${value}%`, "72h failure probability"]} />
            <Bar
              dataKey="riskPct"
              fill="#ff7a1a"
              radius={[0, 8, 8, 0]}
              onClick={(entry) => entry?.asset_id && onNavigate("monitoring", { assetId: entry.asset_id })}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}
