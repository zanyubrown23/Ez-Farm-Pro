import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TRIAL_DAYS = 7;
const C = {
  green:"#4ade80", yellow:"#fbbf24", red:"#f87171", blue:"#60a5fa",
  orange:"#fb923c", purple:"#c084fc", muted:"#8b949e",
  bg:"#0d1117", surface:"#161b22", surface2:"#1c2128", border:"#21262d"
};
const uid = () => Math.random().toString(36).slice(2,9);
const fmt = n => `$${Number(n||0).toFixed(2)}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
const trialLeft = ts => Math.max(0, Math.ceil(TRIAL_DAYS-(Date.now()-ts)/86400000));
function calcAge(dob){
  if(!dob) return null;
  const days = Math.floor((Date.now()-new Date(dob))/86400000);
  if(days<30) return `${days}d`;
  if(days<365) return `${Math.floor(days/30)}mo`;
  return `${(days/365).toFixed(1)}yr`;
}

const DEF = {
  trialStart:Date.now(), isPro:false,
  farms:[{id:"f1",name:"My Farm",location:"Jamaica"}],
  activeFarmId:"f1",
  crops:[], livestock:[], expenses:[], income:[],
  animals:[], alerts:[],
};
const load = () => { try{ const s=localStorage.getItem("ezfarm_v4"); return s?{...DEF,...JSON.parse(s)}:DEF; }catch{return DEF;} };
const save = s => { try{ localStorage.setItem("ezfarm_v4",JSON.stringify(s)); }catch{} };

// ─── SVG Icon Library ─────────────────────────────────────────────────────────
const SVG = ({d,s=18,c}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ICONS = {
  leaf:     <><path d="M17 8C8 10 5.9 16.17 3.82 19.99c-.86 1.58-2.69.43-2.09-1.22C3.34 14.06 6.7 7.5 17 8z"/><path d="M17 8c0-4-1-6-4-8 0 4-3 6-3 12"/></>,
  cow:      <><ellipse cx="12" cy="13" rx="6" ry="5"/><circle cx="9" cy="8" r="2"/><circle cx="15" cy="8" r="2"/><path d="M9 8V6M15 8V6M9 18v2M15 18v2"/></>,
  dollar:   <><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 1 0-5h6"/></>,
  home:     <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  chart:    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
  plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></>,
  sparkle:  <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/></>,
  camera:   <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
  tag:      <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  bell:     <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  mic:      <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
  volume:   <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>,
  stop:     <rect x="6" y="6" width="12" height="12" rx="2"/>,
  x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:    <polyline points="20 6 9 17 4 12"/>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  search:   <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  lock:     <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  history:  <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></>,
  user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  edit:     <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  farm:     <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  repeat:   <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  weight:   <><path d="M6 2h12l2 6H4z"/><rect x="2" y="8" width="20" height="14" rx="2"/><path d="M12 12v4"/></>,
  syringe:  <><path d="M18 2L22 6"/><path d="M7 11l5.5 5.5"/><path d="M14 4l6 6-7 7-6-6z"/><path d="M3.5 16.5l1.5 1.5L2 21l2.5-2.5"/></>,
  qr:       <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="6" y="6" width="1" height="1"/><rect x="17" y="6" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></>,
  male:     <><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="13.65" y2="10.35"/><polyline points="15 5 19 5 19 9"/></>,
  female:   <><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="22"/><line x1="9" y1="18" x2="15" y2="18"/></>,
  dna:      <><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.854-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.854 5.993"/><path d="m2 9 20 6"/><path d="m2 21 20-6"/></>,
  clipboard:<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></>,
};
const Ic = ({n,s=18,c}) => <SVG d={ICONS[n]} s={s} c={c} />;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:{minHeight:"100vh",background:C.bg,color:"#e6edf3",fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"},
  hdr:{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50},
  logo:{display:"flex",alignItems:"center",gap:7,color:C.green,fontWeight:800,fontSize:15},
  nav:{background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",overflowX:"auto"},
  navBtn:{display:"flex",alignItems:"center",gap:5,padding:"11px 12px",background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",borderBottom:"2px solid transparent",fontWeight:500},
  navActive:{color:C.green,borderBottom:`2px solid ${C.green}`},
  main:{flex:1,overflowY:"auto"},
  page:{padding:"16px 14px",maxWidth:640,margin:"0 auto"},
  card:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:10},
  row:{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`},
  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:12},
  modal:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,width:"100%",maxWidth:460,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"},
  mHead:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 17px",borderBottom:`1px solid ${C.border}`,flexShrink:0},
  mBody:{flex:1,overflowY:"auto",padding:"15px 17px"},
  mFoot:{padding:"12px 17px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0},
  input:{background:"#0d1117",border:`1px solid #30363d`,borderRadius:8,color:"#e6edf3",padding:"9px 12px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"},
  label:{fontSize:12,fontWeight:600,color:C.muted,display:"block",marginBottom:5},
  fg:{marginBottom:13},
  btnGreen:{display:"flex",alignItems:"center",gap:5,background:"#166534",border:"none",borderRadius:8,color:C.green,padding:"8px 13px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},
  btnBlue:{display:"flex",alignItems:"center",gap:5,background:"#1e3a5f",border:"none",borderRadius:8,color:C.blue,padding:"8px 13px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},
  btnYellow:{display:"flex",alignItems:"center",gap:5,background:"#451a03",border:"none",borderRadius:8,color:C.yellow,padding:"8px 13px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},
  btnRed:{display:"flex",alignItems:"center",gap:5,background:"#7f1d1d",border:"none",borderRadius:8,color:C.red,padding:"8px 13px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},
  btnGhost:{background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,padding:"8px 13px",fontSize:13,cursor:"pointer"},
  iconBtn:{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:4,display:"flex",alignItems:"center"},
  badge:(bg,fg)=>({borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,background:bg,color:fg||"#e6edf3"}),
  statCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px",display:"flex",flexDirection:"column",gap:3},
  vbar:{background:C.surface,borderTop:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8},
  proTag:{background:"#166534",color:C.green,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700},
};

// ─── Voice hook ───────────────────────────────────────────────────────────────
function useVoice(defaultRepeats=3){
  const [speaking,setSpeaking]=useState(false);
  const [repeats,setRepeats]=useState(defaultRepeats);
  const speak=useCallback((text,reps)=>{
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const r=reps??repeats;
    const sentences=text.replace(/\n+/g," ").split(/(?<=[.!?])\s+/).filter(Boolean);
    const steps=sentences.map((s,i)=>`Step ${i+1}. ${s}`).join(". ");
    const full=Array.from({length:r},(_,i)=>i>0?`Repeating. ${steps}`:steps).join(". ");
    const u=new SpeechSynthesisUtterance(full);
    u.rate=0.88; u.pitch=1.05;
    u.onstart=()=>setSpeaking(true);
    u.onend=()=>setSpeaking(false);
    u.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(u);
  },[repeats]);
  const stop=useCallback(()=>{window.speechSynthesis?.cancel();setSpeaking(false);},[]);
  return{speak,stop,speaking,repeats,setRepeats};
}

// ─── VoiceBar ─────────────────────────────────────────────────────────────────
function VoiceBar({speaking,stop,repeats,setRepeats}){
  return(
    <div style={S.vbar}>
      <div style={{display:"flex",alignItems:"center",gap:6,color:speaking?C.green:C.muted,fontSize:12,fontWeight:600}}>
        <Ic n={speaking?"volume":"mic"} s={16} c={speaking?C.green:C.muted}/>
        {speaking?"Speaking…":"Voice Ready"}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:C.muted}}>Repeats:</span>
        {[1,2,3,5].map(r=>(
          <button key={r} onClick={()=>setRepeats(r)}
            style={{background:repeats===r?"#166534":"none",border:`1px solid ${repeats===r?C.green:C.border}`,borderRadius:6,color:repeats===r?C.green:C.muted,padding:"3px 8px",fontSize:12,cursor:"pointer"}}>
            {r}
          </button>
        ))}
        {speaking&&<button style={S.btnRed} onClick={stop}><Ic n="stop" s={13}/>Stop</button>}
      </div>
    </div>
  );
}

// ─── SpeakBtn ─────────────────────────────────────────────────────────────────
const SpeakBtn=({text,speak,label="Read Aloud",s=13})=>(
  <button style={{...S.btnBlue,padding:"5px 10px",fontSize:s}} onClick={()=>speak(text)}>
    <Ic n="volume" s={13}/>
    {label}
  </button>
);

// ─── Paywall ──────────────────────────────────────────────────────────────────
function Paywall({days,onClose,onUnlock}){
  return(
    <div style={S.ov}>
      <div style={{...S.modal,maxWidth:380,textAlign:"center"}}>
        <div style={{padding:"28px 24px"}}>
          <div style={{color:C.yellow,display:"flex",justifyContent:"center",marginBottom:12}}><Ic n="lock" s={34}/></div>
          <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>{days===0?"Trial Ended":`${days} Day${days!==1?"s":""} Left`}</h2>
          <p style={{color:C.muted,fontSize:14,margin:"0 0 20px"}}>Upgrade to access all Pro features</p>
          {["Animal tag scanner & profiles","Plant health camera & AI diagnosis","Alert & reminder system","Multi-farm management","PDF report export","AI farming tips (Claude)","Voice step-by-step guidance"].map(f=>(
            <div key={f} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",textAlign:"left",fontSize:13}}>
              <span style={{color:C.green}}><Ic n="check" s={14}/></span>{f}
            </div>
          ))}
          <div style={{margin:"20px 0 10px"}}>
            <span style={{fontSize:38,fontWeight:900,color:C.green}}>$9.99</span>
            <span style={{color:C.muted}}>/month</span>
          </div>
          <button style={{...S.btnGreen,width:"100%",justifyContent:"center",padding:"13px",fontSize:15,marginBottom:8}} onClick={onUnlock}>
            Upgrade via PayPal
          </button>
          {days>0&&<button style={{...S.btnGhost,width:"100%",justifyContent:"center"}} onClick={onClose}>Continue Trial ({days}d left)</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Generic Form Modal ───────────────────────────────────────────────────────
function FormModal({title,fields,onSave,onClose,initial={}}){
  const[vals,setVals]=useState(initial);
  const set=(k,v)=>setVals(p=>({...p,[k]:v}));
  return(
    <div style={S.ov}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <span style={{fontWeight:700,fontSize:15}}>{title}</span>
          <button style={S.iconBtn} onClick={onClose}><Ic n="x"/></button>
        </div>
        <div style={S.mBody}>
          {fields.map(f=>(
            <div key={f.key} style={S.fg}>
              <label style={S.label}>{f.label}</label>
              {f.type==="select"?(
                <select style={S.input} value={vals[f.key]||""} onChange={e=>set(f.key,e.target.value)}>
                  <option value="">Select…</option>
                  {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              ):f.type==="textarea"?(
                <textarea style={{...S.input,height:72,resize:"vertical"}} value={vals[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}/>
              ):(
                <input style={S.input} type={f.type||"text"} value={vals[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}/>
              )}
            </div>
          ))}
        </div>
        <div style={S.mFoot}>
          <button style={{...S.btnGhost,flex:1}} onClick={onClose}>Cancel</button>
          <button style={{...S.btnGreen,flex:2,justifyContent:"center"}} onClick={()=>onSave(vals)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Modal ─────────────────────────────────────────────────────────────────
function AiModal({prompt,title,onClose,speak,repeats}){
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(false);
  const fetch_=useCallback(async()=>{
    setLoading(true); setText("");
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const d=await r.json();
      const t=d.content?.map(b=>b.text||"").join("")||"Could not load. Try again.";
      setText(t);
    }catch{setText("Connection error. Please try again.");}
    setLoading(false);
  },[prompt]);
  useEffect(()=>{fetch_();},[fetch_]);
  return(
    <div style={S.ov}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <div style={{display:"flex",alignItems:"center",gap:8,color:C.yellow,fontWeight:700}}><Ic n="sparkle" s={18}/>  {title||"AI Insights"}</div>
          <button style={S.iconBtn} onClick={onClose}><Ic n="x"/></button>
        </div>
        <div style={S.mBody}>
          {loading?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"32px 0",color:C.muted}}>
              <div style={{width:30,height:30,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.green}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
              <p style={{margin:0}}>Analysing…</p>
            </div>
          ):(
            <pre style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.75,color:"#e6edf3",margin:0,fontFamily:"inherit"}}>{text}</pre>
          )}
        </div>
        <div style={S.mFoot}>
          <button style={{...S.btnGhost,flex:1}} onClick={fetch_} disabled={loading}>{loading?"Loading…":"Refresh"}</button>
          {text&&<button style={{...S.btnBlue,flex:1}} onClick={()=>speak(text)}><Ic n="volume" s={13}/>Read ({repeats}×)</button>}
          <button style={{...S.btnGhost}} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── ANIMAL TAG / PROFILE ─────────────────────────────────────────────────────
function AnimalProfileModal({animal,onClose,onSave,onAddRecord,speak,repeats}){
  const[tab,setTab]=useState("profile");
  const[addRec,setAddRec]=useState(false);
  const[rec,setRec]=useState({date:new Date().toISOString().slice(0,10),type:"Weight",value:"",notes:""});
  const age=calcAge(animal.dob);
  const profileText=`Animal profile for ${animal.name||animal.tagId}. Tag ID: ${animal.tagId}. Type: ${animal.type}. Gender: ${animal.gender||"Unknown"}. Age: ${age||"Unknown"}. Health: ${animal.health}. ${animal.notes||""}`;

  const saveRec=()=>{
    if(!rec.value&&!rec.notes) return;
    onAddRecord(animal.id,{...rec,id:uid(),ts:Date.now()});
    setRec({date:new Date().toISOString().slice(0,10),type:"Weight",value:"",notes:""});
    setAddRec(false);
  };

  return(
    <div style={S.ov}>
      <div style={{...S.modal,maxWidth:500}}>
        <div style={S.mHead}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="clipboard" s={18} c={C.blue}/>
            <span style={{fontWeight:700,fontSize:15}}>Animal Profile — <span style={{color:C.yellow}}>{animal.tagId}</span></span>
          </div>
          <button style={S.iconBtn} onClick={onClose}><Ic n="x"/></button>
        </div>
        {/* sub-tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.surface2}}>
          {["profile","history"].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{...S.navBtn,...(tab===t?S.navActive:{}),flex:1,justifyContent:"center",textTransform:"capitalize"}}>
              <Ic n={t==="profile"?"user":"history"} s={14}/>{t}
            </button>
          ))}
        </div>
        <div style={S.mBody}>
          {tab==="profile"&&(
            <>
              {/* header card */}
              <div style={{background:C.surface2,borderRadius:12,padding:16,marginBottom:14,display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:26}}>
                  {animal.type==="Goats"?"🐐":animal.type==="Chickens"?"🐔":animal.type==="Cattle"?"🐄":animal.type==="Pigs"?"🐷":animal.type==="Rabbits"?"🐰":animal.type==="Ducks"?"🦆":animal.type==="Fish"?"🐟":"🐾"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:16}}>{animal.name||animal.tagId}</div>
                  <div style={{fontSize:12,color:C.muted}}>Tag: {animal.tagId} · {animal.type}</div>
                  <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                    <span style={S.badge(animal.health==="Healthy"?"#166534":animal.health==="Sick"?"#7f1d1d":"#713f12")}>{animal.health}</span>
                    {animal.gender&&<span style={S.badge("#1e3a5f",C.blue)}>{animal.gender}</span>}
                    {age&&<span style={S.badge("#1c2128",C.muted)}>{age} old</span>}
                  </div>
                </div>
              </div>
              {/* details */}
              {[
                ["Tag ID",animal.tagId,"tag"],
                ["Animal Type",animal.type,"cow"],
                ["Name / Alias",animal.name||"—","user"],
                ["Gender",animal.gender||"—",animal.gender==="Male"?"male":"female"],
                ["Date of Birth",fmtDate(animal.dob),"history"],
                ["Age",age||"—","repeat"],
                ["Breed",animal.breed||"—","dna"],
                ["Birth Weight",animal.birthWeight?`${animal.birthWeight} kg`:"—","weight"],
                ["Current Weight",animal.weight?`${animal.weight} kg`:"—","weight"],
                ["Health Status",animal.health,"syringe"],
                ["Feed",animal.feed||"—","leaf"],
                ["Notes",animal.notes||"—","clipboard"],
              ].map(([label,value,icon])=>(
                <div key={label} style={{...S.row}}>
                  <Ic n={icon} s={15} c={C.muted}/>
                  <span style={{fontSize:13,color:C.muted,width:110,flexShrink:0}}>{label}</span>
                  <span style={{fontSize:13,fontWeight:500,flex:1}}>{value}</span>
                </div>
              ))}
              <div style={{marginTop:14}}>
                <SpeakBtn text={profileText} speak={speak} label={`Read Profile (${repeats}×)`}/>
              </div>
            </>
          )}
          {tab==="history"&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontWeight:700,fontSize:14}}>Health & Records</span>
                <button style={S.btnGreen} onClick={()=>setAddRec(true)}><Ic n="plus" s={13}/>Add Record</button>
              </div>
              {addRec&&(
                <div style={{background:C.surface2,borderRadius:10,padding:12,marginBottom:12}}>
                  <div style={S.fg}>
                    <label style={S.label}>Record Type</label>
                    <select style={S.input} value={rec.type} onChange={e=>setRec(p=>({...p,type:e.target.value}))}>
                      {["Weight","Vaccination","Medication","Health Check","Injury","Birth","Weaning","Other"].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div style={S.fg}>
                      <label style={S.label}>Date</label>
                      <input style={S.input} type="date" value={rec.date} onChange={e=>setRec(p=>({...p,date:e.target.value}))}/>
                    </div>
                    <div style={S.fg}>
                      <label style={S.label}>Value (e.g. kg)</label>
                      <input style={S.input} value={rec.value} onChange={e=>setRec(p=>({...p,value:e.target.value}))} placeholder="e.g. 45.2"/>
                    </div>
                  </div>
                  <div style={S.fg}>
                    <label style={S.label}>Notes</label>
                    <input style={S.input} value={rec.notes} onChange={e=>setRec(p=>({...p,notes:e.target.value}))} placeholder="Details…"/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.btnGhost,flex:1}} onClick={()=>setAddRec(false)}>Cancel</button>
                    <button style={{...S.btnGreen,flex:2,justifyContent:"center"}} onClick={saveRec}>Save Record</button>
                  </div>
                </div>
              )}
              {(!animal.records||animal.records.length===0)?(
                <p style={{color:C.muted,fontSize:13}}>No records yet. Add weight, vaccinations, health checks and more.</p>
              ):(
                [...animal.records].sort((a,b)=>new Date(b.ts)-new Date(a.ts)).map(r=>(
                  <div key={r.id} style={{...S.card,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={S.badge(
                        r.type==="Vaccination"?"#166534":
                        r.type==="Weight"?"#1e3a5f":
                        r.type==="Medication"?"#713f12":"#1c2128"
                      )}>{r.type}</span>
                      <span style={{fontSize:12,color:C.muted}}>{fmtDate(r.date)}</span>
                    </div>
                    {r.value&&<div style={{fontSize:14,fontWeight:600,marginTop:6}}>{r.value}</div>}
                    {r.notes&&<div style={{fontSize:13,color:C.muted,marginTop:3}}>{r.notes}</div>}
                  </div>
                ))
              )}
            </>
          )}
        </div>
        <div style={S.mFoot}>
          <button style={{...S.btnGhost,flex:1}} onClick={onClose}>Close</button>
          <button style={{...S.btnBlue,flex:1,justifyContent:"center"}} onClick={()=>speak(profileText)}><Ic n="volume" s={13}/>Read Aloud</button>
        </div>
      </div>
    </div>
  );
}

// ─── Animal Tag Scanner / Lookup ──────────────────────────────────────────────
function AnimalTagModal({animals,farmId,onClose,onSave,speak,repeats}){
  const[mode,setMode]=useState("search"); // search | new | found
  const[tagInput,setTagInput]=useState("");
  const[found,setFound]=useState(null);
  const[showProfile,setShowProfile]=useState(false);
  const[form,setForm]=useState({tagId:"",type:"Goats",name:"",gender:"Male",dob:"",breed:"",birthWeight:"",weight:"",health:"Healthy",feed:"",notes:""});

  const lookup=()=>{
    const a=animals.find(x=>x.tagId.toLowerCase()===tagInput.toLowerCase().trim());
    if(a){setFound(a);setMode("found");}
    else{setForm(p=>({...p,tagId:tagInput}));setMode("new");}
  };

  const saveNew=()=>{
    if(!form.tagId||!form.type) return;
    onSave({...form,id:uid(),farmId,records:[],addedDate:Date.now()});
  };

  return(
    <div style={S.ov}>
      {showProfile&&found?(
        <AnimalProfileModal animal={found} onClose={()=>setShowProfile(false)} speak={speak} repeats={repeats}
          onAddRecord={()=>{}} onSave={()=>{}}/>
      ):(
      <div style={S.modal}>
        <div style={S.mHead}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Ic n="tag" s={18} c={C.yellow}/><span style={{fontWeight:700,fontSize:15}}>Animal Tag Scanner</span></div>
          <button style={S.iconBtn} onClick={onClose}><Ic n="x"/></button>
        </div>
        <div style={S.mBody}>
          {mode==="search"&&(
            <>
              <div style={{background:C.surface2,borderRadius:12,padding:16,marginBottom:16,textAlign:"center"}}>
                <Ic n="qr" s={40} c={C.yellow}/>
                <p style={{color:C.muted,fontSize:13,margin:"8px 0 0"}}>Enter or scan a tag ID to look up or create an animal profile.</p>
              </div>
              <label style={S.label}>Tag ID / Ear Tag Number</label>
              <div style={{display:"flex",gap:8}}>
                <input style={{...S.input,flex:1}} value={tagInput} onChange={e=>setTagInput(e.target.value)}
                  placeholder="e.g. JA-2024-001" onKeyDown={e=>e.key==="Enter"&&lookup()}/>
                <button style={S.btnYellow} onClick={lookup}><Ic n="search" s={15}/>Lookup</button>
              </div>
              {animals.length>0&&(
                <div style={{marginTop:16}}>
                  <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"0 0 8px"}}>ALL TAGGED ANIMALS ({animals.length})</p>
                  {animals.map(a=>(
                    <div key={a.id} style={{...S.row,cursor:"pointer"}} onClick={()=>{setFound(a);setMode("found");}}>
                      <span style={{fontSize:20}}>{a.type==="Goats"?"🐐":a.type==="Chickens"?"🐔":a.type==="Cattle"?"🐄":a.type==="Pigs"?"🐷":"🐾"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{a.name||a.tagId}</div>
                        <div style={{fontSize:11,color:C.muted}}>{a.tagId} · {a.type} · {a.gender||"?"}</div>
                      </div>
                      <span style={S.badge(a.health==="Healthy"?"#166534":"#7f1d1d")}>{a.health}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {mode==="found"&&found&&(
            <div>
              <div style={{background:"#166534",borderRadius:10,padding:12,marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
                <Ic n="check" s={20} c={C.green}/>
                <div><div style={{fontWeight:700,color:C.green}}>Animal Found!</div><div style={{fontSize:12,color:C.muted}}>Tag: {found.tagId}</div></div>
              </div>
              <div style={{...S.card,marginBottom:12}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{fontSize:32}}>{found.type==="Goats"?"🐐":found.type==="Chickens"?"🐔":found.type==="Cattle"?"🐄":found.type==="Pigs"?"🐷":"🐾"}</span>
                  <div>
                    <div style={{fontWeight:800,fontSize:16}}>{found.name||found.tagId}</div>
                    <div style={{fontSize:12,color:C.muted}}>{found.type} · {found.gender||"Unknown gender"} · {calcAge(found.dob)||"Age unknown"}</div>
                    <div style={{marginTop:4}}><span style={S.badge(found.health==="Healthy"?"#166534":"#7f1d1d")}>{found.health}</span></div>
                  </div>
                </div>
              </div>
              <button style={{...S.btnBlue,width:"100%",justifyContent:"center",marginBottom:8}} onClick={()=>setShowProfile(true)}>
                <Ic n="clipboard" s={15}/>View Full Profile & History
              </button>
              <button style={{...S.btnGhost,width:"100%",justifyContent:"center"}} onClick={()=>{setTagInput("");setMode("search");}}>Search Another Tag</button>
            </div>
          )}
          {mode==="new"&&(
            <>
              <div style={{background:"#451a03",borderRadius:10,padding:12,marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
                <Ic n="alert" s={18} c={C.yellow}/>
                <div style={{fontSize:13}}><strong style={{color:C.yellow}}>Tag not found.</strong> Create a new animal profile for tag <strong>{form.tagId}</strong></div>
              </div>
              {[
                {key:"tagId",label:"Tag ID *",placeholder:"Auto-filled"},
                {key:"name",label:"Name / Alias",placeholder:"e.g. Brownie"},
                {key:"type",label:"Animal Type *",type:"select",options:["Goats","Chickens","Cattle","Pigs","Rabbits","Ducks","Fish","Other"]},
                {key:"gender",label:"Gender",type:"select",options:["Male","Female","Unknown"]},
                {key:"breed",label:"Breed",placeholder:"e.g. Boer, Jamaican Hope"},
                {key:"dob",label:"Date of Birth",type:"date"},
                {key:"birthWeight",label:"Birth Weight (kg)",type:"number",placeholder:"e.g. 3.2"},
                {key:"weight",label:"Current Weight (kg)",type:"number",placeholder:"e.g. 45"},
                {key:"health",label:"Health Status",type:"select",options:["Healthy","Sick","Under Treatment","Unknown"]},
                {key:"feed",label:"Feed Type",placeholder:"e.g. Corn, pasture"},
                {key:"notes",label:"Notes",type:"textarea",placeholder:"Any notes…"},
              ].map(f=>(
                <div key={f.key} style={S.fg}>
                  <label style={S.label}>{f.label}</label>
                  {f.type==="select"?(
                    <select style={S.input} value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>
                      {f.options.map(o=><option key={o}>{o}</option>)}
                    </select>
                  ):f.type==="textarea"?(
                    <textarea style={{...S.input,height:64,resize:"vertical"}} value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}/>
                  ):(
                    <input style={S.input} type={f.type||"text"} value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}/>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        {mode==="new"&&(
          <div style={S.mFoot}>
            <button style={{...S.btnGhost,flex:1}} onClick={()=>setMode("search")}>Back</button>
            <button style={{...S.btnGreen,flex:2,justifyContent:"center"}} onClick={saveNew}><Ic n="check" s={14}/>Create Profile</button>
          </div>
        )}
        {mode==="search"&&(
          <div style={S.mFoot}>
            <button style={{...S.btnGhost,flex:1}} onClick={onClose}>Close</button>
          </div>
        )}
        {mode==="found"&&(
          <div style={S.mFoot}>
            <button style={{...S.btnGhost,flex:1}} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ─── Plant Scan / Camera ──────────────────────────────────────────────────────
function PlantScanModal({onClose,speak,repeats,onAddAlert,farmId}){
  const[step,setStep]=useState("capture"); // capture | analysing | result
  const[imgData,setImgData]=useState(null);
  const[result,setResult]=useState(null);
  const[cropName,setCropName]=useState("");
  const fileRef=useRef();

  const handleFile=e=>{
    const f=e.target.files[0];
    if(!f) return;
    const reader=new FileReader();
    reader.onload=ev=>{setImgData(ev.target.result);setStep("ready");};
    reader.readAsDataURL(f);
  };

  const analyse=async()=>{
    if(!imgData) return;
    setStep("analysing");
    try{
      const base64=imgData.split(",")[1];
      const mediaType=imgData.split(";")[0].split(":")[1]||"image/jpeg";
      const prompt=`You are an expert plant pathologist and agricultural advisor for backyard farmers in Jamaica and the Caribbean.
Analyse this plant image and provide:
1. Plant identified (if recognisable)
2. Overall health status (Healthy / Minor Issues / Diseased / Critical)
3. Diagnoses — list any diseases, pests, deficiencies, or problems visible
4. Root causes — explain what caused each issue
5. Solutions — specific actionable steps to fix each issue
6. Watering & care schedule — how often to water, fertilise, and care for this plant
7. Alert recommendations — what conditions should trigger a reminder (e.g. "Water every 2 days", "Check for pests weekly")

Be specific, practical, and tailored to tropical Caribbean conditions.${cropName?` The farmer says this is: ${cropName}.`:""}`;
      const r=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:1200,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
            {type:"text",text:prompt}
          ]}]
        })
      });
      const d=await r.json();
      const t=d.content?.map(b=>b.text||"").join("")||"Could not analyse. Try again.";
      setResult(t);
      setStep("result");
    }catch{
      setResult("Analysis failed. Please check your connection and try again.");
      setStep("result");
    }
  };

  const addWaterAlert=()=>{
    onAddAlert({
      id:uid(),farmId,title:`Water ${cropName||"Plant"}`,
      message:`Time to water your ${cropName||"plant"}! Check soil moisture first.`,
      type:"Watering",interval:"Every 2 days",active:true,createdAt:Date.now()
    });
    alert("✅ Watering alert added!");
  };

  return(
    <div style={S.ov}>
      <div style={S.modal}>
        <div style={S.mHead}>
          <div style={{display:"flex",alignItems:"center",gap:8,color:C.green}}><Ic n="camera" s={18}/>  <span style={{fontWeight:700,fontSize:15}}>Plant Health Scanner</span></div>
          <button style={S.iconBtn} onClick={onClose}><Ic n="x"/></button>
        </div>
        <div style={S.mBody}>
          {step==="capture"&&(
            <>
              <div style={{background:C.surface2,borderRadius:12,padding:20,textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:48,marginBottom:8}}>🌿</div>
                <p style={{color:C.muted,fontSize:14,margin:0}}>Take a photo or upload an image of your plant for AI health diagnosis.</p>
              </div>
              <div style={S.fg}>
                <label style={S.label}>Plant Name (optional)</label>
                <input style={S.input} value={cropName} onChange={e=>setCropName(e.target.value)} placeholder="e.g. Scotch Bonnet, Callaloo…"/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button style={{...S.btnGreen,justifyContent:"center",padding:"14px"}} onClick={()=>{ const i=document.createElement("input"); i.type="file"; i.accept="image/*"; i.capture="environment"; i.onchange=handleFile; i.click(); }}>
                  <Ic n="camera" s={16}/>Take Photo with Camera
                </button>
                <button style={{...S.btnBlue,justifyContent:"center",padding:"14px"}} onClick={()=>fileRef.current.click()}>
                  <Ic n="download" s={16}/>Upload Image from Gallery
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
              </div>
            </>
          )}
          {step==="ready"&&(
            <>
              <img src={imgData} alt="plant" style={{width:"100%",borderRadius:10,marginBottom:14,maxHeight:220,objectFit:"cover"}}/>
              <div style={S.fg}>
                <label style={S.label}>Plant Name (optional)</label>
                <input style={S.input} value={cropName} onChange={e=>setCropName(e.target.value)} placeholder="e.g. Scotch Bonnet…"/>
              </div>
              <button style={{...S.btnGreen,width:"100%",justifyContent:"center",padding:"13px"}} onClick={analyse}>
                <Ic n="sparkle" s={16}/>Diagnose Plant Health with AI
              </button>
              <button style={{...S.btnGhost,width:"100%",justifyContent:"center",marginTop:8}} onClick={()=>{setImgData(null);setStep("capture");}}>Retake / Change Photo</button>
            </>
          )}
          {step==="analysing"&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"40px 0",color:C.muted}}>
              <div style={{width:36,height:36,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.green}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
              <p style={{margin:0,fontWeight:600}}>Analysing plant health…</p>
              <p style={{margin:0,fontSize:12}}>Claude AI is checking for diseases, pests & deficiencies</p>
            </div>
          )}
          {step==="result"&&(
            <>
              {imgData&&<img src={imgData} alt="plant" style={{width:"100%",borderRadius:10,marginBottom:14,maxHeight:160,objectFit:"cover"}}/>}
              <pre style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.75,color:"#e6edf3",margin:"0 0 14px",fontFamily:"inherit"}}>{result}</pre>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button style={S.btnBlue} onClick={()=>speak(result||"")}><Ic n="volume" s={13}/>Read ({repeats}×)</button>
                <button style={S.btnYellow} onClick={addWaterAlert}><Ic n="bell" s={13}/>Add Watering Alert</button>
                <button style={{...S.btnGhost}} onClick={()=>{setImgData(null);setResult(null);setStep("capture");}}>Scan Another</button>
              </div>
            </>
          )}
        </div>
        <div style={S.mFoot}>
          <button style={{...S.btnGhost,flex:1}} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────
function AlertsPanel({alerts,onAdd,onDelete,onToggle,speak,repeats}){
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({title:"",message:"",type:"Watering",interval:"Daily",active:true});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const save=()=>{
    if(!form.title) return;
    onAdd({...form,id:uid(),createdAt:Date.now()});
    setForm({title:"",message:"",type:"Watering",interval:"Daily",active:true});
    setShowForm(false);
  };
  return(
    <div style={{...S.page}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div><h2 style={{fontSize:21,fontWeight:700,margin:0}}>Alerts</h2><p style={{fontSize:13,color:C.muted,margin:"3px 0 0"}}>{alerts.filter(a=>a.active).length} active</p></div>
        <button style={S.btnYellow} onClick={()=>setShowForm(!showForm)}><Ic n="plus" s={14}/>Add Alert</button>
      </div>
      {showForm&&(
        <div style={{...S.card,marginBottom:14,border:`1px solid ${C.yellow}`}}>
          <div style={S.fg}><label style={S.label}>Alert Title *</label><input style={S.input} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Water Tomatoes"/></div>
          <div style={S.fg}><label style={S.label}>Message</label><input style={S.input} value={form.message} onChange={e=>set("message",e.target.value)} placeholder="Details for this reminder…"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <label style={S.label}>Type</label>
              <select style={S.input} value={form.type} onChange={e=>set("type",e.target.value)}>
                {["Watering","Fertilising","Pest Check","Harvest","Medication","Vaccination","Weeding","Other"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Interval</label>
              <select style={S.input} value={form.interval} onChange={e=>set("interval",e.target.value)}>
                {["Daily","Every 2 days","Every 3 days","Weekly","Bi-weekly","Monthly","Custom"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.btnGhost,flex:1}} onClick={()=>setShowForm(false)}>Cancel</button>
            <button style={{...S.btnYellow,flex:2,justifyContent:"center"}} onClick={save}><Ic n="check" s={14}/>Save Alert</button>
          </div>
        </div>
      )}
      {alerts.length===0?(
        <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
          <Ic n="bell" s={40} c={C.muted}/>
          <p>No alerts set. Add reminders for watering, fertilising, vet checks and more.</p>
        </div>
      ):alerts.map(a=>(
        <div key={a.id} style={{...S.card,borderLeft:`3px solid ${a.active?C.yellow:C.border}`,opacity:a.active?1:0.5}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={S.badge(a.type==="Watering"?"#1e3a5f":a.type==="Medication"||a.type==="Vaccination"?"#166534":"#451a03",a.type==="Watering"?C.blue:a.type==="Medication"||a.type==="Vaccination"?C.green:C.yellow)}>{a.type}</span>
                <span style={S.badge("#21262d",C.muted)}>{a.interval}</span>
              </div>
              <div style={{fontWeight:700,fontSize:14}}>{a.title}</div>
              {a.message&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{a.message}</div>}
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <button style={{...S.iconBtn,color:a.active?C.green:C.muted}} onClick={()=>onToggle(a.id)} title="Toggle">
                <Ic n={a.active?"check":"repeat"} s={15}/>
              </button>
              <button style={S.iconBtn} onClick={()=>speak(`Reminder: ${a.title}. ${a.message||""} This repeats ${a.interval}.`)}><Ic n="volume" s={14}/></button>
              <button style={S.iconBtn} onClick={()=>onDelete(a.id)}><Ic n="trash" s={14}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function EzFarmingPro(){
  const[state,setState]=useState(load);
  const[tab,setTab]=useState("dashboard");
  const[modal,setModal]=useState(null);
  const[aiPrompt,setAiPrompt]=useState(null);
  const[showPaywall,setShowPaywall]=useState(false);
  const[animalProfile,setAnimalProfile]=useState(null);
  const{speak,stop,speaking,repeats,setRepeats}=useVoice(3);

  useEffect(()=>{ save(state); },[state]);
  const days=trialLeft(state.trialStart);
  const isLocked=!state.isPro&&days===0;

  const upd=(k,v)=>setState(p=>({...p,[k]:v}));
  const requirePro=(fn)=>{ if(isLocked){setShowPaywall(true);return;} fn(); };

  const farm=state.farms.find(f=>f.id===state.activeFarmId)||state.farms[0];
  const fc=state.crops.filter(c=>c.farmId===state.activeFarmId);
  const fl=state.livestock.filter(l=>l.farmId===state.activeFarmId);
  const fa=state.animals.filter(a=>a.farmId===state.activeFarmId);
  const fe=state.expenses.filter(e=>e.farmId===state.activeFarmId);
  const fi=state.income.filter(i=>i.farmId===state.activeFarmId);
  const fal=state.alerts.filter(a=>a.farmId===state.activeFarmId);
  const totalInc=fi.reduce((s,i)=>s+Number(i.amount),0);
  const totalExp=fe.reduce((s,e)=>s+Number(e.amount),0);
  const net=totalInc-totalExp;

  // CRUD helpers
  const addCrop=v=>{ if(!v.name) return; upd("crops",[...state.crops,{...v,id:uid(),farmId:state.activeFarmId,addedDate:Date.now()}]); setModal(null); };
  const delCrop=id=>upd("crops",state.crops.filter(c=>c.id!==id));
  const addLivestock=v=>{ if(!v.type) return; upd("livestock",[...state.livestock,{...v,id:uid(),farmId:state.activeFarmId,addedDate:Date.now()}]); setModal(null); };
  const delLivestock=id=>upd("livestock",state.livestock.filter(l=>l.id!==id));
  const saveAnimal=a=>{ upd("animals",[...state.animals.filter(x=>x.id!==a.id),a]); setModal(null); };
  const addRecordToAnimal=(animalId,rec)=>{
    upd("animals",state.animals.map(a=>a.id===animalId?{...a,records:[...(a.records||[]),rec]}:a));
  };
  const addExpense=v=>{ if(!v.description||!v.amount) return; upd("expenses",[...state.expenses,{...v,id:uid(),farmId:state.activeFarmId,date:Date.now()}]); setModal(null); };
  const delExpense=id=>upd("expenses",state.expenses.filter(e=>e.id!==id));
  const addIncome=v=>{ if(!v.source||!v.amount) return; upd("income",[...state.income,{...v,id:uid(),farmId:state.activeFarmId,date:Date.now()}]); setModal(null); };
  const delIncome=id=>upd("income",state.income.filter(i=>i.id!==id));
  const addFarm=v=>{ if(!v.name) return; const nf={...v,id:uid()}; setState(p=>({...p,farms:[...p.farms,nf],activeFarmId:nf.id})); setModal(null); };
  const addAlert=a=>upd("alerts",[...state.alerts,{...a,farmId:state.activeFarmId}]);
  const delAlert=id=>upd("alerts",state.alerts.filter(a=>a.id!==id));
  const toggleAlert=id=>upd("alerts",state.alerts.map(a=>a.id===id?{...a,active:!a.active}:a));

  const exportReport=()=>{
    const txt=`EZ FARMING PRO — FARM REPORT\nFarm: ${farm?.name} | ${farm?.location}\nGenerated: ${new Date().toLocaleDateString()}\n\nCROPS (${fc.length})\n${fc.map(c=>`• ${c.name} | ${c.status} | Planted: ${c.plantDate||"N/A"}`).join("\n")}\n\nTAGGED ANIMALS (${fa.length})\n${fa.map(a=>`• [${a.tagId}] ${a.name||""} ${a.type} | ${a.gender||"?"} | Age: ${calcAge(a.dob)||"?"} | ${a.health}`).join("\n")}\n\nLIVESTOCK GROUPS (${fl.length})\n${fl.map(l=>`• ${l.count}x ${l.type} | ${l.health}`).join("\n")}\n\nFINANCIALS\nIncome:   ${fmt(totalInc)}\nExpenses: ${fmt(totalExp)}\nNet:      ${fmt(net)}\n\nEXPENSES\n${fe.map(e=>`• ${fmtDate(e.date)} | ${e.description} | ${fmt(e.amount)}`).join("\n")}\n\nINCOME\n${fi.map(i=>`• ${fmtDate(i.date)} | ${i.source} | ${fmt(i.amount)}`).join("\n")}`;
    const b=new Blob([txt],{type:"text/plain"});
    const u=URL.createObjectURL(b);
    const a=document.createElement("a");
    a.href=u; a.download=`${farm?.name?.replace(/\s/g,"_")}_Report.txt`; a.click();
    URL.revokeObjectURL(u);
  };

  const NAV=[
    {id:"dashboard",icon:"chart",label:"Dashboard"},
    {id:"crops",icon:"leaf",label:"Crops"},
    {id:"livestock",icon:"cow",label:"Livestock"},
    {id:"finances",icon:"dollar",label:"Finances"},
    {id:"alerts",icon:"bell",label:"Alerts"},
    {id:"farms",icon:"farm",label:"Farms"},
  ];

  return(
    <div style={S.app}>
      {/* Header */}
      <header style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={S.logo}><Ic n="farm" s={20} c={C.green}/>Ez Farming <span style={{color:C.green}}>Pro</span></div>
          <span style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:20,padding:"2px 10px",fontSize:11,color:C.muted}}>{farm?.name}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {!state.isPro&&days>0&&<span style={{background:"#451a03",color:C.yellow,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,cursor:"pointer"}} onClick={()=>setShowPaywall(true)}>{days}d trial</span>}
          {state.isPro&&<span style={S.proTag}>PRO</span>}
          <button style={{...S.btnYellow,padding:"6px 11px",fontSize:12}} onClick={()=>requirePro(()=>setAiPrompt({title:"AI Farming Tips",prompt:`You are an expert agricultural advisor for small backyard farmers in Jamaica. The farmer grows: ${fc.map(c=>c.name).join(",")||"various crops"}. They keep: ${fa.map(a=>a.type).join(",")||"various animals"}. Give 4 practical, specific, actionable farming tips numbered clearly. Focus on Jamaican tropical conditions, common pests, soil health, and water management.`}))}>
            <Ic n="sparkle" s={14}/>AI Tips
          </button>
          <button style={{...S.btnGhost,padding:"6px 9px"}} onClick={()=>requirePro(exportReport)}><Ic n="download" s={15}/></button>
        </div>
      </header>

      {/* Nav */}
      <nav style={S.nav}>
        {NAV.map(n=>(
          <button key={n.id} style={{...S.navBtn,...(tab===n.id?S.navActive:{})}} onClick={()=>setTab(n.id)}>
            <Ic n={n.icon} s={15}/>{n.label}
            {n.id==="alerts"&&fal.filter(a=>a.active).length>0&&<span style={{background:C.yellow,color:"#000",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:800,marginLeft:2}}>{fal.filter(a=>a.active).length}</span>}
          </button>
        ))}
      </nav>

      {/* Main */}
      <main style={S.main}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div style={S.page}>
            <div style={{marginBottom:16}}>
              <h2 style={{fontSize:21,fontWeight:800,margin:0}}>Dashboard</h2>
              <p style={{fontSize:13,color:C.muted,margin:"3px 0 0"}}>{farm?.name} · {farm?.location}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[
                {label:"Crops",value:fc.length,icon:"leaf",color:C.green},
                {label:"Tagged Animals",value:fa.length,icon:"tag",color:C.yellow},
                {label:"Net Profit",value:fmt(net),icon:"dollar",color:net>=0?C.green:C.red},
                {label:"Active Alerts",value:fal.filter(a=>a.active).length,icon:"bell",color:C.orange},
              ].map(({label,value,icon,color})=>(
                <div key={label} style={{...S.statCard,borderTop:`3px solid ${color}`}}>
                  <Ic n={icon} s={20} c={color}/>
                  <div style={{fontSize:26,fontWeight:800,marginTop:4}}>{value}</div>
                  <div style={{fontSize:12,color:C.muted}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Recent crops */}
            <div style={{...S.card}}>
              <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"0 0 8px"}}>RECENT CROPS</p>
              {fc.length===0?<p style={{color:C.muted,fontSize:13}}>No crops yet.</p>:fc.slice(-3).reverse().map(c=>(
                <div key={c.id} style={S.row}>
                  <span style={{fontSize:18}}>🌱</span>
                  <span style={{flex:1,fontWeight:500,fontSize:14}}>{c.name}</span>
                  <span style={S.badge(c.status==="Growing"?"#166534":c.status==="Harvested"?"#1e3a5f":"#713f12")}>{c.status}</span>
                </div>
              ))}
            </div>
            {/* Tagged animals */}
            <div style={S.card}>
              <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"0 0 8px"}}>TAGGED ANIMALS</p>
              {fa.length===0?<p style={{color:C.muted,fontSize:13}}>No tagged animals. Use the Tag Scanner in Livestock.</p>:fa.slice(-3).reverse().map(a=>(
                <div key={a.id} style={S.row}>
                  <span style={{fontSize:18}}>{a.type==="Goats"?"🐐":a.type==="Cattle"?"🐄":a.type==="Chickens"?"🐔":"🐾"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:14}}>{a.name||a.tagId}</div>
                    <div style={{fontSize:11,color:C.muted}}>{a.tagId} · {a.gender||"?"} · {calcAge(a.dob)||"age?"}</div>
                  </div>
                  <span style={S.badge(a.health==="Healthy"?"#166534":"#7f1d1d")}>{a.health}</span>
                </div>
              ))}
            </div>
            {/* Profit summary */}
            <div style={S.card}>
              <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"0 0 8px"}}>FINANCIALS</p>
              {[["Income",fmt(totalInc),C.green],[`Expenses`,fmt(totalExp),C.red],["Net Profit",fmt(net),net>=0?C.blue:C.red]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.muted}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CROPS */}
        {tab==="crops"&&(
          <div style={S.page}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div><h2 style={{fontSize:21,fontWeight:700,margin:0}}>Crops</h2><p style={{fontSize:13,color:C.muted,margin:"3px 0 0"}}>{fc.length} crops</p></div>
              <div style={{display:"flex",gap:7}}>
                <button style={{...S.btnBlue,padding:"7px 11px",fontSize:12}} onClick={()=>requirePro(()=>setModal("plant_scan"))}>
                  <Ic n="camera" s={13}/>Scan Plant <span style={S.proTag}>PRO</span>
                </button>
                <button style={S.btnGreen} onClick={()=>setModal("crop")}><Ic n="plus" s={14}/>Add</button>
              </div>
            </div>
            {fc.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                <Ic n="leaf" s={44} c={C.muted}/>
                <p>No crops yet. Add a crop or scan a plant for AI diagnosis.</p>
                <button style={S.btnGreen} onClick={()=>setModal("crop")}><Ic n="plus" s={14}/>Add First Crop</button>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {fc.map(c=>(
                  <div key={c.id} style={S.card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:14}}>{c.name}</span>
                      <button style={S.iconBtn} onClick={()=>delCrop(c.id)}><Ic n="trash" s={14}/></button>
                    </div>
                    <span style={S.badge(c.status==="Growing"?"#166534":c.status==="Harvested"?"#1e3a5f":"#713f12")}>{c.status}</span>
                    {c.variety&&<div style={{fontSize:11,color:C.muted,marginTop:5}}>{c.variety}</div>}
                    {c.plantDate&&<div style={{fontSize:11,color:C.muted}}>🌱 {c.plantDate}</div>}
                    {c.harvestDate&&<div style={{fontSize:11,color:C.muted}}>🌾 Est: {c.harvestDate}</div>}
                    {c.notes&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginTop:4}}>{c.notes}</div>}
                    <button style={{...S.btnBlue,padding:"4px 8px",fontSize:11,marginTop:8}} onClick={()=>requirePro(()=>speak(`${c.name} is currently ${c.status}. Planted on ${c.plantDate||"unknown date"}. Expected harvest: ${c.harvestDate||"not set"}. ${c.notes||""}`))}><Ic n="volume" s={11}/>Read</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIVESTOCK */}
        {tab==="livestock"&&(
          <div style={S.page}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div><h2 style={{fontSize:21,fontWeight:700,margin:0}}>Livestock</h2><p style={{fontSize:13,color:C.muted,margin:"3px 0 0"}}>{fa.length} tagged · {fl.length} groups</p></div>
              <div style={{display:"flex",gap:7}}>
                <button style={{...S.btnYellow,padding:"7px 11px",fontSize:12}} onClick={()=>requirePro(()=>setModal("animal_tag"))}>
                  <Ic n="tag" s={13}/>Tag Scanner <span style={S.proTag}>PRO</span>
                </button>
                <button style={S.btnGreen} onClick={()=>setModal("livestock")}><Ic n="plus" s={14}/>Group</button>
              </div>
            </div>

            {/* Tagged animals section */}
            <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"0 0 8px"}}>TAGGED ANIMALS ({fa.length})</p>
            {fa.length===0?(
              <div style={{...S.card,textAlign:"center",padding:"20px",marginBottom:14}}>
                <Ic n="tag" s={32} c={C.yellow}/>
                <p style={{color:C.muted,fontSize:13,margin:"8px 0 8px"}}>No tagged animals. Use Tag Scanner to add individual animal profiles.</p>
                <button style={S.btnYellow} onClick={()=>requirePro(()=>setModal("animal_tag"))}><Ic n="tag" s={13}/>Open Tag Scanner</button>
              </div>
            ):(
              fa.map(a=>(
                <div key={a.id} style={{...S.card,marginBottom:8,cursor:"pointer",border:`1px solid ${C.border}`}} onClick={()=>requirePro(()=>setAnimalProfile(a))}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:28}}>{a.type==="Goats"?"🐐":a.type==="Chickens"?"🐔":a.type==="Cattle"?"🐄":a.type==="Pigs"?"🐷":a.type==="Rabbits"?"🐰":"🐾"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14}}>{a.name||a.tagId}</div>
                      <div style={{fontSize:11,color:C.muted}}>{a.tagId} · {a.type} · {a.gender||"?"} · {calcAge(a.dob)||"age?"}</div>
                      <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                        <span style={S.badge(a.health==="Healthy"?"#166534":"#7f1d1d")}>{a.health}</span>
                        {a.weight&&<span style={S.badge("#1c2128",C.muted)}>{a.weight}kg</span>}
                        {(a.records||[]).length>0&&<span style={S.badge("#1e3a5f",C.blue)}>{a.records.length} records</span>}
                      </div>
                    </div>
                    <Ic n="clipboard" s={16} c={C.muted}/>
                  </div>
                </div>
              ))
            )}

            {/* Livestock groups */}
            <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"14px 0 8px"}}>LIVESTOCK GROUPS ({fl.length})</p>
            {fl.length===0?<p style={{color:C.muted,fontSize:13}}>No groups yet.</p>:fl.map(l=>(
              <div key={l.id} style={{...S.card,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700}}>{l.count}× {l.type}</div>
                    <div style={{fontSize:12,color:C.muted}}>{l.feed||"No feed info"}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={S.badge(l.health==="Healthy"?"#166534":l.health==="Sick"?"#7f1d1d":"#713f12")}>{l.health}</span>
                    <button style={S.iconBtn} onClick={()=>delLivestock(l.id)}><Ic n="trash" s={14}/></button>
                  </div>
                </div>
                {l.notes&&<div style={{fontSize:12,color:C.muted,marginTop:4}}>{l.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {/* FINANCES */}
        {tab==="finances"&&(
          <div style={S.page}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div><h2 style={{fontSize:21,fontWeight:700,margin:0}}>Finances</h2><p style={{fontSize:13,color:C.muted,margin:"3px 0 0"}}>Net: {fmt(net)}</p></div>
              <div style={{display:"flex",gap:7}}>
                <button style={{...S.btnRed,padding:"7px 11px",fontSize:12}} onClick={()=>setModal("expense")}><Ic n="plus" s={13}/>Expense</button>
                <button style={S.btnGreen} onClick={()=>setModal("income")}><Ic n="plus" s={13}/>Income</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
              {[["Income",fmt(totalInc),C.green],["Expenses",fmt(totalExp),C.red],["Net",fmt(net),net>=0?C.blue:C.red]].map(([l,v,c])=>(
                <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${c}`,borderRadius:10,padding:12}}>
                  <div style={{fontSize:11,color:C.muted}}>{l}</div>
                  <div style={{fontSize:17,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"0 0 6px"}}>EXPENSES</p>
            {fe.length===0?<p style={{color:C.muted,fontSize:13}}>None logged.</p>:fe.map(e=>(
              <div key={e.id} style={S.row}>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{e.description}</div><div style={{fontSize:12,color:C.muted}}>{e.category} · {fmtDate(e.date)}</div></div>
                <span style={{color:C.red,fontWeight:600,fontSize:13}}>-{fmt(e.amount)}</span>
                <button style={S.iconBtn} onClick={()=>delExpense(e.id)}><Ic n="trash" s={14}/></button>
              </div>
            ))}
            <p style={{fontSize:12,color:C.muted,fontWeight:700,margin:"14px 0 6px"}}>INCOME</p>
            {fi.length===0?<p style={{color:C.muted,fontSize:13}}>None logged.</p>:fi.map(i=>(
              <div key={i.id} style={S.row}>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{i.source}</div><div style={{fontSize:12,color:C.muted}}>{fmtDate(i.date)}</div></div>
                <span style={{color:C.green,fontWeight:600,fontSize:13}}>+{fmt(i.amount)}</span>
                <button style={S.iconBtn} onClick={()=>delIncome(i.id)}><Ic n="trash" s={14}/></button>
              </div>
            ))}
          </div>
        )}

        {/* ALERTS */}
        {tab==="alerts"&&<AlertsPanel alerts={fal} onAdd={addAlert} onDelete={delAlert} onToggle={toggleAlert} speak={speak} repeats={repeats}/>}

        {/* FARMS */}
        {tab==="farms"&&(
          <div style={S.page}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div><h2 style={{fontSize:21,fontWeight:700,margin:0}}>My Farms</h2><p style={{fontSize:13,color:C.muted,margin:"3px 0 0"}}>{state.farms.length} farms</p></div>
              <button style={S.btnGreen} onClick={()=>requirePro(()=>setModal("farm"))}><Ic n="plus" s={15}/>Add Farm{!state.isPro&&<Ic n="lock" s={11}/>}</button>
            </div>
            {state.farms.map(f=>(
              <div key={f.id} style={{...S.card,border:`1px solid ${f.id===state.activeFarmId?C.green:C.border}`,cursor:"pointer"}} onClick={()=>upd("activeFarmId",f.id)}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700}}>{f.name}</span>
                  {f.id===state.activeFarmId&&<span style={S.badge("#166534",C.green)}>Active</span>}
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>📍 {f.location||"No location"}</div>
                <div style={{fontSize:12,color:C.muted}}>
                  {state.crops.filter(c=>c.farmId===f.id).length} crops · {state.animals.filter(a=>a.farmId===f.id).length} tagged animals
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Voice Bar */}
      <VoiceBar speaking={speaking} stop={stop} repeats={repeats} setRepeats={setRepeats}/>

      {/* Modals */}
      {showPaywall&&<Paywall days={days} onClose={()=>setShowPaywall(false)} onUnlock={()=>{setState(p=>({...p,isPro:true}));setShowPaywall(false);}}/>}
      {aiPrompt&&<AiModal {...aiPrompt} onClose={()=>setAiPrompt(null)} speak={speak} repeats={repeats}/>}
      {modal==="plant_scan"&&<PlantScanModal onClose={()=>setModal(null)} speak={speak} repeats={repeats} onAddAlert={addAlert} farmId={state.activeFarmId}/>}
      {modal==="animal_tag"&&<AnimalTagModal animals={fa} farmId={state.activeFarmId} onClose={()=>setModal(null)} onSave={saveAnimal} speak={speak} repeats={repeats}/>}
      {animalProfile&&<AnimalProfileModal animal={animalProfile} onClose={()=>setAnimalProfile(null)} speak={speak} repeats={repeats}
        onAddRecord={(aid,rec)=>{ addRecordToAnimal(aid,rec); setAnimalProfile(state.animals.find(a=>a.id===aid)||animalProfile); }}
        onSave={saveAnimal}/>}

      {modal==="crop"&&<FormModal title="Add Crop" onClose={()=>setModal(null)} onSave={addCrop} fields={[
        {key:"name",label:"Crop Name *",placeholder:"e.g. Scotch Bonnet"},
        {key:"variety",label:"Variety",placeholder:"optional"},
        {key:"status",label:"Status",type:"select",options:["Planted","Growing","Harvested","Failed"]},
        {key:"plantDate",label:"Plant Date",type:"date"},
        {key:"harvestDate",label:"Expected Harvest",type:"date"},
        {key:"notes",label:"Notes",type:"textarea",placeholder:"Any notes…"},
      ]}/>}

      {modal==="livestock"&&<FormModal title="Add Livestock Group" onClose={()=>setModal(null)} onSave={addLivestock} fields={[
        {key:"type",label:"Animal Type *",type:"select",options:["Chickens","Goats","Pigs","Cattle","Rabbits","Ducks","Fish","Other"]},
        {key:"count",label:"Count",type:"number",placeholder:"e.g. 12"},
        {key:"health",label:"Health",type:"select",options:["Healthy","Sick","Under Treatment","Unknown"]},
        {key:"feed",label:"Feed Type",placeholder:"e.g. Corn & soybean"},
        {key:"notes",label:"Notes",type:"textarea",placeholder:"Any notes…"},
      ]}/>}

      {modal==="expense"&&<FormModal title="Log Expense" onClose={()=>setModal(null)} onSave={addExpense} fields={[
        {key:"description",label:"Description *",placeholder:"e.g. Fertilizer"},
        {key:"amount",label:"Amount (USD) *",type:"number",placeholder:"0.00"},
        {key:"category",label:"Category",type:"select",options:["Seeds","Fertilizer","Equipment","Labour","Feed","Vet","Transport","Other"]},
      ]}/>}

      {modal==="income"&&<FormModal title="Log Income" onClose={()=>setModal(null)} onSave={addIncome} fields={[
        {key:"source",label:"Source *",placeholder:"e.g. Market sale — peppers"},
        {key:"amount",label:"Amount (USD) *",type:"number",placeholder:"0.00"},
      ]}/>}

      {modal==="farm"&&<FormModal title="Add Farm" onClose={()=>setModal(null)} onSave={addFarm} fields={[
        {key:"name",label:"Farm Name *",placeholder:"e.g. Brown's Farm"},
        {key:"location",label:"Location",placeholder:"e.g. St. Elizabeth, Jamaica"},
      ]}/>}
    </div>
  );
}

// Inject keyframes
const st=document.createElement("style");
st.textContent=`@keyframes spin{to{transform:rotate(360deg)}}`;
  
