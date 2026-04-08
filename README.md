# AppForge

> Your AI design agency. Set up in 10 minutes.

AppForge is a multi-agent AI design pipeline that takes a plain-language brief and delivers professionally debated, Figma-ready app designs — running unattended while you work.

## Quick Start

```bash
npx create-appforge
```

That's it. A browser window opens with the setup wizard. Follow the steps.

## What You'll Need

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Claude Code (`npm install -g @anthropic-ai/claude-code`)
- An Anthropic account ([anthropic.com](https://anthropic.com))
- A Figma account ([figma.com](https://figma.com))
- An Ollama cloud API key ([ollama.com](https://ollama.com))

## What Gets Installed

AppForge installs to a single folder on your machine (default: `~/appforge-agents`).

**It never modifies:**
- Your global Claude Code settings (`~/.claude/`)
- Other Claude Code projects
- Any system files or global configs

**It only writes to:**
- The install folder you choose during setup

## Running a Design

After setup, open a terminal and start Claude Code:

```bash
cd ~/appforge-agents && claude
```

Then run a design:

```
/design:brief "A fitness tracking app for busy professionals. iOS-first, premium feel, fast workout logging."
```

Or trigger from your phone via Claude Dispatch:

> "Design an app for [your brief]"

## What Happens

1. Requirements & UX architecture extracted from your brief
2. 2–5 design variants generated in parallel
3. Each variant defended in a 4-round adversarial debate
4. Winning design refined with surviving critique
5. Independent Qwen3.5 AI reviews and challenges the winner
6. Best ideas adopted, everything else documented
7. Final design written to Figma with 4 professional pages

## Cost

Typically **$2–3 per full pipeline run** (Claude API only). Qwen3.5 via Ollama cloud is billed separately at Ollama rates.

## Removing AppForge

Delete the install folder. That's all AppForge wrote to.

```bash
rm -rf ~/appforge-agents
```

---

Built with Claude Code · Figma MCP · OpenCode · Qwen3.5
