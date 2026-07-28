"use client";

import { useEffect, useMemo, useState } from "react";

type Action = "PULL IN" | "CREATE PO" | "PUSH OUT" | "MONITOR" | "RESEARCH" | "OBSOLETE";
type Criticality = "Low" | "Medium" | "High" | "Critical";
type Lifecycle = "Active" | "Phase-out" | "Obsolete";
type Disposition = "pending" | "approved" | "overridden" | "evidence";

type Scenario = {
  sku: string; name: string; site: string; supplier: string; onHand: number;
  openPO: number; weeklyDemand: number; volatility: number; leadTime: number;
  otd: number; unitCost: number; safetyStock: number; inspection: number;
  lifecycle: Lifecycle; criticality: Criticality; concentration: number;
};

type Analysis = {
  action: Action; weeksSupply: number; reorderPoint: number; reorderGap: number;
  stockoutDays: number; supplierRisk: number; cashExposure: number; recommendedQty: number;
  confidence: number; confidenceLabel: string; reasons: string[]; counterargument: string;
  unknowns: string[]; rules: string[]; nextAction: string; owner: string;
  expediteCost: number; carryingCost: number; operationalRisk: number;
};

const seed: Scenario[] = [
  { sku:"SV-2048", name:"Sterile Process Valve", site:"Cambridge", supplier:"Apex Flow", onHand:38, openPO:60, weeklyDemand:32, volatility:28, leadTime:8, otd:71, unitCost:840, safetyStock:52, inspection:12, lifecycle:"Active", criticality:"Critical", concentration:92 },
  { sku:"PF-1180", name:"Barrier Packaging Film", site:"Raleigh", supplier:"NovaPack", onHand:9200, openPO:6000, weeklyDemand:1200, volatility:9, leadTime:5, otd:94, unitCost:2.8, safetyStock:1800, inspection:0, lifecycle:"Active", criticality:"Medium", concentration:54 },
  { sku:"TS-0441", name:"Legacy Temperature Sensor", site:"Austin", supplier:"ThermaCore", onHand:480, openPO:0, weeklyDemand:14, volatility:42, leadTime:12, otd:83, unitCost:126, safetyStock:80, inspection:20, lifecycle:"Obsolete", criticality:"Low", concentration:77 },
  { sku:"FM-7712", name:"Filter Membrane 0.2µm", site:"Cambridge", supplier:"PureSep", onHand:210, openPO:300, weeklyDemand:115, volatility:18, leadTime:6, otd:88, unitCost:34, safetyStock:160, inspection:90, lifecycle:"Active", criticality:"Critical", concentration:68 },
  { sku:"BX-3100", name:"Cold-chain Shipping Box", site:"Raleigh", supplier:"PolarPak", onHand:1600, openPO:0, weeklyDemand:420, volatility:14, leadTime:3, otd:97, unitCost:18, safetyStock:700, inspection:0, lifecycle:"Active", criticality:"High", concentration:39 },
  { sku:"PT-8821", name:"Pressure Transmitter", site:"Austin", supplier:"SignalWorks", onHand:42, openPO:48, weeklyDemand:12, volatility:35, leadTime:10, otd:76, unitCost:575, safetyStock:36, inspection:8, lifecycle:"Phase-out", criticality:"High", concentration:84 },
  { sku:"GL-5530", name:"Borosilicate Vial 20mL", site:"Cambridge", supplier:"VitraLab", onHand:12500, openPO:8000, weeklyDemand:3900, volatility:21, leadTime:7, otd:91, unitCost:0.74, safetyStock:6100, inspection:2400, lifecycle:"Active", criticality:"Critical", concentration:61 },
  { sku:"LB-0902", name:"Regulatory Label Roll", site:"Raleigh", supplier:"MarkRight", onHand:7400, openPO:10000, weeklyDemand:900, volatility:8, leadTime:4, otd:98, unitCost:0.18, safetyStock:1600, inspection:0, lifecycle:"Active", criticality:"Medium", concentration:27 },
  { sku:"MP-6604", name:"Sanitary Pump Assembly", site:"Austin", supplier:"Apex Flow", onHand:5, openPO:4, weeklyDemand:2.2, volatility:48, leadTime:16, otd:68, unitCost:4200, safetyStock:7, inspection:1, lifecycle:"Active", criticality:"Critical", concentration:95 },
  { sku:"CP-2217", name:"Cleaning Polymer", site:"Cambridge", supplier:"ChemNorth", onHand:3400, openPO:1000, weeklyDemand:520, volatility:12, leadTime:4, otd:93, unitCost:6.4, safetyStock:900, inspection:300, lifecycle:"Active", criticality:"High", concentration:46 },
  { sku:"GC-1910", name:"Guide Clamp", site:"Raleigh", supplier:"MotionFab", onHand:86, openPO:0, weeklyDemand:18, volatility:31, leadTime:9, otd:79, unitCost:92, safetyStock:55, inspection:0, lifecycle:"Phase-out", criticality:"Medium", concentration:73 },
  { sku:"RM-4040", name:"Resin Media", site:"Austin", supplier:"PureSep", onHand:640, openPO:800, weeklyDemand:110, volatility:24, leadTime:11, otd:86, unitCost:144, safetyStock:330, inspection:160, lifecycle:"Active", criticality:"High", concentration:66 },
];

const stages = [
  ["INTAKE", "Validating record completeness and unit consistency"],
  ["PARALLEL SCAN", "Five specialists are examining the exception"],
  ["CHALLENGE", "The Risk Challenger contests the leading action"],
  ["SIMULATION", "Testing demand, delay, and cash scenarios"],
  ["SYNTHESIS", "Reconciling rules, evidence, and disagreement"],
  ["HUMAN REVIEW", "Recommendation ready for accountable review"],
];

const agents = [
  { id:"demand", short:"DS", name:"Demand Sentinel", color:"#38d8c6", task:["Validating consumption history","Testing demand volatility","Estimating stockout horizon","Forecast signal complete"] },
  { id:"supplier", short:"SS", name:"Supplier Scout", color:"#63b3ff", task:["Checking PO exposure","Reading delivery reliability","Testing lead-time delay","Supplier signal complete"] },
  { id:"inventory", short:"IS", name:"Inventory Strategist", color:"#a9df66", task:["Checking coverage and ROP","Inspecting quarantine stock","Testing feasible actions","Inventory signal complete"] },
  { id:"finance", short:"FG", name:"Finance Guardian", color:"#f4c45e", task:["Calculating cash exposure","Comparing expedite premium","Testing carrying cost","Finance signal complete"] },
  { id:"challenger", short:"RC", name:"Risk Challenger", color:"#ff765f", task:["Searching for missing evidence","Contesting leading action","Stress-testing failure modes","Challenge recorded"] },
  { id:"orchestrator", short:"DO", name:"Decision Orchestrator", color:"#d5e7ff", task:["Opening decision record","Watching specialist signals","Reconciling disagreement","Building review memo"] },
];

function analyze(s: Scenario): Analysis {
  const usable = Math.max(0, s.onHand + s.inspection * .55);
  const weeksSupply = usable / Math.max(s.weeklyDemand, .1);
  const leadDemand = s.weeklyDemand * s.leadTime;
  const reorderPoint = leadDemand + s.safetyStock;
  const reorderGap = Math.max(0, reorderPoint - usable - s.openPO);
  const stockoutDays = Math.max(0, weeksSupply * 7);
  const supplierRisk = Math.round(Math.min(100, (100-s.otd)*1.15 + s.concentration*.28 + Math.max(0,s.leadTime-6)*2.2));
  const excessUnits = Math.max(0, usable + s.openPO - (leadDemand + s.safetyStock*1.5));
  const cashExposure = Math.round((reorderGap + excessUnits) * s.unitCost);
  const expediteCost = Math.round(reorderGap * s.unitCost * .18);
  const carryingCost = Math.round(excessUnits * s.unitCost * .22);
  const recommendedQty = Math.ceil(reorderGap / 10) * 10;
  let action: Action = "MONITOR";
  if (s.lifecycle === "Obsolete") action = "OBSOLETE";
  else if (s.volatility >= 38 && supplierRisk >= 50) action = "RESEARCH";
  else if (reorderGap > 0 && s.openPO === 0) action = "CREATE PO";
  else if (reorderGap > 0 && s.openPO > 0) action = "PULL IN";
  else if (excessUnits > s.weeklyDemand * 4 || weeksSupply > s.leadTime * 1.7) action = "PUSH OUT";
  const operationalRisk = Math.round(Math.min(100,
    Math.max(0, (s.safetyStock - usable) / Math.max(s.safetyStock,1) * 40) +
    supplierRisk*.38 + s.volatility*.25 + (s.criticality==="Critical"?22:s.criticality==="High"?12:4)
  ));
  const conflict = (s.volatility>30?9:0)+(s.inspection>0?5:0)+(s.lifecycle==="Phase-out"?7:0);
  const completeness = 92 - conflict;
  const confidence = Math.max(54, Math.min(91, Math.round(completeness - supplierRisk*.08)));
  const confidenceLabel = confidence >= 82 ? "High" : confidence >= 68 ? "Moderate" : "Guarded";
  const reasons = action === "OBSOLETE"
    ? ["Lifecycle status is obsolete", `${Math.round(usable)} units remain exposed`, `Potential write-down exposure is ${money(usable*s.unitCost)}`]
    : action === "PUSH OUT"
    ? [`${weeksSupply.toFixed(1)} weeks of usable supply`, `${Math.round(excessUnits)} units exceed the planning horizon`, `${money(carryingCost)} estimated annual carrying cost`]
    : action === "CREATE PO" || action === "PULL IN"
    ? [`Usable supply covers ${weeksSupply.toFixed(1)} weeks`, `${Math.round(reorderGap)}-unit gap to lead-time demand + safety stock`, `Supplier risk is ${supplierRisk}/100 at ${s.otd}% OTD`]
    : action === "RESEARCH"
    ? [`Demand volatility is ${s.volatility}%`, `Supplier risk is ${supplierRisk}/100`, "Signals conflict enough to require new evidence"]
    : [`${weeksSupply.toFixed(1)} weeks of supply is within policy`, `${s.otd}% supplier OTD`, "No deterministic exception threshold fired"];
  const counterargument = action==="PULL IN" || action==="CREATE PO"
    ? `Demand may normalize; accelerating now could create ${money((recommendedQty||reorderGap)*s.unitCost)} of avoidable inventory.`
    : action==="PUSH OUT" ? "A demand spike or supplier miss could consume the apparent buffer faster than the baseline assumes."
    : action==="OBSOLETE" ? "Service obligations may still require a protected last-time-buy quantity."
    : "Current averages may conceal a site-level demand shift that has not reached the planning record.";
  const unknowns = [
    ...(s.concentration>80 ? ["Qualified alternate-supplier capacity"] : []),
    ...(s.inspection>0 ? ["Exact quality-release date for inspection inventory"] : []),
    ...(s.volatility>30 ? ["Cause of recent demand variance"] : []),
  ];
  if (!unknowns.length) unknowns.push("No material unknowns in the synthetic record");
  const rules = [
    `usable_stock = on_hand + 0.55 × inspection = ${Math.round(usable)}`,
    `reorder_point = weekly_demand × lead_time + safety_stock = ${Math.round(reorderPoint)}`,
    `reorder_gap = max(0, ROP − usable − open_PO) = ${Math.round(reorderGap)}`,
    `supplier_risk = reliability + concentration + delay factors = ${supplierRisk}/100`,
    `classification → ${action}`,
  ];
  return { action,weeksSupply,reorderPoint,reorderGap,stockoutDays,supplierRisk,cashExposure,recommendedQty,confidence,confidenceLabel,reasons,counterargument,unknowns,rules,
    nextAction: action==="PULL IN"?"Confirm earlier delivery date":action==="CREATE PO"?"Create purchase requisition":action==="PUSH OUT"?"Negotiate PO deferment":action==="OBSOLETE"?"Open disposition review":action==="RESEARCH"?"Collect missing evidence":"Continue daily monitoring",
    owner: action==="OBSOLETE"?"Category Manager":action==="RESEARCH"?"Buyer + Planner":"Responsible Buyer", expediteCost, carryingCost, operationalRisk };
}

const money = (n:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export default function Home() {
  const [selected,setSelected] = useState(seed[0]);
  const [scenario,setScenario] = useState(seed[0]);
  const [view,setView] = useState<"review"|"portfolio"|"method">("review");
  const [running,setRunning] = useState(false);
  const [stage,setStage] = useState(-1);
  const [elapsed,setElapsed] = useState(0);
  const [complete,setComplete] = useState(false);
  const [traceOpen,setTraceOpen] = useState(false);
  const [disposition,setDisposition] = useState<Disposition>("pending");
  const [overrideOpen,setOverrideOpen] = useState(false);
  const [overrideReason,setOverrideReason] = useState("");
  const [whatIf,setWhatIf] = useState({demand:scenario.weeklyDemand,lead:scenario.leadTime,otd:scenario.otd,cost:scenario.unitCost});
  const analysis = useMemo(()=>analyze(scenario),[scenario]);
  const simulation = useMemo(()=>analyze({...scenario,weeklyDemand:whatIf.demand,leadTime:whatIf.lead,otd:whatIf.otd,unitCost:whatIf.cost}),[scenario,whatIf]);

  useEffect(()=>{
    if(!running) return;
    const started=Date.now();
    const timer=setInterval(()=>{
      const seconds=(Date.now()-started)/1000;
      setElapsed(seconds);
      const next=Math.min(5,Math.floor(seconds/3));
      setStage(next);
      if(seconds>=18){ clearInterval(timer); setRunning(false); setComplete(true); setStage(5); }
    },100);
    return()=>clearInterval(timer);
  },[running]);

  function loadScenario(s:Scenario){
    setSelected(s); setScenario({...s}); setWhatIf({demand:s.weeklyDemand,lead:s.leadTime,otd:s.otd,cost:s.unitCost});
    setComplete(false); setRunning(false); setStage(-1); setDisposition("pending"); setElapsed(0); setView("review");
  }
  function run(){setComplete(false);setDisposition("pending");setStage(0);setElapsed(0);setRunning(true)}
  function skip(){setRunning(false);setStage(5);setElapsed(18);setComplete(true)}
  function update<K extends keyof Scenario>(key:K,value:Scenario[K]){setScenario(v=>({...v,[key]:value}));setComplete(false)}
  function exportMemo(){
    const memo={prototype:"Procurement Mission Control",generatedAt:new Date().toISOString(),dataNotice:"Synthetic scenario; no ERP write-back.",scenario,analysis,humanDisposition:disposition,overrideReason:overrideReason||null,methodVersion:"PMC-0.5"};
    const blob=new Blob([JSON.stringify(memo,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${scenario.sku}-decision-memo.json`;a.click();URL.revokeObjectURL(url);
  }

  const progress = running ? clamp(elapsed/18*100,0,100) : complete?100:0;
  return <main>
    <header className="topbar">
      <a className="brand" href="#top"><span className="brandmark">PMC</span><span>Procurement Mission Control<small>Decision Systems Lab · Research Prototype</small></span></a>
      <nav aria-label="Primary">
        {(["review","portfolio","method"] as const).map(v=><button key={v} className={view===v?"active":""} onClick={()=>setView(v)}>{v}</button>)}
      </nav>
      <span className="synthetic"><i/> Synthetic data</span>
    </header>

    {view==="portfolio" ? <Portfolio onLoad={loadScenario}/> : view==="method" ? <Method/> : <>
      <section className="hero" id="top">
        <div><p className="kicker">Exception investigation · {scenario.site}</p><h1>One exception.<br/><em>Six points of view.</em></h1>
          <p className="lede">A hybrid decision environment where deterministic procurement rules remain the trusted backbone—and specialized agents make evidence, disagreement, uncertainty, and tradeoffs visible before a human acts.</p>
        </div>
        <div className="heroMeta"><span>Selected record</span><strong>{scenario.sku}</strong><p>{scenario.name}</p><button onClick={()=>setView("portfolio")}>Open portfolio queue ↗</button></div>
      </section>
      <div className="notice"><strong>RESEARCH PROTOTYPE</strong><span>This demonstration uses synthetic, operationally plausible records. It has no live SAP connection and cannot place or change purchase orders.</span></div>

      <section className="workspace">
        <aside className="inputPanel panel">
          <div className="panelHead"><div><span>01</span><h2>Decision record</h2></div><button onClick={()=>loadScenario(selected)}>Reset</button></div>
          <label>Scenario<select value={selected.sku} onChange={e=>loadScenario(seed.find(x=>x.sku===e.target.value) || seed[0])}>{seed.slice(0,3).map(s=><option key={s.sku} value={s.sku}>{s.sku} · {s.name}</option>)}</select></label>
          <div className="fieldGrid">
            <Num label="On hand" value={scenario.onHand} onChange={v=>update("onHand",v)}/>
            <Num label="Open PO" value={scenario.openPO} onChange={v=>update("openPO",v)}/>
            <Num label="Weekly demand" value={scenario.weeklyDemand} onChange={v=>update("weeklyDemand",v)}/>
            <Num label="Demand volatility %" value={scenario.volatility} onChange={v=>update("volatility",v)}/>
            <Num label="Lead time · weeks" value={scenario.leadTime} onChange={v=>update("leadTime",v)}/>
            <Num label="Supplier OTD %" value={scenario.otd} onChange={v=>update("otd",v)}/>
            <Num label="Unit cost · $" value={scenario.unitCost} step={.1} onChange={v=>update("unitCost",v)}/>
            <Num label="Safety stock" value={scenario.safetyStock} onChange={v=>update("safetyStock",v)}/>
            <Num label="In inspection" value={scenario.inspection} onChange={v=>update("inspection",v)}/>
            <label>Criticality<select value={scenario.criticality} onChange={e=>update("criticality",e.target.value as Criticality)}>{["Low","Medium","High","Critical"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label>Lifecycle<select value={scenario.lifecycle} onChange={e=>update("lifecycle",e.target.value as Lifecycle)}>{["Active","Phase-out","Obsolete"].map(x=><option key={x}>{x}</option>)}</select></label>
            <Num label="Supplier concentration %" value={scenario.concentration} onChange={v=>update("concentration",v)}/>
          </div>
          <button className="run" onClick={run} disabled={running}>{running?"Agents investigating…":"Run agent review"}<span>⌁</span></button>
        </aside>

        <section className="mission panel" aria-live="polite">
          <div className="panelHead"><div><span>02</span><h2>Agent room</h2></div><div className="clock">{running?`${elapsed.toFixed(1)}s`:"READY"}</div></div>
          <div className="stagebar"><div style={{width:`${progress}%`}}/><span>{stage>=0?stages[stage][0]:"AWAITING REVIEW"}</span><b>{Math.round(progress)}%</b></div>
          <div className="room">
            <div className="gridfloor"/>
            <div className="evidenceBoard">
              <span>SHARED EVIDENCE</span>
              <strong>{stage<0?"No review running":stages[stage][0]}</strong>
              <p>{stage<0?"Agents are standing by.":stages[stage][1]}</p>
              {stage>=1&&<ul>{analysis.reasons.slice(0,stage>=3?3:2).map(r=><li key={r}>{r}</li>)}</ul>}
            </div>
            {agents.map((a,i)=>{
              const active=stage>=0 && (i<5 ? stage>=1 : true);
              const bubble=stage<0?"Standing by":a.task[Math.min(3,Math.max(0,stage-1))];
              return <div className={`agent a${i} ${active?"working":""}`} key={a.id} style={{"--agent":a.color} as React.CSSProperties}>
                <div className="bubble">{bubble}</div><div className="avatar"><span>{a.short}</span></div><b>{a.name}</b><small>{active?"ACTIVE":"IDLE"}</small>
              </div>
            })}
            <div className="consensus"><span>CONSENSUS</span><div><i style={{width:`${stage<2?36:stage===2?58:analysis.confidence}%`}}/></div><strong>{stage<2?"Forming":stage===2?"Contested":analysis.confidenceLabel}</strong></div>
          </div>
          <div className="timeline">
            {stages.map((s,i)=><div className={i<stage?"done":i===stage?"now":""} key={s[0]}><i/><span>{s[0]}</span></div>)}
          </div>
          {running&&<button className="skip" onClick={skip}>Skip to outcome →</button>}
        </section>
      </section>

      <Outcome analysis={analysis} visible={complete} disposition={disposition} setDisposition={setDisposition} onTrace={()=>setTraceOpen(true)} onOverride={()=>setOverrideOpen(true)} exportMemo={exportMemo}/>
      <WhatIf base={analysis} simulation={simulation} values={whatIf} setValues={setWhatIf} scenario={scenario}/>
    </>}

    <footer><span>PROCUREMENT MISSION CONTROL · PMC-0.5</span><p>Built as an explainable research extension of the Procurement Heat Map Engine.</p><a href="https://decisionsystemslab.org/systems/procurement-heat-map">Read the lab notebook ↗</a></footer>

    {traceOpen&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setTraceOpen(false)}><div className="drawer" role="dialog" aria-modal="true" aria-label="Full decision trace">
      <div className="drawerHead"><div><span>COMPLETE TRACE</span><h2>{scenario.sku} · {analysis.action}</h2></div><button onClick={()=>setTraceOpen(false)}>Close ×</button></div>
      {stages.map((s,i)=><article key={s[0]}><b>0{i+1}</b><div><h3>{s[0]}</h3><p>{s[1]}</p>{i===0&&analysis.rules.slice(0,2).map(x=><code key={x}>{x}</code>)}{i===1&&analysis.reasons.map(x=><p key={x}>↳ {x}</p>)}{i===2&&<blockquote>{analysis.counterargument}</blockquote>}{i===3&&<p>Baseline operational risk {analysis.operationalRisk}/100 · cash exposure {money(analysis.cashExposure)}</p>}{i===4&&analysis.rules.slice(2).map(x=><code key={x}>{x}</code>)}{i===5&&<p>Human disposition: {disposition}</p>}</div></article>)}
    </div></div>}
    {overrideOpen&&<div className="overlay"><div className="modal" role="dialog" aria-modal="true"><span>HUMAN OVERRIDE</span><h2>Judgment remains accountable.</h2><p>Record why you disagree. This is logged as a potential signal for future rule review—it does not retrain a model.</p><textarea value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} placeholder="What evidence or context changes this decision?"/><div><button onClick={()=>setOverrideOpen(false)}>Cancel</button><button className="primary" disabled={overrideReason.trim().length<8} onClick={()=>{setDisposition("overridden");setOverrideOpen(false)}}>Record override</button></div></div></div>}
  </main>
}

function Num({label,value,onChange,step=1}:{label:string,value:number,onChange:(n:number)=>void,step?:number}){
  return <label>{label}<input type="number" value={value} step={step} min="0" onChange={e=>onChange(Number(e.target.value))}/></label>
}

function Outcome({analysis:a,visible,disposition,setDisposition,onTrace,onOverride,exportMemo}:{analysis:Analysis,visible:boolean,disposition:Disposition,setDisposition:(d:Disposition)=>void,onTrace:()=>void,onOverride:()=>void,exportMemo:()=>void}){
  return <section className={`outcome ${visible?"visible":""}`} id="outcome">
    <div className="sectionHead"><p>03 · HUMAN REVIEW</p><h2>The system recommends.<br/><em>The buyer decides.</em></h2></div>
    {!visible?<div className="locked"><span>⌁</span><h3>Outcome sealed</h3><p>Run the agent review to produce a traceable recommendation.</p></div>:<>
      <div className="recommendation">
        <div><span>RECOMMENDED ACTION</span><h3>{a.action}</h3><p>{a.nextAction} · Owner: {a.owner}</p></div>
        <div className="confidence"><span>CALIBRATED CONFIDENCE</span><strong>{a.confidenceLabel}</strong><p>{Math.max(50,a.confidence-6)}–{Math.min(96,a.confidence+5)}%</p></div>
        <div className="decisionStats"><Metric label="Weeks supply" value={a.weeksSupply.toFixed(1)}/><Metric label="Reorder gap" value={`${Math.round(a.reorderGap)} u`}/><Metric label="Supplier risk" value={`${a.supplierRisk}/100`}/><Metric label="Cash exposure" value={money(a.cashExposure)}/></div>
      </div>
      <div className="evidenceGrid">
        <article><span>TOP EVIDENCE</span>{a.reasons.map(x=><p key={x}>↳ {x}</p>)}</article>
        <article className="challenge"><span>STRONGEST COUNTERARGUMENT</span><p>{a.counterargument}</p><small>Risk Challenger · recorded before synthesis</small></article>
        <article><span>UNKNOWNS</span>{a.unknowns.map(x=><p key={x}>? {x}</p>)}<small>Evidence that resolves these items could change the action.</small></article>
      </div>
      <div className="actions">
        <div><button className={disposition==="approved"?"selected":""} onClick={()=>setDisposition("approved")}>Approve recommendation</button><button onClick={onOverride}>Override</button><button className={disposition==="evidence"?"selected":""} onClick={()=>setDisposition("evidence")}>Request more evidence</button></div>
        <div><button onClick={onTrace}>Open full trace ↗</button><button onClick={exportMemo}>Export decision memo ↓</button></div>
      </div>
      {disposition!=="pending"&&<div className="logged">Disposition logged: <strong>{disposition}</strong> · No ERP transaction was created.</div>}
    </>}
  </section>
}

function Metric({label,value}:{label:string,value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}

function WhatIf({base,simulation,values,setValues,scenario}:{base:Analysis,simulation:Analysis,values:{demand:number,lead:number,otd:number,cost:number},setValues:React.Dispatch<React.SetStateAction<{demand:number,lead:number,otd:number,cost:number}>>,scenario:Scenario}){
  const changed=base.action!==simulation.action;
  return <section className="whatif">
    <div className="sectionHead"><p>04 · COUNTERFACTUAL LAB</p><h2>What would have to change<br/><em>to change the decision?</em></h2></div>
    <div className="simulator">
      <div className="sliders">
        <Range label="Weekly demand" value={values.demand} min={Math.max(1,scenario.weeklyDemand*.3)} max={scenario.weeklyDemand*2} step={1} set={v=>setValues(x=>({...x,demand:v}))}/>
        <Range label="Lead time · weeks" value={values.lead} min={1} max={24} step={1} set={v=>setValues(x=>({...x,lead:v}))}/>
        <Range label="Supplier OTD" value={values.otd} min={40} max={100} step={1} suffix="%" set={v=>setValues(x=>({...x,otd:v}))}/>
        <Range label="Unit cost" value={values.cost} min={Math.max(.1,scenario.unitCost*.4)} max={scenario.unitCost*1.8} step={scenario.unitCost<10?.1:1} prefix="$" set={v=>setValues(x=>({...x,cost:v}))}/>
      </div>
      <div className="compare">
        <div><span>BASELINE</span><h3>{base.action}</h3><Metric label="Coverage" value={`${base.weeksSupply.toFixed(1)} w`}/><Metric label="Risk" value={`${base.operationalRisk}/100`}/><Metric label="Exposure" value={money(base.cashExposure)}/></div>
        <b>→</b>
        <div className={changed?"changed":""}><span>SIMULATION</span><h3>{simulation.action}</h3><Metric label="Coverage" value={`${simulation.weeksSupply.toFixed(1)} w`}/><Metric label="Risk" value={`${simulation.operationalRisk}/100`}/><Metric label="Exposure" value={money(simulation.cashExposure)}/></div>
      </div>
    </div>
  </section>
}

function Range({label,value,min,max,step,set,suffix="",prefix=""}:{label:string,value:number,min:number,max:number,step:number,set:(v:number)=>void,suffix?:string,prefix?:string}){
  return <label><span>{label}<b>{prefix}{Number(value).toFixed(step<1?1:0)}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/></label>
}

function Portfolio({onLoad}:{onLoad:(s:Scenario)=>void}){
  const [action,setAction]=useState("All"),[site,setSite]=useState("All"),[critical,setCritical]=useState("All");
  const rows=seed.map(s=>({s,a:analyze(s)})).filter(x=>(action==="All"||x.a.action===action)&&(site==="All"||x.s.site===site)&&(critical==="All"||x.s.criticality===critical)).sort((a,b)=>b.a.operationalRisk-a.a.operationalRisk);
  const all=seed.map(s=>analyze(s));
  return <section className="portfolio">
    <div className="portfolioHero"><p className="kicker">Executive exception portfolio</p><h1>Attention is the<br/><em>scarce resource.</em></h1><p>Ranked synthetic inventory exceptions—designed to move teams from reviewing everything to investigating what matters today.</p></div>
    <div className="kpis"><Metric label="Decisions due" value={String(all.filter(a=>a.action!=="MONITOR").length)}/><Metric label="Stockout exposure" value={money(all.filter(a=>a.reorderGap>0).reduce((n,a)=>n+a.reorderGap*100,0))}/><Metric label="Cash at risk" value={money(all.reduce((n,a)=>n+a.cashExposure,0))}/><Metric label="Critical exceptions" value={String(seed.filter(s=>s.criticality==="Critical").length)}/></div>
    <div className="queue panel"><div className="panelHead"><div><span>QUEUE</span><h2>Ranked by decision urgency</h2></div><div className="filters"><select value={action} onChange={e=>setAction(e.target.value)}><option>All</option>{["PULL IN","CREATE PO","PUSH OUT","MONITOR","RESEARCH","OBSOLETE"].map(x=><option key={x}>{x}</option>)}</select><select value={site} onChange={e=>setSite(e.target.value)}><option>All</option>{["Cambridge","Raleigh","Austin"].map(x=><option key={x}>{x}</option>)}</select><select value={critical} onChange={e=>setCritical(e.target.value)}><option>All</option>{["Low","Medium","High","Critical"].map(x=><option key={x}>{x}</option>)}</select></div></div>
      <div className="table" role="table"><div className="tr th"><span>SKU / MATERIAL</span><span>SITE</span><span>ACTION</span><span>RISK</span><span>EXPOSURE</span><span/></div>{rows.map(({s,a})=><button className="tr" key={s.sku} onClick={()=>onLoad(s)}><span><b>{s.sku}</b><small>{s.name}</small></span><span>{s.site}</span><span><i className={`tag ${a.action.replace(" ","").toLowerCase()}`}>{a.action}</i></span><span>{a.operationalRisk}/100</span><span>{money(a.cashExposure)}</span><span>Review →</span></button>)}</div>
    </div>
  </section>
}

function Method(){
  return <section className="method">
    <div className="portfolioHero"><p className="kicker">Method · PMC-0.5</p><h1>Rules first.<br/><em>Agents around them.</em></h1><p>This prototype explores whether a visible team of specialized reasoning roles can improve procurement review without weakening the deterministic backbone that made the production engine trusted.</p></div>
    <div className="methodGrid">
      <article><span>01 · TRUSTED BACKBONE</span><h2>Deterministic calculations</h2><p>Usable stock includes a conservative 55% of inspection inventory. Reorder point equals lead-time demand plus safety stock. Reorder gap subtracts usable inventory and open POs. These formulas are visible in every trace.</p></article>
      <article><span>02 · SPECIALIZATION</span><h2>Bounded agent roles</h2><p>Each agent owns a different lens. The Challenger is structurally required to contest the leading recommendation before synthesis, preventing easy consensus from being mistaken for strong evidence.</p></article>
      <article><span>03 · HUMAN AUTHORITY</span><h2>No autonomous execution</h2><p>Approve, override, and evidence requests create a local decision record only. A production implementation would gate ERP write-back behind identity, authorization, segregation of duties, and audit controls.</p></article>
      <article><span>04 · EVALUATION</span><h2>Falsifiable questions</h2><p>Compare against a rules-only baseline on time-to-decision, consistency, evidence coverage, calibration, override quality, stockout avoidance, working-capital outcomes, and user comprehension.</p></article>
    </div>
    <div className="formula"><span>CORE CLASSIFICATION</span><code>obsolete → OBSOLETE<br/>volatile ∧ supplier_risk → RESEARCH<br/>gap &gt; 0 ∧ open_PO = 0 → CREATE PO<br/>gap &gt; 0 ∧ open_PO &gt; 0 → PULL IN<br/>excess → PUSH OUT<br/>otherwise → MONITOR</code></div>
  </section>
}
