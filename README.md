# Your Architect

AI architecture assistant for students: brief to a defensible design.

- `ARCHITECT_WORKFLOW.md`: core design workflow the agent follows
- `PLATFORM_PLAN.md`: backend and UI plan
- `arch-studio.zip`: the Arch Studio workflow pack (stages, standards, scripts) the UI follows
- `ui/`: front-end (plain HTML/CSS/JS). Everything it shows is real; there is no sample data
- `server.py`: local server for the UI; stores each project in `projects/<id>/`
- `brief_engine.py` + `prompts/brief_reader.md`: reads the uploaded brief with Claude and builds the deliverables checklist
- `research_engine.py`: research and references (stage S1), run with Claude and real web sources
- `report.py`: writes the fact sheet, checklist and the "Brief summary and checklist" PDF

## How it runs

The app is a small Python server on your machine, and the UI is a web page it serves at http://localhost:5173. It doesn't run inside the Claude Code desktop app or the CLI chat. Each time the app needs Claude, the server starts the Claude Code CLI (`claude -p`) in the background as a headless job, logged in as you, and reads its results. So:

- the Claude Code CLI must be installed and logged in (`claude` on PATH);
- the usage counts toward your own Claude plan;
- you can start the server from any terminal, including the terminal in the Claude Code desktop app.

## Run it

```bash
python server.py
```

Then open http://localhost:5173.

1. Drop your brief (PDF, images, Word, notes) on the home screen, pick Studio, Thesis or Competition, and press send.
2. Claude reads every file (about 1–5 minutes). You get the brief digest: facts, assumptions, gaps, and numbers that don't add up.
3. Answer two short rounds of questions. Round 1 sets the route (purpose, detail, scope, presenter). Round 2 covers the site, your ideas, your own style references (one upload slot per drawing type) and key numbers. This saves `Brief summary and checklist.pdf`.
4. Press **Start research**. Nothing runs on its own, and only one project researches at a time: leaving the project asks whether to keep it running in the background or stop it. The jobs run in parallel (about 10–20 minutes). The chat shows a short summary. The research notes go into `outputs/Research.pdf`; the references are shown in the chat:
   - five research notes: site and context, climate, rules and envelope, space standards, precedents. Every point links to a source Claude actually opened; anything not found is listed as a gap, never guessed;
   - real references for each drawing type you left empty: area programme tables, bubble diagrams, zoning diagrams, plans, sections, elevations and sheet layouts. Claude finds published drawings (ArchDaily, Dezeen, student portfolios, award sheets, Pinterest…), the server downloads them, and a second Claude pass looks at each image and keeps the best 6. Each keeps its source link and credit.
5. Pick the foundation style from those real references in the chat, plus an accent colour. Once locked, the chat keeps a small thumbnail of each pick, so you can scroll back and see what you chose.
6. The next stage (the foundation) isn't connected yet. The project stops there and says so, rather than showing made-up content.

Files go where the workflow pack expects them:

| What | Folder |
|---|---|
| Your references | `projects/<id>/03_references/user/<type>/` |
| Site images | `projects/<id>/01_brief/site_images/` |
| Research notes | `projects/<id>/02_research/<topic>.md` (data in `02_research/data/`) |
| References found | `projects/<id>/03_references/<type>/`, with `found.json`, `sources.csv` and `INDEX.md` |
| Your answers, picks and gates | `projects/<id>/state.json` |

The references are for study only and are never placed on your sheets.

To delete a project and all its files, use the **⋯** menu on its card, on its name in the sidebar, or in the project's top bar. It is refused while Claude is reading that brief or researching it.

## Requirements

- Python 3.10+ (standard library only).
- Claude Code CLI installed and logged in (`claude` on PATH).
- Chrome or Edge, used to print the PDF. Without either, the summary is saved as HTML instead.

## Settings (environment variables)

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `5173` | Server port |
| `YA_MODEL` | `opus` | Model used to read the brief |
| `YA_EFFORT` | `high` | Effort for reading the brief (`low` … `max`) |
| `YA_RESEARCH_MODEL` | `sonnet` | Model for research and reference jobs |
| `YA_RESEARCH_EFFORT` | `medium` | Effort for research and reference jobs |
| `YA_RESEARCH_PARALLEL` | `4` | How many research jobs run at once |

This setup is for your own use on your own machine. To serve other students, move the Claude jobs to an Anthropic API key, as described in `PLATFORM_PLAN.md`.
