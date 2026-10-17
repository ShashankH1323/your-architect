# Your Architect — Platform plan (backend + UI direction)

This is a draft for discussion. Nothing in it is built yet. It sits on top of `ARCHITECT_WORKFLOW.md`.

---

## 1. One important correction first: don't serve students through your personal Claude Code login

**What you proposed:** run your own Claude Code (Pro/Max subscription) on a machine, then let 50–100 students drive it through a website over SSH.

**Why not:**
- Consumer subscriptions are for the subscriber's personal use. Sharing or reselling access to other people breaks those terms, and the account can be suspended.
- One subscription also has one usage limit. You already hit it alone. With 50 students it would be exhausted within minutes.

**What to do instead (same idea, legitimate):**
- Use the **Claude Agent SDK**. It is the same agent loop that powers Claude Code, run on your own server.
- Authenticate with an **Anthropic API key** (Claude Console, pay-as-you-go, commercial terms).
- Everything you liked (subagents, file tools, skills, `CLAUDE.md`-style instructions, Blender MCP) still works.
- You are billed per token, so you can price or limit per student.

> Check the current Anthropic Consumer and Commercial Terms yourself before launch. That is the authoritative source, not this note.

---

## 2. Architecture (good for 50–100 students on modest infrastructure)

```
Browser (Next.js app)
   │  HTTPS + WebSocket/SSE for live progress
   ▼
API server (FastAPI or Node)
   - auth, projects, uploads, gate answers, billing/quota
   │
   ├── Postgres ......... users, projects, phases, gates, decisions, usage
   ├── Object storage ... uploads + outputs (Cloudflare R2 / S3)
   └── Job queue (Redis + BullMQ or Celery)
           │
           ▼
   Worker pool (N containers, e.g. 6–10 concurrent)
     each job = one Agent SDK run for one project phase:
       - mounts /projects/<id>/ workspace
       - loads ARCHITECT_WORKFLOW.md as system instructions
       - Python toolchain: ezdxf, matplotlib, PyMuPDF, playwright (HTML→PDF)
       - streams progress events back to API → browser
   Render worker (optional, separate): headless Blender for 3D/renders
```

### Key design decisions

| Decision | Why |
|---|---|
| **One job = one phase, ending at a gate** | The agent works until the next gate, saves, and stops, so no process sits waiting for a student who replies tomorrow. When the student answers, a new job resumes from the files on disk. This matches the save-as-you-go lesson. |
| **Per-project sandbox container** | Students' files never mix, a runaway job can't hurt others, and the agent's file and shell tools are confined. |
| **Queue with a concurrency cap** | 100 students won't all run at once. Even 10% active means 10 jobs. Extra jobs wait in the queue with a visible position. |
| **Model routing** | Opus for the Orchestrator and design-lead steps (P3 questions, P7 forms, conflict rulings), Sonnet or Haiku for research, drafting and checks. This is the biggest cost lever. |
| **Per-student budget** | Each tier has a token budget. Warn at 80% and pause at 100%. This is the same "save at 99%" rule, but enforced by the server. |
| **Gate cards as data** | Each gate the agent reaches writes `gate.json` with the question, options and images. The UI renders it, and the answer goes back to the agent as structured input, so there is no free-text guessing. |
| **Prompt caching** | The workflow file and project context are identical across calls, so caching them cuts cost substantially. |

### Hardware sizing (rough)
- The thinking happens at Anthropic. Your server mostly runs Python drawing scripts.
- One VPS with **8 vCPU / 32 GB** (Hetzner, DigitalOcean or similar, about $40–80 a month) handles about 8 concurrent agent jobs comfortably.
- Blender renders are the exception: they are CPU/GPU heavy. Keep them on a separate render queue, or a GPU box, or start with Eevee or low-sample renders.
- Don't host on your home PC over SSH. Uptime, a public IP and security all become your problem.

### Cost thinking (to verify with real runs)
- Your own AD-6 project was very large: many agents and multiple restarts. A disciplined Tier-2 run following this workflow should be much smaller.
- Measure 3–5 pilot projects per tier to get the real dollars per project before you set any prices or quotas. Don't trust any estimate (including mine) until you have.

### Suggested stack
- **Frontend:** Next.js + Tailwind + shadcn/ui.
- **Auth:** Clerk or Supabase Auth.
- **Database:** Postgres (Supabase or Neon).
- **Storage:** Cloudflare R2.
- **Queue:** Redis (Upstash) + BullMQ.
- **Workers:** Docker containers on the VPS running the Python Agent SDK.
- **Deploy:** Vercel for the frontend, VPS for API and workers.

---

## 3. UI direction (matte black, minimal, clean)

### Core screens
1. **Projects**: grid of project cards with phase progress rings.
2. **New project**: drop zone for the brief, site, references and college format, plus a short form (stage, deadline).
3. **Project workspace**: three panes.
   - Left: a **phase rail** (P0 to P12) with gate states: done, waiting for you, running, locked.
   - Centre: the current **gate card** with options as image cards and a recommendation tag, or a live progress feed.
   - Right: a **preview panel** for PDF, image and 3D viewing, with a version switcher.
4. **Library**: all outputs grouped by type (diagrams, DXF, PDFs, renders), with download.
5. **Defence pack**: private explainer, jury Q&A and flashcards.
6. **Account**: tier, budget used and history.

### Visual language
- Background around #0B0B0C, surfaces around #141416, hairline borders around #232326, text off-white #EDEDED, muted text #8A8A8F.
- One accent colour only, echoing the drawing style (e.g. warm orange or a cool white).
- Font: **Inter** or **Geist** (sans), one family only. No novelty fonts.
- Content-first: the student's drawings are the colour. The UI is neutral.

### Reference sites to look at
Look at each for the specific thing noted:

| Site | Look at |
|---|---|
| https://linear.app | Matte-dark polish, sidebar navigation, subtle borders, typography: the closest to "matte black finish" |
| https://vercel.com/dashboard (and vercel.com) | Minimal black/white dashboard, project cards, deployment progress feed (similar to our phase progress) |
| https://raycast.com | Premium dark surfaces, crisp type, glassy cards |
| https://www.perplexity.ai | Upload/ask flow, sources panel (like our research and reference panel) |
| https://claude.ai | Chat + artifact side panel (like our gate card + preview pane) |
| https://v0.dev | Prompt → generated result with preview, version switching |
| https://www.figma.com | Canvas + layers panel ideas for the preview pane |
| https://mobbin.com | Search real app screens ("onboarding", "file upload", "stepper") for patterns |
| https://godly.website and https://land-book.com | Curated modern sites for landing-page and visual inspiration |
| https://ui.shadcn.com | The component kit itself: dark theme, matches the suggested stack |

---

## 4. Suggested build order
1. Run the workflow manually in Claude Code on 2 new briefs (not AD-6) to test it, then fix `ARCHITECT_WORKFLOW.md`.
2. Agent SDK worker running one project end to end from the command line, with gates written as `gate.json`.
3. API, queue and storage. No UI polish yet.
4. UI: projects, workspace (phase rail, gate card, preview), library.
5. Budgets, auth, pilot with 5–10 classmates, measure cost, then open to 50–100.
