import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine,
  Legend, PieChart, Pie, Cell
} from "recharts";

/* ─────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────── */
const C = {
  navy:    "#0a1628",
  navyMid: "#0d2040",
  accent:  "#00b4d8",
  accentDim:"#0077a8",
  teal:    "#00c9b1",
  white:   "#ffffff",
  offWhite:"#f4f7fb",
  border:  "#dce6f0",
  muted:   "#7a90aa",
  textDark:"#1a2b3c",
  textMid: "#3c5168",
  green:   "#16c784",
  orange:  "#f59e0b",
  red:     "#ef4444",
  warn:    "#fff3cd",
};

const font = "'DM Sans', 'Segoe UI', sans-serif";

/* ─────────────────────────────────────────
   GLOBAL INJECT
───────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${font}; background: ${C.offWhite}; color: ${C.textDark}; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

    /* Circular gauge animation */
    @keyframes fillArc {
      from { stroke-dashoffset: 283; }
      to   { stroke-dashoffset: var(--target-offset); }
    }
    .gauge-arc {
      animation: fillArc 1.4s cubic-bezier(.4,0,.2,1) forwards;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up { animation: fadeUp 0.5s ease forwards; }

    /* Pill badge */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .badge-green  { background: #d1fae5; color: #065f46; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-orange { background: #fef3c7; color: #92400e; }
    .badge-blue   { background: #dbeafe; color: #1e40af; }

    /* Nav item hover */
    .nav-item:hover { background: rgba(0,180,216,0.10) !important; color: ${C.accent} !important; }
    .nav-sub:hover  { background: rgba(0,180,216,0.08) !important; color: ${C.accent} !important; cursor: pointer; }

    /* Tooltip */
    .recharts-tooltip-wrapper { font-size: 11px; }

    /* KPI card hover */
    .kpi-card { transition: box-shadow 0.2s, transform 0.2s; }
    .kpi-card:hover { box-shadow: 0 4px 16px rgba(0,180,216,0.15); transform: translateY(-1px); }

    /* Alert row hover */
    tr.action-row:hover td { background: #f0f9ff; }

    /* Chart popup modal */
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.94) translateY(12px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .chart-modal { animation: modalIn 0.22s cubic-bezier(.4,0,.2,1) forwards; }

    /* Gauge clickable glow */
    .gauge-wrap {
      cursor: pointer;
      border-radius: 50%;
      transition: filter 0.2s;
    }
    .gauge-wrap:hover { filter: drop-shadow(0 0 10px rgba(0,180,216,0.55)); }
    .gauge-wrap.active { filter: drop-shadow(0 0 14px rgba(0,180,216,0.9)); }
  `}</style>
);

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function CircularGauge({ pct = 100, label, sub, onClick, isActive }) {
  const r = 45, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div
      className={`gauge-wrap${isActive ? " active" : ""}`}
      onClick={onClick}
      title="Click to view Fired Duty & Arc O2"
      style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={8} />
        {/* Active ring highlight */}
        {isActive && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,180,216,0.4)" strokeWidth={11} />
        )}
        {/* Fill */}
        <circle
          className="gauge-arc"
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={isActive ? C.accent : C.white}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ "--target-offset": offset }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: C.white, textAlign: "center", lineHeight: 1.2,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{pct.toFixed(2)}%</div>
        <div style={{ fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{label}</div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)" }}>{sub}</div>
        {isActive && (
          <div style={{ fontSize: 7, color: C.accent, marginTop: 3, fontWeight: 700, letterSpacing: "0.4px" }}>● ACTIVE</div>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({ icon, value, unit, label, sub, color = C.white }) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", gap: 12,
      padding: "14px 20px",
      background: "rgba(255,255,255,0.07)",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.12)",
    }}>
      <div style={{ fontSize: 26, opacity: 0.8 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>
          {value}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, opacity: 0.8 }}>{unit}</span>
        </div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function KPICard({ label, actual, optimum, unit, highlight, onTrend }) {
  const isOff = actual != null && optimum != null && Math.abs(actual - optimum) / (optimum || 1) > 0.05;
  const valColor = highlight ? C.orange : isOff ? C.red : C.textDark;

  return (
    <div className="kpi-card" style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "12px 14px",
      minWidth: 0,
      position: "relative",
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          onClick={onTrend}
          style={{
            fontSize: 20, fontWeight: 700, color: valColor,
            cursor: onTrend ? "pointer" : "default",
            textDecoration: onTrend ? "underline dotted" : "none",
            textUnderlineOffset: 3,
          }}
          title={onTrend ? "Click to view trend" : undefined}
        >
          {actual ?? "—"}
        </span>
        {unit && <span style={{ fontSize: 10, color: C.muted }}>{unit}</span>}
        {onTrend && (
          <span
            onClick={onTrend}
            title="View trend"
            style={{
              marginLeft: 4, fontSize: 13, cursor: "pointer",
              color: C.accent, opacity: 0.8, lineHeight: 1,
            }}
          >📈</span>
        )}
      </div>
      {optimum != null && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
          Optimum: <span style={{ fontWeight: 600, color: C.accentDim }}>{optimum}</span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.8px",
      paddingBottom: 8, borderBottom: `2px solid ${C.border}`,
      marginBottom: 12,
    }}>{title}</div>
  );
}

const PIE_COLORS = [C.red, C.accent, C.green];

function ChartPanel({ d, trend }) {
  const [tab, setTab] = useState("trend");
  const yieldData = [
    { name: "Heavy",  value: d.yields?.heavy  || 0 },
    { name: "Medium", value: d.yields?.medium || 0 },
    { name: "Light",  value: d.yields?.light  || 0 },
  ];

  return (
    <div style={{ background: C.white, borderRadius: 10, padding: 14, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>

      {/* Header + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          {tab === "trend" ? "HGI Forecast (%)" : "Crude Slate / Yield Dist."}
        </div>
        <div style={{ display: "flex", background: C.offWhite, borderRadius: 6, padding: 3, gap: 2 }}>
          {[["trend", "HGI TREND"], ["yield", "CRUDE SLATE"]].map(([key, lbl]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "4px 12px", borderRadius: 4, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 600, letterSpacing: "0.3px",
              background: tab === key ? C.white : "transparent",
              color: tab === key ? C.accent : C.muted,
              boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* HGI Trend */}
      {tab === "trend" && (
        <>
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.muted, marginBottom: 6, flexWrap: "wrap" }}>
            <span><span style={{ display: "inline-block", width: 16, height: 2.5, background: C.accent, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />HGI</span>
            <span><span style={{ display: "inline-block", width: 16, height: 2.5, background: C.red, borderRadius: 2, marginRight: 4, verticalAlign: "middle", opacity: 0.7 }} />Upper</span>
            <span><span style={{ display: "inline-block", width: 16, height: 2.5, background: C.orange, borderRadius: 2, marginRight: 4, verticalAlign: "middle", opacity: 0.7 }} />Lower</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trend} margin={{ top: 4, right: 16, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 8, fill: C.muted }}
                tickFormatter={(v) => {
                  const dt = new Date(v);
                  return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 9, fill: C.muted }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: `1px solid ${C.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                labelFormatter={(v) => new Date(v).toLocaleString()}
                formatter={(val, name) => [typeof val === "number" ? val.toFixed(2) : val, name]}
              />
              <ReferenceLine y={d.upper} stroke={C.red}    strokeDasharray="4 3" strokeWidth={1} label={{ value: `↑${d.upper}`, fill: C.red,    fontSize: 8, position: "insideTopRight" }} />
              <ReferenceLine y={d.lower} stroke={C.orange} strokeDasharray="4 3" strokeWidth={1} label={{ value: `↓${d.lower}`, fill: C.orange, fontSize: 8, position: "insideBottomRight" }} />
              <Line type="monotone" dataKey="hgi"   stroke={C.accent} strokeWidth={2.5} dot={false} name="HGI" />
              <Line type="monotone" dataKey="upper" stroke={C.red}    strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Upper" />
              <Line type="monotone" dataKey="lower" stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Lower" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            Current: <span style={{ fontWeight: 700, color: C.accent }}>{d.prediction?.toFixed(1)}</span>
            &nbsp;·&nbsp; Band: <span style={{ fontWeight: 600, color: C.accentDim }}>{d.lower} – {d.upper}</span>
          </div>
        </>
      )}

      {/* Yield / Crude Slate */}
      {tab === "yield" && (
        <>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={300} height={200}>
              <Pie data={yieldData} cx={150} cy={90} outerRadius={80} innerRadius={38} dataKey="value" paddingAngle={3}>
                {yieldData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: `1px solid ${C.border}` }}
                formatter={(val) => [`${Number(val).toFixed(2)}%`, ""]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 4 }}>
            {[
              { label: "Heavy",  value: d.yields?.heavy,  color: C.red },
              { label: "Medium", value: d.yields?.medium, color: C.accent },
              { label: "Light",  value: d.yields?.light,  color: C.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center", background: C.offWhite, borderRadius: 6, padding: "6px 4px" }}>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>{value?.toFixed(2) ?? "—"}%</div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}



/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState(null);
  const [activeNav, setActiveNav] = useState("OVERVIEW");
  const [popupChart, setPopupChart] = useState(null); // null | "hgi" | "hours"
  const [activeOpportunity, setActiveOpportunity] = useState(null); // null | "energy" | "co2"
  const [activeGauge, setActiveGauge] = useState(false); // ← NEW: tracks gauge click

  const fetchData = async () => {
    try {
      const res = await axios.get("https://dcu-backend-r1.onrender.com/run-model");
      /*const res = await axios.get(`${import.meta.env.VITE_API_URL}/run-model`);*/
      
      
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Loading ── */
  if (!data?.latest) return (
    <>
      <GlobalStyle />
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.offWhite, gap: 12 }}>
        <div style={{ width: 40, height: 40, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: C.muted, fontSize: 14 }}>Loading DCU Data…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );

  const d = data.latest;

  const alarmColor = d.prediction > d.upper ? "red" : d.prediction < d.lower ? "orange" : "green";
  const alarmText  = d.prediction > d.upper ? "HIGH RISK" : d.prediction < d.lower ? "LOW DEVIATION" : "NORMAL";

  /* Simulated "optimum" values for display */
  const optFurnace = 12;
  const optHGI     = (d.lower + d.upper) / 2;

  /* ── Nav items ── */
  const navItems = [
    { icon: "🛠️", label: "DEVELOPER INFO" },
    { icon: "🏢", label: "SEA OIL CORP" },
    { icon: "🔗", label: "WOLF REFINERY" },
    { icon: "🔗", label: "PHUKET REFINERY" },
    ];

  /* ── Handler for opportunity card clicks ── */
  const handleOpportunityClick = (type) => {
    setActiveGauge(false); // deactivate gauge when opportunity card is clicked
    setActiveOpportunity(prev => prev === type ? null : type);
  };

  /* ── Handler for gauge click ── */
  const handleGaugeClick = () => {
    setActiveOpportunity(null); // deactivate opportunity cards when gauge is clicked
    setActiveGauge(prev => !prev);
  };

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: font }}>

        {/* ──────────── SIDEBAR ──────────── */}
        <aside style={{
          width: 200, flexShrink: 0,
          background: C.navy,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Logo */}
          <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "linear-gradient(135deg, #00b4d8, #0077a8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>🏭</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.white, letterSpacing: "1px" }}>PROCESS</div>
                <div style={{ fontSize: 9, fontWeight: 500, color: C.accent, letterSpacing: "1.5px" }}>EFFICIENCY</div>
              </div>
            </div>
          </div>

          {/* Top nav */}
          <div style={{ padding: "10px 8px" }}>
            {navItems.map(n => (
              <div key={n.label} className="nav-item" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 6,
                fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)",
                cursor: "pointer", marginBottom: 2,
              }}>
                <span style={{ fontSize: 14 }}>{n.icon}</span>
                {n.label}
              </div>
            ))}
          </div>

          {/* Sub nav */}
          <div style={{ padding: "0 8px", marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", padding: "6px 10px", cursor: "pointer" }}>
              🔧 CDU ▾
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", padding: "6px 10px", cursor: "pointer" }}>
              🔧 DCU ▾
            </div>
            <div style={{ paddingLeft: 8, marginTop: 4 }}>
              {["OVERVIEW", "MONITORING", "CONFIGURATIONS"].map(item => (
                <div key={item} className="nav-sub" style={{
                  fontSize: 11, fontWeight: activeNav === item ? 700 : 400,
                  color: activeNav === item ? C.accent : "rgba(255,255,255,0.55)",
                  padding: "8px 10px", borderRadius: 6,
                  background: activeNav === item ? "rgba(0,180,216,0.12)" : "transparent",
                  display: "flex", alignItems: "center", gap: 8,
                }} onClick={() => setActiveNav(item)}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeNav === item ? C.accent : "transparent", flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* User footer */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, #00b4d8, #16c784)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: C.white,
            }}>A</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.white }}>Admin</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>Anand, Akash</div>
            </div>
          </div>
        </aside>

        {/* ──────────── MAIN ──────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* TOPBAR */}
          <header style={{
            height: 50, flexShrink: 0,
            background: C.white,
            borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 20px",
          }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
              <span style={{ color: C.accent, fontWeight: 600, cursor: "pointer" }}>SEA OIL CORP</span>
              <span>›</span>
              <span style={{ color: C.accent, fontWeight: 600, cursor: "pointer" }}>PHUKET REFINERY</span>
              <span>›</span>
              <span style={{ fontWeight: 700, color: C.textDark }}>DCU OVERVIEW</span>
            </div>
            {/* Time info */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
              <div style={{ color: C.muted }}>
                <span style={{ fontWeight: 600, color: C.orange }}>OPTIMUM TIME: </span>
                {d.timestamp || "—"}
              </div>
              <div style={{ color: C.muted }}>
                <span style={{ fontWeight: 600, color: C.textDark }}>ACTUAL TIME: </span>
                {new Date().toLocaleString()}
              </div>
              {/* Icons */}
              <div style={{ display: "flex", gap: 12, color: C.muted, fontSize: 16 }}>
                <span style={{ cursor: "pointer" }}>🔔</span>
                <span style={{ cursor: "pointer" }}>📅</span>
                <span style={{ cursor: "pointer" }}>ℹ️</span>
              </div>
              {/* Alerts */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.orange }}>7</div>
                  <div style={{ fontSize: 9, color: C.muted }}>ACTIVE ALERT</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>3</div>
                  <div style={{ fontSize: 9, color: C.muted }}>OVERDUE ALERT</div>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── HERO BANNER ── */}
            <div style={{
              background: `linear-gradient(135deg, ${C.navyMid} 0%, #0a3a6e 100%)`,
              borderRadius: 12,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              boxShadow: "0 4px 20px rgba(10,22,40,0.25)",
            }}>
              {/* ── Clickable Gauge ── */}
              <CircularGauge
                pct={d.prediction ?? 100}
                label="PROCESS EFFICIENCY"
                sub={`${((d.prediction / d.upper) * 100).toFixed(1)} MT/DAY`}
                onClick={handleGaugeClick}
                isActive={activeGauge}
              />

              {/* Separator */}
              <div style={{ width: 1, height: 90, background: "rgba(255,255,255,0.15)" }} />

              {/* Opportunity cards */}
              <div style={{ flex: 1, display: "flex", gap: 10 }}>

                {/* ── ENERGY card (clickable) ── */}
                <div
                  onClick={() => handleOpportunityClick("energy")}
                  style={{
                    flex: 1,
                    cursor: "pointer",
                    borderRadius: 10,
                    outline: activeOpportunity === "energy" ? `2px solid ${C.accent}` : "2px solid transparent",
                    transition: "outline 0.15s",
                  }}
                >
                  <OpportunityCard
                    icon="💧"
                    label="PREDICTED ENERGY REDUCTION OPPORTUNITY"
                    value={`${d.lower} – ${d.upper}`}
                    unit="MMBTU/DAY"
                    sub={`${97.4}% ENERGY EFFICIENCY`}
                  />
                </div>

                {/* ── CO2 card (clickable) ── */}
                <div
                  onClick={() => handleOpportunityClick("co2")}
                  style={{
                    flex: 1,
                    cursor: "pointer",
                    borderRadius: 10,
                    outline: activeOpportunity === "co2" ? `2px solid ${C.teal}` : "2px solid transparent",
                    transition: "outline 0.15s",
                  }}
                >
                  <OpportunityCard
                    icon="🌱"
                    label="PREDICTED CO₂ REDUCTION OPPORTUNITY"
                    value={d.houronline?.toFixed(2) ?? "—"}
                    unit="MT/DAY"
                    sub={`${98.3}% ENVIRONMENT EFFICIENCY`}
                  />
                </div>

                {/* Deviation badge */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "10px 20px",
                  background: alarmColor === "green" ? "rgba(22,199,132,0.15)" : alarmColor === "red" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                  borderRadius: 10,
                  border: `1px solid ${alarmColor === "green" ? "rgba(22,199,132,0.3)" : alarmColor === "red" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginBottom: 4 }}>OVERDUE DEVIATION</div>
                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: alarmColor === "green" ? C.green : alarmColor === "red" ? C.red : C.orange,
                  }}>{alarmText}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Prediction: {d.prediction}</div>
                </div>
              </div>
            </div>

            {/* ── THREE-COLUMN KPI ROW ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

              {/* Performance KPIs */}
              <div style={{ background: C.white, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                <SectionHeader title="Performance KPIs" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  maxHeight: "250px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}>
                  <KPICard label="Furnace Charge"            actual={d.furnacecharge}             unit="t/d" />
                  <KPICard label="Liquid Yield"              actual={d.prediction - 3}            unit="%" />
                  <KPICard label="Coke Yield"                actual={d.cokeyield}                 unit="%" />
                  <KPICard label="Thermal Efficiency"        actual="89"                          unit="%" />
                  <KPICard label="Capacity Utilization"      actual={`${d.capacityutilization}`}  unit="%" />
                  <KPICard label="Energy Specific Consumption" actual={`${d.specificenergyconsumption}`} unit="" />
                  <KPICard label="Specific Fuel Consumption" actual={d.specificfuelconsumption}   unit="t/d" />
                  <KPICard label="Average COT"               actual={d.avgcot}                    unit="deg F" />
                </div>
              </div>

              {/* Predicted KPIs */}
              <div style={{ background: C.white, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                <SectionHeader title="Predicted KPIs" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  maxHeight: "250px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}>
                  <KPICard label="Coke Drum HGI"         actual={d.prediction} />
                  <KPICard label="Coke Drum Outage"       actual={d.prediction - 10} unit="ft" />
                  <KPICard label="Coke Drum Fouling Index" actual={d.prediction - 22} />
                  <KPICard label="Furnace Runlength"      actual="14" optimum="32" />
                  <KPICard label="Foamover Probability"   actual="10" unit="%" />
                </div>
              </div>

              {/* ── DYNAMIC third column: gauge click > opportunity click > default ── */}
              <div style={{ background: C.white, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>

                {activeGauge ? (
                  /* ── GAUGE CLICKED: show only Fired Duty + Arc O2 ── */
                  <>
                    <SectionHeader title="Key Parameters – Process" />
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      maxHeight: "250px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}>
                      <KPICard label="Fresh Feed"                        actual={d.freshcharge} unit="BPD" />
                      <KPICard label="Drum Inlet Temperature"            actual={d.inlettemp}   unit="deg F" />
                      <KPICard label="Drum Inlet Pressure"               actual={d.inletpress}  unit="psig" />
                      <KPICard label="Drum Outlet Temperature"           actual={d.outlettemp}  unit="deg F" />
                      <KPICard label="Drum Outlet Pressure"              actual={d.outletpress} unit="psig" />
                      <KPICard label="Recycle Ratio"                     actual={d.residapi}    unit="" />
                      <KPICard label="SHC Ratio"                         actual="0.32"          unit="" />
                      <KPICard label="CPR"                               actual="1.2"           unit="" />
                      <KPICard label="Limiting Pass"                     actual="2" />
                      <KPICard label="Limiting Cell"                     actual="A"             unit="" />
                      <KPICard label="Quench Flow"                       actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Fractionator Bottom Pressure"      actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Fractionator Bottom Temperature"   actual={d.residapi}    unit=""  highlight />
                      <KPICard label="HIC Valve Opening"                 actual="15"            unit="%" highlight />
                    </div>
                  </>

                ) : activeOpportunity === "energy" ? (
                  /* ── ENERGY CARD CLICKED ── */
                  <>
                    <SectionHeader title="Key Parameters – Energy" />
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      maxHeight: "250px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}>
                        <KPICard label="Limiting Pass"                     actual="2" />
                        <KPICard label="Limiting Cell"                     actual="A"             unit=""/>
                        <KPICard label="Damper Opening"                    actual="88"            unit="%"/>
                        <KPICard label="Arc O2"                            actual="3.7"           unit=""/>
                        <KPICard label="Fired Duty"                        actual={d.residapi}    unit=""/>
                        <KPICard label="Crossover Temperature"             actual={d.residapi}    unit=""/>
                        <KPICard label="Bridge Wall Temperature"           actual={d.residapi}    unit=""/>
                    </div>
                  </>

                ) : activeOpportunity === "co2" ? (
                  /* ── CO2 CARD CLICKED ── */
                  <>
                    <SectionHeader title="Key Parameters – Environment" />
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      maxHeight: "250px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}>
                    <KPICard label="Damper Opening"                    actual="88"            unit="%"/>
                    <KPICard label="Arc O2"                            actual="3.7"           unit=""/>
                    <KPICard label="Fired Duty"                        actual={d.residapi}    unit=""/>
                    <KPICard label="Crossover Temperature"             actual={d.residapi}    unit=""/>
                    <KPICard label="Bridge Wall Temperature"           actual={d.residapi}    unit=""/>
                    </div>
                  </>

                ) : (
                  /* ── DEFAULT: full Key Parameters – Process ── */
                  <>
                    <SectionHeader title="Key Parameters – Process" />
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      maxHeight: "250px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}>
                      <KPICard label="Fresh Feed"                        actual={d.freshcharge} unit="BPD" />
                      <KPICard label="Drum Inlet Temperature"            actual={d.inlettemp}   unit="deg F" />
                      <KPICard label="Drum Inlet Pressure"               actual={d.inletpress}  unit="psig" />
                      <KPICard label="Drum Outlet Temperature"           actual={d.outlettemp}  unit="deg F" />
                      <KPICard label="Drum Outlet Pressure"              actual={d.outletpress} unit="psig" />
                      <KPICard label="Recycle Ratio"                     actual={d.residapi}    unit="" />
                      <KPICard label="SHC Ratio"                         actual="0.32"          unit="" />
                      <KPICard label="CPR"                               actual="1.2"           unit="" />
                      <KPICard label="Limiting Pass"                     actual="2" />
                      <KPICard label="Limiting Cell"                     actual="A"             unit="" />
                      <KPICard label="Damper Opening"                    actual="88"            unit="%" highlight />
                      <KPICard label="Arc O2"                            actual="3.7"           unit=""  highlight />
                      <KPICard label="Fired Duty"                        actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Crossover Temperature"             actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Bridge Wall Temperature"           actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Quench Flow"                       actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Fractionator Bottom Pressure"      actual={d.residapi}    unit=""  highlight />
                      <KPICard label="Fractionator Bottom Temperature"   actual={d.residapi}    unit=""  highlight />
                      <KPICard label="HIC Valve Opening"                 actual="15"            unit="%" highlight />
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* ── BOTTOM ROW: Actionables + Chart ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>

              {/* Actionables */}
              <div style={{ background: C.white, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                <SectionHeader title="Actionables – Process" />
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  maxHeight: "250px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}>
                  <thead>
                    <tr>
                      {["KPI", "CAUSE", "ACTUAL", "OPTIMUM", "SUGGESTIONS"].map(h => (
                        <th key={h} style={{
                          background: C.offWhite, padding: "7px 10px", textAlign: "left",
                          fontSize: 10, fontWeight: 700, color: C.muted,
                          textTransform: "uppercase", letterSpacing: "0.5px",
                          borderBottom: `2px solid ${C.border}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="action-row">
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, verticalAlign: "top" }}>HGI</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.orange, fontSize: 11, verticalAlign: "top" }}>
                        {d.prediction > d.upper ? "HIGH HGI VALUE" : d.prediction < d.lower ? "LOW HGI VALUE" : "WITHIN RANGE"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{d.prediction?.toFixed(1)}</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.accentDim, fontWeight: 600 }}>{optHGI.toFixed(1)}</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>
                        {d.prediction > d.upper
                          ? "Reduce furnace COT / adjust severity to bring HGI within target band"
                          : d.prediction < d.lower
                          ? "Increase severity / optimize drum switching schedule"
                          : "Operating within limits ✓"}
                      </td>
                    </tr>
                    <tr className="action-row">
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, verticalAlign: "top" }}>Drum</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.orange, fontSize: 11, verticalAlign: "top" }}>
                        {d.drum_status?.drum1 === "Offline" ? "DRUM 1 OFFLINE" : "DRUM STATUS OK"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
                        <span className={`badge badge-${d.drum_status?.drum1 === "Online" ? "green" : "orange"}`}>
                          {d.drum_status?.drum1 ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.accentDim, fontWeight: 600 }}>Online</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>
                        Monitor drum switching schedule to prevent unplanned downtime
                      </td>
                    </tr>
                    <tr className="action-row">
                      <td style={{ padding: "8px 10px", fontWeight: 700, verticalAlign: "top" }}>Furnace</td>
                      <td style={{ padding: "8px 10px", color: C.muted, fontSize: 11, verticalAlign: "top" }}>CHARGE RATE</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{d.furnacecharge}</td>
                      <td style={{ padding: "8px 10px", color: C.accentDim, fontWeight: 600 }}>{optFurnace}</td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>
                        {d.furnacecharge > optFurnace
                          ? "Consider reducing furnace charge to optimum level"
                          : "Maintain current furnace charge rate"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Permanent chart panel: HGI Trend + Yield ── */}
              <ChartPanel d={d} trend={data.trend} />

            </div>
          </div>
        </div>
      </div>

      {/* ── CHART POPUP MODAL ── */}
      {popupChart && (
        <div
          onClick={() => setPopupChart(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(10,22,40,0.55)",
            backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            className="chart-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.white,
              borderRadius: 14,
              padding: "22px 24px 20px",
              width: "min(820px, 92vw)",
              boxShadow: "0 24px 60px rgba(10,22,40,0.35)",
              display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>
                  {popupChart === "hgi" ? "HGI Prediction – Trend" : "Online Hours – Trend"}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Last {data.trend.length} data points · auto-refreshes every 5s
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {popupChart === "hgi" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: "#e0f7ff", color: C.accentDim, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      Current: {d.prediction?.toFixed(1)}
                    </span>
                    <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      Band: {d.lower} – {d.upper}
                    </span>
                  </div>
                )}
                {popupChart === "hours" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: "#d1faf4", color: "#065f46", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      Current: {d.houronline?.toFixed(2)} hrs
                    </span>
                    <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      Optimum: 3.0 hrs
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setPopupChart(null)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: `1px solid ${C.border}`,
                    background: C.offWhite, cursor: "pointer",
                    fontSize: 16, fontWeight: 700, color: C.muted,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1,
                  }}
                  title="Close"
                >✕</button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: C.border }} />

            {/* Legend */}
            <div style={{ display: "flex", gap: 18, fontSize: 11, color: C.muted }}>
              {popupChart === "hgi" ? (
                <>
                  <span><span style={{ display: "inline-block", width: 20, height: 3, background: C.accent, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />HGI Prediction</span>
                  <span><span style={{ display: "inline-block", width: 20, height: 3, background: C.red, borderRadius: 2, marginRight: 5, verticalAlign: "middle", opacity: 0.7 }} />Upper Bound</span>
                  <span><span style={{ display: "inline-block", width: 20, height: 3, background: C.orange, borderRadius: 2, marginRight: 5, verticalAlign: "middle", opacity: 0.7 }} />Lower Bound</span>
                </>
              ) : (
                <>
                  <span><span style={{ display: "inline-block", width: 20, height: 3, background: C.teal, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />Online Hours</span>
                  <span><span style={{ display: "inline-block", width: 20, height: 3, background: C.orange, borderRadius: 2, marginRight: 5, verticalAlign: "middle", opacity: 0.7 }} />Optimum (3.0 hrs)</span>
                </>
              )}
            </div>

            {/* Chart */}
            {popupChart === "hgi" && (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.trend} margin={{ top: 8, right: 24, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickFormatter={(v) => {
                      const dt = new Date(v);
                      return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                    labelFormatter={(v) => new Date(v).toLocaleString()}
                    formatter={(value, name) => [typeof value === "number" ? value.toFixed(2) : value, name]}
                  />
                  <ReferenceLine y={d.upper} stroke={C.red} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `Upper ${d.upper}`, fill: C.red, fontSize: 10, position: "insideTopRight" }} />
                  <ReferenceLine y={d.lower} stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `Lower ${d.lower}`, fill: C.orange, fontSize: 10, position: "insideBottomRight" }} />
                  <Line type="monotone" dataKey="hgi"   stroke={C.accent} strokeWidth={2.5} dot={{ r: 3, fill: C.accent }} activeDot={{ r: 5 }} name="HGI Pred" />
                  <Line type="monotone" dataKey="upper" stroke={C.red}    strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Upper" />
                  <Line type="monotone" dataKey="lower" stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Lower" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {popupChart === "hours" && (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.trend} margin={{ top: 8, right: 24, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickFormatter={(v) => {
                      const dt = new Date(v);
                      return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                    labelFormatter={(v) => new Date(v).toLocaleString()}
                    formatter={(value, name) => [typeof value === "number" ? value.toFixed(2) : value, name]}
                  />
                  <ReferenceLine y={3.0} stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: "Optimum 3.0", fill: C.orange, fontSize: 10, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="houronline" stroke={C.teal} strokeWidth={2.5} dot={{ r: 3, fill: C.teal }} activeDot={{ r: 5 }} name="Online Hours" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Footer hint */}
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center" }}>
              Click anywhere outside this panel or press ✕ to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
