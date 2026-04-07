import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, ResponsiveContainer } from "recharts";

// ── Fonts ─────────────────────────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap";
document.head.appendChild(_fl);
const _css = document.createElement("style");
_css.textContent = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg0:#07090e;--bg1:#0c0f18;--bg2:#111620;--bg3:#171e2c;--bg4:#1d2638;
  --border:#1c2333;--border2:#263044;
  --amber:#f5a623;--green:#3dd68c;--red:#f05252;--blue:#4a9eff;
  --violet:#a78bfa;--teal:#2dd4bf;
  --text:#c8d6e8;--text2:#7a8fa8;--text3:#3d4f65;
  --font-d:'Syne',sans-serif;--font-m:'IBM Plex Mono',monospace;--font-b:'IBM Plex Sans',sans-serif;
}
body{background:var(--bg0);color:var(--text);font-family:var(--font-b);min-height:100vh}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:var(--bg1)}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
.fu{animation:fadeUp 0.3s ease forwards}
.sr{animation:slideRight 0.25s ease forwards}
textarea:focus,input:focus,select:focus{outline:none}
button{cursor:pointer;border:none;background:none;font-family:var(--font-b)}
`;
document.head.appendChild(_css);

// ══════════════════════════════════════════════════════════════════════════════
// AI PROVIDER ABSTRACTION LAYER
// ══════════════════════════════════════════════════════════════════════════════
const AI_PROVIDERS = {
  claude: {
    id:"claude", label:"Anthropic", badge:"ANT", color:"#f5a623",
    desc:"Anthropic API — active",
    call: async (system, msgs) => {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2000, system, messages:msgs }),
      });
      return (await r.json()).content?.[0]?.text || "";
    },
  },
  gemini: {
    id:"gemini", label:"Google AI", badge:"GAI", color:"#4a9eff",
    desc:"Google AI Studio — add API key to activate",
    call: async () => "[Google AI stub — configure your API key in AI_PROVIDERS.gemini.call()]",
  },
  azure: {
    id:"azure", label:"Azure OpenAI", badge:"AZR", color:"#2dd4bf",
    desc:"Azure OpenAI Service — add endpoint to activate",
    call: async () => "[Azure OpenAI stub — configure your endpoint in AI_PROVIDERS.azure.call()]",
  },
  openai: {
    id:"openai", label:"OpenAI", badge:"OAI", color:"#3dd68c",
    desc:"OpenAI API — add API key to activate",
    call: async () => "[OpenAI stub — configure your API key in AI_PROVIDERS.openai.call()]",
  },
};
const DEFAULT_PROVIDER = "claude";

// ── Dates ─────────────────────────────────────────────────────────────────────
const today = new Date();
const d   = (n) => { const dt = new Date(today); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
const fmt  = (s) => new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
const fmtL = (s) => new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const daysBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const uid  = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

// ── Domain constants ──────────────────────────────────────────────────────────
const FAMILIES = {
  financial:{ label:"Financial",      color:"#f5a623", icon:"£" },
  delivery: { label:"Delivery",       color:"#4a9eff", icon:"◈" },
  strategic:{ label:"Strategic",      color:"#3dd68c", icon:"◆" },
  supplier: { label:"Supplier",       color:"#2dd4bf", icon:"⬡" },
  risk:     { label:"Portfolio Risk", color:"#a78bfa", icon:"▲" },
};
const LINK_META = {
  drives:    { label:"Drives",     color:"#f05252", opacity:1,    desc:"Directly produces this metric value." },
  influences:{ label:"Influences", color:"#f5a623", opacity:0.85, desc:"Contributes but not sole determinant." },
  correlates:{ label:"Correlates", color:"#4a9eff", opacity:0.6,  desc:"Historically co-moves. No direct causation." },
};
const RAG = {
  green:{ color:"#3dd68c", bg:"rgba(61,214,140,0.12)", label:"On Track"  },
  amber:{ color:"#f5a623", bg:"rgba(245,166,35,0.12)", label:"At Risk"   },
  red:  { color:"#f05252", bg:"rgba(240,82,82,0.12)",  label:"Off Track" },
};
const STATUS_META = {
  "complete":    { label:"Complete",    color:"#3dd68c", bg:"rgba(61,214,140,0.12)" },
  "in-progress": { label:"In Progress", color:"#f5a623", bg:"rgba(245,166,35,0.12)" },
  "not-started": { label:"Not Started", color:"#4a5568", bg:"rgba(74,85,104,0.15)"  },
  "at-risk":     { label:"At Risk",     color:"#f05252", bg:"rgba(240,82,82,0.12)"  },
};
const RAID_TYPES = {
  risk:       { label:"Risk",       color:"#f05252", icon:"▲" },
  assumption: { label:"Assumption", color:"#f5a623", icon:"◈" },
  issue:      { label:"Issue",      color:"#a78bfa", icon:"◆" },
  decision:   { label:"Decision",   color:"#3dd68c", icon:"✓" },
};

// ── Onboarding stages ─────────────────────────────────────────────────────────
const STAGES = [
  { id:"identity",  num:1, label:"Identity",
    prompt:`You are APEX, an expert PMO assistant beginning Stage 1 of 5.
Goal: discover programme name, strategic objective, sponsor, and type.
Ask conversationally — senior PMO consultant tone, 1-2 questions at a time.
When all four are confirmed:
\`\`\`json
{"stage":"identity","complete":true,"data":{"name":"...","objective":"...","sponsor":"...","type":"transformation|delivery|commercial|operational|regulatory|organisational"}}
\`\`\`
Do NOT output JSON until all four are established.` },

  { id:"structure", num:2, label:"Structure",
    prompt:`You are APEX, Stage 2: Scale & Structure.
Context: PROGRAMME_CONTEXT
Discover: scale (single/programme/portfolio), workstream names, start date, end date, current phase, governance model.
When complete:
\`\`\`json
{"stage":"structure","complete":true,"data":{"scale":"single|programme|portfolio","workstreams":["ws1","ws2"],"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","currentPhase":"...","governance":"..."}}
\`\`\`` },

  { id:"people",    num:3, label:"People",
    prompt:`You are APEX, Stage 3: People & Ownership.
Context: PROGRAMME_CONTEXT
Discover: delivery leads (name + role + what they own), key stakeholders, external parties.
When complete:
\`\`\`json
{"stage":"people","complete":true,"data":{"leads":[{"name":"...","role":"...","owns":"..."}],"stakeholders":["..."],"external":["..."]}}
\`\`\`` },

  { id:"documents", num:4, label:"Documents",
    prompt:`You are APEX, Stage 4: Document Ingestion.
Context: PROGRAMME_CONTEXT
Extract every task, risk, metric, decision, assumption, and issue from the provided content.
\`\`\`json
{"stage":"documents","complete":true,"data":{"tasks":[{"id":"t1","phase":"...","name":"...","start":"YYYY-MM-DD","end":"YYYY-MM-DD","status":"not-started|in-progress|complete|at-risk","owner":"...","progress":0,"deps":[],"confidence":"high|medium|low"}],"risks":[{"id":"r1","title":"...","impact":"High|Medium|Low","likelihood":"High|Medium|Low","status":"Open","owner":"...","mitigation":"...","confidence":"high|medium|low"}],"raidItems":[{"id":"rd1","type":"risk|assumption|issue|decision","title":"...","description":"...","owner":"...","status":"Open|Closed|Active|Agreed","impact":"High|Medium|Low","dateRaised":"YYYY-MM-DD","dueDate":"YYYY-MM-DD","confidence":"high|medium|low"}],"metrics":[{"id":"m1","family":"financial|delivery|strategic|supplier|risk","name":"...","value":0,"target":0,"unit":"...","direction":"higher|lower|neutral","rag":"green|amber|red","note":"...","confidence":"high|medium|low"}],"summary":"2-3 sentence summary"}}
\`\`\`
Confidence: high=explicit, medium=implied, low=inferred. Generate sensible dates from context.` },

  { id:"metrics",   num:5, label:"Metrics",
    prompt:`You are APEX, Stage 5: Metrics Configuration.
Context: PROGRAMME_CONTEXT
Recommend and configure the right metrics families for this programme type. After confirming:
\`\`\`json
{"stage":"metrics","complete":true,"data":{"metrics":[{"id":"m1","family":"financial|delivery|strategic|supplier|risk","name":"...","value":0,"target":0,"unit":"...","direction":"higher|lower|neutral|lower-abs","rag":"green","trend":[0,0,0,0],"trendL":["Wk1","Wk2","Wk3","Wk4"],"note":"Baseline — update as programme progresses.","lastUpdated":"TODAY","links":[]}]}}
\`\`\`
Replace TODAY with ${d(0)}. Make targets realistic for the programme type.` },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const ragCount = (ms,r) => ms.filter(m=>m.rag===r).length;
const fmtVal   = (m) => { const v=m.value; if(m.unit==="£m")return`£${v}m`; if(m.unit==="%")return`${v}%`; if(m.unit==="/5")return`${v}/5`; if(m.unit==="/100")return`${v}`; return`${v}${m.unit?" "+m.unit:""}`; };
const progPct  = (m) => { if(m.direction==="lower"||m.direction==="lower-abs"){if(!m.target&&!m.value)return 100;const w=(m.trend?.[0]||1)*1.5;return Math.max(0,Math.min(100,100-((m.value/w)*100)));} if(!m.target)return 100; return Math.min(100,(m.value/m.target)*100); };
async function readFile(f){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.onerror=()=>r(`[Could not read: ${f.name}]`);fr.readAsText(f);});}

// ── Micro ─────────────────────────────────────────────────────────────────────
const Spinner = ({s=14,c="var(--amber)"}) => <div style={{width:s,height:s,border:`2px solid var(--border2)`,borderTopColor:c,borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>;
const Badge   = ({status}) => { const m=STATUS_META[status]||STATUS_META["not-started"]; return <span style={{fontSize:8,fontFamily:"var(--font-m)",color:m.color,background:m.bg,border:`1px solid ${m.color}30`,padding:"2px 6px",borderRadius:3,whiteSpace:"nowrap",textTransform:"uppercase"}}>{m.label}</span>; };
const RagPip  = ({rag}) => { const r=RAG[rag]||RAG.amber; return <span style={{width:6,height:6,borderRadius:"50%",background:r.color,display:"inline-block",flexShrink:0}}/>; };
const Conf    = ({c}) => { const col=c==="high"?"#3dd68c":c==="medium"?"#f5a623":"#4a5568"; return <span style={{fontSize:7,fontFamily:"var(--font-m)",color:col,background:`${col}18`,border:`1px solid ${col}30`,padding:"1px 5px",borderRadius:2,textTransform:"uppercase",letterSpacing:"0.08em"}}>{c||"?"}</span>; };

const LinkChip = ({task,linkType,onClick}) => {
  const lm=LINK_META[linkType]||LINK_META.influences;
  return <span onClick={e=>{e.stopPropagation();onClick&&onClick(task);}} title={lm.desc} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:8,fontFamily:"var(--font-m)",padding:"2px 7px",background:`${lm.color}18`,border:`1px solid ${lm.color}55`,borderLeft:`2px solid ${lm.color}`,borderRadius:3,cursor:onClick?"pointer":"default",whiteSpace:"nowrap",opacity:lm.opacity,transition:"opacity 0.15s"}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.opacity="1";}} onMouseLeave={e=>e.currentTarget.style.opacity=String(lm.opacity)}><span style={{color:lm.color,fontWeight:600,letterSpacing:"0.05em"}}>{lm.label}</span><span style={{color:"var(--text3)"}}>·</span><span style={{color:"var(--text2)"}}>{task.name.length>20?task.name.slice(0,19)+"…":task.name}</span></span>;
};

// ── Provider Switcher ─────────────────────────────────────────────────────────
const ProviderSwitcher = ({provider,onChange}) => {
  const [open,setOpen] = useState(false);
  const p = AI_PROVIDERS[provider]||AI_PROVIDERS.claude;
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:5,background:"var(--bg3)",border:`1px solid ${p.color}40`,borderRadius:5,padding:"4px 9px"}}>
        <span style={{width:5,height:5,borderRadius:"50%",background:p.color,animation:"blink 2s infinite"}}/>
        <span style={{fontSize:8,fontFamily:"var(--font-m)",color:p.color,textTransform:"uppercase",letterSpacing:"0.1em"}}>{p.badge}</span>
        <span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>▾</span>
      </button>
      {open&&<div style={{position:"absolute",right:0,top:"calc(100% + 5px)",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:7,padding:7,width:250,zIndex:400,boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
        <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",padding:"3px 7px 7px",borderBottom:"1px solid var(--border)",marginBottom:7}}>AI Engine · swap without changing anything else</div>
        {Object.values(AI_PROVIDERS).map(pr=>(
          <button key={pr.id} onClick={()=>{onChange(pr.id);setOpen(false);}} style={{display:"flex",alignItems:"flex-start",gap:8,width:"100%",padding:"7px",borderRadius:5,background:provider===pr.id?`${pr.color}15`:"transparent",border:`1px solid ${provider===pr.id?pr.color+"50":"transparent"}`,textAlign:"left",marginBottom:2}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:pr.color,flexShrink:0,marginTop:3}}/>
            <div style={{flex:1}}><div style={{fontSize:9,fontFamily:"var(--font-m)",color:provider===pr.id?pr.color:"var(--text)",fontWeight:600}}>{pr.label}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",marginTop:1}}>{pr.desc}</div></div>
            {provider===pr.id&&<span style={{fontSize:7,fontFamily:"var(--font-m)",color:pr.color,flexShrink:0}}>ACTIVE</span>}
          </button>
        ))}
        <div style={{marginTop:5,padding:"5px 7px 0",borderTop:"1px solid var(--border)",fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>Enterprise: <code style={{color:"var(--amber)"}}>APEX_AI_PROVIDER</code> env var overrides UI.</div>
      </div>}
    </div>
  );
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
const Spark = ({data,color,positive}) => {
  if(!data||data.length<2)return null;
  const up=data[data.length-1]>=data[data.length-2], good=positive?up:!up;
  return <div style={{display:"flex",alignItems:"flex-end",gap:3}}>
    <ResponsiveContainer width={52} height={22}>
      <AreaChart data={data.map(v=>({v}))} margin={{top:2,right:0,bottom:0,left:0}}>
        <defs><linearGradient id={`sg${color.replace(/[^a-z0-9]/gi,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg${color.replace(/[^a-z0-9]/gi,"")})`} dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
    <span style={{fontSize:9,fontFamily:"var(--font-m)",color:good?"#3dd68c":"#f05252"}}>{up?"↑":"↓"}</span>
  </div>;
};

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING WIZARD
// ══════════════════════════════════════════════════════════════════════════════
const OnboardingWizard = ({provider,onComplete,onCancel,isModal=false}) => {
  const prov = AI_PROVIDERS[provider]||AI_PROVIDERS.claude;
  const [stageIdx,setStageIdx] = useState(0);
  const [messages,setMessages] = useState([]);
  const [input,setInput]       = useState("");
  const [loading,setLoading]   = useState(false);
  const [collected,setCollected]= useState({});
  const [files,setFiles]       = useState([]);
  const [dragOver,setDragOver] = useState(false);
  const [preview,setPreview]   = useState(null);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const stage     = STAGES[stageIdx];

  useEffect(()=>{
    if(stage.id==="documents"){
      setMessages(prev=>[...prev,{role:"assistant",content:"Stage 4 — Document Ingestion.\n\nDrop files below or paste document content into the chat. I'll read everything and construct your programme baseline automatically — tasks, risks, RAID items, metrics, decisions.\n\nIf you have nothing to hand, type 'skip' and I'll build from our conversation.",stageId:stage.id}]);
    } else { openStage(); }
  },[stageIdx]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,preview]);

  function ctx(){ return Object.entries(collected).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join("\n")||"Not yet established."; }

  async function openStage(){
    setLoading(true);
    try{
      const sys=stage.prompt.replace("PROGRAMME_CONTEXT",ctx()).replace(/TODAY/g,d(0));
      const reply=await prov.call(sys,[{role:"user",content:`Begin Stage ${stage.num}.`}]);
      setMessages(prev=>[...prev,{role:"assistant",content:reply.replace(/```json[\s\S]*?```/g,"").trim(),stageId:stage.id}]);
    }catch(e){setMessages(prev=>[...prev,{role:"assistant",content:"⚠ AI engine connection error. Check your configuration.",stageId:stage.id}]);}
    setLoading(false);
  }

  async function send(override){
    const content=override||input.trim(); if(!content||loading)return;
    const hist=[...messages,{role:"user",content,stageId:stage.id}];
    setMessages(hist); if(!override)setInput(""); setLoading(true);
    try{
      const sys=stage.prompt.replace("PROGRAMME_CONTEXT",ctx()).replace(/TODAY/g,d(0));
      const apiMsgs=hist.filter(m=>m.stageId===stage.id).map(m=>({role:m.role,content:m.content}));
      const reply=await prov.call(sys,apiMsgs);
      const jm=reply.match(/```json\s*([\s\S]*?)```/);
      if(jm){
        const parsed=JSON.parse(jm[1]);
        if(parsed.complete&&parsed.stage===stage.id){
          const nc={...collected,[stage.id]:parsed.data};
          setCollected(nc);
          const clean=reply.replace(/```json[\s\S]*?```/g,"").trim();
          if(stage.id==="documents"&&parsed.data){setPreview(parsed.data);setMessages(prev=>[...prev,{role:"assistant",content:clean||"Extraction complete. Review and confirm to proceed.",stageId:stage.id}]);setLoading(false);return;}
          setMessages(prev=>[...prev,{role:"assistant",content:clean||`Stage ${stage.num} complete.`,stageId:stage.id}]);
          setLoading(false);
          setTimeout(()=>{if(stageIdx<STAGES.length-1)setStageIdx(s=>s+1);else finalise(nc);},900);
          return;
        }
      }
      setMessages(prev=>[...prev,{role:"assistant",content:reply.replace(/```json[\s\S]*?```/g,"").trim(),stageId:stage.id}]);
    }catch(e){setMessages(prev=>[...prev,{role:"assistant",content:"⚠ AI engine error.",stageId:stage.id}]);}
    setLoading(false);
  }

  async function ingestFiles(){
    if(!files.length)return; setLoading(true);
    let combined="";
    for(const f of files){const t=await readFile(f);combined+=`\n\n=== FILE: ${f.name} ===\n${t.slice(0,8000)}`;}
    setFiles([]);
    await send(`Please analyse these documents and extract all programme data:\n${combined}`);
  }

  function skip(){const nc={...collected,[stage.id]:{}};setCollected(nc);if(stageIdx<STAGES.length-1)setStageIdx(s=>s+1);else finalise(collected);}
  function confirmExtract(){setPreview(null);if(stageIdx<STAGES.length-1)setStageIdx(s=>s+1);else finalise(collected);}

  function finalise(all){
    const id=all.identity||{}, str=all.structure||{}, ppl=all.people||{}, doc=all.documents||{}, met=all.metrics||{};
    let tasks=doc.tasks||[];
    if(!tasks.length){const wss=str.workstreams||["Discovery","Delivery","Close-out"];tasks=wss.flatMap((ws,pi)=>[{id:`t${pi*2+1}`,phase:ws,name:`${ws} — Initiation`,start:d(pi*14),end:d(pi*14+10),status:"not-started",owner:ppl.leads?.[0]?.name||"TBC",progress:0,deps:[]},{id:`t${pi*2+2}`,phase:ws,name:`${ws} — Delivery`,start:d(pi*14+10),end:d(pi*14+24),status:"not-started",owner:ppl.leads?.[1]?.name||ppl.leads?.[0]?.name||"TBC",progress:0,deps:[`t${pi*2+1}`]}]);}
    let risks=doc.risks||[{id:"r1",title:"Scope not fully defined",impact:"High",likelihood:"Medium",status:"Open",owner:ppl.leads?.[0]?.name||"TBC",mitigation:"Complete scope workshop at kick-off."},{id:"r2",title:"Resource availability",impact:"Medium",likelihood:"Medium",status:"Open",owner:id.sponsor||"TBC",mitigation:"Confirm allocation at programme start."}];
    let raidItems=doc.raidItems||[];
    if(!raidItems.length&&doc.decisions?.length){raidItems=doc.decisions.map((dec,i)=>({id:`rd${i+1}`,type:"decision",title:dec.description?.slice(0,60)||"Decision",description:dec.description||"",owner:dec.owner||"TBC",status:"Agreed",impact:"Medium",dateRaised:dec.date||d(0),dueDate:dec.date||d(0)}));}
    let metrics=met.metrics||doc.metrics||[];
    if(!metrics.length)metrics=[{id:"m1",family:"delivery",name:"Milestone Adherence Rate",value:0,target:85,unit:"%",direction:"higher",rag:"green",trend:[0,0,0,0],trendL:["Wk1","Wk2","Wk3","Wk4"],note:"Baseline.",lastUpdated:d(0),links:[]},{id:"m2",family:"financial",name:"Budget Utilisation",value:0,target:100,unit:"%",direction:"neutral",rag:"green",trend:[0,0,0,0],trendL:["Wk1","Wk2","Wk3","Wk4"],note:"Baseline.",lastUpdated:d(0),links:[]},{id:"m3",family:"risk",name:"Open High-Impact Risks",value:risks.filter(r=>r.impact==="High"&&r.status==="Open").length,target:0,unit:"risks",direction:"lower",rag:"amber",trend:[0,0,0,risks.filter(r=>r.impact==="High"&&r.status==="Open").length],trendL:["Wk1","Wk2","Wk3","Wk4"],note:"Baseline.",lastUpdated:d(0),links:[]}];
    metrics=metrics.map((m,i)=>({trend:[0,0,0,m.value||0],trendL:["Wk1","Wk2","Wk3","Wk4"],lastUpdated:d(0),links:[],...m,id:m.id||`m${i+1}`}));
    onComplete({programme:{name:id.name||"Unnamed Programme",type:id.type||"transformation",sponsor:id.sponsor||"TBC",objective:id.objective||"",phase:str.currentPhase||"Discovery",startDate:str.startDate||d(0),endDate:str.endDate||d(180)},tasks,risks,raidItems,metrics,decisions:doc.decisions||[],assumptions:doc.assumptions||[]});
  }

  const stageMsgs=messages.filter(m=>m.stageId===stage.id);

  const inner=(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"var(--bg0)"}}>
      {/* Stage progress */}
      <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"9px 18px",display:"flex",gap:4,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
        {STAGES.map((s,i)=>{const done=i<stageIdx,active=i===stageIdx,col=done?"#3dd68c":active?"var(--amber)":"var(--text3)";return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:4,background:active?"rgba(245,166,35,0.1)":done?"rgba(61,214,140,0.07)":"transparent",border:`1px solid ${active?"rgba(245,166,35,0.3)":done?"rgba(61,214,140,0.2)":"var(--border)"}`,transition:"all 0.3s"}}>
            <div style={{width:14,height:14,borderRadius:"50%",background:done?"#3dd68c":active?"var(--amber)":"var(--bg4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:800,color:done||active?"#000":"var(--text3)",flexShrink:0}}>{done?"✓":s.num}</div>
            <span style={{fontSize:7,fontFamily:"var(--font-m)",color:col,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:active?600:400}}>{s.label}</span>
          </div>
          {i<STAGES.length-1&&<div style={{width:10,height:1,background:done?"rgba(61,214,140,0.3)":"var(--border)",flexShrink:0}}/>}
        </div>);})}
        <div style={{marginLeft:"auto",display:"flex",gap:7,alignItems:"center"}}>
          <span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>{stage.num}/{STAGES.length}</span>
          {isModal&&onCancel&&<button onClick={onCancel} style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",padding:"3px 7px",border:"1px solid var(--border2)",borderRadius:4}}>✕</button>}
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"13px 18px",display:"flex",flexDirection:"column",gap:9}}>
            {stageIdx>0&&<div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 11px",display:"flex",gap:6,flexWrap:"wrap"}}>{STAGES.slice(0,stageIdx).map(s=><span key={s.id} style={{fontSize:7,fontFamily:"var(--font-m)",color:"#3dd68c",background:"rgba(61,214,140,0.08)",border:"1px solid rgba(61,214,140,0.2)",borderRadius:3,padding:"2px 6px"}}>✓ {s.label}</span>)}</div>}
            {stageMsgs.map((m,i)=>(
              <div key={i} className="fu" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animationDelay:`${i*0.02}s`}}>
                {m.role==="assistant"&&<div style={{width:20,height:20,borderRadius:3,background:"var(--amber)",marginRight:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#000",fontFamily:"var(--font-d)",marginTop:2}}>◆</div>}
                <div style={{maxWidth:"72%",padding:"8px 12px",borderRadius:m.role==="user"?"8px 8px 2px 8px":"8px 8px 8px 2px",background:m.role==="user"?"rgba(74,158,255,0.12)":"var(--bg3)",border:`1px solid ${m.role==="user"?"rgba(74,158,255,0.25)":"var(--border)"}`,fontSize:11,fontFamily:"var(--font-b)",color:"var(--text)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                  {m.content.startsWith("[Uploaded")?<span style={{color:"var(--text2)"}}>{m.content.split("\n")[0]}</span>:m.content}
                </div>
              </div>
            ))}
            {preview&&(
              <div className="fu" style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:9,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",background:"var(--bg3)",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"#3dd68c",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>✓ Extraction Complete</div><div style={{fontSize:13,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)"}}>Programme Baseline Ready</div></div>
                  <div style={{display:"flex",gap:6}}><button onClick={confirmExtract} style={{background:"var(--green)",color:"#000",borderRadius:5,padding:"6px 13px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:10}}>Confirm & Continue →</button><button onClick={()=>setPreview(null)} style={{border:"1px solid var(--border2)",borderRadius:5,padding:"6px 10px",color:"var(--text3)",fontSize:9}}>Edit</button></div>
                </div>
                <div style={{padding:"11px 14px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[{l:"Tasks",v:preview.tasks?.length||0,c:"var(--blue)"},{l:"Risks",v:preview.risks?.length||0,c:"var(--red)"},{l:"RAID Items",v:preview.raidItems?.length||0,c:"var(--violet)"},{l:"Metrics",v:preview.metrics?.length||0,c:"var(--amber)"}].map((s,i)=>(
                    <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:5,padding:"8px",textAlign:"center"}}>
                      <div style={{fontSize:18,fontFamily:"var(--font-d)",fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {preview.summary&&<p style={{margin:"0 14px 11px",fontSize:10,fontFamily:"var(--font-b)",color:"var(--text2)",lineHeight:1.6,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:5,padding:"8px 10px"}}>{preview.summary}</p>}
                {preview.tasks?.slice(0,3).map((t,i)=><div key={i} style={{margin:"0 14px 5px",padding:"6px 8px",background:"var(--bg3)",borderRadius:4,border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:6}}><Badge status={t.status}/><span style={{fontSize:9,fontFamily:"var(--font-b)",color:"var(--text)",flex:1}}>{t.name}</span><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>{t.owner}</span><Conf c={t.confidence}/></div>)}
                {(preview.tasks?.length||0)>3&&<div style={{padding:"0 14px 10px",fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>+{preview.tasks.length-3} more tasks extracted</div>}
              </div>
            )}
            {loading&&<div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:20,height:20,borderRadius:3,background:"var(--amber)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#000",fontFamily:"var(--font-d)"}}>◆</div><Spinner/></div>}
            <div ref={bottomRef}/>
          </div>

          {stage.id==="documents"&&(
            <div style={{padding:"0 18px 9px"}}>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);setFiles(prev=>[...prev,...Array.from(e.dataTransfer.files)]);}} style={{border:`2px dashed ${dragOver?"var(--amber)":"var(--border2)"}`,borderRadius:6,padding:"10px",textAlign:"center",background:dragOver?"rgba(245,166,35,0.05)":"var(--bg2)",cursor:"pointer",transition:"all 0.2s"}} onClick={()=>fileRef.current?.click()}>
                <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={e=>setFiles(prev=>[...prev,...Array.from(e.target.files)])}/>
                <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{files.length?`${files.length} file(s) queued — click Ingest or drop more`:"Drop files or click to browse · .txt .csv .md .docx .xlsx .pdf"}</div>
                {files.length>0&&<div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>{files.map((f,i)=><span key={i} style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--amber)",background:"rgba(245,166,35,0.1)",border:"1px solid rgba(245,166,35,0.3)",borderRadius:2,padding:"1px 6px"}}>{f.name}</span>)}</div>}
              </div>
              {files.length>0&&<button onClick={ingestFiles} disabled={loading} style={{marginTop:6,width:"100%",background:"var(--amber)",color:"#000",borderRadius:5,padding:"7px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:11,opacity:loading?0.5:1}}>{loading?<Spinner s={11}/>:`Ingest ${files.length} File(s)`}</button>}
            </div>
          )}

          <div style={{padding:"7px 18px 12px",background:"var(--bg1)",borderTop:"1px solid var(--border)",display:"flex",gap:6,flexShrink:0}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={stage.id==="documents"?"Or paste document content here…":"Type your response…"} rows={2} style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:11,padding:"7px 9px",resize:"none",lineHeight:1.5}}/>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <button onClick={()=>send()} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"var(--bg3)":"var(--amber)",color:loading||!input.trim()?"var(--text3)":"#000",border:"none",borderRadius:5,padding:"0 13px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:11,flex:1,minWidth:44,transition:"all 0.2s"}}>{loading?<Spinner/>:"↑"}</button>
              <button onClick={skip} style={{background:"transparent",border:"1px solid var(--border2)",borderRadius:4,padding:"3px 7px",fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",whiteSpace:"nowrap"}}>Skip →</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{width:190,background:"var(--bg1)",borderLeft:"1px solid var(--border)",padding:"13px",overflowY:"auto",flexShrink:0}}>
          <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Collected so far</div>
          {Object.entries(collected).map(([key,val])=>{const s=STAGES.find(s=>s.id===key);if(!s||!val||!Object.keys(val).length)return null;return(
            <div key={key} style={{marginBottom:12}}>
              <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"#3dd68c",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>✓ {s.label}</div>
              {key==="identity"&&<><div style={{fontSize:10,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)",marginBottom:2}}>{val.name}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--amber)",textTransform:"uppercase",marginBottom:2}}>{val.type}</div>{val.sponsor&&<div style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)"}}>Sponsor: {val.sponsor}</div>}</>}
              {key==="structure"&&<><div style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)",marginBottom:1}}>{val.scale} · {val.currentPhase}</div>{val.workstreams?.length>0&&<div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>{val.workstreams.join(", ")}</div>}</>}
              {key==="people"&&val.leads?.map((l,i)=><div key={i} style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)",marginBottom:1}}>{l.name} · {l.role}</div>)}
              {key==="documents"&&<><div style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)",marginBottom:1}}>{val.tasks?.length||0} tasks · {val.risks?.length||0} risks</div><div style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)"}}>{val.raidItems?.length||0} RAID · {val.metrics?.length||0} metrics</div></>}
              {key==="metrics"&&<div style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)"}}>{val.metrics?.length||0} metrics configured</div>}
            </div>
          );})}
          {!Object.keys(collected).length&&<div style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text3)",lineHeight:1.6}}>Data confirmed each stage appears here.</div>}
          <div style={{marginTop:13,paddingTop:13,borderTop:"1px solid var(--border)"}}>
            <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Stage goal</div>
            <p style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)",lineHeight:1.55}}>
              {stage.id==="identity"&&"Name, objective, sponsor, type."}{stage.id==="structure"&&"Scale, workstreams, timeline, governance."}{stage.id==="people"&&"Leads, stakeholders, external parties."}{stage.id==="documents"&&"Auto-extract programme state from documents."}{stage.id==="metrics"&&"Configure metric families and targets."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if(isModal)return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"min(860px,100%)",height:"min(660px,90vh)",borderRadius:10,overflow:"hidden",border:"1px solid var(--border2)",boxShadow:"0 24px 80px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column"}}>
        <div style={{background:"var(--bg1)",borderBottom:"1px solid var(--border)",padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:44,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:20,height:20,background:"var(--amber)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#000",fontFamily:"var(--font-d)"}}>◆</div><div style={{fontSize:11,fontFamily:"var(--font-d)",fontWeight:800,color:"var(--text)"}}>APEX — New Programme</div></div>
          <button onClick={onCancel} style={{color:"var(--text3)",fontSize:16,padding:"2px 6px"}}>✕</button>
        </div>
        <div style={{flex:1,overflow:"hidden"}}>{inner}</div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"var(--bg0)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--bg1)",borderBottom:"1px solid var(--border)",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:46,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:24,height:24,background:"var(--amber)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#000",fontFamily:"var(--font-d)"}}>◆</div><div><div style={{fontSize:13,fontFamily:"var(--font-d)",fontWeight:800,color:"var(--text)",letterSpacing:"-0.02em"}}>APEX</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",letterSpacing:"0.15em",textTransform:"uppercase"}}>AI Programme Execution & Control</div></div><div style={{width:1,height:16,background:"var(--border)",margin:"0 5px"}}/><div style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text3)"}}>AI-guided setup · 5 stages · ~10 min</div></div>
        <ProviderSwitcher provider={provider} onChange={()=>{}}/>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>{inner}</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ADD PROJECT MODAL
// ══════════════════════════════════════════════════════════════════════════════
const AddProjectModal = ({provider,programme,onAdd,onClose}) => {
  const prov = AI_PROVIDERS[provider]||AI_PROVIDERS.claude;
  const [msgs,setMsgs]     = useState([]);
  const [input,setInput]   = useState("");
  const [loading,setLoading]= useState(false);
  const [done,setDone]     = useState(false);
  const bottomRef = useRef(null);

  const SYS=`You are APEX. The user is adding a new project/workstream to an existing programme called "${programme.name}" (${programme.type}).
Ask just 3 focused questions conversationally:
1. What is the name of this new project or workstream?
2. Who owns it, and what is the target completion date?
3. What are the 2-3 main deliverables or tasks?

Once you have enough to create it, output ONE JSON block:
\`\`\`json
{"name":"...","owner":"...","endDate":"YYYY-MM-DD","tasks":[{"name":"...","owner":"...","start":"YYYY-MM-DD","end":"YYYY-MM-DD"}]}
\`\`\`
Be brief. This is a quick addition, not a full onboarding.`;

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{const r=await prov.call(SYS,[{role:"user",content:"Begin. Ask the first question."}]);setMsgs([{role:"assistant",content:r.replace(/```json[\s\S]*?```/g,"").trim()}]);}
      catch(e){setMsgs([{role:"assistant",content:"⚠ AI engine error."}]);}
      setLoading(false);
    })();
  },[]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  async function send(){
    if(!input.trim()||loading||done)return;
    const hist=[...msgs,{role:"user",content:input.trim()}];
    setMsgs(hist);setInput("");setLoading(true);
    try{
      const r=await prov.call(SYS,hist.map(m=>({role:m.role,content:m.content})));
      const jm=r.match(/```json\s*([\s\S]*?)```/);
      if(jm){
        const p=JSON.parse(jm[1]);
        const phaseName=p.name;
        const newTasks=p.tasks.map((t,i)=>({id:uid(),phase:phaseName,name:t.name,start:t.start||d(0),end:t.end||d(14+i*7),status:"not-started",owner:t.owner||p.owner||"TBC",progress:0,deps:[]}));
        setMsgs(prev=>[...prev,{role:"assistant",content:r.replace(/```json[\s\S]*?```/g,"").trim()||`Project "${phaseName}" added — ${newTasks.length} tasks created.`}]);
        setDone(true);
        setTimeout(()=>onAdd(phaseName,newTasks),800);
      } else {
        setMsgs(prev=>[...prev,{role:"assistant",content:r.replace(/```json[\s\S]*?```/g,"").trim()}]);
      }
    }catch(e){setMsgs(prev=>[...prev,{role:"assistant",content:"⚠ AI engine error."}]);}
    setLoading(false);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"min(520px,100%)",background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:10,overflow:"hidden",boxShadow:"0 16px 64px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column",maxHeight:"70vh"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)"}}>Add Project to {programme.name}</div>
          <button onClick={onClose} style={{color:"var(--text3)",fontSize:16,padding:"2px 4px"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:9}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              {m.role==="assistant"&&<div style={{width:18,height:18,borderRadius:3,background:"var(--amber)",marginRight:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#000",fontFamily:"var(--font-d)",marginTop:2}}>◆</div>}
              <div style={{maxWidth:"80%",padding:"7px 11px",borderRadius:m.role==="user"?"7px 7px 2px 7px":"7px 7px 7px 2px",background:m.role==="user"?"rgba(74,158,255,0.12)":"var(--bg3)",border:`1px solid ${m.role==="user"?"rgba(74,158,255,0.25)":"var(--border)"}`,fontSize:11,fontFamily:"var(--font-b)",color:"var(--text)",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:18,height:18,borderRadius:3,background:"var(--amber)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#000",fontFamily:"var(--font-d)"}}>◆</div><Spinner/></div>}
          <div ref={bottomRef}/>
        </div>
        {!done&&<div style={{padding:"8px 14px 12px",borderTop:"1px solid var(--border)",background:"var(--bg3)",display:"flex",gap:6}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder="Type your answer…" style={{flex:1,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:11,padding:"7px 9px"}}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"var(--bg4)":"var(--amber)",color:loading||!input.trim()?"var(--text3)":"#000",border:"none",borderRadius:5,padding:"0 14px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:11}}>{loading?<Spinner/>:"↑"}</button>
        </div>}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE STATUS REPORT
// ══════════════════════════════════════════════════════════════════════════════
const StatusReport = ({state,provider,onClose}) => {
  const prov = AI_PROVIDERS[provider]||AI_PROVIDERS.claude;
  const {programme,tasks,risks,metrics,raidItems} = state;
  const [report,setReport] = useState(null);
  const [loading,setLoading] = useState(false);
  const [copied,setCopied]   = useState(false);

  const g=ragCount(metrics,"green"),a=ragCount(metrics,"amber"),r=ragCount(metrics,"red");
  const phi=metrics.length?Math.round((g*100+a*50)/metrics.length):0;
  const phiC=phi>=70?"#3dd68c":phi>=50?"#f5a623":"#f05252";
  const openRisks=risks.filter(r=>r.status==="Open").length;
  const openIssues=(raidItems||[]).filter(i=>i.type==="issue"&&i.status==="Open").length;
  const pendingDecs=(raidItems||[]).filter(i=>i.type==="decision"&&i.status!=="Agreed").length;

  useEffect(()=>{ generate(); },[]);

  async function generate(){
    setLoading(true);
    const SYS=`You are an expert PMO writer. Write an executive programme status report. Be concise, direct, and use programme management language. No filler. Executives read this in 90 seconds.

Structure your response EXACTLY as follows (use these exact section headers):

## PROGRAMME STATUS
One RAG status line and one sentence on overall health.

## THIS PERIOD — KEY PROGRESS
3-5 bullet points. Concrete completions and movements only.

## NEXT PERIOD — PRIORITIES
3-4 bullet points. What must happen next.

## RISKS & ISSUES
List the top 2-3 open risks/issues only. One mitigation per item.

## DECISIONS REQUIRED
Any decisions needed from leadership. If none, say "No decisions pending."

## FINANCIAL SUMMARY
One paragraph on budget status and any variances.`;

    const prompt=`Programme: ${programme.name} (${programme.type})
Objective: ${programme.objective}
Sponsor: ${programme.sponsor}
Phase: ${programme.phase}
Report date: ${fmtL(d(0))}

PROGRAMME HEALTH:
- Portfolio Health Index: ${phi}/100 (${phi>=70?"Green":phi>=50?"Amber":"Red"})
- Tasks complete: ${tasks.filter(t=>t.status==="complete").length}/${tasks.length}
- Tasks in progress: ${tasks.filter(t=>t.status==="in-progress").length}
- Open risks: ${openRisks}
- Open issues: ${openIssues}
- Decisions pending: ${pendingDecs}

METRICS SUMMARY:
${metrics.map(m=>`- ${m.name}: ${fmtVal(m)} vs target ${m.target}${m.unit} [${m.rag.toUpperCase()}] — ${m.note}`).join("\n")}

RECENT TASKS:
${tasks.filter(t=>t.status==="in-progress"||t.status==="complete").slice(0,8).map(t=>`- [${t.status}] ${t.name} (${t.owner}) ${t.progress}% complete`).join("\n")}

OPEN RISKS:
${risks.filter(r=>r.status==="Open").map(r=>`- [${r.impact}] ${r.title} — ${r.mitigation}`).join("\n")||"None"}

RAID ITEMS:
${(raidItems||[]).filter(i=>i.status!=="Closed"&&i.status!=="Agreed").map(i=>`- [${i.type.toUpperCase()}] ${i.title}: ${i.description}`).join("\n")||"None outstanding"}`;

    try{
      const r=await prov.call(SYS,[{role:"user",content:prompt}]);
      setReport(r);
    }catch(e){setReport("⚠ AI engine error — could not generate report.");}
    setLoading(false);
  }

  function copy(){navigator.clipboard?.writeText(report||"");setCopied(true);setTimeout(()=>setCopied(false),2000);}

  function renderReport(text){
    const sections=text.split(/^##\s/m).filter(Boolean);
    return sections.map((sec,i)=>{
      const lines=sec.split("\n");
      const title=lines[0].trim();
      const body=lines.slice(1).join("\n").trim();
      return(
        <div key={i} style={{marginBottom:20}}>
          <div style={{fontSize:9,fontFamily:"var(--font-m)",color:i===0?phiC:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:7,display:"flex",alignItems:"center",gap:6}}>
            {i===0&&<div style={{width:7,height:7,borderRadius:"50%",background:phiC,animation:"blink 2s infinite"}}/>}
            {title}
          </div>
          <div style={{fontSize:11,fontFamily:"var(--font-b)",color:"var(--text)",lineHeight:1.75,whiteSpace:"pre-wrap"}}>
            {body.split("\n").map((line,j)=>{
              if(line.startsWith("- ")){
                return <div key={j} style={{display:"flex",gap:8,marginBottom:3}}>
                  <span style={{color:"var(--amber)",flexShrink:0,marginTop:2}}>·</span>
                  <span>{line.slice(2)}</span>
                </div>;
              }
              return <p key={j} style={{marginBottom:4}}>{line}</p>;
            })}
          </div>
        </div>
      );
    });
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"min(720px,100%)",height:"min(82vh,700px)",background:"var(--bg1)",border:"1px solid var(--border2)",borderRadius:10,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",background:"var(--bg2)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:2}}>Executive Status Report</div>
            <div style={{fontSize:13,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)"}}>{programme.name} · {fmtL(d(0))}</div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:`${phiC}15`,border:`1px solid ${phiC}40`,borderRadius:20}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:phiC}}/>
              <span style={{fontSize:8,fontFamily:"var(--font-m)",color:phiC,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em"}}>PHI {phi}</span>
            </div>
            {report&&<button onClick={copy} style={{fontSize:8,fontFamily:"var(--font-m)",padding:"5px 11px",background:"rgba(74,158,255,0.15)",border:"1px solid rgba(74,158,255,0.3)",borderRadius:5,color:"var(--blue)",cursor:"pointer"}}>{copied?"Copied ✓":"Copy Text"}</button>}
            {report&&<button onClick={generate} disabled={loading} style={{fontSize:8,fontFamily:"var(--font-m)",padding:"5px 11px",background:"rgba(245,166,35,0.15)",border:"1px solid rgba(245,166,35,0.3)",borderRadius:5,color:"var(--amber)",cursor:"pointer"}}>↻ Refresh</button>}
            <button onClick={onClose} style={{color:"var(--text3)",fontSize:16,padding:"2px 5px"}}>✕</button>
          </div>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--bg2)",flexShrink:0}}>
          {[{l:"Tasks Complete",v:`${tasks.filter(t=>t.status==="complete").length}/${tasks.length}`,c:"#3dd68c"},{l:"In Progress",v:tasks.filter(t=>t.status==="in-progress").length,c:"#f5a623"},{l:"Open Risks",v:openRisks,c:"#f05252"},{l:"Open Issues",v:openIssues,c:"#a78bfa"},{l:"Decisions Pending",v:pendingDecs,c:"#4a9eff"},{l:"On Track Metrics",v:g,c:"#3dd68c"}].map((s,i,arr)=>(
            <div key={i} style={{flex:1,padding:"8px 10px",borderRight:i<arr.length-1?"1px solid var(--border)":"none",textAlign:"center"}}>
              <div style={{fontSize:15,fontFamily:"var(--font-d)",fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {loading&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}>
              <Spinner s={20}/>
              <div style={{fontSize:10,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",animation:"shimmer 1.5s infinite"}}>Generating executive report…</div>
            </div>
          )}
          {report&&!loading&&renderReport(report)}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// RAID LOG TAB
// ══════════════════════════════════════════════════════════════════════════════
const RAIDLog = ({raidItems,setRaidItems,provider}) => {
  const prov = AI_PROVIDERS[provider]||AI_PROVIDERS.claude;
  const [filter,setFilter]   = useState("all");
  const [showAdd,setShowAdd] = useState(false);
  const [addType,setAddType] = useState("risk");
  const [form,setForm]       = useState({title:"",description:"",owner:"",impact:"Medium",dueDate:"",status:"Open"});
  const [aiInput,setAiInput] = useState("");
  const [aiLoading,setAiLoading] = useState(false);

  const filtered = filter==="all" ? raidItems : raidItems.filter(i=>i.type===filter);

  async function addViaAI(){
    if(!aiInput.trim()||aiLoading)return;
    setAiLoading(true);
    const SYS=`You are APEX. The user is describing a RAID item. Extract it and return ONLY valid JSON:
{"type":"risk|assumption|issue|decision","title":"short title (max 60 chars)","description":"full description","owner":"name if mentioned, else TBC","impact":"High|Medium|Low","status":"Open","dateRaised":"${d(0)}","dueDate":"YYYY-MM-DD or null"}`;
    try{
      const r=await prov.call(SYS,[{role:"user",content:aiInput}]);
      const jm=r.match(/```json\s*([\s\S]*?)```/)||[null,r.trim()];
      const parsed=JSON.parse((jm[1]||r).replace(/```json|```/g,"").trim());
      setRaidItems(prev=>[...prev,{...parsed,id:`rd-${uid()}`,dueDate:parsed.dueDate||d(14)}]);
      setAiInput("");
    }catch(e){/* silent */}
    setAiLoading(false);
  }

  function addManual(){
    if(!form.title.trim())return;
    setRaidItems(prev=>[...prev,{...form,id:`rd-${uid()}`,type:addType,dateRaised:d(0),dueDate:form.dueDate||d(14)}]);
    setForm({title:"",description:"",owner:"",impact:"Medium",dueDate:"",status:"Open"});
    setShowAdd(false);
  }

  function updateItem(id,upd){setRaidItems(prev=>prev.map(i=>i.id===id?{...i,...upd}:i));}
  function removeItem(id){setRaidItems(prev=>prev.filter(i=>i.id!==id));}

  const counts=Object.fromEntries(Object.keys(RAID_TYPES).map(t=>[t,raidItems.filter(i=>i.type===t).length]));

  return(
    <div style={{padding:"16px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:12}}>
        <div>
          <div style={{fontSize:13,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)",marginBottom:4}}>RAID Log</div>
          <div style={{display:"flex",gap:10}}>
            {Object.entries(RAID_TYPES).map(([t,tm])=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:9,fontFamily:"var(--font-m)",color:tm.color,fontWeight:600}}>{counts[t]||0}</span>
                <span style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{tm.label}s</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{fontSize:8,fontFamily:"var(--font-m)",padding:"6px 13px",background:"rgba(245,166,35,0.12)",border:"1px solid rgba(245,166,35,0.35)",borderRadius:5,color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.08em"}}>+ Add Item</button>
      </div>

      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,padding:"11px 13px",marginBottom:14}}>
        <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>◆ Natural Language Entry</div>
        <div style={{display:"flex",gap:7}}>
          <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addViaAI();}} placeholder={`Describe a risk, assumption, issue, or decision…`} style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:10,padding:"7px 9px"}}/>
          <button onClick={addViaAI} disabled={aiLoading||!aiInput.trim()} style={{background:aiLoading||!aiInput.trim()?"var(--bg3)":"var(--amber)",color:aiLoading||!aiInput.trim()?"var(--text3)":"#000",border:"none",borderRadius:5,padding:"0 14px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:11,minWidth:50}}>{aiLoading?<Spinner/>:"↑"}</button>
        </div>
      </div>

      {showAdd&&(
        <div className="fu" style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:7,padding:"13px",marginBottom:14}}>
          <div style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Manual Add</div>
          <div style={{display:"flex",gap:6,marginBottom:9,flexWrap:"wrap"}}>
            {Object.entries(RAID_TYPES).map(([t,tm])=>(
              <button key={t} onClick={()=>setAddType(t)} style={{fontSize:8,fontFamily:"var(--font-m)",padding:"4px 11px",border:`1px solid ${addType===t?tm.color:"var(--border2)"}`,borderRadius:4,color:addType===t?tm.color:"var(--text3)",background:addType===t?`${tm.color}15`:"transparent",textTransform:"uppercase",letterSpacing:"0.08em"}}>{tm.icon} {tm.label}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Title *" style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:4,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:10,padding:"6px 8px"}}/>
            <input value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))} placeholder="Owner" style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:4,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:10,padding:"6px 8px"}}/>
          </div>
          <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Description" rows={2} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:4,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:10,padding:"6px 8px",resize:"none",lineHeight:1.5,marginBottom:8}}/>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <select value={form.impact} onChange={e=>setForm(p=>({...p,impact:e.target.value}))} style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:4,color:"var(--text)",fontFamily:"var(--font-m)",fontSize:9,padding:"5px 7px"}}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
            <input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:4,color:"var(--text)",fontFamily:"var(--font-m)",fontSize:9,padding:"5px 7px"}}/>
            <button onClick={addManual} style={{background:"var(--amber)",color:"#000",borderRadius:4,padding:"6px 14px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:10,marginLeft:"auto"}}>Add</button>
            <button onClick={()=>setShowAdd(false)} style={{border:"1px solid var(--border2)",borderRadius:4,padding:"6px 10px",color:"var(--text3)",fontSize:9}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:5,marginBottom:12}}>
        {[["all","All"],...Object.entries(RAID_TYPES).map(([t,tm])=>[t,tm.label+"s"])].map(([key,label])=>(
          <button key={key} onClick={()=>setFilter(key)} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"3px 10px",border:`1px solid ${filter===key?(RAID_TYPES[key]?.color||"var(--amber)"):"var(--border2)"}`,borderRadius:20,color:filter===key?(RAID_TYPES[key]?.color||"var(--amber)"):"var(--text3)",background:filter===key?`${RAID_TYPES[key]?.color||"var(--amber)"}15`:"transparent",textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
        ))}
        <div style={{marginLeft:"auto",fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>{filtered.length} item{filtered.length!==1?"s":""}</div>
      </div>

      {filtered.length===0&&<div style={{textAlign:"center",padding:"32px",fontSize:10,fontFamily:"var(--font-m)",color:"var(--text3)"}}>No {filter==="all"?"RAID":filter} items yet. Add via natural language above.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {filtered.map((item,i)=>{
          const tm=RAID_TYPES[item.type]||RAID_TYPES.risk;
          const statusColor=item.status==="Agreed"||item.status==="Closed"?"#3dd68c":item.status==="Open"?"#f5a623":"var(--text3)";
          return(
            <div key={item.id} className="fu" style={{animationDelay:`${i*0.02}s`,background:"var(--bg2)",border:`1px solid ${tm.color}25`,borderLeft:`3px solid ${tm.color}`,borderRadius:6,padding:"11px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:8,fontFamily:"var(--font-m)",color:tm.color,background:`${tm.color}15`,border:`1px solid ${tm.color}30`,padding:"1px 7px",borderRadius:3,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>{tm.icon} {tm.label}</span>
                    {item.impact&&<span style={{fontSize:7,fontFamily:"var(--font-m)",color:{High:"#f05252",Medium:"#f5a623",Low:"#3dd68c"}[item.impact]||"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>▲ {item.impact}</span>}
                    <span style={{fontSize:8,fontFamily:"var(--font-m)",color:statusColor,background:`${statusColor}15`,border:`1px solid ${statusColor}30`,padding:"1px 6px",borderRadius:3}}>{item.status}</span>
                    <span style={{fontSize:10,fontFamily:"var(--font-b)",fontWeight:500,color:"var(--text)"}}>{item.title}</span>
                  </div>
                  {item.description&&<p style={{fontSize:9,fontFamily:"var(--font-b)",color:"var(--text2)",lineHeight:1.6,marginBottom:5}}>{item.description}</p>}
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {item.owner&&<span style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--blue)"}}>Owner: {item.owner}</span>}
                    {item.dateRaised&&<span style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text3)"}}>Raised: {fmt(item.dateRaised)}</span>}
                    {item.dueDate&&<span style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text3)"}}>Due: {fmt(item.dueDate)}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <select value={item.status} onChange={e=>updateItem(item.id,{status:e.target.value})} style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:4,color:"var(--text)",fontFamily:"var(--font-m)",fontSize:8,padding:"3px 5px"}}>
                    {item.type==="decision"?<><option>Pending</option><option>Agreed</option><option>Rejected</option></>:item.type==="assumption"?<><option>Active</option><option>Confirmed</option><option>Invalidated</option></>:<><option>Open</option><option>In Progress</option><option>Closed</option></>}
                  </select>
                  <button onClick={()=>removeItem(item.id)} style={{fontSize:10,color:"var(--text3)",padding:"2px 5px",opacity:0.5,transition:"opacity 0.15s"}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.5"}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// METRIC DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════
const MetricPanel = ({metric,tasks,onClose,onSave,onNavigate}) => {
  const [val,setVal]   = useState(String(metric.value));
  const [note,setNote] = useState(metric.note||"");
  const [rag,setRag]   = useState(metric.rag);
  const fam=FAMILIES[metric.family]||FAMILIES.delivery;
  const linked=(metric.links||[]).map(l=>({...l,task:tasks.find(t=>t.id===l.taskId)})).filter(l=>l.task);
  function save(){const nv=parseFloat(val);if(isNaN(nv))return;onSave({...metric,value:nv,note,rag,trend:[...(metric.trend||[]).slice(1),nv],lastUpdated:d(0)});onClose();}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"flex-end"}} onClick={onClose}>
      <div className="sr" style={{width:400,height:"100%",background:"var(--bg2)",borderLeft:"1px solid var(--border2)",display:"flex",flexDirection:"column",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"15px 17px",borderBottom:"1px solid var(--border)",background:"var(--bg3)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:fam.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{fam.icon} {fam.label}</div><div style={{fontSize:14,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)",lineHeight:1.25}}>{metric.name}</div></div>
            <button onClick={onClose} style={{color:"var(--text3)",fontSize:17,padding:"2px 4px"}}>✕</button>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:11,marginBottom:9}}>
            <div style={{fontSize:38,fontFamily:"var(--font-d)",fontWeight:800,color:RAG[metric.rag].color,lineHeight:1}}>{fmtVal(metric)}</div>
            <div style={{paddingBottom:2}}><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>Target</div><div style={{fontSize:14,fontFamily:"var(--font-m)",color:"var(--text2)",fontWeight:500}}>{metric.target}{metric.unit}</div></div>
            <Spark data={metric.trend} color={RAG[metric.rag].color} positive={metric.direction==="higher"}/>
          </div>
          {metric.trend&&<div style={{height:38}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={metric.trend.map((v,i)=>({v,l:metric.trendL?.[i]||`Wk${i+1}`}))} margin={{top:2,right:0,bottom:0,left:0}}><defs><linearGradient id="dp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RAG[metric.rag].color} stopOpacity={0.4}/><stop offset="100%" stopColor={RAG[metric.rag].color} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="l" tick={{fontSize:7,fontFamily:"var(--font-m)",fill:"var(--text3)"}} axisLine={false} tickLine={false}/><Area type="monotone" dataKey="v" stroke={RAG[metric.rag].color} strokeWidth={2} fill="url(#dp-g)" dot={{fill:RAG[metric.rag].color,r:2}}/></AreaChart></ResponsiveContainer></div>}
        </div>
        <div style={{padding:"15px 17px",flex:1}}>
          <p style={{fontSize:10,fontFamily:"var(--font-b)",color:"var(--text2)",lineHeight:1.6,marginBottom:16}}>{metric.note}</p>
          {linked.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7}}>Task Linkages ({linked.length})</div>
            {["drives","influences","correlates"].map(type=>{const grp=linked.filter(l=>l.type===type);if(!grp.length)return null;const lm=LINK_META[type];return(<div key={type} style={{marginBottom:9}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><div style={{width:11,height:2,background:lm.color,opacity:lm.opacity,borderRadius:1,flexShrink:0}}/><span style={{fontSize:7,fontFamily:"var(--font-m)",color:lm.color,textTransform:"uppercase",letterSpacing:"0.1em",opacity:lm.opacity}}>{lm.label}</span><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>{lm.desc}</span></div>
              {grp.map(l=><div key={l.taskId} onClick={()=>{onNavigate&&onNavigate(l.task);onClose();}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",marginBottom:2,background:"var(--bg3)",borderRadius:4,border:`1px solid ${lm.color}20`,cursor:"pointer",transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=lm.color+"55"} onMouseLeave={e=>e.currentTarget.style.borderColor=lm.color+"20"}><Badge status={l.task.status}/><div style={{flex:1}}><div style={{fontSize:9,fontFamily:"var(--font-b)",color:"var(--text)"}}>{l.task.name}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",marginTop:1}}>{l.task.owner} · {l.task.progress}%</div></div><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>→ Gantt</span></div>)}
            </div>);})}
          </div>}
          <div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
            <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Manual Update</div>
            <div style={{marginBottom:9}}><label style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:3}}>Value ({metric.unit})</label><input value={val} onChange={e=>setVal(e.target.value)} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text)",fontFamily:"var(--font-m)",fontSize:21,fontWeight:700,padding:"8px 10px"}}/></div>
            <div style={{marginBottom:9}}><label style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:3}}>RAG</label><div style={{display:"flex",gap:5}}>{Object.entries(RAG).map(([k,r])=><button key={k} onClick={()=>setRag(k)} style={{flex:1,padding:"5px",border:`1px solid ${rag===k?r.color:"var(--border2)"}`,borderRadius:5,background:rag===k?r.bg:"transparent",color:rag===k?r.color:"var(--text3)",fontSize:7,fontFamily:"var(--font-m)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{r.label}</button>)}</div></div>
            <div style={{marginBottom:12}}><label style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:3}}>Commentary</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:10,padding:"6px 8px",resize:"none",lineHeight:1.5}}/></div>
            <div style={{display:"flex",gap:6}}><button onClick={save} style={{flex:1,background:"var(--amber)",color:"#000",borderRadius:5,padding:"8px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:11}}>Save</button><button onClick={onClose} style={{padding:"8px 12px",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text3)",fontSize:10}}>Cancel</button></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TASK DRAWER
// ══════════════════════════════════════════════════════════════════════════════
const TaskDrawer = ({task,tasks,metrics,onClose,onUpdate,onOpenMetric}) => {
  if(!task)return null;
  const meta=STATUS_META[task.status]||STATUS_META["not-started"];
  const linkedMetrics=(metrics||[]).filter(m=>(m.links||[]).some(l=>l.taskId===task.id));
  return(
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:300,background:"var(--bg2)",borderLeft:"1px solid var(--border2)",zIndex:100,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,0.5)",animation:"fadeUp 0.2s ease"}}>
      <div style={{padding:"13px 14px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>{task.phase}</div><div style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)",lineHeight:1.3}}>{task.name}</div></div>
        <button onClick={onClose} style={{color:"var(--text3)",fontSize:16,padding:"2px 4px"}}>✕</button>
      </div>
      <div style={{padding:12,flex:1,overflowY:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
          {[{l:"Owner",v:task.owner,c:"var(--blue)"},{l:"Status",v:<Badge status={task.status}/>},{l:"Start",v:fmt(task.start),c:"var(--text2)"},{l:"End",v:fmt(task.end),c:"var(--text2)"},{l:"Progress",v:`${task.progress}%`,c:meta.color},{l:"Deps",v:task.deps?.join(", ")||"None",c:"var(--text3)"}].map((f,i)=>(
            <div key={i} style={{background:"var(--bg3)",padding:"7px 9px",borderRadius:4,border:"1px solid var(--border)"}}><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>{f.l}</div><div style={{fontSize:9,fontFamily:"var(--font-m)",color:f.c||"var(--text)"}}>{f.v}</div></div>
          ))}
        </div>
        <div style={{background:"var(--bg3)",borderRadius:3,height:3,overflow:"hidden",border:"1px solid var(--border)",marginBottom:11}}><div style={{width:`${task.progress}%`,height:"100%",background:`linear-gradient(90deg,${meta.color}88,${meta.color})`,borderRadius:3}}/></div>
        {linkedMetrics.length>0&&<div style={{marginBottom:11}}>
          <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>◆ Driving Metrics ({linkedMetrics.length})</div>
          {linkedMetrics.map(m=>{const link=(m.links||[]).find(l=>l.taskId===task.id);const lm=LINK_META[link?.type]||LINK_META.influences;return(
            <div key={m.id} onClick={()=>onOpenMetric&&onOpenMetric(m)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 7px",marginBottom:2,background:"var(--bg3)",borderRadius:4,border:`1px solid ${lm.color}20`,cursor:"pointer",transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=lm.color+"55"} onMouseLeave={e=>e.currentTarget.style.borderColor=lm.color+"20"}>
              <RagPip rag={m.rag}/><div style={{flex:1}}><div style={{fontSize:9,fontFamily:"var(--font-b)",color:"var(--text)"}}>{m.name}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:lm.color,marginTop:1,opacity:lm.opacity}}>{lm.label} · {FAMILIES[m.family]?.label}</div></div>
              <div style={{fontSize:10,fontFamily:"var(--font-m)",fontWeight:700,color:RAG[m.rag].color}}>{fmtVal(m)}</div>
            </div>
          );})}
        </div>}
        <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Quick Status</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{Object.entries(STATUS_META).map(([key,m])=><button key={key} onClick={()=>onUpdate(task.id,{status:key})} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"3px 7px",border:`1px solid ${task.status===key?m.color:"var(--border2)"}`,borderRadius:3,color:task.status===key?m.color:"var(--text3)",background:task.status===key?m.bg:"transparent",cursor:"pointer",textTransform:"uppercase"}}>{m.label}</button>)}</div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const Dashboard = ({state,setState,provider,setProvider,onNewProgramme}) => {
  const {programme,tasks,risks,metrics,raidItems=[]} = state;
  const prov = AI_PROVIDERS[provider]||AI_PROVIDERS.claude;

  const setTasks   = fn => setState(p=>({...p,tasks:  typeof fn==="function"?fn(p.tasks)  :fn}));
  const setRisks   = fn => setState(p=>({...p,risks:  typeof fn==="function"?fn(p.risks)  :fn}));
  const setMetrics = fn => setState(p=>({...p,metrics:typeof fn==="function"?fn(p.metrics):fn}));
  const setRAID    = fn => setState(p=>({...p,raidItems:typeof fn==="function"?fn(p.raidItems||[]):fn}));

  const [tab,       setTab]     = useState("metrics");
  const [selTask,   setSelTask] = useState(null);
  const [hlTask,    setHlTask]  = useState(null);
  const [openMetric,setOpenM]   = useState(null);
  const [showModal, setShowModal]= useState(false);
  const [showAdd,   setShowAdd] = useState(false);
  const [showReport,setShowReport]=useState(false);
  const [messages,  setMessages]= useState([{role:"assistant",content:`Programme "${programme.name}" (${programme.type}) is live.\n\n${tasks.length} tasks · ${risks.filter(r=>r.status==="Open").length} open risks · ${metrics.length} metrics · ${raidItems.length} RAID items.\n\nDescribe updates, paste documents, or ask about programme status. I'll interpret and update.`}]);
  const [input,     setInput]   = useState("");
  const [loading,   setLoading] = useState(false);
  const [linkLoad,  setLinkLoad]= useState(false);
  const [pendLinks, setPendLinks]= useState([]);
  const bottomRef = useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,pendLinks]);

  const g=ragCount(metrics,"green"),a=ragCount(metrics,"amber"),r=ragCount(metrics,"red");
  const phi=metrics.length?Math.round((g*100+a*50)/metrics.length):0;
  const phiC=phi>=70?"#3dd68c":phi>=50?"#f5a623":"#f05252";
  const openRisks=risks.filter(r=>r.status==="Open").length;

  const SYSTEM=`You are APEX Command Intelligence for "${programme.name}" (${programme.type}, ${programme.phase}). AI engine: ${prov.label}.
Objective: ${programme.objective}. Sponsor: ${programme.sponsor}.
TASKS: ${JSON.stringify(tasks.map(t=>({id:t.id,name:t.name,status:t.status,progress:t.progress,owner:t.owner,phase:t.phase})))}
RISKS: ${JSON.stringify(risks)}
METRICS: ${JSON.stringify(metrics.map(m=>({id:m.id,name:m.name,family:m.family,value:m.value,target:m.target,unit:m.unit,rag:m.rag})))}
Reply concisely (max 130 words, senior PMO tone). End with ONE \`\`\`json ... \`\`\` if updates needed:
{"taskUpdates":[{"id":"t1","status":"in-progress","progress":30}],"newRisks":[{"id":"r5","title":"...","impact":"High","likelihood":"Medium","status":"Open","owner":"...","mitigation":"..."}],"riskUpdates":[{"id":"r1","status":"Mitigated","mitigation":"..."}],"metricUpdates":[{"id":"m1","value":55,"note":"...","rag":"amber"}],"newRAID":[{"id":"rd9","type":"issue","title":"...","description":"...","owner":"...","status":"Open","impact":"High","dateRaised":"${d(0)}","dueDate":"${d(14)}"}]}
Omit JSON if nothing changes.`;

  async function send(){
    if(!input.trim()||loading)return;
    const uMsg={role:"user",content:input.trim()};
    const nMsgs=[...messages,uMsg];
    setMessages(nMsgs);setInput("");setLoading(true);
    try{
      const reply=await prov.call(SYSTEM,nMsgs.map(m=>({role:m.role,content:m.content})));
      const jm=reply.match(/```json\s*([\s\S]*?)```/);
      if(jm){try{
        const u=JSON.parse(jm[1]);
        if(u.taskUpdates?.length)  setTasks(prev=>prev.map(t=>{const up=u.taskUpdates.find(x=>x.id===t.id);return up?{...t,...up}:t;}));
        if(u.newRisks?.length)     setRisks(prev=>[...prev,...u.newRisks]);
        if(u.riskUpdates?.length)  setRisks(prev=>prev.map(r=>{const up=u.riskUpdates.find(x=>x.id===r.id);return up?{...r,...up}:r;}));
        if(u.metricUpdates?.length)setMetrics(prev=>prev.map(m=>{const up=u.metricUpdates.find(x=>x.id===m.id);if(!up)return m;return{...m,...up,trend:[...(m.trend||[]).slice(1),up.value??m.value],lastUpdated:d(0)};}));
        if(u.newRAID?.length)      setRAID(prev=>[...prev,...u.newRAID]);
      }catch(e){}}
      setMessages(prev=>[...prev,{role:"assistant",content:reply.replace(/```json[\s\S]*?```/g,"").trim()}]);
    }catch(e){setMessages(prev=>[...prev,{role:"assistant",content:"⚠ AI engine error."}]);}
    setLoading(false);
  }

  async function analyseLinkages(){
    setLinkLoad(true);setPendLinks([]);
    const SYS=`You are APEX linkage intelligence. Find up to 5 missing task-metric linkages worth adding.
Return ONLY valid JSON array, no markdown:
[{"taskId":"t1","metricId":"m2","linkType":"drives|influences|correlates","rationale":"one causal sentence"}]
Return [] if no strong suggestions.`;
    const prompt=`Tasks: ${JSON.stringify(tasks.map(t=>({id:t.id,name:t.name,phase:t.phase,status:t.status,linked:metrics.filter(m=>(m.links||[]).some(l=>l.taskId===t.id)).map(m=>m.name)})))}
Metrics: ${JSON.stringify(metrics.map(m=>({id:m.id,name:m.name,family:m.family,linkedTaskIds:(m.links||[]).map(l=>l.taskId)})))}`;
    try{
      const raw=await prov.call(SYS,[{role:"user",content:prompt}]);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setPendLinks(parsed.map((s,i)=>({...s,id:`ls-${uid()}`,taskName:tasks.find(t=>t.id===s.taskId)?.name||s.taskId,metricName:metrics.find(m=>m.id===s.metricId)?.name||s.metricId})).filter(s=>s.taskId&&s.metricId));
      setMessages(prev=>[...prev,{role:"assistant",content:parsed.length?`Found ${parsed.length} suggested linkage${parsed.length>1?"s":""}. Review below.`:"Linkage analysis complete — no significant gaps found."}]);
    }catch(e){setMessages(prev=>[...prev,{role:"assistant",content:"⚠ Linkage analysis error."}]);}
    setLinkLoad(false);
  }

  function acceptLink(s){setMetrics(prev=>prev.map(m=>{if(m.id!==s.metricId)return m;if((m.links||[]).some(l=>l.taskId===s.taskId))return m;return{...m,links:[...(m.links||[]),{taskId:s.taskId,type:s.linkType}]};}));setPendLinks(prev=>prev.filter(x=>x.id!==s.id));}
  function navigateToTask(task){setTab("gantt");setHlTask(task.id);setSelTask(task);setTimeout(()=>document.getElementById(`tr-${task.id}`)?.scrollIntoView({behavior:"smooth",block:"center"}),150);}

  function handleAddProject(phaseName,newTasks){
    setTasks(prev=>[...prev,...newTasks]);
    setShowAdd(false);
    setTab("gantt");
  }

  const GW=70,gS=new Date(today);gS.setDate(gS.getDate()-14);
  const todayPct=(daysBetween(gS,today)/GW)*100;
  const phases=[...new Set(tasks.map(t=>t.phase))];
  const wkL=[];for(let i=0;i<=GW;i+=7){const dt=new Date(gS);dt.setDate(dt.getDate()+i);wkL.push({pct:(i/GW)*100,label:fmt(dt.toISOString().split("T")[0])});}

  const TABS=[{id:"metrics",label:"Command Dashboard"},{id:"gantt",label:`Gantt (${tasks.length})`},{id:"risks",label:`Risks (${openRisks})`},{id:"raid",label:`RAID (${raidItems.length})`},{id:"ai",label:"⚡ AI Command"}];

  const [activeFam,setActiveFam] = useState("all");
  const filteredMetrics = activeFam==="all"?metrics:metrics.filter(m=>m.family===activeFam);

  return(
    <div style={{minHeight:"100vh",background:"var(--bg0)",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:"var(--bg1)",borderBottom:"1px solid var(--border)",padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48,flexShrink:0,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:24,height:24,background:"var(--amber)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#000",fontFamily:"var(--font-d)"}}>◆</div>
          <div><div style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:800,color:"var(--text)",letterSpacing:"-0.02em"}}>APEX</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",letterSpacing:"0.15em",textTransform:"uppercase"}}>AI Programme Execution & Control</div></div>
          <div style={{width:1,height:16,background:"var(--border)",margin:"0 5px"}}/>
          <div><div style={{fontSize:10,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--text)"}}>{programme.name}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{programme.type} · {programme.phase}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowReport(true)} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"5px 11px",background:"rgba(74,158,255,0.12)",border:"1px solid rgba(74,158,255,0.3)",borderRadius:4,color:"var(--blue)",textTransform:"uppercase",letterSpacing:"0.08em"}}>📋 Status Report</button>
          <button onClick={()=>setShowAdd(true)} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"5px 11px",background:"rgba(61,214,140,0.12)",border:"1px solid rgba(61,214,140,0.3)",borderRadius:4,color:"var(--green)",textTransform:"uppercase",letterSpacing:"0.08em"}}>+ Add Project</button>
          <button onClick={()=>setShowModal(true)} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"5px 11px",background:"rgba(245,166,35,0.1)",border:"1px solid rgba(245,166,35,0.3)",borderRadius:4,color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.08em"}}>+ New Programme</button>
          <ProviderSwitcher provider={provider} onChange={setProvider}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:"#3dd68c",display:"inline-block",animation:"blink 2s infinite"}}/><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"#3dd68c",textTransform:"uppercase",letterSpacing:"0.1em"}}>Live</span></div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--bg2)",flexShrink:0}}>
        {[{l:"Complete",v:tasks.filter(t=>t.status==="complete").length,c:"#3dd68c"},{l:"In Progress",v:tasks.filter(t=>t.status==="in-progress").length,c:"#f5a623"},{l:"Open Risks",v:openRisks,c:"#f05252"},{l:"RAID Open",v:(raidItems).filter(i=>i.status==="Open"||i.status==="Active"||i.status==="Pending").length,c:"#a78bfa"},{l:"On Track",v:g,c:"#3dd68c"},{l:"PHI",v:phi,c:phiC}].map((s,i,arr)=>(
          <div key={i} style={{flex:1,padding:"8px 10px",borderRight:i<arr.length-1?"1px solid var(--border)":"none",textAlign:"center"}}>
            <div style={{fontSize:17,fontFamily:"var(--font-d)",fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"var(--bg1)",borderBottom:"1px solid var(--border)",padding:"0 18px",flexShrink:0}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",fontSize:8,fontFamily:"var(--font-m)",fontWeight:tab===t.id?600:400,color:tab===t.id?"var(--amber)":"var(--text3)",borderBottom:tab===t.id?"2px solid var(--amber)":"2px solid transparent",background:"none",cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.15s"}}>{t.label}</button>)}
      </div>

      {/* Content */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
        <div style={{flex:1,overflowY:tab==="ai"?"hidden":"auto",display:tab==="ai"?"flex":"block",flexDirection:"column"}}>

          {/* ── METRICS ── */}
          {tab==="metrics"&&<div style={{padding:"15px 18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr) 170px",gap:8,marginBottom:16}}>
              {[{l:"On Track",v:g,c:"#3dd68c"},{l:"At Risk",v:a,c:"#f5a623"},{l:"Off Track",v:r,c:"#f05252"},{l:"Total",v:metrics.length,c:"var(--text2)"},{l:"Families",v:[...new Set(metrics.map(m=>m.family))].length,c:"var(--violet)"}].map((s,i)=>(<div key={i} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,padding:"9px 12px"}}><div style={{fontSize:21,fontFamily:"var(--font-d)",fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{s.l}</div></div>))}
              <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,padding:"9px 12px"}}><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--violet)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Portfolio Health</div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:25,fontFamily:"var(--font-d)",fontWeight:800,color:phiC}}>{phi}</div><div style={{flex:1}}><div style={{background:"var(--bg0)",borderRadius:3,height:4,overflow:"hidden"}}><div style={{width:`${phi}%`,height:"100%",background:`linear-gradient(90deg,${phiC}88,${phiC})`,borderRadius:3}}/></div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",marginTop:2}}>Target 80+</div></div></div></div>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
              {[["all","All","var(--text2)"],...Object.entries(FAMILIES).map(([k,v])=>[k,v.label,v.color])].map(([key,label,color])=><button key={key} onClick={()=>setActiveFam(key)} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"3px 9px",border:`1px solid ${activeFam===key?color:"var(--border2)"}`,borderRadius:20,color:activeFam===key?color:"var(--text3)",background:activeFam===key?`${color}15`:"transparent",textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer",transition:"all 0.15s"}}>{label}</button>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:9}}>
              {filteredMetrics.map((m,i)=>{const fam=FAMILIES[m.family]||FAMILIES.delivery,rag=RAG[m.rag]||RAG.amber,pct=progPct(m),linked=(m.links||[]).map(l=>({...l,task:tasks.find(t=>t.id===l.taskId)})).filter(l=>l.task);
                return(<div key={m.id} className="fu" onClick={()=>setOpenM(m)} style={{animationDelay:`${i*0.025}s`,background:"var(--bg2)",border:"1px solid var(--border)",borderTop:`2px solid ${rag.color}`,borderRadius:6,padding:"11px 13px",cursor:"pointer",transition:"background 0.15s, border-color 0.15s",display:"flex",flexDirection:"column",gap:7}} onMouseEnter={e=>{e.currentTarget.style.background="var(--bg3)";e.currentTarget.style.borderColor=rag.color+"44";}} onMouseLeave={e=>{e.currentTarget.style.background="var(--bg2)";e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.borderTopColor=rag.color;}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:7}}><div style={{flex:1}}><div style={{fontSize:7,fontFamily:"var(--font-m)",color:fam.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>{fam.icon} {fam.label}</div><div style={{fontSize:10,fontFamily:"var(--font-b)",color:"var(--text)",fontWeight:500,lineHeight:1.3}}>{m.name}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:18,fontFamily:"var(--font-d)",fontWeight:800,color:rag.color,lineHeight:1}}>{fmtVal(m)}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",marginTop:2}}>of {m.target}{m.unit}</div></div></div>
                  <div style={{background:"var(--bg0)",borderRadius:3,height:3,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${rag.color}66,${rag.color})`,borderRadius:3,transition:"width 0.5s ease"}}/></div>
                  <p style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text2)",lineHeight:1.5}}>{m.note}</p>
                  {linked.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{linked.slice(0,3).map(l=><LinkChip key={l.taskId} task={l.task} linkType={l.type} onClick={navigateToTask}/>)}{linked.length>3&&<span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",alignSelf:"center"}}>+{linked.length-3}</span>}</div>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>{fmt(m.lastUpdated)}</span><Spark data={m.trend} color={rag.color} positive={m.direction==="higher"}/></div>
                </div>);
              })}
            </div>
          </div>}

          {/* ── GANTT ── */}
          {tab==="gantt"&&<div style={{overflowX:"auto"}}>
            <div style={{display:"flex",borderBottom:"1px solid var(--border)"}}><div style={{width:205,minWidth:205,padding:"5px 10px",fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Task</div><div style={{flex:1,position:"relative",height:24}}>{wkL.map((w,i)=><span key={i} style={{position:"absolute",left:`${w.pct}%`,fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",transform:"translateX(-50%)",top:5,whiteSpace:"nowrap"}}>{w.label}</span>)}</div></div>
            {phases.map(phase=>(<div key={phase}>
              <div style={{padding:"4px 10px",background:"var(--bg3)",borderBottom:"1px solid var(--border)"}}><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>◆ {phase}</span></div>
              {tasks.filter(t=>t.phase===phase).map(task=>{
                const left=Math.max(0,daysBetween(gS,new Date(task.start))),width=Math.max(1,daysBetween(new Date(task.start),new Date(task.end)));
                const lp=(left/GW)*100,wp=(width/GW)*100,meta=STATUS_META[task.status]||STATUS_META["not-started"],hl=task.id===hlTask;
                return(<div key={task.id} id={`tr-${task.id}`} style={{display:"flex",alignItems:"center",borderBottom:"1px solid var(--border)",minHeight:33,background:hl?"var(--bg4)":"var(--bg1)",transition:"background 0.3s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"} onMouseLeave={e=>e.currentTarget.style.background=hl?"var(--bg4)":"var(--bg1)"}>
                  <div style={{width:205,minWidth:205,padding:"0 10px",display:"flex",alignItems:"center",gap:4}}><Badge status={task.status}/><span style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.name}</span></div>
                  <div style={{flex:1,position:"relative",height:33}}>
                    {wkL.map((w,i)=><div key={i} style={{position:"absolute",left:`${w.pct}%`,top:0,bottom:0,borderLeft:"1px solid var(--border)"}}/>)}
                    {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,borderLeft:"1px dashed var(--amber)",zIndex:2,opacity:0.7}}/>}
                    {left<GW&&left+width>0&&<div onClick={()=>{setSelTask(task);setHlTask(task.id);}} style={{position:"absolute",left:`${Math.max(0,lp)}%`,width:`${Math.min(wp,100-Math.max(0,lp))}%`,top:"50%",transform:"translateY(-50%)",height:18,background:meta.bg,border:`1px solid ${meta.color}${hl?"ff":"55"}`,borderLeft:`3px solid ${meta.color}`,borderRadius:3,overflow:"hidden",cursor:"pointer",boxShadow:hl?`0 0 0 2px ${meta.color}44`:undefined,transition:"box-shadow 0.3s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.3)"} onMouseLeave={e=>e.currentTarget.style.filter="brightness(1)"}><div style={{position:"absolute",left:0,top:0,bottom:0,width:`${task.progress}%`,background:`${meta.color}20`}}/><span style={{position:"relative",zIndex:1,fontSize:7,fontFamily:"var(--font-m)",color:meta.color,paddingLeft:4,lineHeight:"18px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}}>{task.name}</span></div>}
                  </div>
                </div>);
              })}
            </div>))}
          </div>}

          {/* ── RISKS ── */}
          {tab==="risks"&&<div>
            <div style={{padding:"7px 14px",background:"var(--bg2)",borderBottom:"1px solid var(--border)",fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{risks.length} total · {openRisks} open · Use AI Command to add via natural language</div>
            {risks.map((r,i)=>(<div key={r.id} style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:i%2===0?"var(--bg1)":"var(--bg0)",display:"grid",gridTemplateColumns:"1fr auto",gap:7}}>
              <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}><span style={{fontSize:7,fontFamily:"var(--font-m)",fontWeight:600,color:{High:"#f05252",Medium:"#f5a623",Low:"#3dd68c"}[r.impact],textTransform:"uppercase",letterSpacing:"0.1em"}}>▲ {r.impact}</span><span style={{fontSize:10,fontFamily:"var(--font-b)",fontWeight:500,color:"var(--text)"}}>{r.title}</span><span style={{fontSize:7,fontFamily:"var(--font-m)",color:r.status==="Mitigated"?"var(--green)":"var(--amber)",background:r.status==="Mitigated"?"rgba(61,214,140,0.1)":"rgba(245,166,35,0.1)",padding:"1px 5px",borderRadius:2}}>{r.status}</span></div><p style={{fontSize:8,color:"var(--text2)",fontFamily:"var(--font-m)",lineHeight:1.6}}><span style={{color:"var(--text3)"}}>MITIGATION: </span>{r.mitigation}</p></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>Owner</div><div style={{fontSize:8,fontFamily:"var(--font-m)",color:"var(--blue)"}}>{r.owner}</div><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",marginTop:1}}>L'hood: <span style={{color:"var(--text2)"}}>{r.likelihood}</span></div></div>
            </div>))}
          </div>}

          {/* ── RAID LOG ── */}
          {tab==="raid"&&<RAIDLog raidItems={raidItems} setRaidItems={setRAID} provider={provider}/>}

          {/* ── AI COMMAND ── */}
          {tab==="ai"&&<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
            <div style={{padding:"7px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",flexShrink:0}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:prov.color,display:"inline-block",animation:"blink 2s infinite"}}/><span style={{fontSize:7,fontFamily:"var(--font-m)",color:prov.color,textTransform:"uppercase",letterSpacing:"0.1em"}}>{prov.badge}</span><span style={{fontSize:8,fontFamily:"var(--font-b)",color:"var(--text2)"}}>{prov.label}</span><span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)",marginLeft:2}}>{prov.desc}</span>
              <button onClick={analyseLinkages} disabled={linkLoad} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4,fontSize:7,fontFamily:"var(--font-m)",padding:"3px 9px",background:"rgba(167,139,250,0.15)",border:"1px solid rgba(167,139,250,0.4)",borderRadius:4,color:"var(--violet)",cursor:"pointer",opacity:linkLoad?0.5:1}}>{linkLoad?<><Spinner s={8}/> Analysing…</>:<>🔗 Analyse Linkages</>}</button>
              <span style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}>Switch engine via ▾ header</span>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"11px 14px",display:"flex",flexDirection:"column",gap:9}}>
              {messages.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                {m.role==="assistant"&&<div style={{width:20,height:20,borderRadius:3,background:"var(--amber)",marginRight:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#000",fontFamily:"var(--font-d)",marginTop:2}}>◆</div>}
                <div style={{maxWidth:"78%",padding:"7px 11px",borderRadius:m.role==="user"?"8px 8px 2px 8px":"8px 8px 8px 2px",background:m.role==="user"?"rgba(74,158,255,0.12)":"var(--bg3)",border:`1px solid ${m.role==="user"?"rgba(74,158,255,0.25)":"var(--border)"}`,fontSize:10,fontFamily:"var(--font-b)",color:"var(--text)",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>))}
              {pendLinks.map(s=>(<div key={s.id} className="fu" style={{background:"rgba(167,139,250,0.07)",border:"1px solid rgba(167,139,250,0.28)",borderRadius:6,padding:"8px 11px",display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{fontSize:11,flexShrink:0,marginTop:1}}>🔗</span>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--violet)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Suggested Linkage</div><p style={{fontSize:9,fontFamily:"var(--font-b)",color:"var(--text)",lineHeight:1.55,marginBottom:3}}>{s.rationale}</p><div style={{fontSize:7,fontFamily:"var(--font-m)",color:"var(--text3)"}}><span style={{color:LINK_META[s.linkType]?.color,fontWeight:600}}>{LINK_META[s.linkType]?.label}</span> · <span style={{color:"var(--text2)"}}>{s.taskName}</span> → <span style={{color:"var(--text2)"}}>{s.metricName}</span></div></div>
                <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                  <button onClick={()=>acceptLink(s)} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"3px 8px",background:"rgba(167,139,250,0.2)",border:"1px solid rgba(167,139,250,0.5)",borderRadius:3,color:"var(--violet)",cursor:"pointer"}}>Accept</button>
                  <button onClick={()=>setPendLinks(prev=>prev.filter(x=>x.id!==s.id))} style={{fontSize:7,fontFamily:"var(--font-m)",padding:"3px 8px",background:"transparent",border:"1px solid var(--border2)",borderRadius:3,color:"var(--text3)",cursor:"pointer"}}>Dismiss</button>
                </div>
              </div>))}
              {loading&&<div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:20,height:20,borderRadius:3,background:"var(--amber)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#000",fontFamily:"var(--font-d)"}}>◆</div><Spinner/></div>}
              <div ref={bottomRef}/>
            </div>
            <div style={{padding:"8px 12px",borderTop:"1px solid var(--border)",background:"var(--bg2)",display:"flex",gap:6,flexShrink:0}}>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Describe updates, paste a document, or ask about the programme…" rows={2} style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,color:"var(--text)",fontFamily:"var(--font-b)",fontSize:10,padding:"7px 9px",resize:"none",lineHeight:1.5}}/>
              <button onClick={send} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"var(--bg3)":"var(--amber)",color:loading||!input.trim()?"var(--text3)":"#000",border:"none",borderRadius:5,padding:"0 14px",fontFamily:"var(--font-d)",fontWeight:700,fontSize:11,transition:"all 0.2s",minWidth:48}}>{loading?<Spinner/>:"↑"}</button>
            </div>
          </div>}
        </div>

        {/* Task drawer */}
        {selTask&&<TaskDrawer task={tasks.find(t=>t.id===selTask.id)} tasks={tasks} metrics={metrics} onClose={()=>{setSelTask(null);setHlTask(null);}} onUpdate={(id,upd)=>setTasks(prev=>prev.map(t=>t.id===id?{...t,...upd}:t))} onOpenMetric={m=>{setSelTask(null);setHlTask(null);setTab("metrics");setTimeout(()=>setOpenM(m),100);}}/>}

        {/* Metric panel */}
        {openMetric&&<MetricPanel metric={metrics.find(m=>m.id===openMetric.id)||openMetric} tasks={tasks} onClose={()=>setOpenM(null)} onSave={updated=>setMetrics(prev=>prev.map(m=>m.id===updated.id?updated:m))} onNavigate={navigateToTask}/>}
      </div>

      {/* Modals */}
      {showModal&&<OnboardingWizard provider={provider} isModal={true} onComplete={newState=>{setState(newState);setShowModal(false);}} onCancel={()=>setShowModal(false)}/>}
      {showAdd&&<AddProjectModal provider={provider} programme={programme} onAdd={handleAddProject} onClose={()=>setShowAdd(false)}/>}
      {showReport&&<StatusReport state={state} provider={provider} onClose={()=>setShowReport(false)}/>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function APEX() {
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [screen,   setScreen]   = useState("onboarding");
  const [state,    setState]    = useState(null);

  return screen==="onboarding"
    ? <OnboardingWizard provider={provider} onComplete={s=>{setState(s);setScreen("dashboard");}} isModal={false}/>
    : <Dashboard state={state} setState={setState} provider={provider} setProvider={setProvider} onNewProgramme={()=>setScreen("onboarding")}/>;
}
