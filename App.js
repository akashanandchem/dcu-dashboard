import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  ReferenceLine, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, ZAxis
} from "recharts";

const C = {
  navy:      "#1a3a5c",
  navyMid:   "#003d6b",
  accent:    "#0099cc",
  accentDim: "#007aa3",
  accentLight:"#e8f5fb",
  teal:      "#00b4d8",
  white:     "#ffffff",
  offWhite:  "#f4f8fb",
  pageBg:    "#f0f5f9",
  border:    "#dce8f0",
  borderMid: "#c8dde9",
  muted:     "#8ba3b5",
  textDark:  "#1c3045",
  textMid:   "#3d5a70",
  textLight: "#7a95a8",
  green:     "#28a745",
  orange:    "#f97316",
  red:       "#dc3545",
  yellow:    "#f5c200",
};

const font = "'DM Sans', 'Segoe UI', sans-serif";
const API  = "http://localhost:8000";

const TREND_COLORS = [
  "#00b4d8","#16c784","#f59e0b","#ef4444",
  "#a78bfa","#00c9b1","#f97316","#3b82f6",
];

const CRUDE_GRADES = [
  { name:"Arab Light",  pct:38, api:32.8, sulfur:1.80, cost:81.2, color:"#00b4d8" },
  { name:"Arab Medium", pct:24, api:29.0, sulfur:2.59, cost:78.4, color:"#16c784" },
  { name:"Arab Heavy",  pct:18, api:27.4, sulfur:2.89, cost:74.8, color:"#f59e0b" },
  { name:"Basra Light", pct:12, api:29.7, sulfur:2.10, cost:79.1, color:"#a78bfa" },
  { name:"Murban",      pct:8,  api:40.5, sulfur:0.76, cost:84.6, color:"#00c9b1" },
];

function genMarginData(){const base=[76,78,75,80,82,79,81,83,78,80,82,84,81,83,85,82,84,86,83,85];return base.map((v,i)=>({day:`D-${20-i}`,margin:+(v+(Math.random()-0.5)*2).toFixed(2),target:82})).reverse();}
function genInventoryData(){return Array.from({length:12},(_,i)=>({month:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],crude:Math.round(2800+Math.sin(i/2)*300+Math.random()*100),product:Math.round(1400+Math.cos(i/2)*200+Math.random()*80)}));}
function genPriceData(){let p=78;return Array.from({length:30},(_,i)=>{p+=(Math.random()-0.48)*1.2;return{day:`D-${30-i}`,brent:+p.toFixed(2),oman:+(p-1.8+Math.random()*0.4).toFixed(2)}}).reverse();}

const MARGIN_DATA=genMarginData();
const INVENTORY_DATA=genInventoryData();
const PRICE_DATA=genPriceData();

const SUPPLY_KPIs=[
  {label:"Crude Intake",value:"95,420",unit:"BPD",status:"normal",opt:"96,000"},
  {label:"Refinery Utilization",value:"94.2",unit:"%",status:"normal",opt:"95.0"},
  {label:"Gross Margin",value:"$8.42",unit:"/bbl",status:"high",opt:"$7.50"},
  {label:"Crude Inventory",value:"3.2",unit:"MMbbls",status:"normal",opt:"3.0"},
  {label:"Product Inventory",value:"1.4",unit:"MMbbls",status:"low",opt:"1.8"},
  {label:"Energy Cost",value:"$1.84",unit:"/bbl",status:"normal",opt:"$1.90"},
  {label:"Transport Cost",value:"$0.62",unit:"/bbl",status:"normal",opt:"$0.65"},
  {label:"Blend API",value:"31.2",unit:"°",status:"normal",opt:"31.5"},
  {label:"Blend Sulfur",value:"2.08",unit:"wt%",status:"high",opt:"2.00"},
  {label:"Crude Cost",value:"$79.4",unit:"/bbl",status:"normal",opt:"$80.0"},
];

const OPTIMIZATION_ACTIONS=[
  {parameter:"Arab Light %",current:"38%",optimum:"42%",impact:"+$0.32/bbl",action:"Increase Arab Light allocation by 4% — improves naphtha yield & reduces sulfur",priority:"HIGH"},
  {parameter:"Basra Light %",current:"12%",optimum:"8%",impact:"+$0.18/bbl",action:"Reduce Basra Light — current pricing premium not justified by yield uplift",priority:"MEDIUM"},
  {parameter:"Blend Sulfur",current:"2.08 wt%",optimum:"2.00 wt%",impact:"+$0.24/bbl",action:"Reduce heavy sour share by 4% to bring blended sulfur within CDU design spec",priority:"HIGH"},
  {parameter:"Product Inventory",current:"1.4 MMbbls",optimum:"1.8 MMbbls",impact:"Risk ↓",action:"Build product stocks ahead of planned CDU turnaround in 3 weeks",priority:"MEDIUM"},
  {parameter:"Crude Procurement",current:"Spot 20%",optimum:"Spot 12%",impact:"-$0.40/bbl",action:"Shift 8% spot to term contract — Brent contango favours term pricing currently",priority:"LOW"},
];

const ALL_PARAMS=[
  {key:"furnacecharge",label:"Furnace Charge",unit:"t/d",category:"Performance"},
  {key:"freshcharge",label:"Fresh Feed",unit:"BPD",category:"Performance"},
  {key:"houronline",label:"Online Hours",unit:"hrs",category:"Performance"},
  {key:"hgi",label:"HGI Prediction",unit:"",category:"Predicted"},
  {key:"upper",label:"HGI Upper Bound",unit:"",category:"Predicted"},
  {key:"lower",label:"HGI Lower Bound",unit:"",category:"Predicted"},
  {key:"inlettemp",label:"Drum Inlet Temperature",unit:"deg F",category:"Key Parameters"},
  {key:"inletpress",label:"Drum Inlet Pressure",unit:"psig",category:"Key Parameters"},
  {key:"outlettemp",label:"Drum Outlet Temperature",unit:"deg F",category:"Key Parameters"},
  {key:"outletpress",label:"Drum Outlet Pressure",unit:"psig",category:"Key Parameters"},
  {key:"residapi",label:"Recycle Ratio",unit:"",category:"Key Parameters"},
  {key:"cokedrum_qw_cum_mgal",label:"Quench Water Consumption",unit:"Mgal",category:"Key Parameters"},
  {key:"cokedrum_qw_duration",label:"Quench Water Consumption Duration",unit:"Hr",category:"Key Parameters"},
  {key:"cokedrum_cokedrum_cokeheight",label:"Coke Height",unit:"ft",category:"Key Parameters"},
  {key:"cokedrum_outage_predicted",label:"Outage",unit:"ft",category:"Key Parameters"},
  {key:"cokedrum_hour1",label:"Hour1",unit:"Hr",category:"Key Parameters"},
  {key:"cokedrum_hour1_outage",label:"Forecasted Outage Hr1",unit:"ft",category:"Key Parameters"},
  {key:"cokedrum_hour2",label:"Hour2",unit:"Hr",category:"Key Parameters"},
  {key:"cokedrum_hour2_outage",label:"Forecasted Outage Hr2",unit:"ft",category:"Key Parameters"},
];

const KPI_TREND_CONFIG={
  furnacecharge:{label:"Furnace Charge",unit:"t/d",color:C.accent},
  freshcharge:{label:"Fresh Feed",unit:"BPD",color:C.teal},
  inlettemp:{label:"Drum Inlet Temperature",unit:"deg F",color:C.orange},
  inletpress:{label:"Drum Inlet Pressure",unit:"psig",color:C.green},
  outlettemp:{label:"Drum Outlet Temperature",unit:"deg F",color:C.red},
  outletpress:{label:"Drum Outlet Pressure",unit:"psig",color:"#a78bfa"},
  houronline:{label:"Online Hours",unit:"hrs",color:C.teal},
  hgi:{label:"HGI Prediction",unit:"",color:C.accent},
};

const GlobalStyle=()=>(
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{font-family:'DM Sans','Segoe UI',sans-serif;background:#f0f5f9;color:#1c3045}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:#f4f8fb}
    ::-webkit-scrollbar-thumb{background:#c0d4e0;border-radius:4px}
    @keyframes fillArc{from{stroke-dashoffset:283}to{stroke-dashoffset:var(--target-offset)}}
    .gauge-arc{animation:fillArc 1.4s cubic-bezier(.4,0,.2,1) forwards}
    .badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase}
    .badge-green{background:#e9f7ee;color:#1a7a3a}
    .badge-red{background:#fdecea;color:#c0281b}
    .badge-orange{background:#fff3e8;color:#b35000}
    .badge-blue{background:#e8f5fb;color:#007aa3}
    .nav-item{transition:background 0.15s,color 0.15s;border-radius:5px}
    .nav-item:hover{background:#e8f5fb!important;color:#0099cc!important}
    .nav-sub{transition:background 0.15s,color 0.15s;border-radius:5px}
    .nav-sub:hover{background:#e8f5fb!important;color:#0099cc!important;cursor:pointer}
    .kpi-card{transition:box-shadow 0.18s;border-radius:6px}
    .kpi-card:hover{box-shadow:0 2px 10px rgba(0,120,180,0.12)!important}
    tr.action-row:hover td{background:#f0f8fc!important}
    tr.opt-row:hover td{background:#f0f8fc!important}
    @keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .chart-modal{animation:modalIn 0.2s ease forwards}
    .gauge-wrap{cursor:pointer;transition:filter 0.2s}
    .gauge-wrap:hover{filter:drop-shadow(0 0 8px rgba(0,153,204,0.5))}
    .gauge-wrap.active{filter:drop-shadow(0 0 14px rgba(0,153,204,0.8))}
    .param-row:hover{background:#f0f8fc!important;cursor:pointer}
    .time-btn{padding:3px 10px;border-radius:4px;border:1px solid #dce8f0;font-size:10px;font-weight:600;cursor:pointer;background:#ffffff;color:#8ba3b5;transition:all 0.12s}
    .time-btn.active{background:#0099cc;color:#ffffff;border-color:#0099cc}
    .time-btn:hover:not(.active){border-color:#0099cc;color:#0099cc;background:#e8f5fb}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes spin2{to{transform:rotate(360deg)}}
    .crude-card{transition:box-shadow 0.18s;border-radius:6px}
    .crude-card:hover{box-shadow:0 2px 10px rgba(0,120,180,0.12)}
    .zoom-wrap{touch-action:none;user-select:none}
    .cfg-file-row{cursor:pointer;border-left:3px solid transparent;transition:background 0.12s,border-color 0.12s}
    .cfg-file-row:hover{background:#eef5fa!important}
    .cfg-file-row.cfg-active{background:#e8f5fb!important;border-left-color:#0099cc!important}
    .cfg-sheet-tab{cursor:pointer;padding:6px 14px;border-radius:5px 5px 0 0;font-size:11px;font-weight:600;border:1px solid transparent;border-bottom:none;transition:all 0.12s}
    .cfg-sheet-tab.cfg-tab-active{background:#ffffff;border-color:#dce8f0;color:#0099cc;margin-bottom:-1px}
    .cfg-sheet-tab:not(.cfg-tab-active){background:#f4f8fb;color:#8ba3b5}
    .cfg-sheet-tab:not(.cfg-tab-active):hover{background:#ffffff;color:#3d5a70}
    .cfg-cell{outline:none;width:100%;height:100%;border:none;background:transparent;font-family:'DM Sans','Segoe UI',sans-serif;font-size:11px;color:#1c3045;padding:6px 10px;cursor:text}
    .cfg-cell:focus{background:#fffde6}
    .cfg-row:hover td{background:#f4f9fc!important}
    .cfg-row.modified td{background:#fffdf0!important}
    .cfg-sidebar-item{transition:background 0.12s;cursor:pointer;border-radius:5px}
    .cfg-sidebar-item:hover{background:#eef5fa}
    .cfg-sidebar-item.active{background:#e8f5fb}
    @keyframes cfgFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .cfg-table-wrap{animation:cfgFadeIn 0.15s ease forwards}
    .cfg-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.12s;border:none;font-family:'DM Sans','Segoe UI',sans-serif}
    .cfg-btn:disabled{opacity:0.4;cursor:not-allowed}
    .cfg-col-del{padding:0 6px;background:transparent;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:13px;font-weight:700;transition:color 0.12s}
    .cfg-col-del:hover{color:#ef4444}
    .cfg-row-del{padding:3px 6px;background:transparent;border:none;color:#8ba3b5;cursor:pointer;font-size:13px;border-radius:3px;transition:all 0.12s}
    .cfg-row-del:hover{color:#dc3545;background:#fdecea}
    @keyframes slideInToast{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes wizardStepIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .wizard-step{animation:wizardStepIn 0.22s ease forwards}
    .wiz-input{padding:8px 11px;border:1px solid #dce8f0;border-radius:5px;font-size:12px;font-family:'DM Sans','Segoe UI',sans-serif;color:#1c3045;background:#ffffff;outline:none;width:100%;transition:border-color 0.15s,box-shadow 0.15s;box-sizing:border-box}
    .wiz-input:focus{border-color:#0099cc;box-shadow:0 0 0 3px rgba(0,153,204,0.1)}
    .wiz-input.error{border-color:#dc3545;background:#fff8f8}
    .wiz-checkbox{cursor:pointer;accent-color:#0099cc;width:14px;height:14px;flex-shrink:0}
    .wiz-toggle{position:relative;display:inline-block;width:42px;height:22px;cursor:pointer;flex-shrink:0}
    .wiz-toggle input{opacity:0;width:0;height:0}
    .wiz-slider{position:absolute;inset:0;background:#c8d8e4;border-radius:22px;transition:background 0.18s}
    .wiz-slider:before{content:'';position:absolute;height:16px;width:16px;left:3px;bottom:3px;background:white;border-radius:50%;transition:transform 0.18s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
    .wiz-toggle input:checked + .wiz-slider{background:#0099cc}
    .wiz-toggle input:checked + .wiz-slider:before{transform:translateX(20px)}
    .step-connector{flex:1;height:2px;background:#dce8f0;transition:background 0.35s}
    .step-connector.done{background:#0099cc}
    .wiz-field-error{font-size:9px;color:#dc3545;font-weight:600;margin-top:3px}
    @keyframes devFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .drum-pair-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;background:#e8f5fb;color:#0099cc;border:1px solid #b8dcee}
    .side-btn{transition:all 0.12s;line-height:1}
    .side-btn:hover{opacity:0.8;transform:scale(1.05)}
    @keyframes heroCardIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .hero-card{cursor:pointer;transition:background 0.15s}
    .hero-card:hover{background:#f0f9ff!important}
  `}</style>
);

function sortTrend(trend){
  if(!trend||!trend.length)return[];
  return[...trend].map(r=>{
    const out={time:r.time};
    Object.keys(r).forEach(k=>{
      if(k==="time")return;
      const v=Number(r[k]);out[k]=isNaN(v)?0:v;
    });
    return out;
  }).sort((a,b)=>new Date(a.time)-new Date(b.time));
}
function getMinMax(sorted,key){
  const vals=sorted.map(r=>r[key]).filter(v=>typeof v==="number"&&!isNaN(v)&&isFinite(v));
  if(!vals.length)return{min:0,max:1};
  const mn=Math.min(...vals),mx=Math.max(...vals);
  return{min:mn,max:mx===mn?mn+1:mx};
}
function computeDomain(sorted,key){
  const{min:mn,max:mx}=getMinMax(sorted,key);
  if(mx===mn){const b=Math.abs(mx)||1;return[+(mn-b*0.05).toFixed(2),+(mx+b*0.05).toFixed(2)];}
  const pad=(mx-mn)*0.15;
  return[+(mn-pad).toFixed(2),+(mx+pad).toFixed(2)];
}
function fmtTime(v){
  const dt=new Date(v);
  return`${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
}
function axisWidth(domain){
  const maxAbs=Math.max(...domain.map(v=>Math.abs(Number(v)||0)));
  const digits=maxAbs>0?Math.floor(Math.log10(maxAbs))+1:1;
  return Math.max(36,digits*8+16);
}

function useZoom(){
  const[zoomRange,setZoomRange]=useState({start:0,end:1});
  const[isZoomed,setIsZoomed]=useState(false);
  const touchRef=useRef({active:false,initDist:0,initRange:{start:0,end:1}});
  const wrapRef=useRef(null);
  const applyZoom=useCallback((ns,ne)=>{
    const clampedS=Math.max(0,ns);const clampedE=Math.min(1,ne);
    setZoomRange({start:clampedS,end:clampedE});
    setIsZoomed(!(clampedS<=0.001&&clampedE>=0.999));
  },[]);
  const handleWheel=useCallback((e)=>{
    e.preventDefault();
    const factor=e.deltaY>0?1.12:0.88;
    setZoomRange(prev=>{
      const center=(prev.start+prev.end)/2;const half=((prev.end-prev.start)/2)*factor;
      const ns=Math.max(0,center-half);const ne=Math.min(1,center+half);
      setIsZoomed(!(ns<=0.001&&ne>=0.999));return{start:ns,end:ne};
    });
  },[applyZoom]);
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    el.addEventListener("wheel",handleWheel,{passive:false});
    return()=>el.removeEventListener("wheel",handleWheel);
  },[handleWheel]);
  const handleTouchStart=useCallback((e)=>{
    if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX;const dy=e.touches[0].clientY-e.touches[1].clientY;
      touchRef.current={active:true,initDist:Math.sqrt(dx*dx+dy*dy),initRange:{...zoomRange}};
    }
  },[zoomRange]);
  const handleTouchMove=useCallback((e)=>{
    if(e.touches.length!==2||!touchRef.current.active)return;e.preventDefault();
    const dx=e.touches[0].clientX-e.touches[1].clientX;const dy=e.touches[0].clientY-e.touches[1].clientY;
    const dist=Math.sqrt(dx*dx+dy*dy);const scale=touchRef.current.initDist/dist;
    const{start,end}=touchRef.current.initRange;const center=(start+end)/2;const half=((end-start)/2)*scale;
    applyZoom(center-half,center+half);
  },[applyZoom]);
  const handleTouchEnd=useCallback(()=>{touchRef.current.active=false;},[]);
  const resetZoom=()=>{setZoomRange({start:0,end:1});setIsZoomed(false);};
  const zoomPct=Math.round((zoomRange.end-zoomRange.start)*100);
  return{zoomRange,isZoomed,resetZoom,zoomPct,wrapRef,wrapProps:{ref:wrapRef,className:"zoom-wrap",onTouchStart:handleTouchStart,onTouchMove:handleTouchMove,onTouchEnd:handleTouchEnd}};
}
function applyZoomSlice(data,zoomRange){
  if(!data.length)return data;
  const len=data.length;const si=Math.max(0,Math.floor(zoomRange.start*len));const ei=Math.min(len,Math.ceil(zoomRange.end*len));
  return data.slice(si,Math.max(si+1,ei));
}

function SectionHeader({title,action}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:8,borderBottom:`1px solid ${C.border}`,marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:700,color:C.textDark,textTransform:"uppercase",letterSpacing:"0.6px"}}>{title}</div>
      {action&&<div style={{fontSize:10,color:C.accent,fontWeight:600,cursor:"pointer"}}>{action}</div>}
    </div>
  );
}
function StatusBadge({status}){
  const map={high:["badge-green","▲ HIGH"],normal:["badge-blue","● NORMAL"],low:["badge-orange","▼ LOW"]};
  const[cls,txt]=map[status]||["badge-blue","—"];
  return<span className={`badge ${cls}`}>{txt}</span>;
}
function ZoomBar({isZoomed,zoomPct,resetZoom,label}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div style={{fontSize:9,color:C.muted,display:"flex",gap:6,alignItems:"center"}}>
        <span style={{color:C.textLight}}>🖱 Scroll</span><span style={{color:C.border}}>·</span><span style={{color:C.textLight}}>👆 Pinch to zoom</span>
        {isZoomed&&<><span style={{color:C.border}}>·</span><span style={{color:C.orange,fontWeight:700,fontSize:9}}>{zoomPct}% view</span></>}
        {label&&<><span style={{color:C.border}}>·</span><span style={{color:C.textLight}}>{label}</span></>}
      </div>
      {isZoomed&&(<button onClick={resetZoom} style={{padding:"2px 8px",borderRadius:4,border:`1px solid ${C.accent}`,fontSize:9,fontWeight:600,color:C.accent,background:C.accentLight,cursor:"pointer"}}>↺ Reset</button>)}
    </div>
  );
}

const WIZARD_STEPS = [
  { id:1, label:"Asset Info",          icon:"🏭", short:"Asset Info"    },
  { id:2, label:"Algorithm Info",      icon:"⚙️",  short:"Algorithm Info" },
  { id:3, label:"Basic Configuration", icon:"🔧",  short:"Basic Configuration"   },
  { id:4, label:"Data Input",          icon:"📊",  short:"Data Input"     },
  { id:5, label:"KPI Calculation",     icon:"📈",  short:"KPI Calculation"      },
];

function WizLabel({ children, required }) {
  return (
    <label style={{ fontSize:12, fontWeight:700, color:C.textDark, textTransform:"uppercase", letterSpacing:"0.6px", display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
      {children}{required && <span style={{ color:C.red }}>*</span>}
    </label>
  );
}

function WizInput({ label, value, onChange, type="number", min=0, placeholder, required, error, hint, unit }) {
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <WizLabel required={required}>
        {label}
        {unit && <span style={{ fontWeight:400, textTransform:"none", fontSize:9, marginLeft:2 }}>({unit})</span>}
      </WizLabel>
      <input className={`wiz-input${error?" error":""}`} type={type} value={value} min={min}
        placeholder={placeholder||""} onChange={e=>onChange(e.target.value)} />
      {error && <div className="wiz-field-error">{error}</div>}
      {hint && !error && <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{hint}</div>}
    </div>
  );
}

function WizSelect({ label, value, onChange, options, required, error }) {
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <WizLabel required={required}>{label}</WizLabel>
      <select className={`wiz-input${error?" error":""}`} value={value} onChange={e=>onChange(e.target.value)}
        style={{ cursor:"pointer", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a90aa' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", appearance:"none" }}>
        <option value="">— Select —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      {error && <div className="wiz-field-error">{error}</div>}
    </div>
  );
}

function WizCheckbox({ label, checked, onChange }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${checked ? C.accent : C.border}`, background: checked ? "rgba(0,180,216,0.06)" : C.white, transition:"all 0.15s", userSelect:"none" }}>
      <input type="checkbox" className="wiz-checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} />
      <span style={{ fontSize:12, fontWeight: checked ? 600 : 400, color: checked ? C.textDark : C.textMid }}>{label}</span>
      {checked && <span style={{ marginLeft:"auto", fontSize:10, color:C.accent, fontWeight:700 }}>✓</span>}
    </label>
  );
}

function WizToggle({ label, value, onChange, hint }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:8, background:C.white, border:`1.5px solid ${value ? C.accent : C.border}`, transition:"border-color 0.15s" }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.textDark }}>{label}</div>
        {hint && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{hint}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, fontWeight:600, color: value ? C.accent : C.muted }}>{value ? "YES" : "NO"}</span>
        <label className="wiz-toggle">
          <input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)} />
          <span className="wiz-slider" />
        </label>
      </div>
    </div>
  );
}

function WizardProgressBar({ currentStep, completedSteps }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, padding:"20px 24px 0" }}>
      {WIZARD_STEPS.map((step, idx) => {
        const isDone = completedSteps.includes(step.id);
        const isActive = currentStep === step.id;
        const isLocked = !isDone && !isActive && step.id > Math.max(...completedSteps, 0) + 1;
        return (
          <React.Fragment key={step.id}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:0 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background: isDone ? C.accent : isActive ? C.navyMid : C.offWhite, border:`2px solid ${isDone ? C.accent : isActive ? C.accent : C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, transition:"all 0.3s", flexShrink:0, boxShadow: isActive ? `0 0 0 4px rgba(0,180,216,0.15)` : "none" }}>
                {isDone ? <span style={{ color:C.white, fontSize:13, fontWeight:700 }}>✓</span> : <span style={{ filter: isLocked ? "grayscale(1) opacity(0.4)" : "none" }}>{step.icon}</span>}
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:12, fontWeight:700, color: isActive ? C.accent : isDone ? C.textDark : C.muted, textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" }}>{step.short}</div>
                {isDone   && <div style={{ fontSize:10, color:C.green,  fontWeight:600 }}>Done</div>}
                {isActive && <div style={{ fontSize:10, color:C.accent, fontWeight:600 }}>Active</div>}
                {isLocked && <div style={{ fontSize:10, color:C.muted  }}>Locked</div>}
              </div>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={`step-connector${isDone ? " done" : ""}`} style={{ margin:"0 4px", marginBottom:24 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function WizSubmitBtn({ onClick, label="Submit & Continue" }) {
  return (
    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
      <button onClick={onClick}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 28px", borderRadius:8, border:"none", background:`linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, color:C.white, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:font, boxShadow:"0 4px 14px rgba(0,180,216,0.35)", transition:"opacity 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.87"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        {label} →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   WizStepCard — PATCHED: accepts onUseDefaults prop
   Renders "Use Defaults" button in top-right of header
───────────────────────────────────────── */
function WizStepCard({ stepNum, title, icon, subtitle, children, isComplete, onUseDefaults }) {
  return (
    <div className="wizard-step" style={{ background:C.white, borderRadius:12, border:`1.5px solid ${isComplete ? C.accent+"55" : C.border}`, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ background: isComplete ? `linear-gradient(90deg, rgba(0,180,216,0.08), transparent)` : `linear-gradient(90deg, rgba(13,32,64,0.04), transparent)`, padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background: isComplete ? C.accent : C.navyMid, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
            {isComplete ? <span style={{ color:C.white, fontSize:16, fontWeight:800 }}>✓</span> : icon}
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.8px" }}>Step {stepNum}</span>
              {isComplete && <span style={{ background:"#d1fae5", color:"#065f46", borderRadius:20, padding:"1px 8px", fontSize:9, fontWeight:700 }}>COMPLETED</span>}
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.textDark }}>{title}</div>
            {subtitle && <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{subtitle}</div>}
          </div>
        </div>
        {/* ── Use Defaults button — only shown when step is not yet complete and onUseDefaults is provided ── */}
        {!isComplete && onUseDefaults && (
          <button
            onClick={onUseDefaults}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:7, border:`1.5px solid ${C.teal}`, background:"rgba(0,180,216,0.07)", color:C.teal, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:font, transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0 }}
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(0,180,216,0.15)"; e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="rgba(0,180,216,0.07)"; e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.color=C.teal; }}>
            ⚡ Use Defaults
          </button>
        )}
      </div>
      <div style={{ padding:"20px" }}>{children}</div>
    </div>
  );
}

/* ── STEP 1: ASSET INFO ── */
const INITIAL_ASSET = {
  fired_heaters:"", cells_per_heater:"", passes_per_heater:"", tubes_per_pass:"",
  burners_per_furnace:"", burners_per_cell:"", burners_per_pass:"",
  coke_drums:"", burner_orientation:"", drum_height:"", drum_diameter:""
};

/* ── DEFAULT VALUES FOR STEP 1 ── */
const DEFAULT_ASSET = {
  fired_heaters:"2", cells_per_heater:"2", passes_per_heater:"4", tubes_per_pass:"48",
  burners_per_furnace:"48", burners_per_cell:"24", burners_per_pass:"12",
  coke_drums:"2", burner_orientation:"Floor type", drum_height:"27", drum_diameter:"8.5"
};

function Step1AssetInfo({ data, onChange, onSubmit, isComplete }) {
  const [errors, setErrors] = useState({});
  const numFields = [
    {key:"fired_heaters",       label:"No. of Fired Heaters", required:true},
    {key:"cells_per_heater",    label:"Cells per Heater",     required:true},
    {key:"passes_per_heater",   label:"Passes per Heater",    required:true},
    {key:"tubes_per_pass",      label:"Tubes per Pass",       required:true},
    {key:"burners_per_furnace", label:"Burners per Furnace",  required:true},
    {key:"burners_per_cell",    label:"Burners per Cell",     required:true},
    {key:"burners_per_pass",    label:"Burners per Pass",     required:true},
  ];
  const validate = () => {
    const e = {};
    numFields.forEach(f => { if (!data[f.key] || Number(data[f.key]) <= 0) e[f.key] = "Required > 0"; });
    if (!data.burner_orientation) e.burner_orientation = "Required";
    if (!data.coke_drums   || Number(data.coke_drums)   <= 0) e.coke_drums   = "Required > 0";
    if (!data.drum_height   || Number(data.drum_height)   <= 0) e.drum_height   = "Required > 0";
    if (!data.drum_diameter || Number(data.drum_diameter) <= 0) e.drum_diameter = "Required > 0";
    setErrors(e); return !Object.keys(e).length;
  };
  const SectionLabel = ({num, label, color=C.accent}) => (
    <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:20, height:20, borderRadius:"50%", background:color, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, color:C.white, fontWeight:800 }}>{num}</span>
      {label}
    </div>
  );
  return (
    <WizStepCard stepNum={1} title="Asset Info" icon="🏭" subtitle="Define your fired heater and coke drum physical configuration" isComplete={isComplete} onUseDefaults={()=>{ onChange(DEFAULT_ASSET); setErrors({}); }}>
      <div style={{ marginBottom:20 }}>
        <SectionLabel num="1" label="Fired Heater Info" color={C.accent} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:12 }}>
          {numFields.map(f=>(
            <WizInput key={f.key} label={f.label} value={data[f.key]} required type="number" min={1}
              onChange={v=>{onChange({...data,[f.key]:v});if(errors[f.key])setErrors(e=>({...e,[f.key]:null}));}}
              error={errors[f.key]} />
          ))}
          <WizSelect label="Burner Orientation" value={data.burner_orientation} required
            onChange={v=>{onChange({...data,burner_orientation:v});if(errors.burner_orientation)setErrors(e=>({...e,burner_orientation:null}));}}
            options={["Floor type","Wall mounted"]} error={errors.burner_orientation} />
        </div>
      </div>
      <div>
        <SectionLabel num="2" label="Coke Drum Info" color={C.orange} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:12 }}>
          <WizInput label="No. of Coke Drums" value={data.coke_drums} required type="number" min={1}
            onChange={v=>{onChange({...data,coke_drums:v});if(errors.coke_drums)setErrors(e=>({...e,coke_drums:null}));}}
            error={errors.coke_drums} />
          <WizInput label="Drum Height" value={data.drum_height} unit="m" required type="number" min={0.1}
            onChange={v=>{onChange({...data,drum_height:v});if(errors.drum_height)setErrors(e=>({...e,drum_height:null}));}}
            error={errors.drum_height} />
          <WizInput label="Drum Diameter" value={data.drum_diameter} unit="m" required type="number" min={0.1}
            onChange={v=>{onChange({...data,drum_diameter:v});if(errors.drum_diameter)setErrors(e=>({...e,drum_diameter:null}));}}
            error={errors.drum_diameter} />
        </div>
        {data.drum_height && data.drum_diameter && Number(data.drum_height)>0 && Number(data.drum_diameter)>0 && (
          <div style={{ marginTop:10 }}>
            <span style={{ background:"rgba(0,201,177,0.1)", color:C.teal, borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:600 }}>
              Vol ≈ {(Math.PI*Math.pow(Number(data.drum_diameter)/2,2)*Number(data.drum_height)).toFixed(1)} m³
            </span>
          </div>
        )}
      </div>
      {!isComplete && <WizSubmitBtn onClick={()=>{if(validate())onSubmit();}} label="Submit Asset Info & Continue" />}
      {isComplete && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(22,199,132,0.08)", borderRadius:8, border:"1px solid rgba(22,199,132,0.3)", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#065f46" }}>
            Saved — {data.fired_heaters} heater(s) · {data.coke_drums} drum(s) · {data.drum_height}m × ⌀{data.drum_diameter}m · {data.burner_orientation}
          </span>
        </div>
      )}
    </WizStepCard>
  );
}

/* ── STEP 2: ALGORITHM INFO ── */
const INITIAL_ALGO = {
  heater_models:[], drum_models:[], kpi_types:[],
  alert_notification:false, workflow_generation:false, model_retraining:false, data_visualization:false,
};

/* ── DEFAULT VALUES FOR STEP 2 ── */
const DEFAULT_ALGO = {
  heater_models:["Runlength forecast","Clean TMT"],
  drum_models:["Outage prediction","HGI prediction"],
  kpi_types:["Furnace limiting","Energy/Environment"],
  alert_notification:true, workflow_generation:false, model_retraining:true, data_visualization:true,
};

const HEATER_MODEL_OPTS = ["Runlength forecast","Clean TMT","Spall"];
const DRUM_MODEL_OPTS   = ["Outage prediction","HGI prediction","Drum overhead fouling prediction"];
const KPI_TYPE_OPTS     = ["Furnace limiting","Energy/Environment","Furnace Fouling"];
const TOGGLE_FIELDS     = [
  {key:"alert_notification", label:"Alert / Notification",  hint:"Real-time operational alerts"},
  {key:"workflow_generation", label:"Workflow Generation",   hint:"Auto-generate maintenance workflows"},
  {key:"model_retraining",    label:"Model Retraining",      hint:"Periodic model auto-retraining"},
  {key:"data_visualization",  label:"Data Visualization",    hint:"Advanced chart & plot modules"},
];

function Step2AlgorithmInfo({ data, onChange, onSubmit, isComplete }) {
  const [errors, setErrors] = useState({});
  const toggleCheck = (field, option) => {
    const next = (data[field]||[]).includes(option)
      ? (data[field]||[]).filter(x=>x!==option)
      : [...(data[field]||[]), option];
    onChange({...data,[field]:next});
    if(errors[field]) setErrors(e=>({...e,[field]:null}));
  };
  const validate = () => {
    const e = {};
    if(!(data.heater_models||[]).length) e.heater_models = "Select at least one";
    if(!(data.drum_models||[]).length)   e.drum_models   = "Select at least one";
    if(!(data.kpi_types||[]).length)     e.kpi_types     = "Select at least one";
    setErrors(e);
    return !Object.keys(e).length;
  };
  const CheckGroup = ({field, options, label, err, accentColor=C.accent}) => (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:accentColor, flexShrink:0 }}/>
        {label}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {options.map(opt=>(
          <WizCheckbox key={opt} label={opt} checked={(data[field]||[]).includes(opt)} onChange={()=>toggleCheck(field,opt)} />
        ))}
      </div>
      {err && <div className="wiz-field-error" style={{ marginTop:6 }}>{err}</div>}
    </div>
  );
  return (
    <WizStepCard stepNum={2} title="Algorithm Info" icon="⚙️" subtitle="Select models, KPI types and enable feature modules" isComplete={isComplete} onUseDefaults={()=>{ onChange(DEFAULT_ALGO); setErrors({}); }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:20 }}>
        <CheckGroup field="heater_models" options={HEATER_MODEL_OPTS} label="Fired Heater Models" err={errors.heater_models} accentColor={C.orange} />
        <CheckGroup field="drum_models"   options={DRUM_MODEL_OPTS}   label="Coke Drum Models"   err={errors.drum_models}   accentColor={C.teal} />
        <CheckGroup field="kpi_types"     options={KPI_TYPE_OPTS}     label="KPI Calculation Types" err={errors.kpi_types}  accentColor={C.green} />
      </div>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:12 }}>Feature Toggles</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {TOGGLE_FIELDS.map(f=>(
            <WizToggle key={f.key} label={f.label} hint={f.hint} value={data[f.key]||false}
              onChange={v=>onChange({...data,[f.key]:v})} />
          ))}
        </div>
      </div>
      {!isComplete && <WizSubmitBtn onClick={()=>{if(validate())onSubmit();}} label="Submit Algorithm Info & Continue" />}
      {isComplete && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(22,199,132,0.08)", borderRadius:8, border:"1px solid rgba(22,199,132,0.3)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#065f46" }}>Saved —</span>
          {[...(data.heater_models||[]),...(data.drum_models||[]),...(data.kpi_types||[])].map(m=>(
            <span key={m} style={{ background:C.accent+"22", color:C.accentDim, borderRadius:20, padding:"1px 9px", fontSize:10, fontWeight:600 }}>{m}</span>
          ))}
        </div>
      )}
    </WizStepCard>
  );
}

/* ── STEP 3: BASIC CONFIGURATION ── */
const INITIAL_BASIC_CONFIG = {
  data_granularity:"", std_dev_period:"", dashboard_refresh:"", model_init_period:""
};

/* ── DEFAULT VALUES FOR STEP 3 ── */
const DEFAULT_BASIC_CONFIG = {
  data_granularity:"5 min", std_dev_period:"1 hr", dashboard_refresh:"5 min", model_init_period:"1 hr"
};

function Step3BasicConfig({ data, onChange, onSubmit, isComplete }) {
  const [errors, setErrors] = useState({});
  const validate = () => {
    const e = {};
    if (!data.data_granularity)  e.data_granularity = "Required";
    if (!data.std_dev_period)    e.std_dev_period = "Required";
    if (!data.dashboard_refresh) e.dashboard_refresh = "Required";
    if (!data.model_init_period) e.model_init_period = "Required";
    setErrors(e);
    return !Object.keys(e).length;
  };
  const RadioGroup = ({ field, label, options, required }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <WizLabel required={required}>{label}</WizLabel>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {options.map(opt => {
          const selected = data[field] === opt;
          return (
            <div key={opt} onClick={() => { onChange({...data,[field]:opt}); if(errors[field]) setErrors(e=>({...e,[field]:null})); }}
              style={{ padding:"8px 18px", borderRadius:8, border:`1.5px solid ${selected ? C.accent : C.border}`, background: selected ? "rgba(0,180,216,0.08)" : C.white, color: selected ? C.accent : C.textMid, fontSize:12, fontWeight: selected ? 700 : 400, cursor:"pointer", transition:"all 0.15s", userSelect:"none", display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", border:`2px solid ${selected ? C.accent : C.border}`, background: selected ? C.accent : "transparent", flexShrink:0, transition:"all 0.15s" }}/>
              {opt}
            </div>
          );
        })}
      </div>
      {errors[field] && <div style={{ fontSize:9, color:C.red, fontWeight:600 }}>{errors[field]}</div>}
    </div>
  );
  const fields = [
    { key:"data_granularity",  label:"Data Granularity",              options:["5 min","30 min","1 hr"],  required:true },
    { key:"std_dev_period",    label:"Standard Deviation Period",     options:["30 min","1 hr"],          required:true },
    { key:"dashboard_refresh", label:"Dashboard Refreshing Frequency",options:["5 min","30 min","1 hr"],  required:true },
    { key:"model_init_period", label:"Model Initialization Period",   options:["1 hr","2 hr"],            required:true },
  ];
  return (
    <WizStepCard stepNum={3} title="Basic Configuration" icon="🔧" subtitle="Set time intervals and refresh frequencies for your unit" isComplete={isComplete} onUseDefaults={()=>{ onChange(DEFAULT_BASIC_CONFIG); setErrors({}); }}>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {fields.map(f => (
          <RadioGroup key={f.key} field={f.key} label={f.label} options={f.options} required={f.required} />
        ))}
      </div>
      {!isComplete && <WizSubmitBtn onClick={()=>{ if(validate()) onSubmit(); }} label="Submit Basic Config & Continue" />}
      {isComplete && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(22,199,132,0.08)", borderRadius:8, border:"1px solid rgba(22,199,132,0.3)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#065f46" }}>Saved —</span>
          {fields.map(f => data[f.key] && (
            <span key={f.key} style={{ background:C.accent+"22", color:C.accentDim, borderRadius:20, padding:"1px 9px", fontSize:10, fontWeight:600 }}>
              {f.label}: {data[f.key]}
            </span>
          ))}
        </div>
      )}
    </WizStepCard>
  );
}

/* ── STEP 4: DATA INPUT ── */
const SAMPLE_TAG_LIST = [
  { id:"coke_drum_inlet_temp",     group:"Coke Drum",  label:"Coke Drum Inlet Temperature",      unit:"°F"   },
  { id:"coke_drum_outlet_temp",    group:"Coke Drum",  label:"Coke Drum Outlet Temperature",     unit:"°F"   },
  { id:"coke_drum_inlet_press",    group:"Coke Drum",  label:"Coke Drum Inlet Pressure",         unit:"psig" },
  { id:"coke_drum_outlet_press",   group:"Coke Drum",  label:"Coke Drum Outlet Pressure",        unit:"psig" },
  { id:"coke_drum_level",          group:"Coke Drum",  label:"Coke Drum Level",                  unit:"ft"   },
  { id:"furnace_cot",              group:"Furnace",    label:"Furnace Coil Outlet Temperature",  unit:"°F"   },
  { id:"furnace_charge_flow",      group:"Furnace",    label:"Furnace Charge Flow",              unit:"t/d"  },
  { id:"furnace_fuel_gas_flow",    group:"Furnace",    label:"Furnace Fuel Gas Flow",            unit:"MMBTU"},
  { id:"furnace_pass1_flow",       group:"Furnace",    label:"Furnace Pass 1 Flow",              unit:"t/d"  },
  { id:"furnace_pass2_flow",       group:"Furnace",    label:"Furnace Pass 2 Flow",              unit:"t/d"  },
  { id:"fractionator_overhead_temp",group:"Fractionator",label:"Fractionator Overhead Temperature",unit:"°F"},
  { id:"fractionator_btm_temp",    group:"Fractionator",label:"Fractionator Bottom Temperature", unit:"°F"  },
  { id:"quench_water_flow",        group:"Utilities",  label:"Quench Water Flow",                unit:"Mgal" },
  { id:"steam_flow",               group:"Utilities",  label:"Steam Flow",                       unit:"t/d"  },
  { id:"feed_api_gravity",         group:"Feed",       label:"Feed API Gravity",                 unit:"°API" },
  { id:"feed_sulfur",              group:"Feed",       label:"Feed Sulfur Content",              unit:"wt%"  },
];

const INITIAL_DATA_INPUT = Object.fromEntries(SAMPLE_TAG_LIST.map(t => [t.id, ""]));

/* ── DEFAULT VALUES FOR STEP 4 ── */
const DEFAULT_DATA_INPUT = {
  coke_drum_inlet_temp:      "TI_CD_INLET_101.PV",
  coke_drum_outlet_temp:     "TI_CD_OUTLET_102.PV",
  coke_drum_inlet_press:     "PI_CD_INLET_101.PV",
  coke_drum_outlet_press:    "PI_CD_OUTLET_102.PV",
  coke_drum_level:           "LI_CD_LEVEL_101.PV",
  furnace_cot:               "TI_FURN_COT_201.PV",
  furnace_charge_flow:       "FI_FURN_CHARGE_201.PV",
  furnace_fuel_gas_flow:     "FI_FURN_FUEL_201.PV",
  furnace_pass1_flow:        "FI_FURN_PASS1_201.PV",
  furnace_pass2_flow:        "FI_FURN_PASS2_201.PV",
  fractionator_overhead_temp:"TI_FRAC_OVH_301.PV",
  fractionator_btm_temp:     "TI_FRAC_BTM_301.PV",
  quench_water_flow:         "FI_QW_FLOW_401.PV",
  steam_flow:                "FI_STEAM_401.PV",
  feed_api_gravity:          "AI_FEED_API_501.PV",
  feed_sulfur:               "AI_FEED_S_501.PV",
};

function Step4DataInput({ data, onChange, onSubmit, isComplete }) {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");
  const groups = ["All", ...Array.from(new Set(SAMPLE_TAG_LIST.map(t => t.group)))];
  const filtered = SAMPLE_TAG_LIST.filter(t => {
    const matchGroup = filterGroup === "All" || t.group === filterGroup;
    const matchSearch = t.label.toLowerCase().includes(search.toLowerCase()) ||
                        (data[t.id]||"").toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });
  const mapped   = SAMPLE_TAG_LIST.filter(t => data[t.id]?.trim());
  const unmapped = SAMPLE_TAG_LIST.filter(t => !data[t.id]?.trim());
  return (
    <WizStepCard stepNum={4} title="Data Input" icon="📊" subtitle="Map PI tags to each required process input" isComplete={isComplete} onUseDefaults={()=>onChange(DEFAULT_DATA_INPUT)}>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:8, background:"rgba(22,199,132,0.08)", border:"1px solid rgba(22,199,132,0.25)" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.green }}/>
          <span style={{ fontSize:11, fontWeight:600, color:C.green }}>{mapped.length} mapped</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:8, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.orange }}/>
          <span style={{ fontSize:11, fontWeight:600, color:C.orange }}>{unmapped.length} unmapped</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:8, background:"rgba(0,180,216,0.08)", border:"1px solid rgba(0,180,216,0.25)" }}>
          <span style={{ fontSize:11, fontWeight:600, color:C.accent }}>{SAMPLE_TAG_LIST.length} total tags</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tag name or PI tag..."
          style={{ flex:1, padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:font, color:C.textDark, outline:"none" }} />
        <select value={filterGroup} onChange={e=>setFilterGroup(e.target.value)}
          style={{ padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:font, color:C.textDark, background:C.white, outline:"none", cursor:"pointer" }}>
          {groups.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ borderRadius:10, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 80px", background:C.navyMid, padding:"10px 16px", gap:12 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.6px" }}>General Input Name</div>
          <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.6px" }}>PI Tag</div>
          <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.6px" }}>Status</div>
        </div>
        <div style={{ maxHeight:380, overflowY:"auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:12 }}>No tags match your search.</div>
          )}
          {filtered.map((tag, i) => {
            const val = data[tag.id] || "";
            const isMapped = val.trim().length > 0;
            return (
              <div key={tag.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 80px", padding:"10px 16px", gap:12, background:i%2===0?C.white:C.offWhite, borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:C.textDark }}>{tag.label}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                    <span style={{ fontSize:9, color:C.muted, background:C.offWhite, border:`1px solid ${C.border}`, borderRadius:20, padding:"1px 7px", fontWeight:600 }}>{tag.group}</span>
                    <span style={{ fontSize:9, color:C.muted }}>{tag.unit}</span>
                  </div>
                </div>
                <input value={val} placeholder="e.g. TI125.PV"
                  onChange={e => onChange({...data, [tag.id]: e.target.value})}
                  style={{ padding:"7px 10px", border:`1.5px solid ${isMapped ? "rgba(22,199,132,0.5)" : C.border}`, borderRadius:6, fontSize:12, fontFamily:font, color:C.textDark, background: isMapped ? "rgba(22,199,132,0.04)" : C.white, outline:"none", width:"100%" }}
                  onFocus={e=>e.target.style.borderColor=C.accent}
                  onBlur={e=>e.target.style.borderColor=isMapped?"rgba(22,199,132,0.5)":C.border}
                />
                <div style={{ display:"flex", justifyContent:"center" }}>
                  {isMapped
                    ? <span style={{ background:"#d1fae5", color:"#065f46", borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700 }}>✓ Set</span>
                    : <span style={{ background:C.offWhite, color:C.muted, borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:600, border:`1px solid ${C.border}` }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!isComplete && <WizSubmitBtn onClick={()=>onSubmit()} label="Submit Data Input & Continue" />}
      {isComplete && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(22,199,132,0.08)", borderRadius:8, border:"1px solid rgba(22,199,132,0.3)", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#065f46" }}>Data Input saved — {mapped.length} of {SAMPLE_TAG_LIST.length} tags mapped</span>
        </div>
      )}
    </WizStepCard>
  );
}

function PlaceholderStep({ stepNum, title, icon, subtitle, description, onSubmit, isComplete, isLast }) {
  return (
    <WizStepCard stepNum={stepNum} title={title} icon={icon} subtitle={subtitle} isComplete={isComplete} onUseDefaults={!isComplete ? ()=>onSubmit() : undefined}>
      <div style={{ padding:"32px 20px", textAlign:"center", background:C.offWhite, borderRadius:10, border:`1.5px dashed ${C.border}` }}>
        <div style={{ fontSize:36, marginBottom:12, opacity:0.5 }}>{icon}</div>
        <div style={{ fontSize:14, fontWeight:700, color:C.textDark, marginBottom:6 }}>{title}</div>
        <div style={{ fontSize:12, color:C.muted, maxWidth:400, margin:"0 auto 20px" }}>{description}</div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:20, padding:"4px 14px", fontSize:11, color:C.orange, fontWeight:600 }}>
          🚧 Coming Soon — Placeholder
        </div>
      </div>
      {!isComplete && (
        <WizSubmitBtn onClick={onSubmit} label={isLast ? "Complete Setup ✓" : "Skip & Continue"} />
      )}
      {isComplete && !isLast && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(22,199,132,0.08)", borderRadius:8, border:"1px solid rgba(22,199,132,0.3)", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#065f46" }}>{title} step completed</span>
        </div>
      )}
      {isComplete && isLast && (
        <div style={{ marginTop:16, padding:"16px 20px", background:"linear-gradient(135deg, rgba(22,199,132,0.1), rgba(0,180,216,0.08))", borderRadius:10, border:"1.5px solid rgba(22,199,132,0.4)", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:28 }}>🎉</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#065f46" }}>All 5 steps completed!</div>
            <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>Your DCU unit is fully configured. Use "Save All Config" to persist your settings.</div>
          </div>
        </div>
      )}
    </WizStepCard>
  );
}

function LockedStep({ stepNum, label, icon, unlocksAfter }) {
  return (
    <div style={{ background:C.white, borderRadius:12, border:`1.5px solid ${C.border}`, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, opacity:0.5 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:C.offWhite, border:`1.5px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, filter:"grayscale(1)" }}>{icon}</div>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>Step {stepNum}</span>
          <span style={{ background:C.offWhite, color:C.muted, borderRadius:20, padding:"1px 8px", fontSize:9, fontWeight:700, border:`1px solid ${C.border}` }}>🔒 LOCKED</span>
        </div>
        <div style={{ fontSize:13, fontWeight:600, color:C.muted }}>{label}</div>
        <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Complete <strong>{unlocksAfter}</strong> to unlock</div>
      </div>
    </div>
  );
}

function DeveloperInfoPage() {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [currentStep,    setCurrentStep]    = useState(1);
  const [saved, setSaved] = useState(false);
  const [assetData, setAssetData] = useState(INITIAL_ASSET);
  const [algoData,  setAlgoData]  = useState(INITIAL_ALGO);
  const [basicData, setBasicData] = useState(INITIAL_BASIC_CONFIG);
  const [dataInput, setDataInput] = useState(INITIAL_DATA_INPUT);

  const completeStep = (stepId) => {
    setCompletedSteps(prev => prev.includes(stepId) ? prev : [...prev, stepId]);
    if (stepId < 5) {
      setCurrentStep(stepId + 1);
      setTimeout(() => {
        const el = document.getElementById(`wiz-step-${stepId + 1}`);
        if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
      }, 120);
    }
  };

  const allDone = completedSteps.length === 5;

  const handleSaveAll = () => {
    const cfg = { asset: assetData, algorithm: algoData };
    console.log("[Developer Info] Config saved:", JSON.stringify(cfg, null, 2));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", fontFamily:font, background:"#FFFFF0" }}>
      <div style={{ background:`linear-gradient(135deg,#003d6b 0%,#005580 100%)`, flexShrink:0 }}>
        <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.white, display:"flex", alignItems:"center", gap:10 }}>
              🛠️ Developer Info — Unit Setup Wizard
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:3 }}>
              Complete all 5 steps sequentially · Each step unlocks the next
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {allDone && (
              <button onClick={handleSaveAll}
                style={{ padding:"9px 20px", borderRadius:8, border:"none", background: saved ? C.green : C.accent, color:C.white, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:font, transition:"background 0.2s", display:"flex", alignItems:"center", gap:6 }}>
                {saved ? "✓ Saved!" : "💾 Save All Config"}
              </button>
            )}
            <div style={{ textAlign:"center", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:9, padding:"8px 16px" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Progress</div>
              <div style={{ fontSize:18, fontWeight:700, color: allDone ? C.green : C.accent }}>{completedSteps.length} / 5</div>
            </div>
          </div>
        </div>
        <WizardProgressBar currentStep={currentStep} completedSteps={completedSteps} />
      </div>
      <div style={{ flex:1, padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
        <div id="wiz-step-1">
          <Step1AssetInfo data={assetData} onChange={setAssetData} onSubmit={()=>completeStep(1)} isComplete={completedSteps.includes(1)} />
        </div>
        <div id="wiz-step-2">
          {completedSteps.includes(1)
            ? <Step2AlgorithmInfo data={algoData} onChange={setAlgoData} onSubmit={()=>completeStep(2)} isComplete={completedSteps.includes(2)} />
            : <LockedStep stepNum={2} label="Algorithm Info" icon="⚙️" unlocksAfter="Asset Info" />}
        </div>
        <div id="wiz-step-3">
          {completedSteps.includes(2)
            ? <Step3BasicConfig data={basicData} onChange={setBasicData} onSubmit={()=>completeStep(3)} isComplete={completedSteps.includes(3)} />
            : <LockedStep stepNum={3} label="Basic Configuration" icon="🔧" unlocksAfter="Algorithm Info" />}
        </div>
        <div id="wiz-step-4">
          {completedSteps.includes(3)
            ? <Step4DataInput data={dataInput} onChange={setDataInput} onSubmit={()=>completeStep(4)} isComplete={completedSteps.includes(4)} />
            : <LockedStep stepNum={4} label="Data Input" icon="📊" unlocksAfter="Basic Configuration" />}
        </div>
        <div id="wiz-step-5">
          {completedSteps.includes(4)
            ? <PlaceholderStep stepNum={5} title="KPI Calculation" icon="📈" subtitle="Define KPI targets, benchmarks and calculation rules" description="Set calculation methodologies for furnace efficiency, energy intensity, fouling indices, and operational targets. Full configuration to be provided." onSubmit={()=>completeStep(5)} isComplete={completedSteps.includes(5)} isLast />
            : <LockedStep stepNum={5} label="KPI Calculation" icon="📈" unlocksAfter="Data Input" />}
        </div>
      </div>
    </div>
  );
}

const CONFIG_FILES=[
  {name:"config",          label:"Config",            icon:"⚙️", desc:"General model configuration parameters"},
  {name:"crudetags",       label:"Crude Tags",         icon:"🏷️", desc:"PI tag mappings for crude feed streams"},
  {name:"desired_hgi",     label:"Desired HGI",        icon:"🎯", desc:"Target HGI setpoints and tolerance bands"},
  {name:"dynamic_tag",     label:"Dynamic Tags",       icon:"🔄", desc:"Dynamic tag definitions for live data"},
  {name:"errorCode",       label:"Error Codes",        icon:"⚠️", desc:"Error / alarm code definitions"},
  {name:"features",        label:"Features",           icon:"📐", desc:"Model feature definitions and scaling"},
  {name:"formulaTags",     label:"Formula Tags",       icon:"🧮", desc:"Calculated / formula tag definitions"},
  {name:"graphics",        label:"Graphics",           icon:"🖼️", desc:"Dashboard graphic element mappings"},
  {name:"lastHgi",         label:"Last HGI",           icon:"📊", desc:"Historical last HGI reference values"},
  {name:"outputTagMapping",label:"Output Tag Mapping", icon:"🔗", desc:"Model output to PI tag mappings"},
];

function CfgFileIcon({ext="csv"}){
  const bg=ext==="xlsx"?"#217346":"#008B6E";
  return(<div style={{width:36,height:36,borderRadius:7,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",letterSpacing:"0.5px",flexShrink:0}}>{ext.toUpperCase()}</div>);
}
function CfgPill({children,color=C.accent}){
  return(<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:color+"22",color}}>{children}</span>);
}
function CfgToast({msg,type,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[msg]);
  const bg=type==="success"?C.green:type==="error"?C.red:C.accent;
  return(<div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:bg,color:"#fff",borderRadius:10,padding:"12px 20px",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",gap:10,animation:"slideInToast 0.25s cubic-bezier(.4,0,.2,1)",fontFamily:font}}><span>{type==="success"?"✓":type==="error"?"✕":"ℹ"}</span>{msg}</div>);
}
function CfgEditableCell({value,onChange}){
  const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(value);const inputRef=useRef(null);
  const commit=()=>{setEditing(false);if(draft!==value)onChange(draft);};
  useEffect(()=>{if(editing)inputRef.current?.focus();},[editing]);
  if(editing){return(<input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setDraft(value);setEditing(false);}}} style={{width:"100%",border:`1.5px solid ${C.accent}`,borderRadius:4,padding:"3px 6px",fontSize:12,fontFamily:font,outline:"none",background:"#e0f7ff",color:C.textDark,boxSizing:"border-box"}}/>);}
  return(<div onClick={()=>{setDraft(value);setEditing(true);}} title="Click to edit" style={{padding:"3px 6px",borderRadius:4,cursor:"text",fontSize:12,color:value===""?C.muted:C.textDark,minHeight:24,display:"flex",alignItems:"center",border:"1.5px solid transparent",transition:"background 0.12s,border-color 0.12s"}} onMouseEnter={e=>{e.currentTarget.style.background="#f0fbff";e.currentTarget.style.borderColor=C.border;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>{value===""?<span style={{color:C.muted,fontStyle:"italic",fontSize:11}}>empty</span>:value}</div>);
}
function CfgSheetGrid({columns,rows,onCellChange,onAddRow,onDeleteRow}){
  const COL_W=160;
  return(<div style={{overflowX:"auto",overflowY:"auto",flex:1,borderRadius:8,border:`1px solid ${C.border}`}}><table style={{borderCollapse:"collapse",minWidth:columns.length*COL_W+50,width:"100%"}}><thead><tr style={{background:C.navyMid,position:"sticky",top:0,zIndex:2}}><th style={{width:42,padding:"8px 6px",borderRight:`1px solid rgba(255,255,255,0.08)`,fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:600}}>#</th>{columns.map((col,ci)=>(<th key={ci} style={{padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:"0.6px",borderRight:`1px solid rgba(255,255,255,0.08)`,minWidth:COL_W,whiteSpace:"nowrap"}}>{col}</th>))}<th style={{width:44,padding:"8px",fontSize:10,color:"rgba(255,255,255,0.4)"}}>✕</th></tr></thead><tbody>{rows.map((row,ri)=>(<tr key={ri} style={{borderBottom:`1px solid ${C.border}`,background:ri%2===0?C.white:C.offWhite}}><td style={{textAlign:"center",fontSize:10,color:C.muted,padding:"4px 6px",borderRight:`1px solid ${C.border}`,fontWeight:600}}>{ri+1}</td>{columns.map((_,ci)=>(<td key={ci} style={{padding:"2px 4px",borderRight:`1px solid ${C.border}`,minWidth:COL_W}}><CfgEditableCell value={row[ci]??""} onChange={val=>onCellChange(ri,ci,val)}/></td>))}<td style={{textAlign:"center",padding:"4px"}}><button onClick={()=>onDeleteRow(ri)} title="Delete row" style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:14,lineHeight:1,padding:"2px 6px",borderRadius:4,transition:"color 0.12s,background 0.12s"}} onMouseEnter={e=>{e.currentTarget.style.color=C.red;e.currentTarget.style.background="#fee2e2";}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.background="none";}}>✕</button></td></tr>))}<tr><td colSpan={columns.length+2} style={{padding:"6px 8px"}}><button onClick={onAddRow} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1.5px dashed ${C.border}`,color:C.accent,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:6,cursor:"pointer",width:"100%",justifyContent:"center",transition:"border-color 0.15s,background 0.15s",fontFamily:font}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background="#e0f7ff";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="none";}}>+ Add Row</button></td></tr></tbody></table></div>);
}
function ConfigurationsPage(){
  const[fileList,setFileList]=useState([]);const[selected,setSelected]=useState(null);const[configData,setConfigData]=useState(null);const[activeSheet,setActiveSheet]=useState("");const[editedRows,setEditedRows]=useState({});const[dirty,setDirty]=useState(false);const[loading,setLoading]=useState(false);const[saving,setSaving]=useState(false);const[toast,setToast]=useState(null);const[search,setSearch]=useState("");
  useEffect(()=>{axios.get(`${API}/config/list`).then(r=>setFileList(r.data.files??[])).catch(()=>setFileList([]));},[]);
  const loadConfig=useCallback(async(key)=>{setLoading(true);setDirty(false);setEditedRows({});try{const r=await axios.get(`${API}/config/${key}`);setConfigData(r.data);setActiveSheet(r.data.active_sheet);}catch(e){setToast({msg:`Failed to load ${key}: ${e?.response?.data?.detail??e.message}`,type:"error"});}finally{setLoading(false);}},[]);
  const selectFile=(key)=>{if(dirty&&!window.confirm("You have unsaved changes. Discard and switch?"))return;setSelected(key);loadConfig(key);};
  const currentSheet=configData?.sheets?.[activeSheet];const columns=currentSheet?.columns??[];const rows=editedRows[activeSheet]??currentSheet?.rows??[];
  const handleCellChange=(ri,ci,val)=>{setEditedRows(prev=>{const base=prev[activeSheet]??currentSheet?.rows?.map(r=>[...r])??[];const next=base.map(r=>[...r]);if(!next[ri])next[ri]=[];next[ri][ci]=val;return{...prev,[activeSheet]:next};});setDirty(true);};
  const handleAddRow=()=>{setEditedRows(prev=>{const base=prev[activeSheet]??currentSheet?.rows?.map(r=>[...r])??[];return{...prev,[activeSheet]:[...base,columns.map(()=>"")]};});setDirty(true);};
  const handleDeleteRow=(ri)=>{setEditedRows(prev=>{const base=prev[activeSheet]??currentSheet?.rows?.map(r=>[...r])??[];return{...prev,[activeSheet]:base.filter((_,i)=>i!==ri)};});setDirty(true);};
  const handleSave=async()=>{if(!selected||!activeSheet)return;setSaving(true);try{await axios.post(`${API}/config/${selected}/save`,{sheet:activeSheet,columns,rows});setDirty(false);setToast({msg:`${configData.label} saved successfully!`,type:"success"});await loadConfig(selected);}catch(e){setToast({msg:`Save failed: ${e?.response?.data?.detail??e.message}`,type:"error"});}finally{setSaving(false);}};
  const handleDiscard=()=>{setEditedRows({});setDirty(false);};
  const filteredFiles=fileList.filter(f=>f.label.toLowerCase().includes(search.toLowerCase())||f.key.toLowerCase().includes(search.toLowerCase()));
  return(<><div style={{flex:1,display:"flex",overflow:"hidden",fontFamily:font,background:C.offWhite}}><div style={{width:240,flexShrink:0,background:C.white,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column"}}><div style={{padding:"14px 14px 10px",borderBottom:`2px solid ${C.border}`}}><div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>Config Files</div><input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"6px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,fontFamily:font,outline:"none",color:C.textDark,boxSizing:"border-box"}}/></div><div style={{overflowY:"auto",flex:1}}>{filteredFiles.length===0&&(<div style={{padding:20,textAlign:"center",color:C.muted,fontSize:12}}>{fileList.length===0?"Cannot reach API — check FastAPI is running":"No files match."}</div>)}{filteredFiles.map(f=>(<div key={f.key} className={`cfg-file-row${selected===f.key?" cfg-active":""}`} onClick={()=>selectFile(f.key)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,background:selected===f.key?"#e0f7ff":C.white,borderLeft:`3px solid ${selected===f.key?C.accent:"transparent"}`}}><CfgFileIcon ext={f.ext||"csv"}/><div style={{minWidth:0,flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.textDark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.label}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{f.key}.{f.ext||"csv"} · {f.size_kb<1?`${Math.round(f.size_kb*1024)} B`:`${f.size_kb} KB`}</div></div>{!f.exists&&<span style={{fontSize:9,color:C.red,fontWeight:700}}>MISSING</span>}</div>))}</div><div style={{padding:"8px 14px",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.muted}}>{fileList.filter(f=>f.exists).length} of {fileList.length} files found</div></div><div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>{!selected&&(<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:C.muted}}><div style={{fontSize:48,opacity:0.3}}>📂</div><div style={{fontSize:14,fontWeight:600}}>Select a config file to view and edit</div><div style={{fontSize:12}}>Choose from the panel on the left</div></div>)}{selected&&loading&&(<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:12,color:C.muted}}><div style={{width:28,height:28,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin2 0.7s linear infinite"}}/>Loading…</div>)}{selected&&!loading&&configData&&(<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{padding:"10px 18px",background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexShrink:0}}><div><div style={{fontSize:14,fontWeight:700,color:C.textDark,display:"flex",alignItems:"center",gap:8}}><CfgFileIcon ext={configData.ext||"csv"}/><div>{configData.label}{dirty&&<span style={{marginLeft:8,fontSize:10,color:C.orange,fontWeight:700,background:"#fef3c7",padding:"1px 7px",borderRadius:10}}>UNSAVED</span>}</div></div><div style={{fontSize:10,color:C.muted,marginTop:3,marginLeft:46}}>{configData.key}.{configData.ext||"csv"} · {rows.length} rows · {columns.length} columns</div></div><div style={{display:"flex",gap:8,alignItems:"center"}}>{dirty&&(<button onClick={handleDiscard} style={{padding:"7px 14px",borderRadius:6,border:`1px solid ${C.border}`,background:C.white,color:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>Discard</button>)}<button onClick={handleSave} disabled={!dirty||saving} style={{padding:"7px 18px",borderRadius:6,border:"none",background:dirty?C.accent:C.border,color:dirty?C.white:C.muted,fontSize:12,fontWeight:700,cursor:dirty?"pointer":"default",fontFamily:font,display:"flex",alignItems:"center",gap:6,transition:"background 0.15s"}}>{saving?<><div style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin2 0.7s linear infinite"}}/>Saving…</>:"💾 Save Changes"}</button><button onClick={()=>loadConfig(selected)} title="Reload from disk" style={{padding:"7px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.white,color:C.muted,fontSize:14,cursor:"pointer"}}>↺</button></div></div>{Object.keys(configData.sheets).length>1&&(<div style={{padding:"8px 18px 0",background:C.offWhite,borderBottom:`1px solid ${C.border}`,display:"flex",gap:4,flexShrink:0}}>{Object.keys(configData.sheets).map(sh=>(<div key={sh} className={`cfg-sheet-tab${activeSheet===sh?" cfg-tab-active":""}`} onClick={()=>setActiveSheet(sh)}>{sh}{editedRows[sh]?<span style={{marginLeft:5,color:C.orange,fontSize:9}}>●</span>:null}</div>))}</div>)}<div style={{padding:"6px 18px",background:C.offWhite,borderBottom:`1px solid ${C.border}`,display:"flex",gap:12,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}><CfgPill color={C.accent}>📄 {activeSheet}</CfgPill><CfgPill color={C.teal}>{rows.length} rows</CfgPill><CfgPill color={C.green}>{columns.length} columns</CfgPill>{dirty&&<CfgPill color={C.orange}>⚠ Unsaved changes</CfgPill>}<div style={{marginLeft:"auto",fontSize:10,color:C.muted}}>Click any cell to edit · + Add Row to append · ✕ to delete a row</div></div><div style={{flex:1,overflow:"hidden",padding:14,display:"flex",flexDirection:"column"}}>{columns.length===0?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>Empty sheet — no columns found.</div>:<CfgSheetGrid columns={columns} rows={rows} onCellChange={handleCellChange} onAddRow={handleAddRow} onDeleteRow={handleDeleteRow}/>}</div></div>)}</div></div>{toast&&<CfgToast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}</>);
}

const MAX_TREND_PARAMS = 8;
const MAX_PER_SIDE     = 4;
const AXIS_SLOT_W      = 54;
const FIXED_L_MARGIN   = MAX_PER_SIDE * AXIS_SLOT_W;
const FIXED_R_MARGIN   = MAX_PER_SIDE * AXIS_SLOT_W;

const TIME_WINDOWS=["1W","1M","2M","3M","6M","1Y"];

function MonitoringTooltip({active,payload,label,selectedKeys,sortedData}){
  if(!active||!payload||!payload.length)return null;
  const timeRow=sortedData?.find(r=>r.time===label)||{};
  return(
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:11,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:190}}>
      <div style={{color:C.muted,marginBottom:6,fontSize:10,fontWeight:600}}>{new Date(label).toLocaleString()}</div>
      {selectedKeys.map((key,i)=>{
        const p=ALL_PARAMS.find(x=>x.key===key);
        const actual=timeRow[key];
        return(
          <div key={key} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:TREND_COLORS[i%TREND_COLORS.length],flexShrink:0}}/>
            <span style={{color:C.textMid,flex:1,fontSize:10}}>{p?.label??key}</span>
            <span style={{fontWeight:700,color:C.textDark}}>
              {typeof actual==="number"?actual.toFixed(2):(actual??"—")}
              {p?.unit?<span style={{fontWeight:400,color:C.muted,marginLeft:3,fontSize:9}}>{p.unit}</span>:null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildHistogramData(sorted, key, bins=20){
  const vals=sorted.map(r=>r[key]).filter(v=>typeof v==="number"&&isFinite(v));
  if(!vals.length)return[];
  const mn=Math.min(...vals), mx=Math.max(...vals);
  const step=(mx-mn)/bins||1;
  const counts=Array.from({length:bins},(_,i)=>({bin:`${(mn+i*step).toFixed(1)}`,binMid:+(mn+(i+0.5)*step).toFixed(3),count:0}));
  vals.forEach(v=>{const idx=Math.min(bins-1,Math.floor((v-mn)/step));counts[idx].count++;});
  return counts;
}

function buildXYData(sorted, xKey, yKey, colorKey=""){
  return sorted.map(r=>({x:r[xKey],y:r[yKey],c:colorKey?r[colorKey]:null,time:r.time}))
    .filter(r=>typeof r.x==="number"&&typeof r.y==="number"&&isFinite(r.x)&&isFinite(r.y));
}

function buildOutlierData(sorted, key){
  const pts=sorted
    .map((r,i)=>({time:r.time,value:r[key],idx:i}))
    .filter(r=>typeof r.value==="number"&&isFinite(r.value));
  if(pts.length<4) return{inliers:pts.map(r=>({...r,isOutlier:false})),outliers:[],q1:0,q3:0,iqr:0,lower:0,upper:0,outlierCount:0,total:pts.length};
  const asc=[...pts].sort((a,b)=>a.value-b.value);
  const n=asc.length;
  const q1=asc[Math.floor(n*0.25)].value;
  const q3=asc[Math.floor(n*0.75)].value;
  const iqr=q3-q1;
  const lower=q1-1.5*iqr;
  const upper=q3+1.5*iqr;
  const inliers=[],outliers=[];
  pts.forEach(r=>{
    if(r.value<lower||r.value>upper) outliers.push(r);
    else inliers.push(r);
  });
  return{inliers,outliers,q1,q3,iqr,lower,upper,outlierCount:outliers.length,total:pts.length};
}

function gaussElim(A,b){
  const n=b.length;const M=A.map((row,i)=>[...row,b[i]]);
  for(let col=0;col<n;col++){
    let mx=col;
    for(let r=col+1;r<n;r++)if(Math.abs(M[r][col])>Math.abs(M[mx][col]))mx=r;
    [M[col],M[mx]]=[M[mx],M[col]];
    if(Math.abs(M[col][col])<1e-12)continue;
    for(let r=col+1;r<n;r++){const f=M[r][col]/M[col][col];for(let k=col;k<=n;k++)M[r][k]-=f*M[col][k];}
  }
  const x=Array(n).fill(0);
  for(let i=n-1;i>=0;i--){x[i]=M[i][n]/M[i][i];for(let j=i-1;j>=0;j--)M[j][n]-=M[j][i]*x[i];}
  return x;
}
function polyFit(xs,ys,degree){
  const d=degree+1;
  const ATA=Array.from({length:d},()=>Array(d).fill(0));
  const ATb=Array(d).fill(0);
  xs.forEach((x,i)=>{
    const row=Array.from({length:d},(_,j)=>Math.pow(x,j));
    for(let j=0;j<d;j++){ATb[j]+=row[j]*ys[i];for(let k=0;k<d;k++)ATA[j][k]+=row[j]*row[k];}
  });
  return gaussElim(ATA,ATb);
}
function evalPoly(coeffs,x){return coeffs.reduce((s,c,i)=>s+c*Math.pow(x,i),0);}

function buildForecastData(sorted,key,inputWindow,forecastHorizon,method){
  const pts=sorted
    .map(r=>({time:new Date(r.time).getTime(),value:r[key]}))
    .filter(r=>typeof r.value==="number"&&isFinite(r.value));
  if(pts.length<3)return{chartData:[],forecastStart:null,r2:null,avgDt:0};
  const winSize=Math.min(inputWindow,pts.length);
  const inputPts=pts.slice(-winSize);
  const N=winSize-1||1;
  const xs=inputPts.map((_,i)=>i/N);
  const ys=inputPts.map(p=>p.value);
  const avgDt=winSize>1?(inputPts[winSize-1].time-inputPts[0].time)/(winSize-1):60000;

  let predictFn,r2=null;
  if(method==="linear"||method==="poly2"||method==="poly3"){
    const deg=method==="linear"?1:method==="poly2"?2:3;
    const eDeg=Math.min(deg,winSize-1);
    const coeffs=polyFit(xs,ys,eDeg);
    predictFn=x=>evalPoly(coeffs,x);
    const yMean=ys.reduce((s,v)=>s+v,0)/ys.length;
    const ssTot=ys.reduce((s,v)=>s+(v-yMean)**2,0);
    const ssRes=xs.reduce((s,x,i)=>s+(ys[i]-predictFn(x))**2,0);
    r2=ssTot>1e-10?Math.max(0,1-ssRes/ssTot):1;
  }else if(method==="movavg"){
    const maN=Math.max(2,Math.min(5,Math.floor(winSize/3)));
    const maXs=[],maYs=[];
    for(let i=maN-1;i<ys.length;i++){maXs.push(xs[i]);maYs.push(ys.slice(i-maN+1,i+1).reduce((s,v)=>s+v,0)/maN);}
    const mCoeffs=polyFit(maXs,maYs,1);
    predictFn=x=>evalPoly(mCoeffs,x);
  }else{
    let s=ys[0],b=ys.length>1?(ys[ys.length-1]-ys[0])/(ys.length-1):0;
    ys.forEach((v,i)=>{if(i>0){const ps=s;s=0.3*v+0.7*(s+b);b=0.1*(s-ps)+0.9*b;}});
    const lastX=xs[xs.length-1];
    predictFn=x=>s+b*(x-lastX)*(N);
  }

  const inputStartIdx=pts.length-winSize;
  const chartData=pts.map(p=>({time:p.time,actual:p.value,forecast:null,fitted:null}));
  inputPts.forEach((_,i)=>{chartData[inputStartIdx+i].fitted=+predictFn(i/N).toFixed(3);});
  const lastIdx=pts.length-1;
  chartData[lastIdx].forecast=chartData[lastIdx].fitted;
  const lastTime=pts[lastIdx].time;
  for(let f=1;f<=forecastHorizon;f++){
    chartData.push({time:lastTime+avgDt*f,actual:null,forecast:+predictFn((winSize-1+f)/N).toFixed(3),fitted:null});
  }
  return{chartData,forecastStart:lastTime,r2:r2!==null?+r2.toFixed(4):null,avgDt};
}

function heatColor(t){
  const f=Math.max(0,Math.min(1,t));
  const stops=[[0,[59,130,246]],[0.33,[0,201,177]],[0.66,[245,158,11]],[1,[239,68,68]]];
  let i=0;
  while(i<stops.length-2&&f>stops[i+1][0])i++;
  const[t0,c0]=stops[i];const[t1,c1]=stops[i+1];
  const r2=(f-t0)/(t1-t0);
  const lerp=(a,b)=>Math.round(a+(b-a)*r2);
  return`rgb(${lerp(c0[0],c1[0])},${lerp(c0[1],c1[1])},${lerp(c0[2],c1[2])})`;
}

function MonitoringPage({trend,latest}){
  const[selectedKeys,setSelectedKeys]=useState(["furnacecharge"]);
  const[timeWindow,setTimeWindow]=useState("1W");
  const[filterText,setFilterText]=useState("");
  const[filterCat,setFilterCat]=useState("ALL");
  const[chartType,setChartType]=useState("trend");
  const[xyX,setXyX]=useState("");
  const[xyY,setXyY]=useState("");
  const[xyColor,setXyColor]=useState("");
  const zoom=useZoom();
  const sorted=useMemo(()=>sortTrend(trend),[trend]);
  const categories=["ALL",...Array.from(new Set(ALL_PARAMS.map(p=>p.category)))];
  const filteredParams=ALL_PARAMS.filter(p=>{
    const matchCat=filterCat==="ALL"||p.category===filterCat;
    const matchText=p.label.toLowerCase().includes(filterText.toLowerCase());
    return matchCat&&matchText;
  });
  const toggleKey=key=>{setSelectedKeys(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);};
  const axisConfigs=useMemo(()=>selectedKeys.map((key,i)=>{
    const domain=computeDomain(sorted,key);const w=axisWidth(domain);
    const unit=ALL_PARAMS.find(x=>x.key===key)?.unit||"";
    return{key,domain,w,unit,color:TREND_COLORS[i%TREND_COLORS.length]};
  }),[sorted,selectedKeys]);
  const chartData=useMemo(()=>applyZoomSlice(sorted,zoom.zoomRange),[sorted,zoom.zoomRange]);
  const xKeyVal=xyX&&selectedKeys.includes(xyX)?xyX:(selectedKeys[0]||"");
  const yKeyVal=xyY&&selectedKeys.includes(xyY)?xyY:(selectedKeys[1]||selectedKeys[0]||"");
  const colorKeyVal=xyColor||"";
  const histKey=selectedKeys[0];
  const histData=useMemo(()=>histKey?buildHistogramData(chartData,histKey,20):[],[chartData,histKey]);
  const xyData=useMemo(()=>xKeyVal&&yKeyVal?buildXYData(chartData,xKeyVal,yKeyVal,colorKeyVal):[],[chartData,xKeyVal,yKeyVal,colorKeyVal]);
  const colorRange=useMemo(()=>{
    if(!colorKeyVal||!xyData.length)return{min:0,max:1};
    const vals=xyData.map(r=>r.c).filter(v=>typeof v==="number"&&isFinite(v));
    if(!vals.length)return{min:0,max:1};
    const mn=Math.min(...vals),mx=Math.max(...vals);
    return{min:mn,max:mx===mn?mn+1:mx};
  },[xyData,colorKeyVal]);
  const[forecastInputWindow,setForecastInputWindow]=useState(20);
  const[forecastHorizon,setForecastHorizon]=useState(10);
  const[forecastMethod,setForecastMethod]=useState("linear");
  const chartTypeTabs=[{key:"trend",icon:"📈",label:"Trend"},{key:"histogram",icon:"📊",label:"Histogram"},{key:"xy",icon:"🔵",label:"X vs Y"},{key:"outlier",icon:"🔴",label:"Outlier"},{key:"forecast",icon:"🔮",label:"Custom Forecast"}];
  const needsTwo=chartType==="xy"&&selectedKeys.length<2;
  const outlierKey=selectedKeys[0]||"";
  const outlierData=useMemo(()=>outlierKey?buildOutlierData(chartData,outlierKey):{inliers:[],outliers:[],q1:0,q3:0,iqr:0,lower:0,upper:0,outlierCount:0,total:0},[chartData,outlierKey]);
  const forecastKey=selectedKeys[0]||"";
  const forecastResult=useMemo(()=>forecastKey&&chartType==="forecast"?buildForecastData(sorted,forecastKey,forecastInputWindow,forecastHorizon,forecastMethod):{chartData:[],forecastStart:null,r2:null},[sorted,forecastKey,forecastInputWindow,forecastHorizon,forecastMethod,chartType]);

  return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12,background:"#FFFFF0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.textDark,textTransform:"uppercase",letterSpacing:"0.4px"}}>Process Monitoring</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>Trend · Histogram · X vs Y · Outlier · Custom Forecast — select up to 8 parameters</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {TIME_WINDOWS.map(tw=>(<button key={tw} className={`time-btn${timeWindow===tw?" active":""}`} onClick={()=>setTimeWindow(tw)}>{tw}</button>))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:12,flex:1,minHeight:500}}>
        <div style={{background:C.white,borderRadius:8,padding:12,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:10,borderBottom:`2px solid ${C.border}`}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px"}}>{chartType==="trend"?"TREND CHART":chartType==="histogram"?"DISTRIBUTION (HISTOGRAM)":chartType==="outlier"?"OUTLIER ANALYSIS (BOX & WHISKER)":chartType==="forecast"?"CUSTOM FORECAST":"X vs Y SCATTER"}</div>
              {chartType==="trend"&&selectedKeys.length>1&&(<div style={{fontSize:9,color:C.muted,marginTop:2}}>Each parameter has its own Y-axis</div>)}
            </div>
            <div style={{display:"flex",background:C.offWhite,borderRadius:7,padding:3,gap:2}}>
              {chartTypeTabs.map(t=>(<button key={t.key} onClick={()=>setChartType(t.key)} style={{padding:"4px 10px",borderRadius:5,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,display:"flex",alignItems:"center",gap:4,background:chartType===t.key?C.accent:"transparent",color:chartType===t.key?C.white:C.muted,transition:"all 0.15s"}}>{t.icon} {t.label}</button>))}
            </div>
          </div>
          {chartType==="xy"&&selectedKeys.length>=2&&(
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:9,fontWeight:700,color:C.white,background:C.accent,padding:"2px 7px",borderRadius:4,letterSpacing:"0.4px"}}>X</span>
                <select value={xKeyVal} onChange={e=>setXyX(e.target.value)} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white,minWidth:130}}>
                  {selectedKeys.map(k=>{const p=ALL_PARAMS.find(x=>x.key===k);return<option key={k} value={k}>{p?.label??k}{p?.unit?` (${p.unit})`:""}</option>;})}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:9,fontWeight:700,color:C.white,background:C.teal,padding:"2px 7px",borderRadius:4,letterSpacing:"0.4px"}}>Y</span>
                <select value={yKeyVal} onChange={e=>setXyY(e.target.value)} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white,minWidth:130}}>
                  {selectedKeys.map(k=>{const p=ALL_PARAMS.find(x=>x.key===k);return<option key={k} value={k}>{p?.label??k}{p?.unit?` (${p.unit})`:""}</option>;})}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:9,fontWeight:700,color:C.white,background:"linear-gradient(90deg,#3b82f6,#00c9b1,#f59e0b,#ef4444)",padding:"2px 7px",borderRadius:4,letterSpacing:"0.4px"}}>🎨 COLOR</span>
                <select value={colorKeyVal} onChange={e=>setXyColor(e.target.value)} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white,minWidth:150}}>
                  <option value="">— None (single colour) —</option>
                  {ALL_PARAMS.map(p=><option key={p.key} value={p.key}>{p.label}{p.unit?` (${p.unit})`:""}</option>)}
                </select>
              </div>
              <span style={{fontSize:10,color:C.muted,marginLeft:4}}>{xyData.length} pts</span>
            </div>
          )}
          {chartType==="histogram"&&selectedKeys.length>1&&(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:10,color:C.muted,fontWeight:600}}>PARAMETER:</span>
              <select value={histKey} onChange={e=>setSelectedKeys(prev=>[e.target.value,...prev.filter(k=>k!==e.target.value)])} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white}}>
                {selectedKeys.map(k=>{const p=ALL_PARAMS.find(x=>x.key===k);return<option key={k} value={k}>{p?.label??k}</option>;})}
              </select>
              <span style={{fontSize:10,color:C.muted}}>Showing distribution of first selected</span>
            </div>
          )}
          {chartType==="outlier"&&selectedKeys.length>1&&(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:10,color:C.muted,fontWeight:600}}>PARAMETER:</span>
              <select value={outlierKey} onChange={e=>setSelectedKeys(prev=>[e.target.value,...prev.filter(k=>k!==e.target.value)])} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white}}>
                {selectedKeys.map(k=>{const p=ALL_PARAMS.find(x=>x.key===k);return<option key={k} value={k}>{p?.label??k}</option>;})}
              </select>
              <span style={{fontSize:10,color:C.muted}}>Showing outliers of first selected</span>
            </div>
          )}
          {chartType==="forecast"&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              {selectedKeys.length>0&&(
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Parameter</span>
                  <select value={forecastKey} onChange={e=>setSelectedKeys(prev=>[e.target.value,...prev.filter(k=>k!==e.target.value)])} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white}}>
                    {selectedKeys.map(k=>{const p=ALL_PARAMS.find(x=>x.key===k);return<option key={k} value={k}>{p?.label??k}</option>;})}
                  </select>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Input Window (pts)</span>
                <input type="number" min={5} max={500} value={forecastInputWindow}
                  onChange={e=>setForecastInputWindow(Math.max(5,Math.min(500,Number(e.target.value)||20)))}
                  style={{width:80,padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Forecast Horizon (pts)</span>
                <input type="number" min={1} max={200} value={forecastHorizon}
                  onChange={e=>setForecastHorizon(Math.max(1,Math.min(200,Number(e.target.value)||10)))}
                  style={{width:80,padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Forecast Method</span>
                <select value={forecastMethod} onChange={e=>setForecastMethod(e.target.value)} style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font,background:C.white,cursor:"pointer"}}>
                  <option value="linear">Linear Regression</option>
                  <option value="poly2">Polynomial (2°)</option>
                  <option value="poly3">Polynomial (3°)</option>
                  <option value="movavg">Moving Average</option>
                  <option value="expsmooth">Exponential Smoothing</option>
                </select>
              </div>
              {forecastResult.r2!==null&&(
                <div style={{display:"flex",flexDirection:"column",gap:3,marginLeft:8}}>
                  <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>R² (Fit Quality)</span>
                  <span style={{fontSize:14,fontWeight:700,color:forecastResult.r2>0.9?C.green:forecastResult.r2>0.7?C.orange:C.red,lineHeight:"28px"}}>{forecastResult.r2.toFixed(3)}</span>
                </div>
              )}
            </div>
          )}
          {chartType==="trend"&&selectedKeys.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {axisConfigs.map((ac)=>{
                const p=ALL_PARAMS.find(x=>x.key===ac.key);
                const{min:mn,max:mx}=getMinMax(sorted,ac.key);
                return(
                  <div key={ac.key} style={{display:"flex",alignItems:"center",gap:5,background:C.offWhite,borderRadius:20,padding:"3px 10px 3px 8px",fontSize:10,fontWeight:500,color:C.textMid,border:`1px solid ${ac.color}22`}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:ac.color,flexShrink:0}}/>
                    {p?.label??ac.key}{ac.unit?` (${ac.unit})`:""}
                    <span style={{fontSize:9,color:C.muted,marginLeft:3}}>[{mn.toFixed(1)}–{mx.toFixed(1)}]</span>
                    <span onClick={()=>toggleKey(ac.key)} style={{marginLeft:3,cursor:"pointer",color:C.muted,fontSize:12,fontWeight:700,lineHeight:1}}>×</span>
                  </div>
                );
              })}
            </div>
          )}
          {chartType==="trend"&&<ZoomBar isZoomed={zoom.isZoomed} zoomPct={zoom.zoomPct} resetZoom={zoom.resetZoom}/>}
          {selectedKeys.length===0?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13,textAlign:"center",padding:40,flexDirection:"column",gap:8}}>
              <div style={{fontSize:28}}>☑</div>Select one or more parameters from the table on the right.
            </div>
          ):chartType==="trend"?(
            <div {...zoom.wrapProps} style={{flex:1,minHeight:350}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{top:8,right:16,left:0,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="time" tick={{fontSize:9,fill:C.muted}} tickFormatter={fmtTime} interval="preserveStartEnd"/>
                  {axisConfigs.map((ac)=>(<YAxis key={ac.key} yAxisId={ac.key} orientation="left" width={ac.w} tick={{fontSize:8,fill:ac.color}} domain={ac.domain} tickFormatter={v=>typeof v==="number"?v.toFixed(0):v} label={ac.unit?{value:ac.unit,angle:-90,position:"insideLeft",style:{fontSize:7,fill:ac.color,fontWeight:600}}:undefined}/>))}
                  <Tooltip content={<MonitoringTooltip selectedKeys={selectedKeys} sortedData={chartData}/>}/>
                  <Legend formatter={value=>{const p=ALL_PARAMS.find(x=>x.key===value);return<span style={{fontSize:10,color:C.textMid}}>{p?.label??value}</span>;}}/>
                  {axisConfigs.map((ac)=>(<Line key={ac.key} yAxisId={ac.key} type="monotone" dataKey={ac.key} stroke={ac.color} strokeWidth={2.5} dot={false} name={ac.key} isAnimationActive={false} activeDot={{r:4,fill:ac.color}}/>))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ):chartType==="histogram"?(
            <div style={{flex:1,minHeight:350}}>
              {histData.length===0?(<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12}}>No data</div>):(
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histData} margin={{top:8,right:16,left:8,bottom:24}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="bin" tick={{fontSize:8,fill:C.muted}} label={{value:`${ALL_PARAMS.find(x=>x.key===histKey)?.label??histKey} ${ALL_PARAMS.find(x=>x.key===histKey)?.unit?"("+ALL_PARAMS.find(x=>x.key===histKey)?.unit+")":""}`,offset:-10,position:"insideBottom",style:{fontSize:9,fill:C.muted}}} interval={Math.ceil(histData.length/8)}/>
                    <YAxis tick={{fontSize:9,fill:C.muted}} label={{value:"Frequency",angle:-90,position:"insideLeft",style:{fontSize:9,fill:C.muted}}}/>
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={(v,n,props)=>[`${v} observations`,`Bin: ${props.payload?.bin} ${ALL_PARAMS.find(x=>x.key===histKey)?.unit||""}`]}/>
                    <Bar dataKey="count" name="Frequency" radius={[3,3,0,0]} isAnimationActive={false}>
                      {histData.map((_,i)=>(<Cell key={i} fill={`hsl(${190+i*(160/histData.length)},70%,${50+i*(15/histData.length)}%)`}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {histKey&&(()=>{
                const{min:mn,max:mx}=getMinMax(chartData,histKey);
                const vals=chartData.map(r=>r[histKey]).filter(v=>typeof v==="number"&&isFinite(v));
                const mean=vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0;
                const sorted2=[...vals].sort((a,b)=>a-b);
                const median=sorted2.length?sorted2[Math.floor(sorted2.length/2)]:0;
                const std=Math.sqrt(vals.length?vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length:0);
                return(<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginTop:8}}>{[["Min",mn],["Max",mx],["Mean",mean],["Median",median],["Std Dev",std]].map(([lbl,val])=>(<div key={lbl} style={{textAlign:"center",background:C.offWhite,borderRadius:6,padding:"6px 4px"}}><div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase"}}>{lbl}</div><div style={{fontSize:13,fontWeight:700,color:C.accent}}>{typeof val==="number"?val.toFixed(2):"—"}</div></div>))}</div>);
              })()}
            </div>
          ):chartType==="outlier"?(
            !outlierKey?(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13,textAlign:"center",padding:40,flexDirection:"column",gap:8}}>
                <div style={{fontSize:28}}>🔴</div>Select a parameter from the table to analyse outliers.
              </div>
            ):(
              <div style={{flex:1,minHeight:350,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  {[
                    {label:"Q1",val:outlierData.q1,color:C.accent},
                    {label:"Q3",val:outlierData.q3,color:C.accent},
                    {label:"IQR",val:outlierData.iqr,color:C.teal},
                    {label:"Lower Fence",val:outlierData.lower,color:C.green},
                    {label:"Upper Fence",val:outlierData.upper,color:C.orange},
                    {label:"Outliers",val:outlierData.outlierCount,color:C.red,isCount:true},
                  ].map(({label,val,color,isCount})=>(
                    <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",background:C.offWhite,borderRadius:6,padding:"5px 10px",minWidth:72}}>
                      <div style={{fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
                      <div style={{fontSize:12,fontWeight:700,color,marginTop:2}}>{typeof val==="number"?isCount?val:val.toFixed(2):"—"}</div>
                    </div>
                  ))}
                  <div style={{marginLeft:"auto",fontSize:10,color:C.muted}}>
                    <span style={{color:C.red,fontWeight:700}}>{outlierData.outlierCount}</span> outlier{outlierData.outlierCount!==1?"s":""} / <span style={{fontWeight:600}}>{outlierData.total}</span> pts
                    {outlierData.total>0&&<span style={{marginLeft:4,color:C.orange}}>({((outlierData.outlierCount/outlierData.total)*100).toFixed(1)}%)</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",fontSize:10}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:"50%",background:C.green,display:"inline-block"}}/><span style={{color:C.textMid}}>Inlier</span></span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:"50%",background:C.red,display:"inline-block"}}/><span style={{color:C.textMid}}>Outlier</span></span>
                  <span style={{color:C.muted,fontSize:9}}>· Fences: Q1−1.5×IQR &amp; Q3+1.5×IQR</span>
                </div>
                <div style={{flex:1,minHeight:260}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{top:8,right:20,left:axisWidth(computeDomain(chartData,outlierKey))+4,bottom:24}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="time" type="number" name="Time" scale="time"
                        domain={["auto","auto"]}
                        tick={{fontSize:9,fill:C.muted}}
                        tickFormatter={v=>fmtTime(new Date(v))}
                        label={{value:"Time",offset:-12,position:"insideBottom",style:{fontSize:9,fill:C.muted}}}/>
                      <YAxis dataKey="value" type="number" name={outlierKey}
                        tick={{fontSize:9,fill:C.muted}}
                        width={axisWidth(computeDomain(chartData,outlierKey))}
                        domain={[
                          d=>Math.min(d,outlierData.lower)*0.98,
                          d=>Math.max(d,outlierData.upper)*1.02,
                        ]}
                        tickFormatter={v=>typeof v==="number"?v.toFixed(0):v}
                        label={{value:`${ALL_PARAMS.find(x=>x.key===outlierKey)?.label||outlierKey}${ALL_PARAMS.find(x=>x.key===outlierKey)?.unit?" ("+ALL_PARAMS.find(x=>x.key===outlierKey)?.unit+")":""}`,angle:-90,position:"insideLeft",style:{fontSize:9,fill:C.muted}}}/>
                      <ZAxis range={[30,30]}/>
                      <ReferenceLine yAxisId={undefined} y={outlierData.upper} stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5} label={{value:"Upper",position:"right",fill:C.orange,fontSize:8}}/>
                      <ReferenceLine y={outlierData.lower} stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5} label={{value:"Lower",position:"right",fill:C.green,fontSize:8}}/>
                      <ReferenceLine y={outlierData.q1} stroke={C.accent} strokeDasharray="3 3" strokeWidth={1} label={{value:"Q1",position:"right",fill:C.accent,fontSize:8}}/>
                      <ReferenceLine y={outlierData.q3} stroke={C.accent} strokeDasharray="3 3" strokeWidth={1} label={{value:"Q3",position:"right",fill:C.accent,fontSize:8}}/>
                      <Tooltip cursor={{strokeDasharray:"3 3"}} content={({active,payload})=>{
                        if(!active||!payload?.length)return null;
                        const pt=payload[0]?.payload;
                        const isOut=pt?.value<outlierData.lower||pt?.value>outlierData.upper;
                        const p=ALL_PARAMS.find(x=>x.key===outlierKey);
                        return(
                          <div style={{background:C.white,border:`1px solid ${isOut?C.red:C.green}`,borderRadius:8,padding:"9px 13px",fontSize:11,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:190}}>
                            <div style={{color:C.muted,marginBottom:5,fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.border}`,paddingBottom:4}}>
                              {pt?.time?new Date(pt.time).toLocaleString():""}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                              <span style={{width:8,height:8,borderRadius:"50%",background:isOut?C.red:C.green,flexShrink:0}}/>
                              <span style={{color:C.textMid,flex:1}}>{p?.label||outlierKey}</span>
                              <span style={{fontWeight:700,color:isOut?C.red:C.green}}>{pt?.value?.toFixed(3)}<span style={{fontWeight:400,color:C.muted,marginLeft:3,fontSize:9}}>{p?.unit}</span></span>
                            </div>
                            <div style={{fontSize:9,color:isOut?C.red:C.green,fontWeight:700,marginTop:4,textAlign:"center",background:isOut?"#fdecea":"#e9f7ee",borderRadius:4,padding:"2px 6px"}}>
                              {isOut?"⚠ OUTLIER":"✓ INLIER"}
                            </div>
                          </div>
                        );
                      }}/>
                      <Scatter name="Inliers" data={outlierData.inliers.map(r=>({...r,time:new Date(r.time).getTime()}))} isAnimationActive={false}
                        shape={(props)=>{const{cx,cy}=props;return<circle cx={cx} cy={cy} r={5} fill={C.green} fillOpacity={0.75} stroke={C.green} strokeWidth={0.5} strokeOpacity={0.5}/>;}}/>
                      <Scatter name="Outliers" data={outlierData.outliers.map(r=>({...r,time:new Date(r.time).getTime()}))} isAnimationActive={false}
                        shape={(props)=>{const{cx,cy}=props;return<circle cx={cx} cy={cy} r={6} fill={C.red} fillOpacity={0.85} stroke={C.red} strokeWidth={1}/>;}}/>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          ):chartType==="forecast"?(
            !forecastKey?(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13,textAlign:"center",padding:40,flexDirection:"column",gap:8}}>
                <div style={{fontSize:28}}>🔮</div>Select a parameter from the table to generate a forecast.
              </div>
            ):(
              <div style={{flex:1,minHeight:350,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:12,alignItems:"center",fontSize:10,flexWrap:"wrap"}}>
                  <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:24,height:3,borderRadius:2,background:C.accent,display:"inline-block"}}/><span style={{color:C.textMid}}>Actual</span></span>
                  <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:24,height:3,borderRadius:2,background:C.teal,display:"inline-block",borderTop:"2px dashed "+C.teal}}/><span style={{color:C.textMid}}>Fitted (input window)</span></span>
                  <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:24,height:3,borderRadius:2,background:C.orange,display:"inline-block"}}/><span style={{color:C.textMid}}>Forecast</span></span>
                  <span style={{marginLeft:"auto",fontSize:9,color:C.muted}}>
                    Input: <b>{Math.min(forecastInputWindow,sorted.filter(r=>typeof r[forecastKey]==="number").length)}</b> pts · Horizon: <b>{forecastHorizon}</b> pts · Method: <b>{{linear:"Linear",poly2:"Poly 2°",poly3:"Poly 3°",movavg:"Moving Avg",expsmooth:"Exp. Smooth"}[forecastMethod]}</b>
                  </span>
                </div>
                {forecastResult.chartData.length===0?(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12}}>Not enough data points (need ≥ 3)</div>
                ):(()=>{
                  const fcData=forecastResult.chartData;
                  const allVals=fcData.flatMap(r=>[r.actual,r.forecast,r.fitted].filter(v=>typeof v==="number"&&isFinite(v)));
                  const yMin=Math.min(...allVals),yMax=Math.max(...allVals);
                  const yPad=(yMax-yMin)*0.12||1;
                  const yDomain=[+(yMin-yPad).toFixed(2),+(yMax+yPad).toFixed(2)];
                  const aw=axisWidth(yDomain);
                  const fParam=ALL_PARAMS.find(x=>x.key===forecastKey);
                  return(
                    <div style={{flex:1,minHeight:280}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fcData} margin={{top:8,right:60,left:aw,bottom:24}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="time" type="number" scale="time" domain={["auto","auto"]}
                            tick={{fontSize:9,fill:C.muted}} tickFormatter={v=>fmtTime(v)} interval="preserveStartEnd"
                            label={{value:"Time",offset:-12,position:"insideBottom",style:{fontSize:9,fill:C.muted}}}/>
                          <YAxis width={aw} tick={{fontSize:9,fill:C.muted}} domain={yDomain}
                            tickFormatter={v=>typeof v==="number"?v.toFixed(0):v}
                            label={{value:fParam?.unit?`${fParam.label} (${fParam.unit})`:fParam?.label||forecastKey,angle:-90,position:"insideLeft",style:{fontSize:9,fill:C.muted}}}/>
                          {forecastResult.forecastStart&&(
                            <ReferenceLine x={forecastResult.forecastStart} stroke={C.orange} strokeDasharray="6 3" strokeWidth={1.5}
                              label={{value:"Forecast →",position:"insideTopRight",fill:C.orange,fontSize:8,fontWeight:700}}/>
                          )}
                          <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}
                            labelFormatter={v=>`Time: ${new Date(v).toLocaleString()}`}
                            formatter={(val,name)=>{
                              const labels={actual:"Actual",fitted:"Fitted",forecast:"Forecast"};
                              const colors={actual:C.accent,fitted:C.teal,forecast:C.orange};
                              return[<span style={{color:colors[name]??C.textDark,fontWeight:700}}>{typeof val==="number"?val.toFixed(3):val} <span style={{fontWeight:400,color:C.muted,fontSize:9}}>{fParam?.unit||""}</span></span>,labels[name]??name];
                            }}/>
                          <Legend formatter={v=>({actual:"Actual",fitted:"Fitted",forecast:"Forecast"})[v]??v} wrapperStyle={{fontSize:10}}/>
                          <Line dataKey="actual" name="actual" stroke={C.accent} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} activeDot={{r:4}}/>
                          <Line dataKey="fitted" name="fitted" stroke={C.teal} strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} isAnimationActive={false}/>
                          <Line dataKey="forecast" name="forecast" stroke={C.orange} strokeWidth={2} strokeDasharray="7 3" dot={{r:3,fill:C.orange}} connectNulls={false} isAnimationActive={false} activeDot={{r:5}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
            )
          ):chartType==="xy"?(
            needsTwo?(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12,textAlign:"center",padding:20,flexDirection:"column",gap:6}}>
                <div style={{fontSize:22}}>🔵</div>
                Select at least 2 parameters to plot X vs Y scatter
              </div>
            ):(
              <div style={{flex:1,minHeight:350,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{fontSize:9,color:C.muted,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{color:C.accent,fontWeight:600}}>
                    X: {ALL_PARAMS.find(x=>x.key===xKeyVal)?.label}{ALL_PARAMS.find(x=>x.key===xKeyVal)?.unit?" ("+ALL_PARAMS.find(x=>x.key===xKeyVal)?.unit+")":""}
                  </span>
                  <span>·</span>
                  <span style={{color:C.teal,fontWeight:600}}>
                    Y: {ALL_PARAMS.find(x=>x.key===yKeyVal)?.label}{ALL_PARAMS.find(x=>x.key===yKeyVal)?.unit?" ("+ALL_PARAMS.find(x=>x.key===yKeyVal)?.unit+")":""}
                  </span>
                  {colorKeyVal&&<><span>·</span>
                  <span style={{fontWeight:600,background:"linear-gradient(90deg,#3b82f6,#00c9b1,#f59e0b,#ef4444)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                    🎨 Color: {ALL_PARAMS.find(x=>x.key===colorKeyVal)?.label}
                    {" "}[{colorRange.min.toFixed(1)} – {colorRange.max.toFixed(1)}]
                  </span></>}
                  <span style={{marginLeft:"auto"}}>{xyData.length} data points</span>
                </div>
                {colorKeyVal&&(
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:9,color:C.muted,whiteSpace:"nowrap"}}>
                      {colorRange.min.toFixed(1)}{ALL_PARAMS.find(x=>x.key===colorKeyVal)?.unit?" "+ALL_PARAMS.find(x=>x.key===colorKeyVal)?.unit:""}
                    </span>
                    <div style={{flex:1,height:10,borderRadius:5,background:"linear-gradient(90deg,#3b82f6,#00c9b1,#f59e0b,#ef4444)"}}/>
                    <span style={{fontSize:9,color:C.muted,whiteSpace:"nowrap"}}>
                      {colorRange.max.toFixed(1)}{ALL_PARAMS.find(x=>x.key===colorKeyVal)?.unit?" "+ALL_PARAMS.find(x=>x.key===colorKeyVal)?.unit:""}
                    </span>
                  </div>
                )}
                <div style={{flex:1,minHeight:280}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{top:8,right:20,left:axisWidth(computeDomain(chartData,xKeyVal))+4,bottom:24}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="x" type="number" name={xKeyVal} tick={{fontSize:9,fill:C.muted}} domain={computeDomain(chartData,xKeyVal)} tickFormatter={v=>typeof v==="number"?v.toFixed(0):v} label={{value:ALL_PARAMS.find(x=>x.key===xKeyVal)?.label||xKeyVal,offset:-12,position:"insideBottom",style:{fontSize:9,fill:C.muted}}}/>
                      <YAxis dataKey="y" type="number" name={yKeyVal} tick={{fontSize:9,fill:C.muted}} width={axisWidth(computeDomain(chartData,yKeyVal))} domain={computeDomain(chartData,yKeyVal)} tickFormatter={v=>typeof v==="number"?v.toFixed(0):v} label={{value:ALL_PARAMS.find(x=>x.key===yKeyVal)?.label||yKeyVal,angle:-90,position:"insideLeft",style:{fontSize:9,fill:C.muted}}}/>
                      <ZAxis range={[28,28]}/>
                      <Tooltip cursor={{strokeDasharray:"3 3"}} content={({active,payload})=>{
                        if(!active||!payload?.length)return null;
                        const pt=payload[0]?.payload;
                        const cParam=ALL_PARAMS.find(x=>x.key===colorKeyVal);
                        return(
                          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 13px",fontSize:11,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:200}}>
                            <div style={{color:C.muted,marginBottom:6,fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.border}`,paddingBottom:5}}>
                              {pt?.time?new Date(pt.time).toLocaleString():""}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                              <span style={{width:8,height:8,borderRadius:2,background:C.accent,flexShrink:0}}/>
                              <span style={{color:C.textMid,flex:1}}>{ALL_PARAMS.find(x=>x.key===xKeyVal)?.label||xKeyVal}</span>
                              <span style={{fontWeight:700,color:C.accent}}>{pt?.x?.toFixed(3)}<span style={{fontWeight:400,color:C.muted,marginLeft:3,fontSize:9}}>{ALL_PARAMS.find(x=>x.key===xKeyVal)?.unit}</span></span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                              <span style={{width:8,height:8,borderRadius:2,background:C.teal,flexShrink:0}}/>
                              <span style={{color:C.textMid,flex:1}}>{ALL_PARAMS.find(x=>x.key===yKeyVal)?.label||yKeyVal}</span>
                              <span style={{fontWeight:700,color:C.teal}}>{pt?.y?.toFixed(3)}<span style={{fontWeight:400,color:C.muted,marginLeft:3,fontSize:9}}>{ALL_PARAMS.find(x=>x.key===yKeyVal)?.unit}</span></span>
                            </div>
                            {colorKeyVal&&pt?.c!=null&&(()=>{
                              const t=(pt.c-colorRange.min)/(colorRange.max-colorRange.min);
                              const col=heatColor(t);
                              return(
                                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,paddingTop:5,borderTop:`1px solid ${C.border}`}}>
                                  <span style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,boxShadow:`0 0 4px ${col}`}}/>
                                  <span style={{color:C.textMid,flex:1}}>{cParam?.label||colorKeyVal}</span>
                                  <span style={{fontWeight:700,color:col}}>{pt.c.toFixed(3)}<span style={{fontWeight:400,color:C.muted,marginLeft:3,fontSize:9}}>{cParam?.unit}</span></span>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      }}/>
                      <Scatter data={xyData} isAnimationActive={false} shape={(props)=>{
                        const{cx,cy,payload}=props;
                        let fill=axisConfigs.find(a=>a.key===yKeyVal)?.color??C.accent;
                        if(colorKeyVal&&payload.c!=null){
                          const t=(payload.c-colorRange.min)/(colorRange.max-colorRange.min);
                          fill=heatColor(t);
                        }
                        return(<circle cx={cx} cy={cy} r={5} fill={fill} fillOpacity={0.82} stroke={fill} strokeWidth={0.5} strokeOpacity={0.5}/>);
                      }}/>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                {colorKeyVal&&(()=>{
                  const vals=xyData.map(r=>r.c).filter(v=>typeof v==="number"&&isFinite(v));
                  if(!vals.length)return null;
                  const mean=vals.reduce((s,v)=>s+v,0)/vals.length;
                  const sorted2=[...vals].sort((a,b)=>a-b);
                  const median=sorted2[Math.floor(sorted2.length/2)]??0;
                  const std=Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
                  const cParam=ALL_PARAMS.find(x=>x.key===colorKeyVal);
                  return(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
                      {[["Min",colorRange.min],["Max",colorRange.max],["Mean",mean],["Median",median],["Std Dev",std]].map(([lbl,val])=>(
                        <div key={lbl} style={{textAlign:"center",background:C.offWhite,borderRadius:6,padding:"5px 4px"}}>
                          <div style={{fontSize:8,color:C.muted,fontWeight:600,textTransform:"uppercase"}}>{lbl}</div>
                          <div style={{fontSize:11,fontWeight:700,color:heatColor((val-colorRange.min)/(colorRange.max-colorRange.min)||0)}}>
                            {typeof val==="number"?val.toFixed(2):"—"}
                            <span style={{fontSize:8,fontWeight:400,color:C.muted,marginLeft:2}}>{cParam?.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )
          ):null}
        </div>
        <div style={{background:C.white,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 14px 10px",borderBottom:`2px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>KEY PARAMETERS</div>
            <div style={{display:"flex",gap:6}}>
              <input value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Search…" style={{flex:1,padding:"5px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textDark,outline:"none",fontFamily:font}}/>
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.textMid,outline:"none",fontFamily:font,background:C.white,cursor:"pointer"}}>
                {categories.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 75px 68px 48px",padding:"7px 14px",background:"#f0f6fa",borderBottom:`1px solid ${C.border}`}}>
            {["","PARAMETER","CATEGORY","ACTUAL","AXIS"].map((h,i)=>(<div key={i} style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</div>))}
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {filteredParams.map(p=>{
              const isChecked=selectedKeys.includes(p.key);
              const colorIdx=selectedKeys.indexOf(p.key);
              const lineColor=isChecked?TREND_COLORS[colorIdx%TREND_COLORS.length]:C.border;
              const actualVal=latest?.[p.key];
              const maxReached=!isChecked&&selectedKeys.length>=MAX_TREND_PARAMS;
              return(
                <div key={p.key} className="param-row" onClick={maxReached?undefined:()=>toggleKey(p.key)}
                  style={{display:"grid",gridTemplateColumns:"28px 1fr 75px 68px 48px",padding:"8px 14px",borderBottom:`1px solid ${C.border}`,background:isChecked?"#f0fbff":maxReached?"#fafafa":C.white,transition:"background 0.15s",opacity:maxReached?0.45:1,cursor:maxReached?"not-allowed":"pointer"}}>
                  <div style={{display:"flex",alignItems:"center"}}>
                    <input type="checkbox" checked={isChecked} onChange={maxReached?undefined:()=>toggleKey(p.key)} onClick={e=>e.stopPropagation()} disabled={maxReached} style={{width:14,height:14,cursor:maxReached?"not-allowed":"pointer",accentColor:C.accent}}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                    {isChecked&&<span style={{width:14,height:3,borderRadius:2,background:lineColor,flexShrink:0,display:"inline-block"}}/>}
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:isChecked?600:400,color:isChecked?C.textDark:C.textMid,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.label}</div>
                      {p.unit&&<div style={{fontSize:9,color:C.muted}}>{p.unit}</div>}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.muted,display:"flex",alignItems:"center"}}>{p.category}</div>
                  <div style={{fontSize:11,fontWeight:600,color:C.textDark,display:"flex",alignItems:"center"}}>{typeof actualVal==="number"?actualVal.toFixed(2):(actualVal??"—")}</div>
                  <div style={{fontSize:9,fontWeight:700,display:"flex",alignItems:"center",color:isChecked?TREND_COLORS[colorIdx%TREND_COLORS.length]:C.muted}}>{isChecked?`L${colorIdx+1}`:"—"}</div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"8px 14px",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.muted,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>{selectedKeys.length} parameter{selectedKeys.length!==1?"s":""} selected{selectedKeys.length>=MAX_TREND_PARAMS&&<span style={{color:C.orange,marginLeft:4,fontWeight:600}}>· limit reached</span>}</span>
            {selectedKeys.length>0&&<span style={{color:C.red,cursor:"pointer",fontWeight:600}} onClick={()=>setSelectedKeys([])}>Clear all</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPITrendModal({trendKey,trend,onClose}){
  const zoom=useZoom();const cfg=KPI_TREND_CONFIG[trendKey];if(!cfg||!trend)return null;
  const sorted=sortTrend(trend);const vals=sorted.map(r=>r[trendKey]).filter(v=>!isNaN(Number(v)));const domain=computeDomain(sorted,trendKey);const latest=vals[vals.length-1];const aw=axisWidth(domain);const chartData=applyZoomSlice(sorted,zoom.zoomRange);
  return(<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,40,60,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="chart-modal" onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:10,padding:"20px 24px 18px",width:"min(760px,92vw)",boxShadow:"0 20px 60px rgba(0,60,100,0.25)",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:14,fontWeight:700,color:C.textDark}}>{cfg.label} – Trend</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>Last {sorted.length} data points · auto-refreshes every 5s</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{background:"#e0f7ff",color:C.accentDim,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>Current: {typeof latest==="number"?latest.toFixed(2):"—"} {cfg.unit}</span><button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.offWhite,cursor:"pointer",fontSize:15,fontWeight:700,color:C.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div></div><div style={{height:1,background:C.border}}/><ZoomBar isZoomed={zoom.isZoomed} zoomPct={zoom.zoomPct} resetZoom={zoom.resetZoom}/><div {...zoom.wrapProps} style={{height:260}}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{top:6,right:20,left:aw,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="time" tick={{fontSize:9,fill:C.muted}} tickFormatter={fmtTime} interval="preserveStartEnd"/><YAxis width={aw} tick={{fontSize:9,fill:C.muted}} domain={domain} tickFormatter={v=>typeof v==="number"?v.toFixed(0):v}/><Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}} labelFormatter={v=>new Date(v).toLocaleString()} formatter={val=>[typeof val==="number"?val.toFixed(2):val,cfg.label]}/><Line type="monotone" dataKey={trendKey} stroke={cfg.color} strokeWidth={2.5} dot={{r:3,fill:cfg.color}} activeDot={{r:5}} name={cfg.label} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><div style={{fontSize:10,color:C.muted,textAlign:"center"}}>Click outside or press ✕ to close</div></div></div>);
}

function CircularGauge({pct=100,label,sub,onClick,isActive}){
  const r=42,cx=50,cy=50,circ=2*Math.PI*r,offset=circ*(1-pct/100);
  return(<div className={`gauge-wrap${isActive?" active":""}`} onClick={onClick} style={{position:"relative",width:130,height:130,flexShrink:0}}>
    <svg viewBox="0 0 100 100" style={{width:"100%",height:"100%",transform:"rotate(-90deg)"}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={isActive?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.15)"} strokeWidth={8}/>
      {isActive&&<circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(100,220,255,0.3)" strokeWidth={12}/>}
      <circle className="gauge-arc" cx={cx} cy={cy} r={r} fill="none" stroke={isActive?"#7de8ff":C.white} strokeWidth={8} strokeLinecap="round" strokeDasharray={circ} style={{"--target-offset":offset}}/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.white,textAlign:"center"}}>
      <div style={{fontSize:22,fontWeight:800,lineHeight:1}}>{pct.toFixed(1)}%</div>
      <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.8)",marginTop:4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.55)",marginTop:2}}>{sub}</div>
      {isActive&&<div style={{fontSize:8,color:"#7de8ff",marginTop:4,fontWeight:700}}>● ACTIVE</div>}
    </div>
  </div>);
}

function OpportunityCard({icon,value,unit,label,sub,color=C.white}){
  return(<div style={{flex:1,display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"rgba(255,255,255,0.10)",borderRadius:7,border:"1px solid rgba(255,255,255,0.18)",backdropFilter:"blur(4px)"}}><div style={{fontSize:22,opacity:0.9}}>{icon}</div><div><div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:600,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div><div style={{fontSize:20,fontWeight:700,color}}>{value}<span style={{fontSize:11,fontWeight:500,marginLeft:4,opacity:0.8}}>{unit}</span></div>{sub&&<div style={{fontSize:9,color:"rgba(255,255,255,0.6)",marginTop:2}}>{sub}</div>}</div></div>);
}

function KPICard({label,actual,optimum,unit,highlight,trendKey,onTrendClick}){
  const isOff=actual!=null&&optimum!=null&&Math.abs(actual-optimum)/(optimum||1)>0.05;
  const valColor=highlight?C.orange:isOff?C.red:C.accent;const isClickable=!!(onTrendClick&&trendKey);
  return(<div className="kpi-card" style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",minWidth:0}}>
    <div style={{fontSize:10,fontWeight:600,color:C.textDark,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8,display:"flex",justifyContent:"center",alignItems:"center",textAlign:"center",position:"relative"}}>
      <span style={{textAlign:"center"}}>{label}</span>
      {isClickable&&<span style={{fontSize:8,color:C.accent,cursor:"pointer",position:"absolute",right:0}} onClick={()=>onTrendClick(trendKey)}>↗</span>}
    </div>
    {optimum!=null?(
      <div style={{display:"flex",alignItems:"center",gap:0}}>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:700,color:valColor,lineHeight:1,cursor:isClickable?"pointer":"default"}} onClick={isClickable?()=>onTrendClick(trendKey):undefined}>{actual??"—"}</div>
          {unit&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{unit}</div>}
          <div style={{fontSize:9,color:C.muted,marginTop:2}}>Actual</div>
        </div>
        <div style={{width:1,height:40,background:C.border,flexShrink:0,margin:"0 8px"}}/>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.accentDim,lineHeight:1}}>{optimum}</div>
          {unit&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{unit}</div>}
          <div style={{fontSize:9,color:C.muted,marginTop:2}}>Optimum</div>
        </div>
      </div>
    ):(
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:12,fontWeight:700,color:valColor,lineHeight:1,cursor:isClickable?"pointer":"default"}} onClick={isClickable?()=>onTrendClick(trendKey):undefined}>{actual??"—"}</div>
        {unit&&<div style={{fontSize:9,color:C.muted,marginTop:3}}>{unit}</div>}
      </div>
    )}
  </div>);
}

const PIE_COLORS=[C.red,C.accent,C.green];

function ChartPanel({d,trend,runlengthTrend}){
  const[view,setView]=useState("hgi");
  const sortedMain=useMemo(()=>sortTrend(trend),[trend]);
  const sortedRun=useMemo(()=>{
    const arr=Array.isArray(runlengthTrend)?runlengthTrend:[];
    const safeNum=(v)=>{if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
    return[...arr].map(r=>({...r,time:r.time,TMT:safeNum(r.TMT),TMT_forecast:safeNum(r.TMT_forecast)})).sort((a,b)=>new Date(a.time)-new Date(b.time));
  },[runlengthTrend]);
  const yieldData=[{name:"Heavy",value:d.yields?.heavy??0},{name:"Medium",value:d.yields?.medium??0},{name:"Light",value:d.yields?.light??0}];
  const toDate=(v)=>{const s=String(v??"");const iso=(s.includes(" ")&&!s.includes("T"))?s.replace(" ","T"):s;const dt=new Date(iso);return isNaN(dt.getTime())?new Date(s):dt;};
  const config={
    hgi:{header:"HGI Forecast (%)",dataset:"main",xKey:"time",yPrimary:"hgi"},
    dp:{header:"Actual DP Trend",dataset:"main",xKey:"time",yPrimary:"actualdp"},
    cokedrum_cokeheight:{header:"Coke Height Trend",dataset:"main",xKey:"cycletime",yPrimary:"cokedrum_cokeheight"},
    cokedrum_outage_predicted:{header:"Outage Predicted Trend",dataset:"main",xKey:"cycletime",yPrimary:"cokedrum_outage_predicted"},
    runlength:{header:"Runlength Forecast",dataset:"runlength",xKey:"time",yPrimary:"TMT"},
    yield:{header:"Crude Slate / Yield Dist.",dataset:"yield"},
  };
  const cfg=config[view]??config.hgi;
  const isYield=cfg.dataset==="yield";
  const dataForChart=cfg.dataset==="runlength"?sortedRun:sortedMain;
  const lastMain=sortedMain?.length?sortedMain[sortedMain.length-1]:{};
  const lastRun=sortedRun?.length?sortedRun[sortedRun.length-1]:{};
  const primaryKey=cfg.yPrimary;
  const domain=(!isYield&&primaryKey&&dataForChart?.length)?computeDomain(dataForChart,primaryKey):["auto","auto"];
  const xTickFormatter=(v)=>{if(cfg.xKey==="cycletime"){const num=Number(v);return Number.isFinite(num)?num.toFixed(2):String(v);}return fmtTime(v);};
  const labelFormatter=(v)=>{if(cfg.xKey==="cycletime")return`Cycle: ${v}`;return toDate(v).toLocaleString();};
  return(<div style={{background:C.white,borderRadius:8,padding:14,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:11,fontWeight:700,color:C.textDark,textTransform:"uppercase",letterSpacing:"0.5px"}}>{cfg.header}</div>
      <select value={view} onChange={e=>setView(e.target.value)} style={{padding:"4px 10px",borderRadius:5,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:10,fontWeight:700,background:C.accentLight,color:C.accent,outline:"none"}}>
        <option value="hgi">HGI TREND</option>
        <option value="dp">ACTUAL DP</option>
        <option value="cokedrum_cokeheight">COKE HEIGHT</option>
        <option value="cokedrum_outage_predicted">OUTAGE PREDICTED</option>
        <option value="runlength">RUNLENGTH FORECAST</option>
        <option value="yield">CRUDE SLATE</option>
      </select>
    </div>
    {!isYield&&(<>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dataForChart} margin={{top:4,right:16,left:-18,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
          <XAxis dataKey={cfg.xKey} tick={{fontSize:8,fill:C.muted}} tickFormatter={xTickFormatter} interval="preserveStartEnd"/>
          <YAxis tick={{fontSize:9,fill:C.muted}} domain={domain}/>
          <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} labelFormatter={labelFormatter} formatter={(val,name)=>[typeof val==="number"?val.toFixed(2):val,name]}/>
          {view==="hgi"&&(<><ReferenceLine y={d.upper} stroke={C.red} strokeDasharray="4 3" strokeWidth={1} label={{value:`↑${d.upper}`,fill:C.red,fontSize:8,position:"insideTopRight"}}/><ReferenceLine y={d.lower} stroke={C.orange} strokeDasharray="4 3" strokeWidth={1} label={{value:`↓${d.lower}`,fill:C.orange,fontSize:8,position:"insideBottomRight"}}/><Line type="monotone" dataKey="upper" stroke={C.red} strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Upper" isAnimationActive={false}/><Line type="monotone" dataKey="lower" stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Lower" isAnimationActive={false}/><Line type="monotone" dataKey="hgi" stroke={C.accent} strokeWidth={2.5} dot={false} name="HGI" isAnimationActive={false}/></>)}
          {view==="dp"&&(<><Line type="monotone" dataKey="actualdp" stroke={C.accent} strokeWidth={2.5} dot={false} name="Actual DP" isAnimationActive={false}/><Line type="monotone" dataKey="cleandp" stroke={C.teal} strokeWidth={2.5} dot={false} name="Clean DP" isAnimationActive={false}/><Line type="monotone" dataKey="foulingdp" stroke={C.orange} strokeWidth={2.5} dot={false} name="Fouling DP" isAnimationActive={false}/></>)}
          {view==="cokedrum_cokeheight"&&<Line type="monotone" dataKey="cokedrum_cokeheight" stroke={C.teal} strokeWidth={2.5} dot={false} name="Coke Height" isAnimationActive={false}/>}
          {view==="cokedrum_outage_predicted"&&<Line type="monotone" dataKey="cokedrum_outage_predicted" stroke={C.orange} strokeWidth={2.5} dot={false} name="Outage Predicted" isAnimationActive={false}/>}
          {view==="runlength"&&(<><Line type="monotone" dataKey="TMT" stroke={C.red} strokeWidth={2.5} dot={false} name="TMT" isAnimationActive={false} connectNulls={false}/><Line type="monotone" dataKey="TMT_forecast" stroke={C.green} strokeWidth={2.5} dot={false} name="TMT Forecast" isAnimationActive={false} connectNulls={false}/></>)}
        </LineChart>
      </ResponsiveContainer>
      <div style={{fontSize:10,color:C.muted,marginTop:4}}>
        {view==="hgi"?(<>Current: <span style={{fontWeight:700,color:C.accent}}>{d.prediction?.toFixed(1)}</span> · Band: <span style={{fontWeight:600,color:C.accentDim}}>{d.lower} – {d.upper}</span></>)
        :view==="runlength"?(<>TMT: <span style={{fontWeight:700,color:C.red}}>{typeof lastRun?.TMT==="number"?lastRun.TMT.toFixed(3):"—"}</span></>)
        :view==="dp"?(<>Actual DP: <span style={{fontWeight:700,color:C.accent}}>{typeof lastMain?.actualdp==="number"?lastMain.actualdp.toFixed(2):"—"}</span></>)
        :<></>}
      </div>
    </>)}
    {isYield&&(<>
      <div style={{display:"flex",justifyContent:"center"}}>
        <PieChart width={280} height={180}>
          <Pie data={yieldData} cx={140} cy={80} outerRadius={72} innerRadius={34} dataKey="value" paddingAngle={3}>
            {yieldData.map((_,i)=>(<Cell key={i} fill={PIE_COLORS[i]}/>))}
          </Pie>
          <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={val=>[`${Number(val).toFixed(2)}%`,""]}/>
          <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
        </PieChart>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:4}}>
        {[["Heavy",d.yields?.heavy,C.red],["Medium",d.yields?.medium,C.accent],["Light",d.yields?.light,C.green]].map(([lbl,val,col])=>(
          <div key={lbl} style={{textAlign:"center",background:"#f0f5f9",borderRadius:6,padding:"6px 4px"}}>
            <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase"}}>{lbl}</div>
            <div style={{fontSize:16,fontWeight:700,color:col}}>{val?.toFixed(2)??"—"}%</div>
          </div>
        ))}
      </div>
    </>)}
  </div>);
}

function CrudeSupplyChainPage(){
  const[activeTab,setActiveTab]=useState("overview");
  const blendAPI=CRUDE_GRADES.reduce((s,g)=>s+g.api*(g.pct/100),0).toFixed(1);
  const blendSulfur=CRUDE_GRADES.reduce((s,g)=>s+g.sulfur*(g.pct/100),0).toFixed(2);
  const avgCost=CRUDE_GRADES.reduce((s,g)=>s+g.cost*(g.pct/100),0).toFixed(2);
  const latestMargin=MARGIN_DATA[MARGIN_DATA.length-1]?.margin.toFixed(2);
  const tabs=[{key:"overview",label:"OVERVIEW"},{key:"crude_slate",label:"CRUDE SLATE"},{key:"economics",label:"ECONOMICS"},{key:"optimize",label:"OPTIMIZATION"}];
  return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12,background:"#f0f5f9"}}>
      <div style={{background:`linear-gradient(135deg,#003d6b 0%,#005580 100%)`,borderRadius:8,padding:"14px 20px",boxShadow:"0 2px 10px rgba(0,50,100,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.white,letterSpacing:"0.5px"}}>🛢️ CRUDE SUPPLY CHAIN OPTIMIZATION</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:3}}>Tansein Refinery · CDU Complex · Real-time blend & economics</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {[["INTAKE","95,420 BPD",C.accent],["MARGIN","$"+latestMargin+"/bbl",C.green],["UTIL.","94.2%",C.teal]].map(([lbl,val,col])=>(
              <div key={lbl} style={{textAlign:"center",background:"rgba(255,255,255,0.07)",padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:600,letterSpacing:"0.5px"}}>{lbl}</div>
                <div style={{fontSize:16,fontWeight:700,color:col,marginTop:2}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {CRUDE_GRADES.map(g=>(<div key={g.name} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"6px 12px"}}><div style={{width:8,height:8,borderRadius:"50%",background:g.color,flexShrink:0}}/><div><div style={{fontSize:10,fontWeight:600,color:C.white}}>{g.name}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>{g.pct}% · {g.api}° API · ${g.cost}/bbl</div></div></div>))}
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",background:"rgba(0,180,216,0.15)",border:"1px solid rgba(0,180,216,0.3)",borderRadius:8,padding:"6px 14px",marginLeft:"auto"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",fontWeight:600}}>BLEND PROPERTIES</div>
            <div style={{fontSize:10,color:C.white,marginTop:2}}>API {blendAPI}° · Sulfur {blendSulfur} wt% · Avg Cost ${avgCost}/bbl</div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:C.white,padding:4,borderRadius:8,border:`1px solid ${C.border}`,alignSelf:"flex-start"}}>
        {tabs.map(t=>(<button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:"6px 16px",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:"0.4px",background:activeTab===t.key?C.accent:"transparent",color:activeTab===t.key?C.white:C.muted,transition:"all 0.15s"}}>{t.label}</button>))}
      </div>
      {activeTab==="overview"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {SUPPLY_KPIs.slice(0,5).map(k=>(<div key={k.label} className="crude-card" style={{background:C.white,borderRadius:7,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:9,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{k.label}</div><div style={{fontSize:20,fontWeight:700,color:C.textDark}}>{k.value}<span style={{fontSize:10,color:C.muted,marginLeft:4}}>{k.unit}</span></div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}><StatusBadge status={k.status}/><span style={{fontSize:9,color:C.muted}}>Opt: {k.opt}</span></div></div>))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {SUPPLY_KPIs.slice(5).map(k=>(<div key={k.label} className="crude-card" style={{background:C.white,borderRadius:7,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:9,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{k.label}</div><div style={{fontSize:20,fontWeight:700,color:C.textDark}}>{k.value}<span style={{fontSize:10,color:C.muted,marginLeft:4}}>{k.unit}</span></div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}><StatusBadge status={k.status}/><span style={{fontSize:9,color:C.muted}}>Opt: {k.opt}</span></div></div>))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:12}}>
            <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
              <SectionHeader title="Gross Refining Margin – 20 Day Trend ($/bbl)"/>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={MARGIN_DATA} margin={{top:4,right:16,left:0,bottom:0}}>
                  <defs><linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/><stop offset="95%" stopColor={C.accent} stopOpacity={0.02}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={{fontSize:8,fill:C.muted}} interval={3}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} domain={[70,90]}/>
                  <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={(v,n)=>[`$${v}/bbl`,n==="margin"?"Margin":"Target"]}/>
                  <ReferenceLine y={82} stroke={C.green} strokeDasharray="4 3" strokeWidth={1.5} label={{value:"Target $82",fill:C.green,fontSize:8,position:"insideTopRight"}}/>
                  <Area type="monotone" dataKey="margin" stroke={C.accent} strokeWidth={2.5} fill="url(#marginGrad)" dot={false} name="margin" isAnimationActive={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
              <SectionHeader title="Inventory Levels – Monthly (MBbls)"/>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={INVENTORY_DATA} margin={{top:4,right:8,left:0,bottom:0}} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="month" tick={{fontSize:8,fill:C.muted}}/><YAxis tick={{fontSize:9,fill:C.muted}}/>
                  <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={(v,n)=>[`${v} MBbls`,n==="crude"?"Crude":"Product"]}/>
                  <Legend wrapperStyle={{fontSize:10}} iconSize={10}/>
                  <Bar dataKey="crude" name="Crude" fill={C.accent} radius={[3,3,0,0]} isAnimationActive={false}/>
                  <Bar dataKey="product" name="Product" fill={C.teal} radius={[3,3,0,0]} isAnimationActive={false}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
      {activeTab==="crude_slate"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:12}}>
          <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
            <SectionHeader title="Current Crude Blend Composition"/>
            <div style={{display:"flex",justifyContent:"center"}}>
              <PieChart width={280} height={220}>
                <Pie data={CRUDE_GRADES} cx={140} cy={100} outerRadius={90} innerRadius={45} dataKey="pct" paddingAngle={2}>
                  {CRUDE_GRADES.map((g,i)=><Cell key={i} fill={g.color}/>)}
                </Pie>
                <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={(v,n)=>[`${v}%`,n]}/>
                <Legend iconSize={10} wrapperStyle={{fontSize:10}}/>
              </PieChart>
            </div>
            <div style={{marginTop:8}}>
              {CRUDE_GRADES.map(g=>(<div key={g.name} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:8,height:8,borderRadius:"50%",background:g.color,flexShrink:0}}/><div style={{flex:1,fontSize:11,color:C.textMid,fontWeight:500}}>{g.name}</div><div style={{fontSize:11,fontWeight:700,color:C.textDark,width:36,textAlign:"right"}}>{g.pct}%</div><div style={{width:80,height:6,background:C.offWhite,borderRadius:3,overflow:"hidden"}}><div style={{width:`${g.pct*2.5}%`,height:"100%",background:g.color,borderRadius:3}}/></div></div>))}
            </div>
          </div>
          <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:12}}>
            <SectionHeader title="Crude Grade Properties & Cost"/>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["CRUDE GRADE","BLEND %","API°","SULFUR wt%","COST $/bbl","NAPHTHA %","DIST. %","RESID %"].map(h=>(<th key={h} style={{background:"#f0f6fa",padding:"7px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.6px",borderBottom:`1px solid ${C.border}`}}>{h}</th>))}</tr></thead>
              <tbody>
                {CRUDE_GRADES.map(g=>(<tr key={g.name} style={{borderBottom:`1px solid ${C.border}`}}><td style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:g.color,flexShrink:0}}/><span style={{fontWeight:600,color:C.textDark,fontSize:11}}>{g.name}</span></td><td style={{padding:"8px 10px",fontWeight:700,color:C.accent}}>{g.pct}%</td><td style={{padding:"8px 10px",color:C.textMid}}>{g.api}</td><td style={{padding:"8px 10px",color:g.sulfur>2.5?C.orange:C.textMid,fontWeight:g.sulfur>2.5?600:400}}>{g.sulfur}</td><td style={{padding:"8px 10px",color:C.textMid}}>${g.cost}</td><td style={{padding:"8px 10px",color:C.textMid}}>{(18+g.api*0.4).toFixed(1)}%</td><td style={{padding:"8px 10px",color:C.textMid}}>{(35+g.api*0.3).toFixed(1)}%</td><td style={{padding:"8px 10px",color:C.textMid}}>{(47-g.api*0.7).toFixed(1)}%</td></tr>))}
                <tr style={{background:C.offWhite,fontWeight:700}}><td style={{padding:"8px 10px",fontSize:11,color:C.textDark}}>BLEND (Weighted Avg)</td><td style={{padding:"8px 10px",color:C.accent}}>100%</td><td style={{padding:"8px 10px",color:C.textDark}}>{blendAPI}</td><td style={{padding:"8px 10px",color:Number(blendSulfur)>2.0?C.orange:C.textDark}}>{blendSulfur}</td><td style={{padding:"8px 10px",color:C.textDark}}>${avgCost}</td><td colSpan={3} style={{padding:"8px 10px",color:C.muted,fontSize:10}}>Weighted average of all grades</td></tr>
              </tbody>
            </table>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:4}}>
              {[["Blend API",blendAPI,"°",28,42,C.accent],["Blend Sulfur",blendSulfur,"wt%",0,3,Number(blendSulfur)>2.0?C.orange:C.green],["Avg Cost",avgCost,"$/bbl",70,90,C.teal]].map(([lbl,val,unit,mn,mx,col])=>{
                const pct=Math.min(100,Math.max(0,((Number(val)-mn)/(mx-mn))*100));
                return(<div key={lbl} style={{background:C.offWhite,borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:9,fontWeight:600,color:C.muted,textTransform:"uppercase",marginBottom:6}}>{lbl}</div><div style={{fontSize:18,fontWeight:700,color:col}}>{val}<span style={{fontSize:10,marginLeft:3,color:C.muted}}>{unit}</span></div><div style={{marginTop:6,height:4,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:2,transition:"width 0.6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:8,color:C.muted}}><span>{mn}</span><span>{mx}</span></div></div>);
              })}
            </div>
          </div>
        </div>
      )}
      {activeTab==="economics"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:12}}>
            <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
              <SectionHeader title="Crude Benchmark Prices – 30 Day ($/bbl)"/>
              <div style={{display:"flex",gap:16,fontSize:10,color:C.muted,marginBottom:8}}><span><span style={{display:"inline-block",width:16,height:3,background:C.accent,borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Brent</span><span><span style={{display:"inline-block",width:16,height:3,background:C.orange,borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Oman</span></div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={PRICE_DATA} margin={{top:4,right:16,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={{fontSize:8,fill:C.muted}} interval={4}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} domain={[70,90]}/>
                  <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={(v,n)=>[`$${v}/bbl`,n]}/>
                  <Line type="monotone" dataKey="brent" stroke={C.accent} strokeWidth={2.5} dot={false} name="Brent" isAnimationActive={false}/>
                  <Line type="monotone" dataKey="oman" stroke={C.orange} strokeWidth={2} dot={false} name="Oman" isAnimationActive={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
              <SectionHeader title="Economic Summary"/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["Crude Cost","$79.4/bbl","$80.0/bbl",C.green],["Variable OpEx","$2.46/bbl","$2.30/bbl",C.orange],["Fixed OpEx","$1.84/bbl","$1.84/bbl",C.green],["Gross Margin","$8.42/bbl","$7.50/bbl",C.green],["Net Margin","$6.58/bbl","$6.00/bbl",C.green],["Daily Revenue","$13.8M","$13.5M",C.green],["Monthly Profit","$197M","$182M",C.green]].map(([lbl,actual,target,col])=>(
                  <div key={lbl} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.offWhite,borderRadius:6}}>
                    <div style={{fontSize:11,color:C.textMid,fontWeight:500}}>{lbl}</div>
                    <div style={{display:"flex",gap:16,alignItems:"center"}}><div style={{fontSize:13,fontWeight:700,color:col}}>{actual}</div><div style={{fontSize:10,color:C.muted}}>vs {target}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
            <SectionHeader title="Cost & Margin Breakdown ($/bbl)"/>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
              {[["Crude Cost","$79.4",79.4,C.accent],["Transport","$0.62",0.62,C.muted],["Energy","$1.84",1.84,C.orange],["Variable","$0.62",0.62,C.red],["Fixed","$1.84",1.84,"#a78bfa"],["Gross Margin","$8.42",8.42,C.green]].map(([lbl,val,v,col])=>(
                <div key={lbl} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,fontWeight:700,color:col}}>{val}</div>
                  <div style={{width:"100%",background:col,borderRadius:"3px 3px 0 0",height:`${Math.min(100,(v/8.42)*100)}px`,opacity:0.85}}/>
                  <div style={{fontSize:8,color:C.muted,textAlign:"center",lineHeight:1.2}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab==="optimize"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[["Total Margin Opportunity","$0.74/bbl","+$1.02M/day",C.green,"💰"],["Active Optimization Flags","3 Items","2 High Priority",C.orange,"⚠️"],["Next Review","Today 14:00","Blend Planning Meeting",C.accent,"📅"]].map(([lbl,val,sub,col,icon])=>(
              <div key={lbl} style={{background:C.white,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,display:"flex",gap:12,alignItems:"center"}}>
                <div style={{fontSize:28,opacity:0.8}}>{icon}</div>
                <div><div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4}}>{lbl}</div><div style={{fontSize:20,fontWeight:700,color:col}}>{val}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>{sub}</div></div>
              </div>
            ))}
          </div>
          <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
            <SectionHeader title="Optimization Recommendations"/>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["PARAMETER","CURRENT","OPTIMUM","MARGIN IMPACT","RECOMMENDED ACTION","PRIORITY"].map(h=>(<th key={h} style={{background:C.offWhite,padding:"8px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.4px",borderBottom:`2px solid ${C.border}`}}>{h}</th>))}</tr></thead>
              <tbody>{OPTIMIZATION_ACTIONS.map((a,i)=>(<tr key={i} className="opt-row" style={{borderBottom:`1px solid ${C.border}`}}><td style={{padding:"10px",fontWeight:700,color:C.textDark,fontSize:11}}>{a.parameter}</td><td style={{padding:"10px",color:C.textMid,fontSize:11}}>{a.current}</td><td style={{padding:"10px",color:C.accent,fontWeight:600,fontSize:11}}>{a.optimum}</td><td style={{padding:"10px",color:C.green,fontWeight:700,fontSize:11}}>{a.impact}</td><td style={{padding:"10px",color:C.textMid,fontSize:10,lineHeight:1.5,maxWidth:280}}>{a.action}</td><td style={{padding:"10px"}}><span className={`badge ${a.priority==="HIGH"?"badge-red":a.priority==="MEDIUM"?"badge-orange":"badge-blue"}`}>{a.priority}</span></td></tr>))}</tbody>
            </table>
          </div>
          <div style={{background:C.white,borderRadius:7,padding:12,border:`1px solid ${C.border}`}}>
            <SectionHeader title="Optimal Crude Blend vs Current (%)"/>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={CRUDE_GRADES.map(g=>({name:g.name,current:g.pct,optimal:g.name==="Arab Light"?42:g.name==="Arab Medium"?24:g.name==="Arab Heavy"?16:g.name==="Basra Light"?8:10}))} margin={{top:4,right:16,left:0,bottom:0}} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:9,fill:C.muted}}/><YAxis tick={{fontSize:9,fill:C.muted}} unit="%"/>
                <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}} formatter={(v,n)=>[`${v}%`,n==="current"?"Current":"Optimal"]}/>
                <Legend wrapperStyle={{fontSize:10}} iconSize={10}/>
                <Bar dataKey="current" name="Current" fill={C.accent} radius={[3,3,0,0]} isAnimationActive={false} opacity={0.7}/>
                <Bar dataKey="optimal" name="Optimal" fill={C.green} radius={[3,3,0,0]} isAnimationActive={false}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

const equipmentSchema = {
  heaters: {
    type: "array", label: "Heater Configuration", icon: "🔥",
    item: {
      heater_id:{ type:"string", label:"Heater ID", required:true },
      passes:{ type:"number", label:"No. of Passes", min:1, required:true },
      tubes_per_pass:{ type:"number", label:"Tubes per Pass", min:1, required:true },
      burners:{ type:"number", label:"Burners per Furnace", min:1, required:true },
      burner_arrangement:{ type:"select", label:"Burner Arrangement", options:["Opposed Fired","Terrace Wall","Side Fired","Vertical Cylindrical"], required:true },
    },
  },
  coke_drums: {
    type: "array", label: "Coke Drum Configuration", icon: "🏭",
    item: {
      drum_id:{ type:"string", label:"Drum ID", required:true },
      height:{ type:"number", label:"Height (m)", min:0.1, required:true },
      diameter:{ type:"number", label:"Diameter (m)", min:0.1, required:true },
    },
  },
};

function makeDefaultItem(itemSchema){const obj={};Object.entries(itemSchema).forEach(([key,field])=>{if(field.type==="select")obj[key]=field.options[0];else obj[key]="";});return obj;}
function validateItem(itemSchema,item){const errors={};Object.entries(itemSchema).forEach(([key,field])=>{const val=item[key];if(field.required&&(val===""||val===null||val===undefined)){errors[key]="Required";}else if(field.type==="number"&&val!==""&&Number(val)<(field.min??0)){errors[key]=`Min ${field.min??0}`;}});return errors;}

function DevSchemaField({ fieldKey, fieldDef, value, onChange, error }) {
  const baseInput = { width:"100%", padding:"6px 10px", border:`1.5px solid ${error?C.red:C.border}`, borderRadius:6, fontSize:12, fontFamily:font, color:C.textDark, background:error?"#fff5f5":C.white, outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px" }}>
        {fieldDef.label}{fieldDef.required&&<span style={{color:C.red,marginLeft:2}}>*</span>}
      </label>
      {fieldDef.type==="select"?(
        <select value={value??fieldDef.options[0]} onChange={e=>onChange(e.target.value)} style={{...baseInput,cursor:"pointer"}}>
          {fieldDef.options.map(opt=><option key={opt} value={opt}>{opt}</option>)}
        </select>
      ):(
        <input type={fieldDef.type==="number"?"number":"text"} value={value??""} min={fieldDef.min} placeholder={fieldDef.type==="number"?`≥ ${fieldDef.min??0}`:fieldDef.label} onChange={e=>onChange(e.target.value)} onFocus={e=>{e.target.style.borderColor=C.accent;}} onBlur={e=>{e.target.style.borderColor=error?C.red:C.border;}} style={baseInput}/>
      )}
      {error&&<span style={{fontSize:9,color:C.red,fontWeight:600}}>{error}</span>}
    </div>
  );
}

function DevSchemaArraySection({ sectionKey, sectionDef, items, onChange }) {
  const [validationMap, setValidationMap] = useState({});
  const addItem = () => onChange([...items, makeDefaultItem(sectionDef.item)]);
  const removeItem = idx => { onChange(items.filter((_,i)=>i!==idx)); setValidationMap(prev=>{const n={...prev};delete n[idx];return n;}); };
  const updateField = (idx, key, val) => {
    const next = items.map((item,i)=>i===idx?{...item,[key]:val}:item);
    onChange(next);
    const errs = validateItem(sectionDef.item, {...items[idx],[key]:val});
    setValidationMap(prev=>({...prev,[idx]:errs}));
  };
  const firstField = Object.keys(sectionDef.item)[0];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:8, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>{sectionDef.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.textDark }}>{sectionDef.label}</div>
            <div style={{ fontSize:9, color:C.muted }}>{items.length} item{items.length!==1?"s":""} configured</div>
          </div>
        </div>
        <button onClick={addItem} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 16px", borderRadius:7, border:"none", background:C.accent, color:C.white, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:font, transition:"opacity 0.15s" }} onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          + Add {sectionDef.label.replace(" Configuration","")}
        </button>
      </div>
      {items.length===0&&(<div style={{padding:"24px",textAlign:"center",color:C.muted,fontSize:12,background:C.offWhite,borderRadius:8,border:`1.5px dashed ${C.border}`}}>No items yet — click <strong>+ Add</strong> above to begin</div>)}
      {items.map((item,idx)=>{
        const errs=validationMap[idx]??{};const hasErrors=Object.keys(errs).length>0;
        return(
          <div key={idx} style={{background:C.white,border:`1.5px solid ${hasErrors?C.red+"66":C.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px",background:hasErrors?"#fff5f5":C.offWhite,borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:hasErrors?C.red:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.white,flexShrink:0}}>{idx+1}</div>
                <span style={{fontSize:12,fontWeight:600,color:C.textDark}}>{item[firstField]||`Item ${idx+1}`}</span>
                {hasErrors&&<span style={{fontSize:9,color:C.red,fontWeight:700,background:"#fee2e2",padding:"1px 8px",borderRadius:10}}>⚠ Validation errors</span>}
              </div>
              <button onClick={()=>removeItem(idx)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.muted,fontSize:11,padding:"4px 10px",fontWeight:600,transition:"all 0.12s",fontFamily:font}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;e.currentTarget.style.background="#fee2e2";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;e.currentTarget.style.background="none";}}>✕ Remove</button>
            </div>
            <div style={{padding:"14px",display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(175px, 1fr))",gap:12}}>
              {Object.entries(sectionDef.item).map(([fk,fd])=>(<DevSchemaField key={fk} fieldKey={fk} fieldDef={fd} value={item[fk]} error={errs[fk]} onChange={val=>updateField(idx,fk,val)}/>))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DCUDeveloperSetupPanel({ onClose }) {
  const [config, setConfig] = useState({ equipment:{ heaters:[], coke_drums:[] } });
  const [activeTab, setActiveTab] = useState("heaters");
  const [showJson, setShowJson] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const updateSection = (sectionKey, newItems) => setConfig(prev=>({...prev,equipment:{...prev.equipment,[sectionKey]:newItems}}));
  const handleSave = () => { console.log("[DCU Developer Setup] Config saved:", JSON.stringify(config,null,2)); setSavedFlash(true); setTimeout(()=>setSavedFlash(false),2400); };
  const totalItems = Object.values(config.equipment).reduce((s,arr)=>s+arr.length,0);
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(10,22,40,0.62)",backdropFilter:"blur(4px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:"min(800px,95vw)",background:C.offWhite,display:"flex",flexDirection:"column",boxShadow:"-10px 0 60px rgba(10,22,40,0.32)",fontFamily:font}}>
        <div style={{background:`linear-gradient(135deg,${C.navyMid} 0%,#0a3560 100%)`,padding:"14px 20px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:"rgba(0,180,216,0.2)",border:"1px solid rgba(0,180,216,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚙️</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.white,letterSpacing:"0.3px"}}>DCU Developer Setup</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1}}>Schema-driven equipment configuration · {totalItems} item{totalItems!==1?"s":""} defined</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowJson(p=>!p)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${showJson?C.accent:"rgba(255,255,255,0.2)"}`,background:showJson?"rgba(0,180,216,0.2)":"transparent",color:showJson?C.accent:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font,transition:"all 0.15s"}}>{showJson?"◀ Hide JSON":"{ } Preview JSON"}</button>
            <button onClick={handleSave} style={{padding:"7px 20px",borderRadius:7,border:"none",background:savedFlash?C.green:C.accent,color:C.white,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:font,transition:"background 0.2s",display:"flex",alignItems:"center",gap:6}}>{savedFlash?"✓ Saved!":"💾 Save Config"}</button>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontSize:16,color:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",gap:2,flexShrink:0}}>
          {Object.entries(equipmentSchema).map(([key,def])=>{const count=config.equipment[key]?.length??0;const isActive=activeTab===key;return(<div key={key} onClick={()=>setActiveTab(key)} style={{padding:"10px 18px",cursor:"pointer",fontSize:11,fontWeight:isActive?700:500,color:isActive?C.accent:C.muted,borderBottom:`2px solid ${isActive?C.accent:"transparent"}`,marginBottom:-1,display:"flex",alignItems:"center",gap:7,transition:"all 0.15s",userSelect:"none"}}><span>{def.icon}</span>{def.label}{count>0&&<span style={{background:isActive?C.accent:C.border,color:isActive?C.white:C.muted,borderRadius:20,padding:"1px 8px",fontSize:9,fontWeight:700}}>{count}</span>}</div>);})}
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex"}}>
          <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:16}}>
            {Object.entries(equipmentSchema).map(([key,def])=>activeTab===key?(<DevSchemaArraySection key={key} sectionKey={key} sectionDef={def} items={config.equipment[key]??[]} onChange={items=>updateSection(key,items)}/>):null)}
          </div>
          {showJson&&(
            <div style={{width:300,flexShrink:0,borderLeft:`1px solid ${C.border}`,background:C.navy,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:10,fontWeight:700,color:C.accent,letterSpacing:"0.8px",textTransform:"uppercase"}}>Live JSON Preview</span>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{JSON.stringify(config).length} chars</span>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
                <pre style={{margin:0,fontSize:10,lineHeight:1.75,color:"#7dd3fc",fontFamily:"'Cascadia Code','Fira Code','Courier New',monospace",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(config,null,2)}</pre>
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                <button onClick={()=>{navigator.clipboard?.writeText(JSON.stringify(config,null,2)).catch(()=>{});}} style={{width:"100%",padding:"7px",borderRadius:6,border:`1px solid rgba(0,180,216,0.35)`,background:"rgba(0,180,216,0.12)",color:C.accent,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:font}}>📋 Copy JSON to Clipboard</button>
              </div>
            </div>
          )}
        </div>
        <div style={{background:C.white,borderTop:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:16,flexShrink:0,flexWrap:"wrap"}}>
          {Object.entries(equipmentSchema).map(([key,def])=>{const count=config.equipment[key]?.length??0;return(<div key={key} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.textMid}}><span>{def.icon}</span><span style={{fontWeight:700,color:C.textDark}}>{count}</span><span>{def.label.replace(" Configuration",count===1?"":"s")}</span></div>);})}
          <div style={{marginLeft:"auto",fontSize:10,color:C.muted}}>Click outside or ✕ to close · JSON updates live as you type</div>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const[data,setData]=useState(null);
  const[activeUnit,setActiveUnit]=useState("DCU");
  const[activeDCUNav,setActiveDCUNav]=useState("OVERVIEW");
  const[activeCDUNav,setActiveCDUNav]=useState("OVERVIEW");
  const[activeTopNav,setActiveTopNav]=useState(null);
  const[activeOpportunity,setActiveOpportunity]=useState(null);
  const[activeGauge,setActiveGauge]=useState(false);
  const[kpiTrendKey,setKpiTrendKey]=useState(null);
  const[showCal,setShowCal]=useState(false);
  const[calDate,setCalDate]=useState(new Date());
  const fetchData=async()=>{try{const res=await axios.get("http://localhost:8000/run-model");setData(res.data);}catch(err){console.error(err);}};
  useEffect(()=>{fetchData();const id=setInterval(fetchData,5000);return()=>clearInterval(id);},[]);

  if(!data?.latest)return(
    <><GlobalStyle/><div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f0f5f9",gap:12}}><div style={{width:38,height:38,borderRadius:8,background:`linear-gradient(135deg,${C.accent},${C.navy})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:4}}>🏭</div><div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><div style={{color:C.muted,fontSize:12,fontWeight:500,letterSpacing:"0.3px",marginTop:4}}>Loading DCU Data…</div></div></>
  );

  const d=data.latest;
  const alarmColor=d.prediction>d.upper?"red":d.prediction<d.lower?"orange":"green";
  const optFurnace=12;const optHGI=(d.lower+d.upper)/2;
  const showDeveloperInfo=activeTopNav==="DEVELOPER INFO";
  const currentNav=showDeveloperInfo?"DEVELOPER INFO":(activeUnit==="CDU"?activeCDUNav:activeDCUNav);
  const handleOpportunityClick=type=>{setActiveGauge(false);setActiveOpportunity(prev=>prev===type?null:type);};
  const handleGaugeClick=()=>{setActiveOpportunity(null);setActiveGauge(prev=>!prev);};
  const navTopItems=[{icon:"🛠️",label:"DEVELOPER INFO"},{icon:"🏢",label:"SEA OIL CORP"},{icon:"🔗",label:"TANSEIN REFINERY"}];

  return(
    <><GlobalStyle/>
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",fontFamily:font}}>
      <div style={{height:60,flexShrink:0,background:C.white,borderBottom:`3px solid ${C.navy}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:16,fontWeight:800,color:C.textDark,letterSpacing:"0.3px"}}>DELAYED COKER UNIT</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          {["👤","✉️","❓","⏻"].map(i=><span key={i} style={{fontSize:18,cursor:"pointer",color:C.muted,opacity:0.7}}>{i}</span>)}
          <div style={{width:1,height:24,background:C.border}}/>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.white}}>J</div>
            <div><div style={{fontSize:11,fontWeight:700,color:C.textDark}}>Welcome</div><div style={{fontSize:10,color:C.muted}}>John Doe · Admin</div></div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <aside style={{width:175,flexShrink:0,background:C.white,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 8px",borderBottom:`1px solid ${C.border}`}}/>
          <div style={{padding:"8px 8px"}}>
            {navTopItems.map(n=>{const isActive=activeTopNav===n.label;return(<div key={n.label} className="nav-item" onClick={()=>setActiveTopNav(prev=>prev===n.label?null:n.label)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 12px",borderRadius:5,fontSize:11,fontWeight:isActive?700:500,color:isActive?C.white:C.textMid,cursor:"pointer",marginBottom:3,background:isActive?C.accent:"transparent"}}><span style={{fontSize:12}}>{n.icon}</span>{n.label}</div>);})}
          </div>
          <div style={{padding:"0 8px",marginTop:4,overflowY:"auto",flex:1}}>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.6px",padding:"6px 10px 2px"}}>Units</div>
            {[{unit:"CDU",items:["OVERVIEW"]},{unit:"DCU",items:["OVERVIEW","MONITORING","CONFIGURATIONS"]}].map(({unit,items})=>{
              const isUnitActive=!showDeveloperInfo&&activeUnit===unit;
              const activeItem=unit==="CDU"?activeCDUNav:activeDCUNav;
              const setItem=unit==="CDU"?setActiveCDUNav:setActiveDCUNav;
              return(<div key={unit}>
                <div onClick={()=>{setActiveUnit(unit);setActiveTopNav(null);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:5,fontSize:11,fontWeight:500,color:C.textMid,cursor:"pointer",marginBottom:2}}>
                  <span>🔧 {unit}</span><span style={{fontSize:9,color:C.muted}}>{isUnitActive?"▲":"▼"}</span>
                </div>
                {isUnitActive&&items.map(item=>(<div key={item} className="nav-sub" onClick={()=>setItem(item)} style={{padding:"7px 10px 7px 26px",borderRadius:5,fontSize:11,fontWeight:activeItem===item?700:400,color:activeItem===item?C.accent:C.textMid,background:activeItem===item?C.accentLight:"transparent",marginBottom:2,cursor:"pointer"}}>{item}</div>))}
              </div>);
            })}
          </div>
        </aside>

        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {(()=>{
            const today=new Date();
            const yr=calDate.getFullYear(),mo=calDate.getMonth();
            const firstDay=new Date(yr,mo,1).getDay();
            const daysInMo=new Date(yr,mo+1,0).getDate();
            const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
            const cells=[];
            for(let i=0;i<firstDay;i++)cells.push(null);
            for(let d=1;d<=daysInMo;d++)cells.push(d);
            while(cells.length%7!==0)cells.push(null);
            return(
              <div style={{height:48,flexShrink:0,background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 20px",position:"relative"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.textDark,textTransform:"uppercase",letterSpacing:"0.4px"}}>{currentNav}</div>
                  <span style={{color:C.border}}>|</span>
                  <div style={{fontSize:10,color:C.muted}}>TANSEIN REFINERY</div>
                </div>
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)"}}>
                  {!showDeveloperInfo&&activeUnit==="DCU"&&activeDCUNav==="OVERVIEW"&&(
                    <div style={{display:"flex",borderRadius:20,overflow:"hidden",border:`1px solid ${C.border}`}}>
                      <div style={{padding:"5px 20px",background:C.accent,color:C.white,fontSize:10,fontWeight:700,cursor:"pointer"}}>ONLINE</div>
                      <div style={{padding:"5px 20px",background:C.white,color:C.muted,fontSize:10,fontWeight:600,cursor:"pointer"}}>SPALL</div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12,flex:1,justifyContent:"flex-end"}}>
                  <div style={{fontSize:10,color:C.muted}}>
                    <span style={{fontWeight:700,color:C.textDark}}>ACTUAL : </span>
                    <span style={{color:C.accent,fontWeight:600}}>{today.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} · {today.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:15,cursor:"pointer",opacity:0.7}}>⚠️</span>
                    <span onClick={()=>setShowCal(p=>!p)} style={{fontSize:15,cursor:"pointer",opacity:showCal?1:0.7,color:showCal?C.accent:"inherit",position:"relative"}}>📅</span>
                    <span style={{fontSize:15,cursor:"pointer",opacity:0.7}}>🔔</span>
                    <span style={{fontSize:15,cursor:"pointer",opacity:0.7}}>🔕</span>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <div style={{padding:"2px 8px",background:"#fff3e8",border:"1px solid #ffd08a",borderRadius:4,textAlign:"center"}}>
                      <div style={{fontSize:13,fontWeight:800,color:C.orange,lineHeight:1.2}}>7</div>
                      <div style={{fontSize:8,fontWeight:700,color:C.orange,letterSpacing:"0.3px"}}>ACTIVE ALERT</div>
                    </div>
                    <div style={{padding:"2px 8px",background:"#fdecea",border:"1px solid #f5b3b3",borderRadius:4,textAlign:"center"}}>
                      <div style={{fontSize:13,fontWeight:800,color:C.red,lineHeight:1.2}}>3</div>
                      <div style={{fontSize:8,fontWeight:700,color:C.red,letterSpacing:"0.3px"}}>OVERDUE</div>
                    </div>
                  </div>
                </div>
                {showCal&&(
                  <div style={{position:"absolute",top:52,right:160,zIndex:999,background:C.white,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 8px 28px rgba(0,50,100,0.15)",width:260,fontFamily:font}}>
                    <div style={{background:`linear-gradient(135deg,${C.accent},${C.navy})`,borderRadius:"10px 10px 0 0",padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <button onClick={()=>setCalDate(new Date(yr,mo-1,1))} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,cursor:"pointer",borderRadius:5,padding:"3px 9px",fontSize:13,fontWeight:700}}>‹</button>
                      <div style={{fontSize:13,fontWeight:700,color:C.white}}>{MONTHS[mo]} {yr}</div>
                      <button onClick={()=>setCalDate(new Date(yr,mo+1,1))} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,cursor:"pointer",borderRadius:5,padding:"3px 9px",fontSize:13,fontWeight:700}}>›</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"8px 10px 4px",gap:2}}>
                      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(<div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:C.muted,padding:"2px 0"}}>{d}</div>))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 10px 10px",gap:2}}>
                      {cells.map((d,i)=>{const isToday=d&&d===today.getDate()&&mo===today.getMonth()&&yr===today.getFullYear();return(<div key={i} style={{textAlign:"center",padding:"5px 2px",fontSize:11,fontWeight:isToday?700:400,color:isToday?C.white:d?C.textDark:"transparent",background:isToday?C.accent:"transparent",borderRadius:isToday?5:0,cursor:d?"pointer":"default",transition:"background 0.1s"}} onMouseEnter={e=>{if(d&&!isToday)e.currentTarget.style.background=C.accentLight;}} onMouseLeave={e=>{if(!isToday)e.currentTarget.style.background="transparent";}}>{d||""}</div>);})}
                    </div>
                    <div style={{padding:"6px 10px 10px",textAlign:"center"}}>
                      <button onClick={()=>setCalDate(new Date())} style={{padding:"5px 20px",background:C.accentLight,border:`1px solid ${C.accent}`,borderRadius:5,color:C.accent,fontSize:11,fontWeight:600,cursor:"pointer"}}>Today</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {showDeveloperInfo && <DeveloperInfoPage />}
          {!showDeveloperInfo && activeUnit==="CDU" && activeCDUNav==="OVERVIEW" && <CrudeSupplyChainPage/>}
          {!showDeveloperInfo && activeUnit==="DCU" && activeDCUNav==="MONITORING" && <MonitoringPage trend={data.trend} latest={d}/>}
          {!showDeveloperInfo && activeUnit==="DCU" && activeDCUNav==="CONFIGURATIONS" && <ConfigurationsPage/>}

          {!showDeveloperInfo && activeUnit==="DCU" && activeDCUNav==="OVERVIEW" && (
            <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:12,background:"#FFFFF0"}}>
              <div style={{display:"flex",gap:12}}>
                <div onClick={handleGaugeClick} style={{flex:1,cursor:"pointer",borderRadius:8,padding:"16px 18px",background:activeGauge?`linear-gradient(135deg,${C.accent},${C.navyMid})`:"linear-gradient(135deg,#e8f5fb,#D3DFE4)",border:`1px solid ${activeGauge?C.accent:C.border}`,boxShadow:activeGauge?"0 2px 6px rgba(0,153,204,0.25)":"0 2px 6px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",gap:14,transition:"all 0.15s",position:"relative",overflow:"hidden"}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:activeGauge?"rgba(255,255,255,0.2)":"rgba(0,153,204,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>⚙️</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:activeGauge?C.white:C.textDark,lineHeight:1}}>{(d.prediction??72.4).toFixed(1)}%</div>
                    <div style={{fontSize:11,fontWeight:700,color:activeGauge?"rgba(255,255,255,0.8)":C.accentDim,textTransform:"uppercase",letterSpacing:"0.4px",marginTop:3}}>PROCESS EFFICIENCY</div>
                    <div style={{fontSize:10,color:activeGauge?"rgba(255,255,255,0.65)":C.textDark,marginTop:4}}>PREDICTED PRODUCTION OPPORTUNITY</div>
                    <div style={{fontSize:12,fontWeight:700,color:activeGauge?C.white:C.accent,marginTop:2}}>{((d.prediction/d.upper)*100).toFixed(1)} MT/DAY</div>
                  </div>
                  {activeGauge&&<div style={{position:"absolute",top:8,right:10,width:16,height:16,borderRadius:"50%",background:"rgba(255,255,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:C.white}}>✓</div>}
                </div>
                <div onClick={()=>handleOpportunityClick("energy")} style={{flex:1,cursor:"pointer",borderRadius:8,padding:"16px 18px",background:activeOpportunity==="energy"?`linear-gradient(135deg,${C.accent},${C.navyMid})`:"linear-gradient(135deg,#e8f5fb,#D3DFE4)",border:`1px solid ${activeOpportunity==="energy"?C.accent:C.border}`,boxShadow:activeOpportunity==="energy"?"0 2px 6px rgba(0,153,204,0.35)":"0 2px 6px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",gap:14,transition:"all 0.15s"}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:activeOpportunity==="energy"?"rgba(255,255,255,0.2)":"rgba(0,153,204,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>💧</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:activeOpportunity==="energy"?C.white:C.textDark,lineHeight:1}}>95.6%</div>
                    <div style={{fontSize:11,fontWeight:700,color:activeOpportunity==="energy"?"rgba(255,255,255,0.8)":C.accentDim,textTransform:"uppercase",letterSpacing:"0.4px",marginTop:3}}>ENERGY EFFICIENCY</div>
                    <div style={{fontSize:10,color:activeOpportunity==="energy"?"rgba(255,255,255,0.65)":C.textDark,marginTop:4}}>PREDICTED ENERGY REDUCTION OPPORTUNITY</div>
                    <div style={{fontSize:12,fontWeight:700,color:activeOpportunity==="energy"?C.white:C.accent,marginTop:2}}>372 MMBTU/DAY</div>
                  </div>
                </div>
                <div onClick={()=>handleOpportunityClick("co2")} style={{flex:1,cursor:"pointer",borderRadius:8,padding:"16px 18px",background:activeOpportunity==="co2"?`linear-gradient(135deg,${C.accent},${C.navyMid})`:"linear-gradient(135deg,#e8f5fb,#D3DFE4)",border:`1px solid ${activeOpportunity==="co2"?C.accent:C.border}`,boxShadow:activeOpportunity==="co2"?"0 2px 6px rgba(0,153,204,0.35)":"0 2px 6px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",gap:14,transition:"all 0.15s"}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:activeOpportunity==="co2"?"rgba(255,255,255,0.2)":"rgba(0,153,204,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌱</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:activeOpportunity==="co2"?C.white:C.textDark,lineHeight:1}}>96.6%</div>
                    <div style={{fontSize:11,fontWeight:700,color:activeOpportunity==="co2"?"rgba(255,255,255,0.8)":C.accentDim,textTransform:"uppercase",letterSpacing:"0.4px",marginTop:3}}>ENVIRONMENT EFFICIENCY</div>
                    <div style={{fontSize:10,color:activeOpportunity==="co2"?"rgba(255,255,255,0.65)":C.textDark,marginTop:4}}>PREDICTED CO₂ REDUCTION OPPORTUNITY</div>
                    <div style={{fontSize:12,fontWeight:700,color:activeOpportunity==="co2"?C.white:C.accent,marginTop:2}}>{d.houronline?.toFixed(2)??"—"} MT/DAY</div>
                  </div>
                </div>
                <div style={{flex:0.7,borderRadius:8,padding:"16px 18px",background:"linear-gradient(135deg,#e8f5fb,#D3DFE4)",border:`1px solid ${C.border}`,boxShadow:"0 2px 6px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(249,115,22,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>⚠️</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:alarmColor==="green"?C.green:alarmColor==="red"?C.red:C.orange,lineHeight:1}}>4</div>
                    <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.4px",marginTop:3}}>ACTIVE DEVIATION</div>
                    <div style={{fontSize:10,color:C.textDark,marginTop:4}}>OVERDUE DEVIATION</div>
                    <div style={{fontSize:12,fontWeight:700,color:alarmColor==="green"?C.green:alarmColor==="red"?C.red:C.orange,marginTop:2}}>0</div>
                  </div>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div style={{background:C.white,borderRadius:8,padding:12,border:`1px solid ${C.border}`}}><SectionHeader title="Performance KPIs"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:"250px",overflowY:"auto",paddingRight:4}}><KPICard label="Liquid Yield" actual={d.prediction-3} unit="%"/><KPICard label="Coke Yield" actual={d.cokeyield} unit="%"/><KPICard label="Thermal Efficiency" actual="89" unit="%"/><KPICard label="Capacity Utilization" actual={`${d.capacityutilization}`} unit="%"/><KPICard label="Energy Specific Consumption" actual={`${d.specificenergyconsumption}`} unit=""/><KPICard label="Specific Fuel Consumption" actual={d.specificfuelconsumption} unit="t/d"/></div></div>
                <div style={{background:C.white,borderRadius:8,padding:12,border:`1px solid ${C.border}`}}><SectionHeader title="Predicted KPIs"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:"250px",overflowY:"auto",paddingRight:4}}><KPICard label="Coke Drum HGI" actual={d.prediction} trendKey="hgi" onTrendClick={setKpiTrendKey}/><KPICard label="Coke Drum Outage" actual={d.cokedrum_outage_predicted} unit="ft"/><KPICard label="Coke Drum Fouling Index" actual={d.prediction-22}/><KPICard label="Furnace Runlength" actual="14" optimum="32"/><KPICard label="Foamover Probability" actual="10" unit="%"/><KPICard label="Hour Online" actual={d.houronline} unit="hrs" trendKey="houronline" onTrendClick={setKpiTrendKey}/></div></div>
                <div style={{background:C.white,borderRadius:8,padding:12,border:`1px solid ${C.border}`}}>
                  {activeGauge?(<><SectionHeader title="Key Parameters – Process"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:"250px",overflowY:"auto",paddingRight:4}}><KPICard label="Fresh Feed" actual={d.freshcharge} unit="BPD" trendKey="freshcharge" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Inlet Temp" actual={d.inlettemp} unit="deg F" trendKey="inlettemp" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Inlet Pressure" actual={d.inletpress} unit="psig" trendKey="inletpress" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Outlet Temp" actual={d.outlettemp} unit="deg F" trendKey="outlettemp" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Outlet Pressure" actual={d.outletpress} unit="psig" trendKey="outletpress" onTrendClick={setKpiTrendKey}/><KPICard label="Recycle Ratio" actual={d.residapi} unit=""/><KPICard label="SHC Ratio" actual="0.32" unit=""/><KPICard label="CPR" actual="1.2" unit=""/><KPICard label="Quench Flow" actual={d.residapi} unit="" highlight/><KPICard label="HIC Valve Opening" actual="15" unit="%" highlight/></div></>)
                  :activeOpportunity?(<><SectionHeader title={`Key Parameters – ${activeOpportunity==="energy"?"Energy":"Environment"}`}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:"250px",overflowY:"auto",paddingRight:4}}><KPICard label="Damper Opening" actual="88" unit="%"/><KPICard label="Arc O2" actual="3.7" unit=""/><KPICard label="Fired Duty" actual={d.residapi} unit=""/><KPICard label="Crossover Temperature" actual={d.residapi} unit=""/><KPICard label="Bridge Wall Temperature" actual={d.residapi} unit=""/></div></>)
                  :(<><SectionHeader title="Key Parameters – Process"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:"250px",overflowY:"auto",paddingRight:4}}><KPICard label="Fresh Feed" actual={d.freshcharge} unit="BPD" trendKey="freshcharge" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Inlet Temp" actual={d.inlettemp} unit="deg F" trendKey="inlettemp" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Inlet Pressure" actual={d.inletpress} unit="psig" trendKey="inletpress" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Outlet Temp" actual={d.outlettemp} unit="deg F" trendKey="outlettemp" onTrendClick={setKpiTrendKey}/><KPICard label="Drum Outlet Pressure" actual={d.outletpress} unit="psig" trendKey="outletpress" onTrendClick={setKpiTrendKey}/><KPICard label="Recycle Ratio" actual={d.residapi} unit=""/><KPICard label="Damper Opening" actual="88" unit="%" highlight/><KPICard label="Arc O2" actual="3.7" unit="" highlight/><KPICard label="Fired Duty" actual={d.residapi} unit="" highlight/><KPICard label="HIC Valve Opening" actual="15" unit="%" highlight/></div></>)}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:12}}>
                <div style={{background:C.white,borderRadius:8,padding:12,border:`1px solid ${C.border}`}}>
                  <SectionHeader title="Actionables – Process"/>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["KPI","CAUSE","ACTUAL","OPTIMUM","SUGGESTIONS"].map(h=>(<th key={h} style={{background:"#f0f6fa",padding:"7px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",borderBottom:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`}}>{h}</th>))}</tr></thead><tbody>
                    <tr className="action-row"><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,fontWeight:700,verticalAlign:"top"}}>HGI</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,color:C.orange,fontSize:11,verticalAlign:"top"}}>{d.prediction>d.upper?"HIGH HGI VALUE":d.prediction<d.lower?"LOW HGI VALUE":"WITHIN RANGE"}</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontWeight:600}}>{d.prediction?.toFixed(1)}</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,color:C.accentDim,fontWeight:600}}>{optHGI.toFixed(1)}</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.textMid,lineHeight:1.5}}>{d.prediction>d.upper?"Reduce furnace COT / adjust severity":d.prediction<d.lower?"Increase severity / optimize drum switching":"Operating within limits ✓"}</td></tr>
                    <tr className="action-row"><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontWeight:700,verticalAlign:"top"}}>Drum</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,color:C.orange,fontSize:11,verticalAlign:"top"}}>{d.drum_status?.drum1==="Offline"?"DRUM 1 OFFLINE":"DRUM STATUS OK"}</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`}}><span className={`badge badge-${d.drum_status?.drum1==="Online"?"green":"orange"}`}>{d.drum_status?.drum1??"—"}</span></td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,color:C.accentDim,fontWeight:600}}>Online</td><td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.textMid}}>Monitor drum switching schedule to prevent unplanned downtime</td></tr>
                    <tr className="action-row"><td style={{padding:"8px 10px",fontWeight:700,verticalAlign:"top"}}>Furnace</td><td style={{padding:"8px 10px",color:C.muted,fontSize:11,verticalAlign:"top"}}>CHARGE RATE</td><td style={{padding:"8px 10px",fontWeight:600}}>{d.furnacecharge}</td><td style={{padding:"8px 10px",color:C.accentDim,fontWeight:600}}>{optFurnace}</td><td style={{padding:"8px 10px",fontSize:11,color:C.textMid}}>{d.furnacecharge>optFurnace?"Consider reducing furnace charge to optimum level":"Maintain current furnace charge rate"}</td></tr>
                  </tbody></table>
                </div>
                <ChartPanel d={d} trend={data.trend} runlengthTrend={data.runlength?.trend??[]}/>
              </div>

              <div style={{background:C.pageBg,borderRadius:6,padding:"7px 16px",display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:600,flexShrink:0}}>
                <span style={{color:C.navy,fontWeight:700}}>FURNACE</span>
                <span style={{color:"#1a7a3a",marginLeft:8}}>ONLINE: F1</span>
                <span style={{color:"#7a3000",margin:"0 6px"}}>|</span>
                <span style={{color:"#7a3000"}}>SPALL: F2 · P1</span>
                <span style={{margin:"0 10px",color:C.navy}}>|</span>
                <span style={{color:C.navy,fontWeight:700}}>COKE DRUM:</span>
                <span style={{color:"#1a7a3a",marginLeft:8}}>ONLINE: CD-11</span>
                <span style={{color:"#7a3000",margin:"0 6px"}}>|</span>
                <span style={{color:C.red}}>OFFLINE: CD-12</span>
                <div style={{marginLeft:"auto",background:C.navy,color:C.white,padding:"4px 14px",borderRadius:4,fontSize:10,fontWeight:700,cursor:"pointer"}}>TMT SUMMARY</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {kpiTrendKey&&<KPITrendModal trendKey={kpiTrendKey} trend={data.trend} onClose={()=>setKpiTrendKey(null)}/>}
    </div>
    </>
  );
}