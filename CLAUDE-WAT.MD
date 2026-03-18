# Agent Instructions — Ylopo Website

You're working inside the **WAT framework** (Workflows, Agents, Tools) on the **Ylopo website project**. This is a front-end website build. Your job is to design, build, and iterate on web pages using the brand system and tooling already in place.

---

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and edge cases
- Written in plain language, the same way you'd brief a teammate

**Layer 2: Agents (The Decision-Maker — You)**
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully
- Ask clarifying questions when inputs are ambiguous
- Do not improvise around a failing tool — fix it, document it, move on

**Layer 3: Tools (The Execution)**
- Node.js scripts in the project root that do the actual work
- `serve.mjs` — starts the local dev server
- `screenshot.mjs` — takes Puppeteer screenshots for visual QA
- New tools go in `tools/` as the project grows

---

## Project Context

**What this project is:** Public-facing website pages for Ylopo, a real estate digital marketing platform.

**Deliverables live here:** All output is HTML files in the project root or in `pages/`. Nothing gets "sent" anywhere — the final file IS the deliverable.

**Brand system is locked in:** All design work must follow the style guide. Do not invent colors, fonts, or component patterns.

---

## Brand Reference (Always Check First)

| Asset | Location | Notes |
|---|---|---|
| Logo | `ylopo-logo-2021.png` | Use as-is. Never recolor, stretch, or rotate. |
| Style Guide PDF | `Style Guide.pdf` | Original source of truth |
| Interactive Style Guide | `style-guide.html` | Full HTML reference — colors, type, components |
| Brand colors | See style-guide.html §01 | Primary: #7BC109, Navy: #172F44 |
| Fonts | Raleway (headings) + Nunito (body) | Google Fonts CDN |

---

## How to Operate

**1. Check for an existing workflow first**
Before starting any task, look in `workflows/`. If a relevant SOP exists, follow it. Only build a new workflow when nothing covers the task — and ask before creating one.

**2. Always serve before screenshotting**
The local server runs on **port 3001** (port 3000 may be in use by other projects).
```
# Check if server is running
lsof -ti:3001

# Start if not running (background)
cd /Users/kiwi/Desktop/Cowork/Ylopo\ Website && python3 -m http.server 3001 &
```
Never screenshot a `file:///` URL. Always screenshot from `http://localhost:3001/`.

**3. Screenshot workflow**
```
node screenshot.mjs http://localhost:3001/filename.html label
# Saves to: temporary screenshots/screenshot-N-label.png
```
- After every build, take a screenshot and read it with the Read tool
- Do at least 2 comparison rounds before declaring done
- Be specific in comparisons: exact px, colors, spacing

**4. Learn and adapt when things fail**
- Read the full error trace before doing anything
- Fix the script, retest, document the fix in the relevant workflow
- If a fix requires paid API calls or external credits, ask first

**5. Keep workflows current**
- Update `workflows/` when you discover better methods, constraints, or recurring issues
- Do not create or overwrite a workflow without asking

---

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the tool or workflow
3. Verify the fix works
4. Update the workflow
5. Move on with a more robust system

---

## File Structure

```
project root
├── CLAUDE.md               # Claude Code project rules (do not edit without asking)
├── CLAUDE-WAT.MD           # This file — agent operating instructions
├── style-guide.html        # Completed deliverable — Ylopo brand style guide
├── index.html              # Homepage (to be built)
├── pages/                  # Additional pages as the project grows
├── workflows/              # Markdown SOPs — one file per task type
├── tools/                  # Node/Python scripts for reusable execution tasks
├── temporary screenshots/  # Puppeteer output — all screenshots land here
├── serve.mjs               # Local dev server (port 3001)
├── screenshot.mjs          # Puppeteer screenshot utility
├── ylopo-logo-2021.png     # Brand logo
├── Style Guide.pdf         # Original brand style guide PDF
├── package.json            # Node dependencies (puppeteer installed)
└── .env                    # API keys (never commit, never hardcode elsewhere)
```

**Temps and intermediates:** Anything in `temporary screenshots/` is disposable and regeneratable.
**Secrets:** `.env` only. Never in code, never in workflows, never in comments.

---

## Hard Rules for This Project

- Always use Ylopo brand colors — never default Tailwind blue/indigo
- Always use Raleway for headings and Nunito for body copy
- Always serve on localhost before screenshotting
- Never skip the screenshot comparison step
- Never commit `.env` or `credentials.json`
- Do not modify `style-guide.html` unless explicitly asked — it is a completed deliverable

---

## Bottom Line

You sit between what I want (workflows) and what actually gets done (tools). Read the workflow, make smart decisions, call the right tools, recover from errors, and keep improving the system as you go.

Stay pragmatic. Stay on-brand. Keep the loop running.
