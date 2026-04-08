#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════╗
// ║  create-appforge  ·  v1.0.0                                ║
// ║  npx create-appforge                                        ║
// ╚══════════════════════════════════════════════════════════════╝

import { createServer }                 from "http";
import { readFileSync, writeFileSync,
         mkdirSync, existsSync,
         readdirSync }                  from "fs";
import { join, resolve, dirname }       from "path";
import { homedir, platform, userInfo }  from "os";
import { execSync, exec }               from "child_process";
import { fileURLToPath }                from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = 4242;
const HOST      = "127.0.0.1";

// ── ANSI ───────────────────────────────────────────────────────
const c = { r:"\x1b[0m", b:"\x1b[1m", y:"\x1b[33m", g:"\x1b[32m", d:"\x1b[2m", red:"\x1b[31m" };
const log = {
  info:    m => console.log(`  ${c.d}→${c.r} ${m}`),
  ok:      m => console.log(`  ${c.g}✓${c.r} ${m}`),
  warn:    m => console.log(`  ${c.y}!${c.r} ${m}`),
  err:     m => console.log(`  ${c.red}✗${c.r} ${m}`),
  head:    m => console.log(`\n${c.b}${c.y}${m}${c.r}`),
};

// ── System checks ──────────────────────────────────────────────
function tryExec(cmd) {
  try { return execSync(cmd, { encoding:"utf8", stdio:["pipe","pipe","pipe"] }).trim().split("\n")[0]; }
  catch { return null; }
}

function checkPrereqs() {
  const nodeVer  = tryExec("node --version");
  const nodeMaj  = nodeVer ? parseInt(nodeVer.replace("v","")) : 0;
  const gitVer   = tryExec("git --version");
  const claudeV  = tryExec("claude --version");
  const ollamaV  = tryExec("ollama --version");
  const ocodeV   = tryExec("opencode --version");
  const isWin    = platform() === "win32";

  // Claude Desktop detection (check known install paths)
  let desktopVer = null;
  if (isWin) {
    const winPath = join(process.env.LOCALAPPDATA||"", "AnthropicClaude", "claude.exe");
    if (existsSync(winPath)) desktopVer = "installed";
  } else {
    const macPath = "/Applications/Claude.app";
    if (existsSync(macPath)) desktopVer = "installed";
  }

  // Check for existing .env values
  const existingEnv = { ANTHROPIC_API_KEY:"", FIGMA_TOKEN:"", FIGMA_FILE_URL:"", OLLAMA_API_KEY:"" };
  const envPaths = [
    join(homedir(), "appforge-agents", ".env"),
    join(process.cwd(), ".env"),
  ];
  for (const p of envPaths) {
    if (existsSync(p)) {
      const lines = readFileSync(p, "utf8").split("\n");
      for (const line of lines) {
        const [k, ...rest] = line.split("=");
        const v = rest.join("=").trim();
        if (k && v && k.trim() in existingEnv) existingEnv[k.trim()] = v;
      }
      break;
    }
  }

  // WSL check (Windows only)
  let wslVer = null;
  if (isWin) wslVer = tryExec("wsl --status");

  return {
    node:          { found: nodeMaj >= 18, version: nodeVer||"not found", detail: nodeMaj >= 18 ? "≥18 ✓" : "upgrade needed" },
    git:           { found: !!gitVer,      version: (gitVer||"not found").replace("git version ",""), detail: "ok" },
    claude:        { found: !!claudeV,     version: claudeV||"not found", detail: "authenticated" },
    wsl:           { found: isWin ? !!wslVer : true, version: isWin ? (wslVer ? "WSL2 available" : "not found") : "native unix", detail: isWin ? "WSL2" : "ok" },
    ollama:        { found: !!ollamaV,     version: ollamaV||null, detail: "ok" },
    opencode:      { found: !!ocodeV,      version: ocodeV||null, detail: "ok" },
    claudeDesktop: { found: !!desktopVer,  version: desktopVer||null, detail: "installed" },
    existingEnv,
    existingProject: existsSync(join(homedir(), "appforge-agents", "CLAUDE.md")),
    platform: platform(),
    username: userInfo().username,
  };
}

// ── File content generators ─────────────────────────────────────
function generateFiles(config) {
  const files = [];
  const installPath = resolve(config.installPath.replace("~", homedir()).replace("%USERPROFILE%", homedir()));
  const add = (relPath, content) => files.push({ path: join(installPath, relPath), content });

  // ── Core ─────────────────────────────────────────────────────
  add(".env", [
    `ANTHROPIC_API_KEY=${config.anthropicKey || ""}`,
    `FIGMA_TOKEN=${config.figmaToken || ""}`,
    `FIGMA_FILE_URL=${config.figmaFileUrl || ""}`,
    `OLLAMA_BASE_URL=https://api.ollama.com/v1`,
    `OLLAMA_API_KEY=${config.ollamaApiKey || ""}`,
    `OLLAMA_MODEL=qwen3.5:cloud`,
    `APPFORGE_VARIANT_COUNT=${config.variantCount || 3}`,
    `APPFORGE_COST_THRESHOLD_USD=${config.costThreshold || "2.00"}`,
    config.projectName ? `APPFORGE_PROJECT_NAME=${config.projectName}` : "",
  ].filter(Boolean).join("\n"));


  add(".gitignore", ["node_modules/",".env","*.key",
    "output/runs/","output/designs/","output/debates/",
    "output/competing-agency/","output/cross-agency/","output/blockers/",".DS_Store",
  ].join("\n"));

  add("package.json", JSON.stringify({
    name: "appforge-design-pipeline",
    version: "1.0.0",
    description: config.projectName || "AppForge AI design pipeline",
    type: "module",
    scripts: { "competing-agency": "node agents/competing-agency/index.js" },
  }, null, 2));

  add(".mcp.json", JSON.stringify({
    mcpServers: {
      figma: { type:"http", url:"https://mcp.figma.com/mcp",
        headers: { Authorization: `Bearer \${FIGMA_TOKEN}` } }
    }
  }, null, 2));

  add(".claude/settings.json", JSON.stringify({
    projectName: config.projectName || "AppForge",
    autoApprove: ["Read","Write","Bash"],
    experimentalFeatures: { agentTeams: true },
  }, null, 2));

  // ── CLAUDE.md ────────────────────────────────────────────────
  add("CLAUDE.md", `# AppForge — Master Agent Instructions
# Inherited by all spawned Claude Code agents

## SYSTEM OVERVIEW
AppForge is a professional app design pipeline. You coordinate a team of agents
that takes a client brief through: Requirements → UX Architecture → Design Variants
(parallel) → Adversarial Debate → Consensus & Refinement →${config.agencyEnabled ? " Qwen3.5 Competing Agency →" : ""}
Cross-Agency Analysis → Figma Delivery → Audit Report.

Project root: the directory containing this CLAUDE.md file.
All output: written to output/ subdirectories (gitignored).
Telemetry: every agent emits stage events to output/runs/[runId]/events.ndjson.

## AGENT ROLES
See agents/ directory for individual agent definitions.
Key agents: Requirements Analyst, UX Architect, Design Variant Generator (×${config.variantCount||3}),
Design Lead, Design Advocate (×N), Design Arbiter, Design Refinement, Cross-Agency Analyst.
${config.agencyEnabled ? "\nCompeting Agency: OpenCode/Qwen3.5 (agents/competing-agency/) — called via bash." : ""}

## DEBATE PROTOCOL
Round 1: Opening statements. Round 2: Cross-examination (2 objections per rival, must
cite specific element + user/business harm). Round 3: Rebuttals (must respond to all
objections — silence = full concession). Round 4: Arbiter verdict and scoring.
Surviving objections → consensus improvement list (top 5 by impact).

## DESIGN CONVENTIONS
- iOS frames: 390×844px. Android: 393×851px. Desktop: 1440×900px.
- Layer naming (BEM): Screen/Section/Component — e.g. Home/Hero/PrimaryButton
- Figma pages: Final Design · Debate Summary · Agency Comparison · Runner-Up · Archive
- Token naming: color/primary, type/body, space/md, radius/sm

## THRESHOLDS
- Variant count: ${config.variantCount || 3} (APPFORGE_VARIANT_COUNT)
- Cost checkpoint: $${config.costThreshold || "2.00"} — pause and notify via Dispatch
- Max improvements per refinement pass: 5 (ranked by Arbiter impact score)
- Max variant respawn attempts: 3
- Max debate rounds: 4

## TELEMETRY
Emit NDJSON events to output/runs/[runId]/events.ndjson on every stage start/complete/blocked.
Event schema: { event, runId, stageId, stageName, timestamp, durationMs, tokens, estimatedCostUSD, status }

## DISPATCH & BLOCKERS
Write blockers to output/blockers/current-blocker.json and emit stage:blocked event.
Poll output/blockers/response.json every 10s for user response (4hr timeout).
Dispatch notification format: emoji prefix + one-line summary + instructions + reply format.
`);

  // ── Slash commands ───────────────────────────────────────────
  const commands = {
    "design-brief": `# /design:brief — Full Pipeline\nRun complete pipeline: Requirements → UX → Variants (${config.variantCount||3} parallel) → Debate → ${config.agencyEnabled?"Qwen Agency → ":""}Synthesis → Figma.\nEstimated time: 25–45 min. Cost: $2–4.\n\nUsage: /design:brief "Your app brief here"`,
    "design-variants": `# /design:variants\nRe-run variant generation only. Uses existing requirements and UX architecture.`,
    "design-debate": `# /design:debate\nRe-run debate stage only. Uses existing variants in output/designs/.`,
    "design-runnerup": `# /design:runnerup\nWrite runner-up design to Figma Runner-Up page and make it visible.`,
    "design-status": `# /design:status\nReport pipeline state, stage completions, running cost, Figma links.\nReads output/runs/ and output/blockers/.`,
    "design-estimate": `# /design:estimate\nEstimate tokens and cost before a full run.\nUsage: /design:estimate 3 (for 3 variants)`,
    "setup-init": `# /setup:init\nRun the 6-agent setup team. Checks prerequisites, collects missing credentials via Dispatch, tests integrations.\nIdempotent — skips completed stages.`,
  };
  for (const [name, content] of Object.entries(commands)) {
    add(`.claude/commands/${name}.md`, content);
  }

  // ── Agent stubs ──────────────────────────────────────────────
  const agents = [
    ["requirements",        "Senior Product Analyst",         "S1 — Input: client brief. Output: output/designs/requirements.json. Extract personas (max 5), user stories, screens, interactions, constraints, platform."],
    ["ux-architect",        "Senior UX Architect",            "S2 — Input: requirements.json. Output: output/designs/ux-architecture.json including design_space (vary/fixed fields for variant generation)."],
    ["design-variant",      "Creative UI Designer (per letter A–E)", "S3 — Input: ux-architecture.json + assigned letter + design space. Output: output/designs/design-[LETTER].json. Must diverge: different nav pattern + color family + layout type from other variants."],
    ["design-lead",         "Design Lead Validator",          "S4 — Input: all design-*.json. Validate minimum differentiation. Reject and respawn if too similar (max 3 attempts). Output: output/designs/variant-validation.json."],
    ["design-advocate",     "Senior Designer (Advocate)",     "S5 — Assigned one design. Defend vigorously. Submit 2 objections per rival (cite specific element + user/business harm). Must rebut or formally concede every objection."],
    ["design-arbiter",      "Neutral Design Director",        "S5 — Neutral observer. Score each design on Viability + Defensibility + Client Fit + Refinement Potential (1–10 each). Output: output/debates/arbiter-verdict-[runId].json."],
    ["design-refinement",   "Senior Designer (Refinement)",   "S6 + S9 — Apply only the listed improvements. Surgical changes only — not a redesign. Max 5 improvements ranked by Arbiter impact score."],
    ["cross-agency-analyst","Senior Design Strategist",       "S8 — Compare winner-refined.json vs competing-agency/redesign.json across 14 dimensions. Adoption criteria: user value + feasibility + brief alignment + design system consistency (all four must pass). Output: comparison-report.json, adoption-list.json, rejection-list.json."],
  ];
  for (const [file, persona, role] of agents) {
    add(`agents/${file}.md`, `---\ndescription: ${persona}\nmode: subagent\n---\n\n# ${persona}\n\n${role}\n\nRefer to CLAUDE.md for complete behavioral rules, thresholds, and output schemas.\n`);
  }

  // ── Skills ───────────────────────────────────────────────────
  add("skills/debate-protocol.md", `# Debate Protocol\n\nFour rounds: Opening → Cross-Examination → Rebuttal → Arbiter Verdict.\n\nValid objection format: "[Design X]'s [specific element] creates [specific user harm or business risk] because [reasoning]."\nInvalid: vague aesthetic criticism without named element and named harm.\n\nSilence on any objection = full concession.\nFormal concession format: "I concede that [element] has [weakness]."\n`);
  add("skills/design-diversity.md", `# Design Diversity Rules\n\nNo two variants may share the same combination of:\n- Navigation pattern (tab bar / drawer / bottom nav / top nav / gestures)\n- Primary color family (warm / cool / neutral / chromatic)\n- Layout type (card grid / list / dashboard / editorial / immersive)\n\nIf any two variants share all three, Design Lead rejects and respawns (max 3 attempts).\n`);
  add("skills/adoption-rubric.md", `# Cross-Agency Adoption Rubric\n\nFor each design element from the Qwen redesign, evaluate all four criteria:\n1. User value: does this change serve users measurably better?\n2. Feasibility: can this be implemented within the existing design system?\n3. Brief alignment: does this align with the original client brief?\n4. Design system consistency: does this work with existing tokens and components?\n\nAll four must be positive to adopt. Document rationale for every adoption AND rejection.\n`);
  add("skills/figma-write.md", `# Figma Write Skills\n\nUse the Figma MCP remote server (mcp.figma.com/mcp) to write frames and tokens.\n\nPage structure (write in this order):\n1. Final Design — full fidelity with Variables, auto-layout, named components\n2. Debate Summary — annotated objections and improvements\n3. Agency Comparison — Claude winner vs Qwen redesign side-by-side${config.agencyEnabled ? " (with adoption rationale annotations)" : ""}\n4. Runner-Up — hidden by default\n5. Archive — prior run snapshots\n\nLayer naming: Screen/Section/Component (BEM-style)\nAlways retry once on Figma API failure before marking stage as blocked.\n`);

  // ── Lib ──────────────────────────────────────────────────────
  add("lib/telemetry.js", `// AppForge Telemetry — emits events to output/runs/[runId]/events.ndjson
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export function emit(event) {
  const runId = process.env.APPFORGE_RUN_ID || new Date().toISOString().slice(0,10) + '-run';
  const dir = \`output/runs/\${runId}\`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const entry = JSON.stringify({ ...event, runId, timestamp: new Date().toISOString() });
  appendFileSync(join(dir, 'events.ndjson'), entry + '\\n');
}

export const stage = {
  start:    (id, name, meta = {}) => emit({ event:'stage:start', stageId:id, stageName:name, ...meta }),
  complete: (id, name, tokens, costUSD, meta = {}) => emit({ event:'stage:complete', stageId:id, stageName:name, tokens, estimatedCostUSD:costUSD, status:'success', ...meta }),
  blocked:  (id, blockerType, message) => emit({ event:'stage:blocked', stageId:id, blockerType, dispatchMessage:message }),
};

export const pipeline = {
  start:    (runId, variantCount, brief) => emit({ event:'pipeline:start', runId, variantCount, brief:brief?.slice(0,200) }),
  complete: (winner, totalCost, durationMs, figmaLinks) => emit({ event:'pipeline:complete', winner, totalCostUSD:totalCost, durationMs, figmaLinks }),
};
`);

  add("lib/report-generator.js", `// AppForge Report Generator — reads events.ndjson → manifest.json
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';

const runsDir = 'output/runs';
if (!existsSync(runsDir)) { console.log('No runs found.'); process.exit(0); }
const runs = readdirSync(runsDir).sort().reverse();
if (!runs.length) { console.log('No runs found.'); process.exit(0); }

const latest = runs[0];
const eventsPath = \`\${runsDir}/\${latest}/events.ndjson\`;
if (!existsSync(eventsPath)) { console.log('No events found for', latest); process.exit(0); }

const events = readFileSync(eventsPath, 'utf8').trim().split('\\n').filter(Boolean).map(l => JSON.parse(l));
const stageEvents = events.filter(e => e.event === 'stage:complete');

const manifest = {
  runId: latest,
  startTime: events[0]?.timestamp,
  endTime: events[events.length-1]?.timestamp,
  status: events.some(e => e.event === 'pipeline:complete') ? 'complete' : 'partial',
  stages: stageEvents.map(e => ({ stageId:e.stageId, stageName:e.stageName, durationMs:e.durationMs, tokens:e.tokens, costUSD:e.estimatedCostUSD })),
  totals: {
    claudeInputTok:  stageEvents.reduce((a,e) => a + (e.tokens?.input  || 0), 0),
    claudeOutputTok: stageEvents.reduce((a,e) => a + (e.tokens?.output || 0), 0),
    totalCostUSD:    stageEvents.reduce((a,e) => a + (e.estimatedCostUSD || 0), 0),
  },
  winner:    events.find(e => e.event === 'pipeline:complete')?.winner    || null,
  figmaLinks: events.find(e => e.event === 'pipeline:complete')?.figmaLinks || null,
};
writeFileSync(\`\${runsDir}/\${latest}/manifest.json\`, JSON.stringify(manifest, null, 2));
console.log('Report written:', \`\${runsDir}/\${latest}/manifest.json\`);
console.log('Total cost: $' + manifest.totals.totalCostUSD.toFixed(3));
`);

  // ── Docs ─────────────────────────────────────────────────────
  add("docs/brief-template.md", `# AppForge Client Brief Template

## App Overview
- App type: (fitness / e-commerce / productivity / social / etc.)
- Platform: (iOS / Android / Web / Cross-platform)
- Core purpose: (one sentence)

## Audience
- Primary users: (age, occupation, tech comfort)
- Key problem solved:

## Key Screens (4–8)
1.
2.
3.
4.

## Design Direction
- Feel: (minimal / bold / playful / professional / premium)
- Reference apps: (apps you admire)
- Avoid:
- Brand colors: (if any)

## Run Settings
- Variants: ${config.variantCount || 3} (default from your config)
`);

  // ── Competing agency ─────────────────────────────────────────
  if (config.agencyEnabled) {
    add("agents/competing-agency/system-prompt.md", `You are the lead design team at a world-class competing agency.
You have received a competitor's finished app design JSON. You are seeing it cold —
no knowledge of their brief, process, debate, or internal reasoning.

Your job:
1. Critique this design with fresh, professional eyes — cite specific UI elements and specific user harms
2. Produce a complete alternative redesign that addresses those weaknesses
3. Your redesign must differ in: nav pattern, visual identity, and layout approach

Output ONLY valid JSON:
{
  "agencyCritique": {
    "summary": "string",
    "weaknesses": [{ "element": "string", "issue": "string", "impact": "high|medium|low" }],
    "missedOpportunities": ["string"]
  },
  "redesign": { /* same schema as input design */ },
  "designPhilosophy": "string"
}
`);

    add("agents/competing-agency/index.js", `// AppForge — Qwen3.5 Competing Agency Bridge
import { readFileSync, writeFileSync } from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';
config({ path: '../../.env' });

const client = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'https://api.ollama.com/v1',
  apiKey:  process.env.OLLAMA_API_KEY  || 'ollama',
});
const MODEL   = process.env.OLLAMA_MODEL || 'qwen3.5:cloud';

const winner = JSON.parse(readFileSync('../../output/designs/winner-refined.json', 'utf8'));
const sysPrompt = readFileSync('./system-prompt.md', 'utf8');

console.log('Calling Qwen3.5 competing agency...');

const response = await client.chat.completions.create({
  model: MODEL,
  messages: [
    { role: 'system',  content: sysPrompt },
    { role: 'user',    content: \`/think\\n\\nReview this competitor design and produce your superior alternative:\\n\${JSON.stringify(winner, null, 2)}\\n\\nRespond with ONLY valid JSON.\` },
  ],
  temperature: 0.7,
});

const raw   = response.choices[0].message.content;
const clean = raw.replace(/<think>[\\s\\S]*?<\\/think>/g, '').trim();

let result;
try {
  result = JSON.parse(clean);
} catch {
  console.log('JSON parse failed — retrying with schema correction...');
  const retry = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user',   content: 'Your previous response was not valid JSON. Return ONLY a JSON object with keys: agencyCritique and redesign. No markdown, no explanation.' },
    ],
  });
  result = JSON.parse(retry.choices[0].message.content.replace(/<think>[\\s\\S]*?<\\/think>/g,'').trim());
}

writeFileSync('../../output/competing-agency/redesign.json', JSON.stringify(result.redesign || result, null, 2));
writeFileSync('../../output/competing-agency/critique.json', JSON.stringify(result.agencyCritique || {}, null, 2));

console.log('✓ Competing agency complete.');
console.log('  Weaknesses found:', result.agencyCritique?.weaknesses?.length || 0);
`);

    add("agents/competing-agency/.opencode/opencode.json", JSON.stringify({
      "$schema": "https://opencode.ai/config.json",
      provider: {
        ollama: {
          npm: "@ai-sdk/openai-compatible",
          name: "Ollama",
          options: { baseURL: "https://api.ollama.com/v1" },
          models: { "qwen3.5:cloud": { name: "qwen3.5:cloud" } },
        }
      },
      agent: {
        orchestrator: {
          mode: "primary", model: "ollama/qwen3.5:cloud", temperature: 0.7,
          permission: { task: { "creative-director":"allow", "lead-designer":"allow" } },
        },
        "creative-director": { mode:"subagent", model:"ollama/qwen3.5:cloud", temperature: 0.6, description:"Cold-reads competitor design and identifies weaknesses" },
        "lead-designer":     { mode:"subagent", model:"ollama/qwen3.5:cloud", temperature: 0.8, description:"Produces competing redesign from Creative Director critique" },
      },
    }, null, 2));
  }



  return { files, installPath };
}

// ── Write files to disk ─────────────────────────────────────────
function writeFiles(files) {
  const dirs = new Set(files.map(f => f.path.split(/[/\\]/).slice(0,-1).join("/")));
  dirs.forEach(d => { if (d) mkdirSync(d, { recursive:true }); });
  files.forEach(f => writeFileSync(f.path, f.content, "utf8"));
}

// ── HTML shell ──────────────────────────────────────────────────
function buildHTML() {
  const wizardPath = join(__dirname, "wizard.jsx");
  const wizardCode = existsSync(wizardPath) ? readFileSync(wizardPath, "utf8") : "// wizard.jsx not found";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AppForge Setup</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#FAFAF8}</style>
</head>
<body>
  <div id="root"></div>
  <script>window.__APPFORGE_API__ = true;</script>
  <script type="text/babel" data-presets="react">
${wizardCode
    .replace(/^import\s.*$/gm, "")
    .replace(/^export\s+default\s+/gm, "")
    .replace(/^export\s+/gm, "")}

// Replace React imports for browser UMD
const { useState, useEffect, useRef, useCallback } = React;

// Replace MOCK with real API call
async function fetchPrereqs() {
  try {
    const r = await fetch('/api/check-prereqs');
    return await r.json();
  } catch { return null; }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(AppForgeWizard, { apiMode: true, fetchPrereqs })
);
  </script>
</body>
</html>`;
}

// ── HTTP Server ─────────────────────────────────────────────────
function startServer() {
  const server = createServer(async (req, res) => {
    const url    = new URL(req.url, `http://${HOST}:${PORT}`);
    const setCT  = t => res.writeHead(200, { "Content-Type": t });

    // ── /api/check-prereqs ──────────────────────────────────────
    if (req.method === "GET" && url.pathname === "/api/check-prereqs") {
      setCT("application/json");
      res.end(JSON.stringify(checkPrereqs()));
      return;
    }

    // ── /api/install (streaming NDJSON) ─────────────────────────
    if (req.method === "POST" && url.pathname === "/api/install") {
      let body = "";
      req.on("data", d => body += d);
      req.on("end", async () => {
        res.writeHead(200, {
          "Content-Type":  "application/x-ndjson",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        });
        try {
          const config = JSON.parse(body);
          const { files, installPath } = generateFiles(config);

          res.write(JSON.stringify({ type:"start", total:files.length, installPath }) + "\n");

          // Create dirs first
          const dirs = new Set(files.map(f => f.path.split(/[/\\]/).slice(0,-1).join("/")));
          dirs.forEach(d => { if (d) mkdirSync(d, { recursive:true }); });

          // Write files one by one with a tiny delay for UI feedback
          for (const f of files) {
            writeFileSync(f.path, f.content, "utf8");
            const relPath = f.path.replace(installPath + "/", "").replace(installPath + "\\", "");
            res.write(JSON.stringify({ type:"file", path:relPath }) + "\n");
            await new Promise(r => setTimeout(r, 35));
          }

          // npm install
          res.write(JSON.stringify({ type:"log", msg:"→ Running npm install openai dotenv..." }) + "\n");
          try {
            execSync("npm install openai dotenv --save --silent", { cwd: installPath, stdio:"pipe" });
            res.write(JSON.stringify({ type:"log", msg:"✓ Dependencies installed" }) + "\n");
          } catch (e) {
            res.write(JSON.stringify({ type:"log", msg:`! npm install failed: ${e.message}` }) + "\n");
          }

          res.write(JSON.stringify({ type:"complete", installPath }) + "\n");
          res.end();
        } catch (err) {
          res.write(JSON.stringify({ type:"error", message: err.message }) + "\n");
          res.end();
        }
      });
      return;
    }

    // ── Serve wizard.jsx ────────────────────────────────────────
    if (url.pathname === "/wizard.jsx") {
      const wizPath = join(__dirname, "wizard.jsx");
      if (existsSync(wizPath)) {
        setCT("text/javascript");
        res.end(readFileSync(wizPath, "utf8"));
      } else {
        res.writeHead(404); res.end("wizard.jsx not found in package");
      }
      return;
    }

    // ── Root → serve wizard HTML ────────────────────────────────
    setCT("text/html; charset=utf-8");
    res.end(buildHTML());
  });

  server.listen(PORT, HOST, () => {
    const url = `http://${HOST}:${PORT}`;
    log.head("AppForge Setup Wizard");
    log.ok(`Wizard running at ${url}`);
    log.info("Opening your browser...\n");
    log.info(`${c.d}Close this window when setup is complete.${c.r}\n`);

    const openCmd = platform() === "darwin" ? "open"
                  : platform() === "win32"  ? "start"
                  : "xdg-open";
    exec(`${openCmd} ${url}`, () => {});
  });

  process.on("SIGINT", () => { server.close(); console.log("\n"); log.info("Setup wizard closed."); process.exit(0); });
  process.on("SIGTERM", () => { server.close(); process.exit(0); });
}

// ── Entry ───────────────────────────────────────────────────────
console.clear();
console.log(`\n  ${c.b}${c.y}APP${c.r}${c.b}FORGE${c.r}  ${c.d}Setup Wizard v1.0.0${c.r}\n`);
startServer();
