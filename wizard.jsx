import { useState, useEffect, useRef, useCallback } from "react";

// ─── Theme ────────────────────────────────────────────────────────────────
const T={
  bg:"#FAFAF8",surface:"#FFFFFF",surfaceAlt:"#F5F3EF",
  border:"#E4DDD4",borderLight:"#EDE8E2",
  amber:"#B85C00",amberMid:"#E07820",amberLight:"#FEF3E2",amberPale:"#FFFAF3",
  dark:"#1A1714",mid:"#6B5F55",light:"#A8998C",rule:"#EDE8E0",
  success:"#1E6B40",successBg:"#EEF9F2",successBorder:"#A3D9B8",
  error:"#B01C1C",errorBg:"#FEF2F2",errorBorder:"#FECACA",
  warn:"#854D0E",warnBg:"#FFFBEB",warnBorder:"#FDE68A",
  info:"#1E40AF",infoBg:"#EFF6FF",infoBorder:"#BFDBFE",
  skip:"#5B6B8A",skipBg:"#F0F4FA",skipBorder:"#C7D5EA",
  win:"#0078D4",winBg:"#EFF6FF",winBorder:"#BFDBFE",
};
const mono={fontFamily:"'DM Mono','Fira Code',monospace"};
const serif={fontFamily:"Lora,Georgia,'Times New Roman',serif"};
const disp={fontFamily:"'Playfair Display',Georgia,serif"};

// ─── OS Detection ─────────────────────────────────────────────────────────
function detectOS(){
  const ua=navigator.userAgent||"";
  const p=navigator.platform||"";
  if(p.startsWith("Win")||ua.includes("Windows"))return"windows";
  if(p.includes("Mac"))return"macos";
  return"linux";
}

// ─── Mock system scan ─────────────────────────────────────────────────────
const MOCK={
  node:{found:true,version:"v22.0.0",detail:"≥18 ✓"},
  git:{found:true,version:"2.43.0",detail:"ok"},
  claude:{found:true,version:"1.8.2",detail:"authenticated"},
  wsl:{found:true,version:"Ubuntu 22.04",detail:"WSL2"},
  ollama:{found:false,version:null},
  opencode:{found:false,version:null},
  claudeDesktop:{found:true,version:"0.9.2",detail:"installed"},
  existingEnv:{ANTHROPIC_API_KEY:"",FIGMA_TOKEN:"",FIGMA_FILE_URL:"",OLLAMA_API_KEY:""},
  existingProject:false,
};

// ─── File manifest ────────────────────────────────────────────────────────
const MANIFEST={
  Core:["CLAUDE.md",".env",".gitignore",".mcp.json",".claude/settings.json","package.json"],
  Commands:[".claude/commands/design-brief.md",".claude/commands/design-variants.md",".claude/commands/design-debate.md",".claude/commands/design-runnerup.md",".claude/commands/design-status.md",".claude/commands/design-estimate.md",".claude/commands/setup-init.md"],
  Agents:["agents/requirements.md","agents/ux-architect.md","agents/design-variant.md","agents/design-lead.md","agents/design-advocate.md","agents/design-arbiter.md","agents/design-refinement.md","agents/cross-agency-analyst.md"],
  Skills:["skills/debate-protocol.md","skills/design-diversity.md","skills/adoption-rubric.md","skills/figma-write.md"],
  Lib:["lib/telemetry.js","lib/report-generator.js"],
  Docs:["docs/brief-template.md"],
  Agency:["agents/competing-agency/index.js","agents/competing-agency/system-prompt.md","agents/competing-agency/.opencode/opencode.json"],
};

// ─── Steps ────────────────────────────────────────────────────────────────
const ALL_STEPS=[
  {id:"welcome",   title:"Welcome",          icon:"✦",sub:"Your AI design agency"},
  {id:"prereqs",   title:"System Check",     icon:"⚙",sub:"Detecting your environment"},
  {id:"platform",  title:"Platform Setup",   icon:"🖥",sub:"Windows · Desktop · WSL"},
  {id:"location",  title:"Location",         icon:"◈",sub:"Where AppForge will install"},
  {id:"claude",    title:"Claude Code",      icon:"◉",sub:"Auth & API key"},
  {id:"dispatch",  title:"Desktop & Dispatch",icon:"📱",sub:"Connect your phone"},
  {id:"figma",     title:"Figma",            icon:"◆",sub:"Design output"},
  {id:"agency",    title:"Qwen Agency",      icon:"🤖",sub:"Independent AI reviewer",optional:true},
  {id:"config",    title:"Preferences",      icon:"⚡",sub:"Pipeline settings"},
  {id:"review",    title:"Review",           icon:"◎",sub:"Confirm & install"},
  {id:"installing",title:"Installing",       icon:"▶",sub:"Writing files"},
  {id:"figmaauth", title:"Figma Auth",       icon:"🔐",sub:"One-time browser step"},
  {id:"done",      title:"Ready",            icon:"✓",sub:"Pipeline is live"},
];

// ─── UI Primitives ────────────────────────────────────────────────────────
const Field=({label,hint,optional,detected,children})=>(
  <div style={{marginBottom:18}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
      <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",color:T.dark,...mono,textTransform:"uppercase"}}>{label}</span>
      {hint&&<span style={{fontSize:11,color:T.light,...serif}}>{hint}</span>}
      {optional&&<span style={{fontSize:10,color:T.skip,...mono,background:T.skipBg,padding:"1px 6px",borderRadius:10,border:`1px solid ${T.skipBorder}`}}>optional</span>}
      {detected&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.successBg,color:T.success,border:`1px solid ${T.successBorder}`,...mono}}>✓ {detected}</span>}
    </div>
    {children}
  </div>
);

const TInput=({value,onChange,placeholder,error,type="text",autoDetected,mono:isMono=true})=>{
  const[focus,setFocus]=useState(false);
  return(
    <div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{width:"100%",padding:"10px 14px",fontSize:13,...(isMono?mono:serif),color:T.dark,
          background:autoDetected&&!focus?T.successBg:T.surface,
          border:`1.5px solid ${error?T.error:focus?T.amber:autoDetected?T.successBorder:T.border}`,
          borderRadius:7,outline:"none",boxSizing:"border-box",transition:"all 0.15s"}} />
      {error&&<div style={{fontSize:11,color:T.error,marginTop:5,...mono}}>⚠ {error}</div>}
    </div>
  );
};

const Toggle=({value,onChange,label,sub})=>(
  <button onClick={()=>onChange(!value)} style={{display:"flex",alignItems:"center",gap:14,width:"100%",
    background:value?T.amberPale:T.surfaceAlt,border:`1.5px solid ${value?T.amberMid+"50":T.border}`,
    borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>
    <div style={{width:44,height:24,borderRadius:12,flexShrink:0,position:"relative",background:value?T.amber:"#D1C9C0",transition:"background 0.2s"}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?23:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}} />
    </div>
    <div>
      <div style={{fontSize:13,fontWeight:600,color:T.dark,...mono}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:T.mid,marginTop:2,...serif}}>{sub}</div>}
    </div>
  </button>
);

const Callout=({icon,title,body,type="info",compact})=>{
  const styles={
    info:{bg:T.infoBg,border:T.infoBorder,text:T.info},
    success:{bg:T.successBg,border:T.successBorder,text:T.success},
    warn:{bg:T.warnBg,border:T.warnBorder,text:T.warn},
    error:{bg:T.errorBg,border:T.errorBorder,text:T.error},
    amber:{bg:T.amberLight,border:T.amberMid+"40",text:T.amber},
    skip:{bg:T.skipBg,border:T.skipBorder,text:T.skip},
    win:{bg:T.winBg,border:T.winBorder,text:T.win},
  };
  const s=styles[type]||styles.info;
  return(
    <div style={{background:s.bg,border:`1px solid ${s.border}`,borderLeft:`3px solid ${s.text}`,borderRadius:"0 8px 8px 0",padding:compact?"10px 14px":"13px 16px",marginTop:12}}>
      {title&&<div style={{fontSize:12,fontWeight:600,color:s.text,marginBottom:body?4:0,...mono}}>{icon} {title}</div>}
      {body&&<div style={{fontSize:12,color:T.mid,lineHeight:1.65,...serif}}>{body}</div>}
    </div>
  );
};

const Card=({children,highlight,accent})=>(
  <div style={{background:T.surface,border:`1.5px solid ${highlight?T.amber+"50":T.border}`,
    borderLeft:accent?`3px solid ${accent}`:undefined,
    borderRadius:10,padding:"18px 20px",marginBottom:12}}>{children}</div>
);

const Code=({children})=>(
  <code style={{display:"block",fontSize:12,...mono,background:"#0D0D0D",color:"#7CFC7C",padding:"8px 12px",borderRadius:6,marginTop:6,overflowX:"auto",whiteSpace:"nowrap"}}>{children}</code>
);

const InlineCode=({children})=>(
  <code style={{fontSize:11,...mono,background:T.surfaceAlt,color:T.dark,padding:"2px 6px",borderRadius:4,border:`1px solid ${T.border}`}}>{children}</code>
);

const PrimaryBtn=({onClick,children,disabled,loading})=>(
  <button onClick={onClick} disabled={disabled||loading}
    style={{background:disabled||loading?T.rule:T.amber,color:disabled||loading?T.light:"#FFF",border:"none",borderRadius:8,padding:"12px 28px",fontSize:13,fontWeight:600,letterSpacing:"0.04em",cursor:disabled||loading?"not-allowed":"pointer",transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:8,...mono}}>
    {loading&&<div style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"af-spin 0.7s linear infinite"}} />}
    {children}
  </button>
);

const GhostBtn=({onClick,children})=>(
  <button onClick={onClick} style={{background:"transparent",color:T.mid,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"11px 22px",fontSize:13,cursor:"pointer",transition:"all 0.15s",...mono}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amber;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.mid;}}
  >{children}</button>
);

const CheckRow=({label,status,detail,fix,isChecking})=>{
  const colors={pass:T.success,fail:T.error,checking:T.amberMid,optional:T.skip};
  const icons={pass:"✓",fail:"✗",checking:"·",optional:"○"};
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.rule}`}}>
      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,marginTop:1,
        background:(colors[status]||T.light)+"18",border:`2px solid ${colors[status]||T.border}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        animation:status==="checking"?"af-spin 1.2s linear infinite":"none"}}>
        <span style={{fontSize:11,fontWeight:800,color:colors[status]||T.light}}>{icons[status]}</span>
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:T.dark,...serif}}>{label}</span>
          {status==="pass"&&detail&&<span style={{fontSize:10,color:T.success,...mono,background:T.successBg,padding:"1px 7px",borderRadius:10,border:`1px solid ${T.successBorder}`}}>{detail}</span>}
        </div>
        {status==="fail"&&fix&&<div style={{marginTop:4}}><InlineCode>{fix}</InlineCode></div>}
      </div>
      <span style={{fontSize:11,...mono,flexShrink:0,color:status==="pass"?T.success:status==="fail"?T.error:T.light}}>
        {isChecking?"scanning...":status==="pass"?detail||"ok":status==="fail"?"required":status==="optional"?"optional":"—"}
      </span>
    </div>
  );
};

// ─── Step: Welcome ────────────────────────────────────────────────────────
function Welcome(){
  return(
    <div>
      <div style={{textAlign:"center",padding:"8px 0 26px"}}>
        <div style={{...disp,fontWeight:900,fontSize:56,color:T.dark,letterSpacing:"-0.03em",lineHeight:1}}>App<span style={{color:T.amber}}>Forge</span></div>
        <div style={{fontSize:16,color:T.mid,...serif,marginTop:10,fontStyle:"italic"}}>Multi-agent AI design pipeline · Set up in 10 minutes</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
        {[{icon:"◈",n:"18",label:"AI agents",body:"A full design team that debates, challenges, and refines your work"},
          {icon:"◆",n:"4",label:"Figma pages",body:"Winner, debate rationale, agency comparison, runner-up"},
          {icon:"📱",n:"∞",label:"Phone-operated",body:"Trigger runs via Dispatch, monitor and clear blockers from anywhere"},
        ].map((c,i)=>(
          <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16}}>
            <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.1em",marginBottom:6,textTransform:"uppercase"}}>{c.icon} {c.label}</div>
            <div style={{...disp,fontWeight:900,fontSize:28,color:T.amber,marginBottom:4}}>{c.n}</div>
            <div style={{fontSize:11,color:T.mid,lineHeight:1.6,...serif}}>{c.body}</div>
          </div>
        ))}
      </div>
      <Callout icon="🔒" title="Zero interference guarantee" type="success" compact
        body="AppForge installs into one isolated folder. It never modifies your global Claude settings, other projects, system PATH, or any files outside the install directory. Uninstall by deleting one folder." />
    </div>
  );
}

// ─── Step: System Check ───────────────────────────────────────────────────
function Prereqs({detected,isChecking,onRecheck,agencyEnabled,os}){
  const core=[
    {key:"node",   label:"Node.js 18+",  fix:"nodejs.org → LTS"},
    {key:"git",    label:"Git",          fix:os==="windows"?"git-scm.com (required for Code tab)":"git-scm.com"},
    {key:"claude", label:"Claude Code",  fix:"npm install -g @anthropic-ai/claude-code"},
    ...(os==="windows"?[{key:"wsl",label:"WSL2 (optional on Windows)",fix:"Windows Features → Windows Subsystem for Linux"}]:[]),
  ];
  const desktop=[
    {key:"claudeDesktop",label:"Claude Desktop App",fix:"claude.com/download"},
  ];
  const agency=[
    {key:"ollama",   label:"Ollama",   fix:"ollama.com"},
    {key:"opencode", label:"OpenCode", fix:"npm install -g opencode"},
  ];
  const allCoreOk=!isChecking&&detected&&core.filter(i=>i.key!=="wsl").every(i=>detected[i.key]?.found);

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>
        Scanning your system for existing installations. Anything already found will be incorporated automatically.
      </p>
      <Card>
        <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.12em",marginBottom:6}}>REQUIRED</div>
        {core.map(i=><CheckRow key={i.key} label={i.label} status={isChecking?"checking":detected?.[i.key]?.found?"pass":"fail"} detail={detected?.[i.key]?.version} fix={i.fix} isChecking={isChecking} />)}
      </Card>
      <Card>
        <div style={{fontSize:10,color:T.win,...mono,letterSpacing:"0.12em",marginBottom:6}}>CLAUDE DESKTOP APP</div>
        {desktop.map(i=><CheckRow key={i.key} label={i.label} status={isChecking?"checking":detected?.[i.key]?.found?"pass":"fail"} detail={detected?.[i.key]?.version} fix={i.fix} isChecking={isChecking} />)}
        {!isChecking&&!detected?.claudeDesktop?.found&&(
          <Callout icon="🖥" title="Claude Desktop recommended for Windows" type="win" compact
            body="The Claude Desktop app gives you the Code tab (Claude Code without a terminal), Cowork, and Dispatch — all in one GUI. Highly recommended for Windows users." />
        )}
      </Card>
      {agencyEnabled&&(
        <Card>
          <div style={{fontSize:10,color:T.skip,...mono,letterSpacing:"0.12em",marginBottom:6}}>COMPETING AGENCY TOOLS (optional)</div>
          {agency.map(i=><CheckRow key={i.key} label={i.label} status={isChecking?"checking":detected?.[i.key]?.found?"pass":"optional"} detail={detected?.[i.key]?.version} fix={i.fix} isChecking={isChecking} />)}
        </Card>
      )}
      <div style={{display:"flex",gap:10,alignItems:"center",marginTop:14}}>
        <button onClick={onRecheck} style={{background:T.amber,color:"#fff",border:"none",borderRadius:7,padding:"9px 18px",fontSize:12,cursor:"pointer",...mono,display:"flex",alignItems:"center",gap:6}}>
          {isChecking&&<div style={{width:10,height:10,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"af-spin 0.7s linear infinite"}} />}
          {isChecking?"Scanning...":"↻ Re-scan"}
        </button>
        {allCoreOk&&!isChecking&&<span style={{fontSize:12,color:T.success,...mono}}>✓ All required tools found</span>}
      </div>
    </div>
  );
}

// ─── Step: Platform Setup ─────────────────────────────────────────────────
function PlatformSetup({data,onChange,detected,os}){
  const isWin=os==="windows";
  const desktopFound=detected?.claudeDesktop?.found;

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>
        Configure how AppForge runs on your machine. We detected <strong>{isWin?"Windows":"macOS / Linux"}</strong>. You can override this below.
      </p>

      {/* OS selector */}
      <Card>
        <Field label="Operating system">
          <div style={{display:"flex",gap:8}}>
            {[{v:"windows",label:"🪟 Windows",sub:"x64 · WSL2 available"},{v:"macos",label:"🍎 macOS",sub:"Intel or Apple Silicon"},{v:"linux",label:"🐧 Linux",sub:"Ubuntu / Debian"}].map(opt=>(
              <button key={opt.v} onClick={()=>onChange("os",opt.v)} style={{flex:1,padding:"10px 8px",borderRadius:8,cursor:"pointer",transition:"all 0.15s",textAlign:"center",
                border:`1.5px solid ${data.os===opt.v?T.amber:T.border}`,
                background:data.os===opt.v?T.amberLight:T.surfaceAlt}}>
                <div style={{fontSize:13,...mono,color:data.os===opt.v?T.amber:T.dark,fontWeight:data.os===opt.v?600:400}}>{opt.label}</div>
                <div style={{fontSize:10,color:T.light,...serif,marginTop:2}}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </Field>
      </Card>

      {/* Windows-specific: interface choice */}
      {data.os==="windows"&&(
        <Card accent={T.win}>
          <div style={{fontSize:10,color:T.win,...mono,letterSpacing:"0.12em",marginBottom:12}}>🪟 WINDOWS INTERFACE</div>
          <Field label="How will you run AppForge?" hint="choose your preferred interface">
            <div style={{display:"flex",gap:8,flexDirection:"column"}}>
              {[
                {v:"desktop",label:"Claude Desktop — Code tab",sub:"GUI interface · no terminal needed · includes Dispatch · recommended",badge:"recommended",color:T.win},
                {v:"wsl",label:"WSL2 Terminal",sub:"Full WSL Ubuntu · all CLI tools · requires Windows Terminal",badge:null,color:T.mid},
                {v:"both",label:"Both — Desktop for running, WSL for files",sub:"Best of both worlds",badge:null,color:T.mid},
              ].map(opt=>(
                <button key={opt.v} onClick={()=>onChange("windowsInterface",opt.v)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,cursor:"pointer",transition:"all 0.15s",textAlign:"left",
                  border:`1.5px solid ${data.windowsInterface===opt.v?T.amber:T.border}`,
                  background:data.windowsInterface===opt.v?T.amberLight:T.surfaceAlt}}>
                  <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:`2px solid ${data.windowsInterface===opt.v?T.amber:T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {data.windowsInterface===opt.v&&<div style={{width:8,height:8,borderRadius:"50%",background:T.amber}} />}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:600,color:T.dark,...mono}}>{opt.label}</span>
                      {opt.badge&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:T.winBg,color:T.win,border:`1px solid ${T.winBorder}`,...mono}}>{opt.badge}</span>}
                    </div>
                    <div style={{fontSize:11,color:T.mid,...serif,marginTop:2}}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </Field>

          {(data.windowsInterface==="desktop"||data.windowsInterface==="both")&&!desktopFound&&(
            <Callout icon="⬇" title="Install Claude Desktop" type="win"
              body="Download from claude.com/download — install the Windows x64 version. Available for Pro and Max subscribers. Required for Cowork, Dispatch, and the Code tab GUI." />
          )}
          {(data.windowsInterface==="desktop"||data.windowsInterface==="both")&&desktopFound&&(
            <Callout icon="✓" title={`Claude Desktop ${detected.claudeDesktop.version} detected`} type="success" compact
              body="Code tab, Cowork, and Dispatch are available. Make sure you're on the latest version — Cowork Windows support launched April 3, 2026." />
          )}

          {(data.windowsInterface==="wsl"||data.windowsInterface==="both")&&(
            <Callout icon="⚠" title="WSL note" type="warn" compact
              body="For Dispatch to trigger Claude Code sessions, Windows Terminal must stay open with the WSL tab active. Claude Desktop Code tab handles this automatically." />
          )}
        </Card>
      )}

      {/* Path translation helper for Windows */}
      {data.os==="windows"&&(
        <Card>
          <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.12em",marginBottom:10}}>PATH REFERENCE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {label:"Windows path",val:`C:\\Users\\${data.windowsUsername||"username"}\\appforge-agents`,color:T.win},
              {label:"WSL path",val:`~/appforge-agents`,color:T.success},
              {label:"From Dispatch / Cowork",val:`C:\\Users\\${data.windowsUsername||"username"}\\appforge-agents`,color:T.win},
              {label:"From WSL terminal",val:`~/appforge-agents`,color:T.success},
            ].map((r,i)=>(
              <div key={i} style={{background:T.surfaceAlt,borderRadius:6,padding:"8px 10px",border:`1px solid ${T.borderLight}`}}>
                <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.06em",marginBottom:3}}>{r.label.toUpperCase()}</div>
                <div style={{fontSize:11,...mono,color:r.color,wordBreak:"break-all"}}>{r.val}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10}}>
            <Field label="Your Windows username" optional>
              <TInput value={data.windowsUsername} onChange={v=>onChange("windowsUsername",v)} placeholder="john" />
              <div style={{fontSize:11,color:T.light,marginTop:4,...serif}}>Used to show correct Windows paths throughout setup.</div>
            </Field>
          </div>
        </Card>
      )}

      {data.os!=="windows"&&(
        <Callout icon="✓" title="No additional platform config needed" type="success" compact
          body="macOS and Linux use standard ~/appforge-agents paths. Claude Code runs in Terminal. Dispatch works via the Claude Desktop app." />
      )}
    </div>
  );
}

// ─── Step: Location ───────────────────────────────────────────────────────
function Location({data,onChange,detected,os}){
  const isWin=os==="windows";
  const useDesktop=data.windowsInterface==="desktop"||data.windowsInterface==="both";
  const winSuggestions=[
    `C:\\Users\\${data.windowsUsername||"username"}\\appforge-agents`,
    `C:\\Users\\${data.windowsUsername||"username"}\\Documents\\appforge`,
  ];
  const unixSuggestions=["~/appforge-agents","~/Documents/appforge","~/Desktop/appforge"];
  const suggestions=isWin&&useDesktop?winSuggestions:unixSuggestions;

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>
        Choose where AppForge installs. All agent files, designs, and output live in this single isolated folder.
      </p>
      <Card>
        <Field label="Install path" detected={detected?.existingProject?"existing project found":null}>
          <TInput value={data.installPath} onChange={v=>onChange("installPath",v)} placeholder={isWin&&useDesktop?`C:\\Users\\${data.windowsUsername||"username"}\\appforge-agents`:"~/appforge-agents"} />
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            {suggestions.map(p=>(
              <button key={p} onClick={()=>onChange("installPath",p)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,cursor:"pointer",transition:"all 0.15s",...mono,
                border:`1px solid ${data.installPath===p?T.amber:T.border}`,
                background:data.installPath===p?T.amberLight:T.surfaceAlt,
                color:data.installPath===p?T.amber:T.mid}}>{p}</button>
            ))}
          </div>
        </Field>
        <Field label="Project name" optional>
          <TInput value={data.projectName} onChange={v=>onChange("projectName",v)} placeholder="My Design Agency" />
        </Field>
      </Card>

      {isWin&&useDesktop&&(
        <Callout icon="🪟" title="Windows path note" type="win"
          body="The Claude Desktop Code tab uses Windows paths directly. If you also use WSL, the same folder is accessible as ~/appforge-agents inside WSL. Both work — choose whichever you'll use most." />
      )}
      <Callout icon="🔒" title="Isolation" type="success" compact body="AppForge only writes inside the path above. No changes to global Claude settings, other projects, or system files." />
    </div>
  );
}

// ─── Step: Claude Code ────────────────────────────────────────────────────
function ClaudeSetup({data,onChange,detected,os}){
  const[authSt,setAuthSt]=useState(detected?.claude?.found?"pass":"idle");
  const isWin=os==="windows";
  const useDesktop=data.windowsInterface==="desktop"||data.windowsInterface==="both";
  const check=()=>{setAuthSt("checking");setTimeout(()=>setAuthSt(detected?.claude?.found?"pass":"fail"),1600);};

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>
        Claude Code orchestrates all your design agents.{isWin&&useDesktop?" On Windows, authentication can be done through the Desktop app's Code tab or via WSL.":""}
      </p>

      <Card highlight={detected?.claude?.found}>
        <Field label="Authentication" detected={detected?.claude?.found?detected.claude.version:null}>
          <div style={{display:"flex",alignItems:"center",gap:12,background:T.surfaceAlt,borderRadius:8,padding:"12px 14px",border:`1px solid ${T.border}`}}>
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
              background:authSt==="pass"?T.successBg:authSt==="fail"?T.errorBg:T.surfaceAlt,
              border:`2px solid ${authSt==="pass"?T.success:authSt==="fail"?T.error:T.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              animation:authSt==="checking"?"af-spin 1s linear infinite":"none",transition:"all 0.3s"}}>
              <span style={{fontSize:14,color:authSt==="pass"?T.success:authSt==="fail"?T.error:T.light}}>
                {authSt==="pass"?"✓":authSt==="fail"?"✗":authSt==="checking"?"·":"◉"}
              </span>
            </div>
            <div style={{flex:1,...serif,fontSize:13,color:T.dark}}>
              {authSt==="idle"&&"Click Verify to check authentication"}
              {authSt==="checking"&&"Verifying..."}
              {authSt==="pass"&&`Authenticated · v${detected?.claude?.version||"detected"}`}
              {authSt==="fail"&&(isWin&&useDesktop?"Open Claude Desktop → Code tab → sign in with Anthropic account":"Run: claude · then complete browser OAuth")}
            </div>
            <button onClick={check} style={{background:authSt==="pass"?T.successBg:T.amber,color:authSt==="pass"?T.success:"#fff",border:`1px solid ${authSt==="pass"?T.successBorder:"transparent"}`,borderRadius:6,padding:"7px 14px",fontSize:11,cursor:"pointer",...mono,flexShrink:0,transition:"all 0.2s"}}>
              {authSt==="checking"?"...":authSt==="pass"?"✓ OK":"Verify"}
            </button>
          </div>
          {isWin&&useDesktop&&authSt==="fail"&&(
            <div style={{marginTop:10,fontSize:12,color:T.mid,...serif,lineHeight:1.7}}>
              <strong>To authenticate via Desktop:</strong><br/>
              1. Open Claude Desktop app → click the <strong>Code</strong> tab in the left sidebar<br/>
              2. Sign in with your Anthropic account when prompted<br/>
              3. Select Environment: <strong>Local</strong><br/>
              4. Come back here and click Verify
            </div>
          )}
        </Field>
      </Card>

      <Card>
        <Field label="Anthropic API Key" hint="console.anthropic.com → API Keys" detected={detected?.existingEnv?.ANTHROPIC_API_KEY?"found in .env":null}>
          <TInput value={data.anthropicKey} onChange={v=>onChange("anthropicKey",v)} placeholder="sk-ant-api03-..." type="password"
            autoDetected={!!detected?.existingEnv?.ANTHROPIC_API_KEY&&data.anthropicKey===detected.existingEnv.ANTHROPIC_API_KEY} />
          <div style={{fontSize:11,color:T.light,marginTop:5,...serif}}>Stored only in your local .env — never transmitted except to the Anthropic API.</div>
        </Field>
      </Card>

      <Callout icon="🔒" title="Project-scoped only" type="success" compact body="Claude settings write to .claude/ inside your install folder — never to global ~/.claude/ or any system location." />
    </div>
  );
}

// ─── Step: Desktop & Dispatch ─────────────────────────────────────────────
function DesktopDispatch({data,onChange,detected,os}){
  const[dispatchPaired,setDispatchPaired]=useState(false);
  const[desktopOpen,setDesktopOpen]=useState(false);
  const isWin=os==="windows";
  const desktopFound=detected?.claudeDesktop?.found;
  const useDesktop=data.windowsInterface==="desktop"||data.windowsInterface==="both"||os!=="windows";

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>
        Connect AppForge to the Claude Desktop app and pair your phone via Dispatch. This is what lets you trigger and monitor design runs from anywhere.
      </p>

      {/* Desktop app status */}
      <Card accent={desktopFound?T.success:T.amber}>
        <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.12em",marginBottom:12}}>CLAUDE DESKTOP APP</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:desktopFound?T.successBg:T.surfaceAlt,border:`2px solid ${desktopFound?T.success:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
            {desktopFound?"✓":"🖥"}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:T.dark,...mono}}>
              {desktopFound?`Claude Desktop ${detected.claudeDesktop.version} · installed`:"Claude Desktop not detected"}
            </div>
            <div style={{fontSize:12,color:T.mid,...serif,marginTop:2}}>
              {desktopFound?"Cowork, Code tab, and Dispatch are available.":"Download from claude.com/download · Pro or Max required"}
            </div>
          </div>
          {!desktopFound&&(
            <a href="https://claude.com/download" target="_blank" rel="noreferrer" style={{background:T.amber,color:"#fff",textDecoration:"none",borderRadius:7,padding:"8px 16px",fontSize:12,...mono,fontWeight:600,flexShrink:0}}>Download ↗</a>
          )}
        </div>

        {desktopFound&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {icon:"💻",label:"Code Tab",desc:"Claude Code in a GUI — no terminal needed on Windows"},
              {icon:"🏠",label:"Cowork",desc:"Agentic tasks, file access, sub-agent coordination"},
              {icon:"📱",label:"Dispatch",desc:"Phone ↔ desktop continuous conversation"},
            ].map((f,i)=>(
              <div key={i} style={{background:T.surfaceAlt,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.borderLight}`}}>
                <div style={{fontSize:16,marginBottom:4}}>{f.icon}</div>
                <div style={{fontSize:11,fontWeight:600,color:T.dark,...mono,marginBottom:3}}>{f.label}</div>
                <div style={{fontSize:10,color:T.mid,...serif,lineHeight:1.5}}>{f.desc}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dispatch pairing */}
      <Card highlight={dispatchPaired}>
        <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.12em",marginBottom:12}}>📱 DISPATCH — PHONE PAIRING</div>
        <div style={{fontSize:12,color:T.mid,...serif,lineHeight:1.7,marginBottom:14}}>
          Dispatch creates a persistent conversation between your phone and this desktop. Once paired, you can send AppForge tasks from anywhere and receive notifications when they complete or need your input.
        </div>

        <div style={{background:T.surfaceAlt,borderRadius:8,padding:"14px",border:`1px solid ${T.border}`,marginBottom:14}}>
          {[
            ["1","Open Claude Desktop app","On this computer"],
            ["2","Click the Cowork tab","In the left sidebar"],
            ["3","Click Dispatch","Also in the left sidebar"],
            ["4","Click Get started","Then enable Keep desktop awake"],
            ["5","Scan the QR code","With the Claude app on your phone"],
            ["6","Done","One continuous conversation across both devices"],
          ].map(([n,step,detail],i,arr)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:i<arr.length-1?`1px dashed ${T.rule}`:"none",alignItems:"flex-start"}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:T.amberLight,border:`2px solid ${T.amber}`,display:"flex",alignItems:"center",justifyContent:"center",...mono,fontSize:11,fontWeight:700,color:T.amber,marginTop:1}}>{n}</div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:T.dark,...mono}}>{step}</div>
                <div style={{fontSize:11,color:T.mid,...serif}}>{detail}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={()=>setDispatchPaired(true)} style={{width:"100%",padding:"12px",
          background:dispatchPaired?T.successBg:T.amber,color:dispatchPaired?T.success:"#fff",
          border:`2px solid ${dispatchPaired?T.successBorder:"transparent"}`,borderRadius:9,
          fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.25s",...mono}}>
          {dispatchPaired?"✓ Dispatch paired — phone and desktop connected":"I've set up Dispatch"}
        </button>

        {!dispatchPaired&&<Callout icon="○" title="Skip for now" type="skip" compact body="You can pair Dispatch after installation. AppForge will work without it — you'll just need to open the Claude Desktop Code tab manually to trigger runs." />}
      </Card>

      {/* Keep awake reminder */}
      <Card>
        <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.12em",marginBottom:10}}>⏰ KEEP DESKTOP AWAKE</div>
        <div style={{fontSize:12,color:T.mid,...serif,lineHeight:1.7,marginBottom:10}}>
          AppForge pipeline runs take 25–45 minutes. Your computer must stay awake for the full duration.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {(isWin?[
            ["Windows Settings","Settings → System → Power → Screen and sleep → set to Never"],
            ["In Dispatch","Toggle 'Keep desktop awake' when starting Dispatch — handles it automatically"],
          ]:[
            ["macOS","System Settings → Battery → Options → Prevent sleep when on power adapter"],
            ["Terminal","caffeinate -d & (run before starting pipeline)"],
          ]).map(([label,detail],i)=>(
            <div key={i} style={{background:T.surfaceAlt,borderRadius:7,padding:"10px 12px",border:`1px solid ${T.borderLight}`}}>
              <div style={{fontSize:11,fontWeight:600,color:T.dark,...mono,marginBottom:3}}>{label}</div>
              <div style={{fontSize:11,color:T.mid,...serif,lineHeight:1.5}}>{detail}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Step: Figma ──────────────────────────────────────────────────────────
function FigmaSetup({data,onChange,detected}){
  const[show,setShow]=useState(false);
  const tokAuto=!!detected?.existingEnv?.FIGMA_TOKEN&&data.figmaToken===detected.existingEnv.FIGMA_TOKEN;
  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>AppForge delivers finished designs directly into a Figma file — frames, tokens, and four output pages.</p>
      <Card>
        <Field label="Personal Access Token" hint="starts with figd_" detected={detected?.existingEnv?.FIGMA_TOKEN?"found in .env":null}>
          <div style={{position:"relative"}}>
            <TInput value={data.figmaToken} onChange={v=>onChange("figmaToken",v)} placeholder="figd_..." type={show?"text":"password"} autoDetected={tokAuto}
              error={data.figmaToken&&!data.figmaToken.startsWith("figd_")?"Must start with figd_":null} />
            <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.light,fontSize:11,...mono}}>{show?"hide":"show"}</button>
          </div>
          <div style={{fontSize:11,color:T.light,marginTop:5,...serif}}>figma.com → Settings → Security → Personal Access Tokens → Generate</div>
        </Field>
        <Field label="Project File URL" detected={detected?.existingEnv?.FIGMA_FILE_URL?"found in .env":null}>
          <TInput value={data.figmaFileUrl} onChange={v=>onChange("figmaFileUrl",v)} placeholder="https://www.figma.com/design/..."
            autoDetected={!!detected?.existingEnv?.FIGMA_FILE_URL&&data.figmaFileUrl===detected.existingEnv.FIGMA_FILE_URL}
            error={data.figmaFileUrl&&!data.figmaFileUrl.includes("figma.com")?"Must be a figma.com URL":null} />
          <div style={{fontSize:11,color:T.light,marginTop:5,...serif}}>Create a file with 5 blank pages: <strong>Final Design · Debate Summary · Agency Comparison · Runner-Up · Archive</strong></div>
        </Field>
      </Card>
      <Callout icon="💡" title="Create Figma file via Dispatch" type="amber" compact
        body={`In Claude Dispatch or Cowork: "Open Figma in the browser, create a new design file called AppForge Projects, add 5 blank pages: Final Design, Debate Summary, Agency Comparison, Runner-Up, Archive — send me the URL."`} />
    </div>
  );
}

// ─── Step: Qwen Agency ────────────────────────────────────────────────────
function AgencySetup({data,onChange,detected}){
  const[show,setShow]=useState(false);
  const[testSt,setTestSt]=useState("idle");
  const keyAuto=!!detected?.existingEnv?.OLLAMA_API_KEY&&data.ollamaApiKey===detected.existingEnv.OLLAMA_API_KEY;
  const test=()=>{setTestSt("testing");setTimeout(()=>setTestSt(data.ollamaApiKey?.length>10?"pass":"fail"),2000);};
  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>Qwen3.5 reviews your winning design with independent eyes. Runs via Ollama cloud — no local GPU needed.</p>
      <Card>
        <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.12em",marginBottom:10}}>TOOL STATUS</div>
        {[{key:"ollama",label:"Ollama CLI",inst:"ollama.com (optional — cloud mode doesn't need it)"},{key:"opencode",label:"OpenCode",inst:"npm install -g opencode"}].map(item=>{
          const d=detected?.[item.key];
          return(
            <div key={item.key} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${T.rule}`}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:d?.found?T.successBg:T.surfaceAlt,border:`2px solid ${d?.found?T.success:T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:d?.found?T.success:T.light}}>{d?.found?"✓":"○"}</span>
              </div>
              <span style={{fontSize:13,color:T.dark,...serif,flex:1}}>{item.label}</span>
              {d?.found?<span style={{fontSize:11,color:T.success,...mono}}>{d.version}</span>:<span style={{fontSize:11,...mono,background:T.surfaceAlt,padding:"2px 8px",borderRadius:4,border:`1px solid ${T.border}`,color:T.mid}}>{item.inst}</span>}
            </div>
          );
        })}
      </Card>
      <Card>
        <Field label="Ollama Cloud API Key" hint="ollama.com → API Keys" detected={detected?.existingEnv?.OLLAMA_API_KEY?"found in .env":null}>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,position:"relative"}}>
              <TInput value={data.ollamaApiKey} onChange={v=>onChange("ollamaApiKey",v)} placeholder="ollama-..." type={show?"text":"password"} autoDetected={keyAuto} />
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.light,fontSize:11,...mono}}>{show?"hide":"show"}</button>
            </div>
            <button onClick={test} disabled={!data.ollamaApiKey||testSt==="testing"} style={{flexShrink:0,background:testSt==="pass"?T.successBg:testSt==="fail"?T.errorBg:T.amber,color:testSt==="pass"?T.success:testSt==="fail"?T.error:"#fff",border:`1.5px solid ${testSt==="pass"?T.successBorder:testSt==="fail"?T.errorBorder:"transparent"}`,borderRadius:7,padding:"10px 16px",fontSize:11,cursor:!data.ollamaApiKey?"not-allowed":"pointer",...mono,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
              {testSt==="testing"&&<div style={{width:10,height:10,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"af-spin 0.7s linear infinite"}} />}
              {testSt==="pass"?"✓ OK":testSt==="fail"?"✗ Fail":testSt==="testing"?"...":"Test"}
            </button>
          </div>
        </Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Model","qwen3.5:cloud"],["Endpoint","api.ollama.com/v1"],["Cost","Ollama pricing"],["Local GPU","Not required"]].map(([k,v])=>(
            <div key={k} style={{background:T.surfaceAlt,borderRadius:6,padding:"8px 12px",border:`1px solid ${T.borderLight}`}}>
              <div style={{fontSize:10,color:T.light,...mono,letterSpacing:"0.06em"}}>{k.toUpperCase()}</div>
              <div style={{fontSize:12,color:T.dark,...mono,marginTop:2}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Step: Config ─────────────────────────────────────────────────────────
function Config({data,onChange}){
  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>Fine-tune your pipeline. Change any time by editing .env.</p>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",color:T.dark,...mono,textTransform:"uppercase",marginBottom:8}}>COMPETING AGENCY</div>
        <Toggle value={data.agencyEnabled} onChange={v=>onChange("agencyEnabled",v)}
          label={data.agencyEnabled?"Enabled — Qwen3.5 reviews winning design":"Disabled — Claude-only pipeline"}
          sub={data.agencyEnabled?"Adds ~5–8 min and Ollama cloud cost. Requires Ollama API key.":"Faster. No Ollama needed. Full Claude debate still active."} />
        {!data.agencyEnabled&&<Callout icon="○" type="skip" compact body="All 18 Claude agents still run — debate, Arbiter scoring, refinement, Figma delivery. Enable anytime by adding OLLAMA_API_KEY to .env." />}
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",color:T.dark,...mono,textTransform:"uppercase",marginBottom:10}}>DESIGN VARIANTS</div>
        <div style={{display:"flex",alignItems:"center",gap:16,margin:"0 0 6px"}}>
          <input type="range" min={2} max={5} value={data.variantCount} onChange={e=>onChange("variantCount",parseInt(e.target.value))} style={{flex:1,accentColor:T.amber}} />
          <div style={{width:42,height:42,borderRadius:8,background:T.amberLight,border:`2px solid ${T.amber}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:T.amber,...disp}}>{data.variantCount}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.light,...serif}}>
          <span>2 — ~$1.50</span><span>3 — recommended</span><span>5 — thorough ~$6</span>
        </div>
      </Card>
      <Card>
        <Field label="Cost checkpoint" hint="pipeline pauses for approval above this amount">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18,color:T.mid,...mono}}>$</span>
            <TInput value={data.costThreshold} onChange={v=>onChange("costThreshold",v)} placeholder="2.00" />
          </div>
        </Field>
      </Card>
    </div>
  );
}

// ─── Step: Review ─────────────────────────────────────────────────────────
function Review({data,os}){
  const fileCount=Object.entries(MANIFEST).filter(([k])=>k!=="Agency"||data.agencyEnabled).reduce((a,[,v])=>a+v.length,0);
  const isWin=os==="windows";
  const rows=[
    {label:"Install path",     val:data.installPath},
    {label:"OS / Interface",   val:isWin?`Windows · ${data.windowsInterface||"Desktop"}`:os},
    {label:"Claude Desktop",   val:data.windowsInterface==="desktop"||data.windowsInterface==="both"?"✓ Code tab":"WSL terminal"},
    {label:"Dispatch paired",  val:"Configure after install"},
    {label:"Figma token",      val:data.figmaToken?"figd_•••"+data.figmaToken.slice(-4):"⚠ Not set"},
    {label:"Figma file",       val:data.figmaFileUrl?"✓ Set":"⚠ Not set"},
    {label:"Competing agency", val:data.agencyEnabled?"✓ Enabled":"○ Disabled"},
    ...(data.agencyEnabled?[{label:"Ollama key",val:data.ollamaApiKey?"•••"+data.ollamaApiKey.slice(-4):"⚠ Not set"}]:[]),
    {label:"Variants per run", val:`${data.variantCount}`},
    {label:"Cost checkpoint",  val:`$${data.costThreshold}`},
    {label:"Files to install", val:`${fileCount}`},
  ];
  const issues=[];
  if(!data.figmaToken?.startsWith("figd_"))issues.push("Figma token missing or invalid");
  if(!data.figmaFileUrl?.includes("figma.com"))issues.push("Figma file URL missing or invalid");
  if(!data.anthropicKey)issues.push("Anthropic API key missing");
  if(data.agencyEnabled&&!data.ollamaApiKey)issues.push("Ollama API key required when agency is enabled");

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>Review before installation. Everything can be changed later by editing .env.</p>
      <Card>
        {rows.map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<rows.length-1?`1px solid ${T.rule}`:"none"}}>
            <span style={{fontSize:12,color:T.mid,...serif}}>{r.label}</span>
            <span style={{fontSize:12,...mono,color:r.val?.startsWith("⚠")?T.error:T.dark}}>{r.val}</span>
          </div>
        ))}
      </Card>
      {issues.length>0
        ?<Callout icon="⚠" title={`${issues.length} issue${issues.length>1?"s":""} to fix`} type="error" body={issues.join(" · ")} />
        :<Callout icon="✓" title="Ready to install" type="success" compact body={`${fileCount} files → ${data.installPath}. No other files will be created or modified.`} />}
    </div>
  );
}

// ─── Step: Installing ─────────────────────────────────────────────────────
function Installing({progress,log,agencyEnabled}){
  const cats=Object.entries(MANIFEST).filter(([k])=>k!=="Agency"||agencyEnabled);
  const total=cats.reduce((a,[,v])=>a+v.length,0);
  const pct=total>0?Math.round((progress/total)*100):0;
  const logRef=useRef(null);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);
  let cursor=0;
  return(
    <div>
      <div style={{textAlign:"center",padding:"8px 0 22px"}}>
        <div style={{...disp,fontWeight:900,fontSize:52,color:pct===100?T.success:T.amber,transition:"color 0.5s"}}>{pct}%</div>
        <div style={{fontSize:14,color:T.mid,...serif,marginTop:4}}>{pct<100?"Writing AppForge...":"Installation complete ✓"}</div>
      </div>
      <div style={{height:8,background:T.rule,borderRadius:4,overflow:"hidden",marginBottom:18}}>
        <div style={{height:"100%",background:pct===100?T.success:`linear-gradient(90deg,${T.amber},${T.amberMid})`,borderRadius:4,width:`${pct}%`,transition:"width 0.25s ease"}} />
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {cats.map(([cat,files])=>{
          const start=cursor;cursor+=files.length;
          const done=Math.max(0,Math.min(files.length,progress-start));
          const complete=done>=files.length;
          return(
            <div key={cat} style={{fontSize:10,padding:"4px 10px",borderRadius:20,...mono,transition:"all 0.3s",background:complete?T.successBg:T.surfaceAlt,color:complete?T.success:T.mid,border:`1px solid ${complete?T.successBorder:T.border}`}}>
              {complete?"✓ ":""}{cat} {done}/{files.length}
            </div>
          );
        })}
      </div>
      <div ref={logRef} style={{background:"#0D0D0D",borderRadius:10,padding:"14px 16px",...mono,fontSize:11,color:"#7CFC7C",maxHeight:200,overflowY:"auto",lineHeight:1.9}}>
        {log.map((l,i)=>(
          <div key={i} style={{opacity:i===log.length-1?1:Math.max(0.35,1-(log.length-1-i)*0.07),color:l.startsWith("✗")?"#FF6B6B":l.startsWith("→")?"#FFB347":"#7CFC7C"}}>{l}</div>
        ))}
        {pct<100&&<div style={{animation:"af-blink 1s step-end infinite"}}>▌</div>}
      </div>
    </div>
  );
}

// ─── Step: Figma Auth ─────────────────────────────────────────────────────
function FigmaAuth({data,os}){
  const[done,setDone]=useState(false);
  const isWin=os==="windows";
  const useDesktop=data.windowsInterface==="desktop"||data.windowsInterface==="both";

  const steps=useDesktop&&isWin
    ?[
        ["Open Claude Desktop app","On this computer"],
        ["Click the Code tab","In the left sidebar"],
        ["Select Environment: Local","In the session configuration area"],
        [`Navigate to install folder`,`cd "${data.installPath}"`],
        ["Type /mcp and press Enter","In the Claude Code input"],
        ["Select figma → Authenticate","Browser opens → approve → done"],
      ]
    :[
        ["Open a WSL / macOS terminal",`Navigate to ${data.installPath}`],
        ["Open Claude Code",`cd ${data.installPath} && claude`],
        ["Type /mcp","Press Enter"],
        ["Select figma → Authenticate","Browser opens → approve → done"],
      ];

  return(
    <div>
      <p style={{fontSize:14,color:T.mid,...serif,lineHeight:1.75,marginBottom:18}}>One final step — Figma MCP needs a one-time browser OAuth. Takes ~30 seconds.</p>
      {isWin&&(
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{v:"desktop",l:"Via Claude Desktop Code tab"},{v:"wsl",l:"Via WSL terminal"}].map(opt=>(
            <button key={opt.v} onClick={()=>{}} style={{flex:1,padding:"9px",borderRadius:7,cursor:"pointer",fontSize:11,...mono,border:`1.5px solid ${useDesktop&&opt.v==="desktop"?T.amber:!useDesktop&&opt.v==="wsl"?T.amber:T.border}`,background:((useDesktop&&opt.v==="desktop")||(!useDesktop&&opt.v==="wsl"))?T.amberLight:T.surfaceAlt,color:((useDesktop&&opt.v==="desktop")||(!useDesktop&&opt.v==="wsl"))?T.amber:T.mid}}>{opt.l}</button>
          ))}
        </div>
      )}
      <Card>
        {steps.map(([step,detail],i,arr)=>(
          <div key={i} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:i<arr.length-1?`1px dashed ${T.rule}`:"none"}}>
            <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:T.amberLight,border:`2px solid ${T.amber}`,display:"flex",alignItems:"center",justifyContent:"center",...mono,fontSize:11,fontWeight:700,color:T.amber,marginTop:2}}>{i+1}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:T.dark,...mono}}>{step}</div>
              <div style={{fontSize:12,color:T.mid,marginTop:2,...serif}}>{detail}</div>
            </div>
          </div>
        ))}
      </Card>
      <button onClick={()=>setDone(true)} style={{width:"100%",padding:"14px",background:done?T.successBg:T.amber,color:done?T.success:"#fff",border:`2px solid ${done?T.successBorder:"transparent"}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.25s",...mono}}>
        {done?"✓ Figma authentication complete":"I've completed Figma authentication"}
      </button>
      {isWin&&<Callout icon="💡" title="Browser didn't open?" type="win" compact body="Claude Code will print a URL in the terminal. Copy it and paste it into Edge or Chrome manually." />}
    </div>
  );
}

// ─── Step: Done ───────────────────────────────────────────────────────────
function Done({data,os}){
  const[copied,setCopied]=useState(null);
  const isWin=os==="windows";
  const useDesktop=data.windowsInterface==="desktop"||data.windowsInterface==="both";
  const copy=(txt,k)=>{navigator.clipboard?.writeText(txt).catch(()=>{});setCopied(k);setTimeout(()=>setCopied(null),2000);};

  const desktopInstructions=useDesktop&&isWin
    ?[
        {step:"Open Claude Desktop",detail:"App should already be installed and authenticated"},
        {step:"Click the Code tab",detail:"In the left sidebar"},
        {step:"Select Environment: Local",detail:"In the session configuration"},
        {step:"In the input area, run:",detail:`cd "${data.installPath}"`},
        {step:"Start your first run:",detail:"/design:brief \"Describe your app here...\""},
      ]
    :null;

  const terminalCmd=isWin&&!useDesktop
    ?`wt -p "Ubuntu" bash -c "cd ${data.installPath} && claude --enable-auto-mode"`
    :`cd ${data.installPath} && claude --enable-auto-mode`;

  return(
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:10}}>🎨</div>
      <div style={{...disp,fontWeight:900,fontSize:36,color:T.dark,marginBottom:6,letterSpacing:"-0.02em"}}>AppForge is ready.</div>
      <div style={{fontSize:15,color:T.mid,...serif,marginBottom:28}}>
        Your {data.agencyEnabled?"18-agent":"Claude"} design pipeline is installed and configured{isWin?" for Windows":""}.
      </div>

      {desktopInstructions?(
        <div style={{background:"#0D0D0D",borderRadius:12,padding:"18px 20px",textAlign:"left",marginBottom:20}}>
          <div style={{fontSize:10,color:"#666",...mono,letterSpacing:"0.12em",marginBottom:12}}>START VIA CLAUDE DESKTOP CODE TAB</div>
          {desktopInstructions.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:12,marginBottom:10,alignItems:"flex-start"}}>
              <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:T.amber+"30",border:`1px solid ${T.amber}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,...mono,color:T.amberMid,marginTop:1}}>{i+1}</div>
              <div>
                <div style={{fontSize:12,color:"#AAA",...mono}}>{d.step}</div>
                {d.detail.startsWith("/")||d.detail.startsWith("cd ")?
                  <div style={{fontSize:12,color:"#7CFC7C",...mono,marginTop:2}}>{d.detail}</div>:
                  <div style={{fontSize:11,color:"#666",...serif,marginTop:1}}>{d.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      ):(
        <div style={{background:"#0D0D0D",borderRadius:12,padding:"18px 20px",textAlign:"left",marginBottom:20}}>
          <div style={{fontSize:10,color:"#666",...mono,letterSpacing:"0.12em",marginBottom:10}}>START YOUR FIRST RUN</div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontSize:11,color:"#7CFC7C",...mono,flex:1,wordBreak:"break-all"}}>{terminalCmd}</span>
            <button onClick={()=>copy(terminalCmd,"start")} style={{background:copied==="start"?T.success:T.amber,color:"#fff",border:"none",borderRadius:5,padding:"5px 12px",fontSize:10,cursor:"pointer",...mono,flexShrink:0}}>{copied==="start"?"✓":"copy"}</button>
          </div>
          <div style={{fontSize:10,color:"#555",...mono,marginBottom:5}}>Then inside Claude Code:</div>
          <div style={{fontSize:12,color:"#FFB347",...mono}}>{`/design:brief "Describe your app here..."`}</div>
        </div>
      )}

      {/* Dispatch reminder */}
      <div style={{background:T.winBg,border:`1px solid ${T.winBorder}`,borderRadius:10,padding:"14px 16px",textAlign:"left",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:T.win,...mono,marginBottom:6}}>📱 Run from your phone via Dispatch</div>
        <div style={{fontSize:12,color:T.mid,...serif,lineHeight:1.65}}>
          Once Dispatch is paired (Cowork → Dispatch → scan QR code), send this from Claude mobile:<br/>
          <span style={{...mono,fontSize:12,color:T.dark,background:T.surfaceAlt,padding:"4px 8px",borderRadius:5,marginTop:6,display:"inline-block",marginBottom:4}}>
            "Open Claude Desktop Code tab, navigate to {data.installPath}, and run /design:brief [your brief]"
          </span><br/>
          <span style={{fontSize:11,color:T.light}}>Dispatch routes dev tasks to the Code tab automatically.</span>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"left"}}>
        {[{icon:"📊",title:"Audit reports",body:`Every run logged in ${data.installPath}/output/runs/`},
          {icon:"⚙",title:"Change settings",body:`Edit ${data.installPath}/.env to update any credential or config`},
          {icon:"🔒",title:"Uninstall",body:`Delete the ${data.installPath} folder. Nothing else was modified.`}
        ].map((c,i)=>(
          <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px"}}>
            <div style={{fontSize:18,marginBottom:6}}>{c.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:T.dark,...mono,marginBottom:4}}>{c.title}</div>
            <div style={{fontSize:11,color:T.mid,lineHeight:1.6,...serif}}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────
export default function AppForgeWizard(){
  const[stepIdx,setStepIdx]=useState(0);
  const[detected,setDetected]=useState(null);
  const[isChecking,setIsChecking]=useState(false);
  const[installProgress,setInstallProgress]=useState(0);
  const[installLog,setInstallLog]=useState([]);
  const[installing,setInstalling]=useState(false);
  const iRef=useRef(null);

  const osDetected=detectOS();
  const[data,setData]=useState({
    os:osDetected,
    windowsInterface:"desktop",
    windowsUsername:"",
    installPath:osDetected==="windows"?"C:\\Users\\username\\appforge-agents":"~/appforge-agents",
    projectName:"",
    anthropicKey:"",figmaToken:"",figmaFileUrl:"",ollamaApiKey:"",
    variantCount:3,costThreshold:"2.00",agencyEnabled:true,
  });

  const update=useCallback((k,v)=>setData(p=>({...p,[k]:v})),[]);

  // Update installPath when username or OS changes
  useEffect(()=>{
    if(data.os==="windows"&&(data.windowsInterface==="desktop"||data.windowsInterface==="both")){
      const u=data.windowsUsername||"username";
      setData(p=>({...p,installPath:`C:\\Users\\${u}\\appforge-agents`}));
    }else if(data.os==="windows"&&data.windowsInterface==="wsl"){
      setData(p=>({...p,installPath:"~/appforge-agents"}));
    }
  },[data.windowsUsername,data.windowsInterface,data.os]);

  // Build active steps
  const activeSteps=ALL_STEPS.filter(s=>s.id!=="agency"||data.agencyEnabled);
  const cur=activeSteps[stepIdx];

  const runScan=useCallback(()=>{
    setIsChecking(true);
    setTimeout(()=>{
      const d={...MOCK};
      setData(p=>({...p,
        anthropicKey:d.existingEnv.ANTHROPIC_API_KEY||p.anthropicKey,
        figmaToken:d.existingEnv.FIGMA_TOKEN||p.figmaToken,
        figmaFileUrl:d.existingEnv.FIGMA_FILE_URL||p.figmaFileUrl,
        ollamaApiKey:d.existingEnv.OLLAMA_API_KEY||p.ollamaApiKey,
      }));
      setDetected(d);
      setIsChecking(false);
    },2200);
  },[]);

  useEffect(()=>{if(stepIdx===1)runScan();},[stepIdx]);

  const runInstall=useCallback(()=>{
    if(installing)return;
    setInstalling(true);
    setInstallProgress(0);
    const allFiles=Object.entries(MANIFEST).filter(([k])=>k!=="Agency"||data.agencyEnabled).flatMap(([c,fs])=>fs.map(f=>({c,f})));
    setInstallLog(["→ Starting AppForge installation...",`→ Target: ${data.installPath}`,`→ OS: ${data.os} · Interface: ${data.windowsInterface||"default"}`,`→ ${allFiles.length} files · agency ${data.agencyEnabled?"enabled":"disabled"}`]);
    let i=0;
    iRef.current=setInterval(()=>{
      if(i>=allFiles.length){
        clearInterval(iRef.current);
        setInstallLog(p=>[...p,"→ npm install openai dotenv...","→ Validating configuration...","✓ AppForge installed!"]);
        setTimeout(()=>setStepIdx(s=>s+1),1400);
        return;
      }
      const{c,f}=allFiles[i];
      setInstallProgress(i+1);
      setInstallLog(p=>[...p.slice(-22),`✓ [${c}] ${f}`]);
      i++;
    },70);
  },[data,installing]);

  useEffect(()=>()=>{if(iRef.current)clearInterval(iRef.current);},[]);

  const canContinue=()=>{
    if(!cur)return false;
    const id=cur.id;
    if(id==="prereqs")return!isChecking&&detected&&["node","git","claude"].every(k=>detected[k]?.found);
    if(id==="figma")return data.figmaToken?.startsWith("figd_")&&data.figmaFileUrl?.includes("figma.com");
    if(id==="agency")return!!data.ollamaApiKey&&data.ollamaApiKey.length>10;
    if(id==="review"){
      const ok=data.figmaToken?.startsWith("figd_")&&data.figmaFileUrl?.includes("figma.com")&&!!data.anthropicKey;
      return ok&&(!data.agencyEnabled||!!data.ollamaApiKey);
    }
    return true;
  };

  const handleNext=()=>{
    if(cur?.id==="review"){setStepIdx(s=>s+1);runInstall();return;}
    if(stepIdx<activeSteps.length-1)setStepIdx(s=>s+1);
  };

  const content={
    welcome:<Welcome />,
    prereqs:<Prereqs detected={detected} isChecking={isChecking} onRecheck={runScan} agencyEnabled={data.agencyEnabled} os={data.os} />,
    platform:<PlatformSetup data={data} onChange={update} detected={detected} os={data.os} />,
    location:<Location data={data} onChange={update} detected={detected} os={data.os} />,
    claude:<ClaudeSetup data={data} onChange={update} detected={detected} os={data.os} />,
    dispatch:<DesktopDispatch data={data} onChange={update} detected={detected} os={data.os} />,
    figma:<FigmaSetup data={data} onChange={update} detected={detected} />,
    agency:<AgencySetup data={data} onChange={update} detected={detected} />,
    config:<Config data={data} onChange={update} />,
    review:<Review data={data} os={data.os} />,
    installing:<Installing progress={installProgress} log={installLog} agencyEnabled={data.agencyEnabled} />,
    figmaauth:<FigmaAuth data={data} os={data.os} />,
    done:<Done data={data} os={data.os} />,
  };

  const isInstalling=cur?.id==="installing";
  const isDone=cur?.id==="done";
  const showNav=!isInstalling&&!isDone;

  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;}
        @keyframes af-spin{to{transform:rotate(360deg)}}
        @keyframes af-slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes af-blink{50%{opacity:0}}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${T.rule};border-radius:2px}
      `}</style>

      {/* Sidebar */}
      <div style={{width:226,background:T.dark,padding:"28px 22px",flexShrink:0,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        <div style={{...disp,fontWeight:900,fontSize:24,color:"#FFF",letterSpacing:"-0.02em",marginBottom:6}}>App<span style={{color:T.amberMid}}>Forge</span></div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",...mono,marginBottom:26,letterSpacing:"0.08em"}}>
          {data.os==="windows"?"WINDOWS SETUP":"SETUP WIZARD"}
        </div>
        <div style={{flex:1,position:"relative"}}>
          <div style={{position:"absolute",left:10,top:14,bottom:14,width:1,background:"rgba(255,255,255,0.08)"}} />
          <div style={{position:"absolute",left:10,top:14,width:1,background:T.amberMid,height:`${(stepIdx/Math.max(1,activeSteps.length-1))*100}%`,maxHeight:"calc(100% - 28px)",transition:"height 0.45s ease"}} />
          {activeSteps.map((s,i)=>{
            const past=i<stepIdx,isCur=i===stepIdx,fut=i>stepIdx;
            return(
              <div key={s.id} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:17,position:"relative"}}>
                <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,zIndex:1,marginTop:1,background:past?T.amberMid:T.dark,border:`2px solid ${past?T.amberMid:isCur?T.amberMid:"rgba(255,255,255,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s"}}>
                  {past?<span style={{fontSize:9,fontWeight:900,color:T.dark}}>✓</span>:<span style={{fontSize:9,color:isCur?T.amberMid:"rgba(255,255,255,0.2)",...mono}}>{i+1}</span>}
                </div>
                <div style={{opacity:fut?0.28:1,transition:"opacity 0.3s"}}>
                  <div style={{fontSize:11,fontWeight:isCur?600:400,...mono,letterSpacing:"0.02em",color:isCur?"#FFF":past?T.amberMid:"rgba(255,255,255,0.55)"}}>{s.title}</div>
                  {isCur&&<div style={{fontSize:10,color:"rgba(255,255,255,0.28)",...serif,fontStyle:"italic",marginTop:1}}>{s.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:14}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.22)",...mono,letterSpacing:"0.08em",marginBottom:6}}>STEP {stepIdx+1} OF {activeSteps.length}</div>
          <div style={{height:3,background:"rgba(255,255,255,0.1)",borderRadius:2}}>
            <div style={{height:"100%",background:T.amberMid,borderRadius:2,width:`${(stepIdx/Math.max(1,activeSteps.length-1))*100}%`,transition:"width 0.4s ease"}} />
          </div>
          {data.os==="windows"&&<div style={{marginTop:8,fontSize:10,color:"rgba(255,255,255,0.2)",...mono}}>🪟 Windows · {data.windowsInterface||"Desktop"}</div>}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",maxWidth:700,minWidth:0}}>
        <div style={{flex:1,padding:"36px 44px 24px",overflowY:"auto"}}>
          <div key={cur?.id} style={{animation:"af-slide 0.3s ease"}}>
            <div style={{marginBottom:24}}>
              <h1 style={{...disp,fontWeight:900,fontSize:30,color:T.dark,margin:0,letterSpacing:"-0.02em"}}>{cur?.title}</h1>
              <div style={{fontSize:14,color:T.mid,...serif,fontStyle:"italic",marginTop:4}}>{cur?.sub}</div>
            </div>
            {cur&&content[cur.id]}
          </div>
        </div>
        {showNav&&(
          <div style={{padding:"18px 44px",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>{stepIdx>0&&<GhostBtn onClick={()=>setStepIdx(s=>s-1)}>← Back</GhostBtn>}</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              {!canContinue()&&cur?.id!=="welcome"&&<span style={{fontSize:11,color:T.light,...serif,fontStyle:"italic"}}>Complete this step to continue</span>}
              <PrimaryBtn onClick={handleNext} disabled={!canContinue()&&cur?.id!=="welcome"}>
                {cur?.id==="review"?"Begin Installation →":"Continue →"}
              </PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
