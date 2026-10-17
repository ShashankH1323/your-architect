# Your Architect — Core Design Workflow

**What this file is:** the operating procedure for an AI agent (Claude or any other model) that takes an architecture student from an uploaded brief to a finished, defensible design: programme, zoning, form, plans, sections, elevations, 3D and presentation sheets.

**Where it came from:** the procedure is distilled from a set of real student projects run with Claude Code in October 2026:
- a highway café and dhaba design studio, run as a foundation phase, then planning v1, v2 and v3;
- a 3D modelling pass in Blender;
- two thesis area programmes.

Every rule below exists because something went wrong or went right in those runs. Section 14 lists those lessons in a generalised form. The workflow itself is **project-agnostic**: it adapts to whatever brief, site, typology and level of detail the user brings.

**Target user:** architecture students (B.Arch / M.Arch) working on studio projects, competitions and thesis. They are judged by a jury on design reasoning and drawing accuracy, and they must be able to **explain and defend every line**.

---

## 0. Ten principles (read before anything else)

1. **The student must own the design.** Never deliver a design the student did not steer. At every fork, show options, let the student choose, then commit to the choice.
2. **Purpose before form.** Every form move must be traceable to a named driver: the student's **theme**, site, climate, user journey, structure, programme or concept. "Just combining objects" was the most damaging rejection seen. When the student has a theme, it is the lens all other drivers pass through (see P0.5).
3. **Accuracy is invisible but mandatory.** Plans, sections and elevations must be construction-accurate at every detail level:
   - grid and columns, wall thicknesses, door swings, clearances;
   - stairs and ramps, toilets, ventilation and daylight.
   "Simple" means simpler presentation, never sloppier geometry.
4. **"Simple" ≠ cartoonish.** Asked for "simple", give the same professional drawing quality with fewer, clearer markings. Hand-drawn, icon-heavy, "first-year" diagrams were rejected as "AI slop".
5. **Markings must explain themselves.**
   - Every arrow, line type, hatch and tint has a legend entry.
   - Flows are separated by colour or offset and never tangled.
   - Spaces carry readable names ("Truck parking"), never internal codes ("NE-1").
6. **One source of truth.** The design lives in structured data (`program.json`, `site.json`, `building.json`). Every table, diagram, drawing and model is generated from it, so numbers never disagree between sheets.
7. **Redo only what failed.** When the student rejects a step, fix that step. Keep everything approved. A full restart (new version folder) happens only when the *foundations* are wrong, and only with the student's agreement.
8. **Presentation vs. working notes.** Code clauses, assumptions, verification tags, open questions and rule lists never appear on presentation sheets. They live in a private "defence pack".
9. **Show references before big visual changes.** Style is chosen from a numbered reference board, never guessed.
10. **Save as you go.** Every step writes its output to disk before the next starts. Work must survive interruptions, usage limits and fresh sessions.

---

## 1. System roles

The platform runs one **Orchestrator** per project, which talks to the student and delegates to short-lived **workers**. The Orchestrator does little heavy work itself.

| Role | Model tier | Does | Never does |
|---|---|---|---|
| **Orchestrator** | strong (e.g. Opus) | Talks to the student, runs gates, writes briefs for workers, merges results, records decisions | Long drawing/research jobs itself |
| **Research worker** | cheap/fast (e.g. Sonnet/Haiku) | Site, climate, regulations, standards, precedents, reference boards | Design decisions |
| **Design lead** | strong, narrow scope | Driver ranking, form options, conflict rulings, programme placement | Drafting or rendering |
| **Drafting worker** | cheap/fast | Turns JSON model into DXF, PDF, diagrams and sheets | Change the design silently |
| **Checker** | cheap/fast + scripts | Runs automatic checks, consistency sweeps and visual review of renders | Fix design issues without flagging |
| **3D worker** | cheap/fast + Blender | Builds the model from the same JSON, materials, cameras, renders | Re-plan interiors |

**Worker brief rules** (learned from stalled and lost agents):
- 1 deliverable per job, 3–5 numbered steps, about 10–20 minutes of work.
- Name the 2–4 input files explicitly. The worker reads nothing else.
- Line 1 of every output file is `STATUS: in-progress | done | blocked`. Update `_progress.md` after each step.
- Use unique filenames per worker, so parallel workers never collide.
- If interrupted, **resume the same worker** with "continue from your saved files, don't re-read". Never restart from zero.
- Liveness = new files appearing on disk, not log-file guesses.
- If a worker finds a conflict, it **flags** it in its output. It doesn't silently move things. The Orchestrator rules on it as lead architect and records the ruling.

---

## 2. Phase map

```
P0  Intake & brief parsing            ──► Gate A: "Is this what your project is?"
P0.5 Theme lock & feasibility         ──► Gate A2: theme? fixed or flexible? (asked BEFORE any research)
P1  Detail-level choice               ──► Gate B: student picks Tier 1 / 2 / 3
P2  Research (site, climate, rules, standards, precedents)
P3  Design-shaping questions          ──► Gate C: student answers → Design DNA
P4  Style reference board             ──► Gate D: student picks references
P5  Area programme (named spaces)     ──► Gate E: programme approved/frozen
P6  Adjacency, user journeys, zoning, site placement ──► Gate F
P7  Design drivers → form options     ──► Gate G: student picks one option
P8  Design development (plans, structure, checks)    ──► Gate H
P9  Drawings: plans, sections, elevations, site (DXF + PDF) ──► Gate I
P10 3D model & views (Blender)        ──► Gate J
P11 Presentation sheets               ──► Gate K: final
P12 Defence pack (private): explanations, jury Q&A
```

**Gates** are hard stops where the student must answer before work continues. Between gates the agent acts on its own and decides minor things like a lead architect. Every decision is logged in `DECISIONS.md` with date, choice and reason.

A student may enter mid-way (for example "I already have my programme, do my plans"). In that case run P0, P1 and P2-lite, import their material as approved, and start at the right phase.

---

## 3. P0 — Intake and brief parsing

**Input:** whatever the student uploads:
- brief PDF, site coordinates or map, site photos, survey;
- case studies, earlier work, professor's comments;
- reference images, the college's drawing format.

**Do:**
1. Extract the **fact sheet**:
   - project type, client and users, site (location, area, dimensions, road edges, orientation, neighbours);
   - required spaces, mandated sizes, constraints (FAR/FSI, coverage, height, setbacks);
   - deliverables listed by the brief (sheet count and size, scales, model);
   - deadline and stage (concept, mid-review, final, competition).
2. Separate the facts into three lists: **given**, **inferred** (stated as assumptions) and **missing**.
3. Sample, don't swallow. For long reference PDFs, read the pages that matter, such as one plan, one section and one elevation for style. Don't ingest whole portfolios.
4. Verify site data independently where possible (map area vs. stated area, road widths, orientation). Report any mismatch.

**Output:** `00_fact_sheet.md`. Show the student a **one-screen summary**: project in one line, site in one line, key constraints, and missing items as specific questions.

**Gate A:** "Here is what I understood. Correct anything wrong and fill these gaps." Ask only for the missing facts that change the design. Infer the rest and label it as an assumption.

---

## 3A. P0.5 — Theme lock and feasibility (Gate A2)

Some students arrive with a **theme** already in mind: a geometry ("circular building"), an idea ("the street as a living room"), a material ("all bamboo"), a cultural or symbolic motif ("mandala", "a weaver's loom"), a movement ("deconstructivist", "biophilic"), or a story. Ask about it **at the very start, before research**. A theme changes what is worth researching, what to ask and which forms are allowed, so discovering it later wastes the whole research and form stage.

### Step 1: ask
Ask early in Gate A, as one short card:
1. "Do you already have a theme or idea the design must follow? (geometry, concept, material, style, story, or none)"
2. If yes: "How fixed is it?"
   - **Fixed**: non-negotiable. The professor set it, or it's the core of the student's intent.
   - **Strong preference**: keep it unless the site really fights it, and adapt how it shows up.
   - **Open**: a starting inspiration; the site and research may reshape or replace it.
3. "What does the theme mean to you in one line?" A "circular" theme could mean a circular plan, circular movement, a ring of spaces around a centre, or a circular roof only. Pin the meaning down before designing.

Record the answers in `DESIGN_DNA.md` as **Line 0: Theme** (statement, meaning, strength).

### Step 2: quick feasibility check
Run this before full research. It's a cheap job using only the brief and plot geometry.
- Test the theme against the hard limits: plot shape and size, setbacks and coverage, programme area, mandated structure or material, parking and access geometry, and climate extremes.
- Example: a 40 m circle on a 60 × 50 m plot with 6 m setbacks doesn't fit. A 36 m circle fits but leaves the corners for parking and service, which may be a good thing.
- Give a verdict:
  - **Fits**;
  - **Fits with adaptation**: name 2–3 adaptations, e.g. "a circle of pavilions instead of one solid drum" or "a circular courtyard inside a site-following block";
  - **Conflicts**: say exactly why, with numbers.

### Step 3: act by strength × verdict

| | Fits | Fits with adaptation | Conflicts |
|---|---|---|---|
| **Fixed** | Theme is a hard constraint | Show the adaptations and let the student pick one. The theme stays hard | Explain the conflict honestly, then show the closest feasible interpretations. The student decides. Never quietly drop a fixed theme |
| **Strong preference** | Hard constraint | Student picks an adaptation | Offer: (a) best adapted version, (b) a related theme that suits the site. The student decides |
| **Open** | Lead driver | Lead driver, adapted | Treat as inspiration only and design from site/climate, telling the student why |

### Step 4: theme as the filter for everything after
Once the theme is locked (Fixed or Strong), it **filters** every later phase. The other factors still matter, but they are solved *through* the theme, not instead of it:
- **P2 Research:**
  - Add a theme research worker covering built precedents of that theme, the geometry and structural implications (e.g. radial grids, curved steel, ring beams), and its cultural meaning.
  - Precedents are chosen for how they made the theme work under similar conditions.
- **P3 Questions:** every question is phrased within the theme. Example: not "orient for wind or shade?" but "your circle can open to the breeze on one side or wrap a shaded courtyard. Which?".
- **P4 Style:** include references that express the theme in drawings, such as radial plan graphics.
- **P5 Programme:** check that the spaces suit the theme. Wedge-shaped rooms in a circle need a furniture test; adjust sizes and shapes early.
- **P6 Zoning:** zoning patterns follow the theme's logic (rings, sectors and a centre for a circular theme; bands for a linear one).
- **P7 Form:**
  - The theme is **driver #0**, above all ranked drivers.
  - All 3–5 options are *variations of the theme*, for example a solid ring, a broken ring, nested circles, a circle of pavilions, or a spiral.
  - Each evolution strip shows how the theme was adapted to the site, the climate and the programme.
  - A form that breaks a fixed theme is not a valid option.
- **P8 Development:**
  - Structure suits the theme (a radial or polar grid for circles).
  - The accuracy checklist still applies fully. Curved walls still need real door swings, real furniture and real stairs.
- **P12 Defence:** a ready answer to "Why this theme, and how did it adapt to the site?".

**No theme?** Form is derived from the ranked site, climate, programme and concept drivers, as in P7. The P3 concept/identity questions can then offer theme seeds if the student wants one.

---

## 4. P1 — Detail-level choice (Gate B)

Asked right after Gate A, once the scope is clear. The agent must **describe concretely what each tier produces for this brief**, not generic text. Show each tier with its list of outputs, sheet count, rough time or credit cost, and the kind of student it suits.

| | **Tier 1 — Student Simple** | **Tier 2 — Studio Standard** (default) | **Tier 3 — Professional / Competition** |
|---|---|---|---|
| Who it's for | Early-semester, concept review, fast turnaround | Mid/final studio juries | Thesis, competitions, students who want to learn the technical depth |
| Programme | One sheet: key zones with named spaces, sizes and a plain "what it is" line | Full named-space list, adjacency matrix, bubble diagram | Plus derivation of every size from standards, occupancy and fixture calculations |
| Site & climate | 1–2 diagrams (sun, wind, access) | 4–6 site/climate diagrams | Full data-driven analysis (hourly wind, sun path, rainfall, context mapping) |
| Form | 3 options, chosen one developed | 3–5 options with evolution strips and comparison | Plus driver ranking, precedent study per option |
| Plans | Furnished plans, solid walls, room names, key dimensions | Plus column grid, door swings, sections cut lines, levels | Plus structural grid, framing plans, detailed dimensions, schedules |
| Sections/Elev. | 2 sections, 2–4 elevations | 2–3 sections, 4 elevations, rendered section | Plus wall-section detail, foundation, connection details |
| CAD | Presentation PDF + DXF | DXF with layers and furniture blocks + PDF | Plus technical PDF set, structural DXF |
| 3D | 2–3 views | Massing + 4–6 views, exploded axo | Full render set (day/dusk, people, materials) |
| Presentation | 3–6 sheets | 6–10 sheets | 10+ sheets + summary booklet |
| Defence pack | 1-page explainer | Project guide + jury Q&A | Full guide + Q&A + standards notes |

**Rules:**
- Accuracy rules (Section 11) apply equally in **all** tiers. The tiers differ in quantity of output and depth of presentation, not in correctness.
- The student can upgrade or downgrade later. Upgrading adds to the existing data and never restarts.
- Ask a second, separate question: **"How much do you want to understand vs. just receive?"** It decides whether the agent explains its reasoning as it goes or only in the final defence pack.

---

## 5. P2 — Research

Run in parallel cheap workers, each saving one file.

| Worker | Output | Content |
|---|---|---|
| Site & context | `research/site.md` | Plot geometry, roads and access, neighbours and their influence (e.g. a hospital opposite means quiet zones and night traffic), views, existing trees and levels |
| Climate | `research/climate.md` | Climate zone, sun path, prevailing winds by season, rainfall/monsoon, temperature extremes. Use real data sources (national met data, NASA POWER, OSM) where reachable |
| Regulations | `research/rules.md` | Local bye-laws: FAR/FSI, coverage, height, setbacks, parking, fire (exits, travel distance, stair rules), accessibility |
| Space standards | `research/standards.md` | Sizes and clearances for every space type in the brief (national building code, Neufert, typology guides) |
| Precedents | `research/precedents.md` | 4–6 built projects. Pick them for **lessons**, not looks. Prefer projects with published plans and sections, and give one lesson per precedent |

**Rules:**
- Tag every value internally as **V** (verified from source with URL), **K** (known standard, not re-checked) or **E** (estimate). The tags never reach presentation sheets.
- If local rules can't be found, borrow from the nearest comparable city or the national code. Tell the student exactly what was borrowed, and pick values that look plausible for that place (a jury notices a metro-city FAR on a small-town site).
- When a source is ambiguous, use the stricter reading.
- Some sources block automated reading (Behance, Issuu, LinkedIn, low-resolution Pinterest). Say so plainly and use what can be opened.
- Keep research proportionate to the tier. Don't over-research Tier 1.

**Output to student:** a short "what the site and rules are telling us" brief with 5–7 bullets. These findings become the raw material for the P3 questions.

---

## 6. P3 — Design-shaping questions (Gate C)

This is what makes every project **unique** instead of a repeated template. Vague questions ("What style do you like?") are banned. Each question must:
1. Come from **this project's** research: site, users, climate or brief.
2. Offer **2–4 concrete options**, each with a one-line consequence ("→ means a longer building along the road, more frontage, harder cross-ventilation").
3. Visibly change the design. If no answer would change the outcome, don't ask.
4. Include the agent's recommendation and reason, but leave the choice to the student.

### 6.1 Question families and why they exist

| Family | Why it matters | How to form it (pattern) | Example (for a roadside café) |
|---|---|---|---|
| **Users & journey** | Plans fail when the agent hasn't walked each user's route | "Who are the 3–5 user types and what is each one's sequence from arrival to exit?" Propose the journeys and ask which ones are primary | "Families upstairs, away from trucks, or one shared hall?" |
| **Scale & capacity** | Sets programme size and parking, the most common clash | Give the numbers range from research and ask for a pick | "2–3 trucks + 10 cars, or a large truck stop (20 trucks)? The plot fits the first only" |
| **Site stance** | Decides siting and frontage | "Face the road / turn inward / sit as an object in landscape" | "Building as a highway beacon, or a calm courtyard away from traffic?" |
| **Climate strategy** | A legitimate, defensible form driver | Name the 1–2 dominant climate forces and the options to respond | "Long axis along the breeze for cross-ventilation, or deep shade with courtyards?" |
| **Spatial experience** | Turns a list of rooms into architecture | "What should the user *feel* at the key moment?" Offer experiential options | "Open dining street under one roof / series of shaded pavilions / gardens between blocks" |
| **Material & structure** | Must match brief (competitions often mandate it) and region | Offer systems with their spatial consequences | "Steel portal frames (big spans, open hall) vs. load-bearing + steel roof (cheaper, cellular)" |
| **Openness vs. enclosure** | Controls the ratio of built to open space and the use of the site | "How much of the site is building vs. designed open space?" | "Compact block + parking, or building woven through gardens using the whole site?" |
| **Height & section** | Plans alone make flat projects | "Single storey spread, G+1, or a vertical element (tower, mezzanine, double height)?" | "Use the full permitted height with a signage tower?" |
| **Concept / identity** | Gives the jury a story, and a thesis needs a visible concept | Offer 2–3 concept seeds grounded in place, culture or programme | "A local food culture motif, a highway beacon, a woven street" |
| **Constraints to respect** | Avoids redesign later | Ask about professor's preferences and any must-keep elements | "Did your professor ask for any specific element or rule?" |

### 6.2 Process
- Generate 8–15 candidate questions. Keep the **6–10** with the highest design impact, ordered from big decisions (scale, stance) to smaller ones (material).
- Ask in 2–3 small batches, not one wall of questions. Later questions may depend on earlier answers.
- Allow "you decide". The agent then chooses, states its reasoning, and logs it.
- Record the answers in **`DESIGN_DNA.md`**:
  - 5–8 lines describing this project's unique combination (users, stance, climate move, experience, structure, openness, concept);
  - each line cites the answer that set it.
  All later phases must cite the DNA when making decisions.

### 6.3 Uniqueness guard
Before P7, compare the DNA against the platform's library of past projects of the same typology. If the form options would repeat a recent project's parti, generate different options. A typology must never collapse into one template.

---

## 7. P4 — Style reference board (Gate D)

Style references are about **how the drawings and sheets look**, not what the building is. A steel café can borrow sheet style from a timber house.

1. Build a numbered board of **8–12 references** across:
   - plan rendering, section style, elevation style;
   - diagram and zoning style, sheet composition.
   Mix building types. Include the student's own uploaded favourites.
2. For each reference, one line on what it's good for ("thin route overlay on exploded axo", "pastel zone fills with names inside, arrow legend at bottom").
3. The student picks favourites **per category**. They may like the plan style from one reference and the elevations from another.
4. Synthesise a **blended style guide** (`STYLE_GUIDE.md`). Never copy one reference wholesale.
   - Palette: neutral greys plus **one accent colour**.
   - Line weights, wall fill (solid or hatch), furniture shown, tree and people style.
   - Font: Arial or Calibri, bold headings; no monospace, no novelty fonts, no special symbols (†, ‡, §, ◐).
   - Arrow system: thin, one style per flow, with a legend.
   - Sheet grid and size (A1/A3, margins, title block).
5. Render one **sample sheet** in the chosen style and confirm before producing at scale.

Repeat this mini-board any time the student is unhappy with a visual: show 6–10 numbered options against their specific complaint, let them pick, then restyle. **Never** guess a new style unasked.

---

## 8. P5 — Area programme (Gate E)

**Programme = named, real spaces**, not population categories or zone totals. "VFX studio, 2 rooms × 60 m²" is a programme line; "UG students: 400" is not.

1. Build `program.json`. One entry per space with:
   - name, zone, count, size (L × W), area, floor;
   - users, capacity, adjacency needs;
   - a plain-language "what it is";
   - derivation (standard, occupancy calculation or precedent) and an internal source tag.
2. Group spaces into zones. For presentation, show the **key zones in detail** and the rest as one-liners, so the sheet reads at a glance and isn't overwhelming.
3. Compute the summary strip:
   - built-up area per floor, total BUA, FAR, ground coverage;
   - parking and open-space percentages;
   - checks against the limits from P2.
4. Make the programme visibly express the concept and DNA. In a "digital creativity" campus the spaces themselves should say so.
5. Check the essentials the student will be asked about:
   - toilets per occupancy, accessibility (ramps at 1:12, lift, step-free route), staff facilities;
   - services (electrical room, generator, gas store, water tanks, waste);
   - fire exits.
   Include them, sized, even in Tier 1.
6. For every technical space, prepare a "Know this" note (what it is, why it's needed here, why it's placed there) in the defence pack.

**Gate E:** the student reviews the programme **before** placement. Once approved, it is frozen. Later changes go through `DECISIONS.md` and regenerate everything downstream.

---

## 9. P6 — Adjacency, journeys, zoning, placement (Gate F)

1. **Adjacency matrix**: must be next to / good to be near / keep apart. Shown with a legend: solid thin line = must, dashed = good, red = apart.
2. **User journeys**: draw each user type's route (arrival → parking → entry → core activity → exit). Each journey gets its own thin colour or offset. Walking the routes catches bad adjacencies, like diners crossing the kitchen or washing far from tables.
3. **Bubble diagram**: bubbles sized by area, public-to-private gradient, entries marked.
4. **Zoning layers on the real site**:
   - public / semi-public / private / service;
   - vehicle vs. pedestrian, quiet vs. noisy, wet vs. dry;
   - built vs. open.
5. **Test fit** (scripted): place the programme on the plot and check coverage, setbacks, parking geometry (turning radii, bay sizes), separations (e.g. gas store from generator) and site area balance (built + open + paved + green = plot area exactly).
6. **Placement before form.** Decide where things go on the site before any form is sculpted.

**Quality checks before showing:**
- No room without an outside wall unless it is designed with a light well or courtyard. Every habitable room gets daylight and ventilation.
- Service, wet and noisy zones are kept off sensitive edges.

---

## 10. P7 — Drivers → form options (Gate G)

The core design step. Form must be **derived**, never decorated.

1. **Driver ranking** (design lead): list the 5–8 forces from research and DNA (sun, wind, road frontage, views, rain, structure system, programme bands, concept) and rank them for *this* site. If a theme is locked (P0.5), it sits above the list as driver #0, and every option must be a version of it.
2. **Precedent lessons**: 4–6 buildings, each giving one transferable lesson tied to a driver.
3. **Generate 3–5 genuinely different options.** Each option is a page with:
   - a one-line idea ("a tapered wing that catches the breeze and shades the road edge");
   - a **4-step evolution strip** where each step names the driver it answers (block → rotate for wind → carve courtyard for light → lift roof for stack ventilation);
   - a hero axonometric, a simple plan and a climate section;
   - automatic checks: coverage, height, setbacks, programme area achieved.
4. **Comparison page**: options against drivers, with the agent's recommendation and reasons.
5. The student picks one, or asks for a hybrid. They may ask for a tweak to the chosen option (e.g. "fix the cantilever").
6. Forms are not limited to orthogonal grids. Curves sit happily on a regular structural grid. Don't restrict the student's options unasked.

**Rejection signs to avoid:** shapes with no reason ("what is that wheel doing?"), options that differ only in roof shape, and a form that ignores the placement from P6.

**If all options are rejected:** don't restart the project. Re-rank the drivers with the student ("which force matters most to you?") and regenerate this step only.

---

## 11. P8 — Design development (Gate H)

Build the single source model: `site.json`, `building.json` per floor (walls, openings, rooms, furniture), `structure.json` (grid, columns, beams, footings).

### 11.1 Accuracy checklist (all tiers, automated where possible)

| Area | Checks |
|---|---|
| Structure | Regular column grid with spans suited to the system. One footing per column. Beams sized for spans (intermediate columns if overloaded). Bracing not crossing doors or windows. Cantilevers within reason |
| Walls | Consistent thickness by type (external, internal, partition). Solid fill in plans |
| Doors | Every room has a door. Swing doesn't hit furniture, other doors or circulation. No door opening straight onto urinals or WCs. No locked-in or locked-out spaces |
| Circulation | Corridor widths, clear routes to exits, travel distance within fire limits (else add an exit stair) |
| Stairs | Riser ≤ code limit for the occupancy (e.g. 150 mm non-residential), tread ≥ minimum, ≤ 12 risers per flight, landings, headroom ≥ 2.1 m, direction arrows correct |
| Ramps & access | 1:12 max, landings, lift where required, accessible toilet at full code size, step-free route |
| Toilets | Correct fixture counts, WC, basin and urinal grouping that makes sense, privacy screening, ventilation |
| Furniture | Real sizes (blocks), clearances (e.g. bench pitch), nothing in front of doors or service counters, seat counts match programme |
| Light & air | Every habitable room has a window to outside or a courtyard. Cross-ventilation where the DNA says so |
| Services | Gas store, generator, electrical room, water tanks, waste, kept at safe separations with service access |
| Numbers | Areas, coverage, FAR and seat counts are identical across programme, plans and sheets ("programme" vs "drawn" labelled if they differ) |

### 11.2 Conflict handling
Checkers report conflicts as a table. The Orchestrator rules on each as lead architect, records the ruling and regenerates. Rulings that affect the student's chosen design (e.g. "the east elevation reads empty because the block is open — keep or change?") go to the student with options.

---

## 12. P9 — Drawings (Gate I)

1. **CAD output (DXF):**
   - mm units, layers with clear prefixes (A-wall, A-door, A-furn, S-grid, L-tree…), lineweights on layers;
   - furniture, doors, fixtures, trees, people and vehicles as **blocks** (true size), never exploded linework;
   - one DXF per drawing or scale, which opens cleanly in AutoCAD.
2. **Sheets produced:** site plan, every floor plan (furnished), roof plan, 2–3 sections through the important spaces, 4 elevations, plus structure and details per tier.
3. **Two PDF sets when Tier ≥ 2:**
   - **Presentation PDF** in the chosen style;
   - **Technical PDF** with grid, dimensions and levels.
   Presentation sheets carry only basic dimensions unless the brief asks for working drawings.
4. **Vector, not raster.** Drawings go into PDFs as vector, so they stay sharp when zoomed. Raster only for renders and photos.
5. **Visual review:** render each sheet to an image and inspect it. Check overlaps, text collisions, legends that match the marks, stray placeholders (`{{NAME}}`), leftover internal tags and blank areas.
6. **Readability:** if a drawing confuses (e.g. elevations look empty because the building is open), first ask whether it's a design weakness or a drawing problem. Fix the right one. Add explanatory views (see-through aerial, exploded axo) where needed.

---

## 13. P10–P12 — 3D, presentation, defence pack

### P10 — 3D (Gate J)
- Build in Blender **from the same JSON**, so the model and drawings always match.
- Start with massing and an exploded floor axo, then materials, context (trees, people, vehicles at real scale), and day and dusk lighting per tier.
- Keep the realistic-render version as a separate file copy.
- Review every render before showing it. Run long renders as background jobs.

### P11 — Presentation sheets (Gate K)
- Compose on the chosen grid: one story per sheet.
  - Sheet order: context → analysis → concept and evolution → plans → sections → elevations → 3D → details.
- Plain student-voice text, short, with no AI-sounding phrasing (no em-dash headers, no buzzwords).
- Text on sheets should explain the *why* in one line per drawing.
- Final check: every legend matches, every space is named, the numbers agree, there's no jury-sensitive content, and every placeholder is filled (name, roll number, guide).

### P12 — Defence pack (private, never on sheets)
- A 5-sentence project summary the student can say out loud.
- "How did you come up with X" for form, roof, structure and zoning.
- A "Know this" card for every technical space and every non-obvious furniture or equipment item.
- Likely jury questions with answers. List every assumption and borrowed rule, and how to defend it.
- Open weaknesses honestly listed, with a suggested answer for each.

---

## 14. Lessons log (why the rules exist)

| What went wrong | Generalised rule |
|---|---|
| "Simple" was read as hand-drawn, cartoonish diagrams → "AI slop, very first year" | Simple = same professional quality, fewer and clearer markings (Principle 4) |
| Detailed foundation PDF was loved; only its arrows and boxes confused | Fix markings and legends, keep the depth (Principle 5) |
| Reference board limited to the same building type | Style references are about drawing style, across all types (P4) |
| Student liked several references and was told to follow one | Blend a style from per-category picks (P4) |
| Form options with no purpose ("why is that wheel?") | Drivers → evolution strip → options (P7) |
| v1 plan was one deep block with ~20 windowless rooms, half the area in service rooms | Daylight and ventilation check, placement before form, programme reality check (P6, P8) |
| Building covered too little of the site; open space unused | Ask the openness question, design open spaces as experiences (P3) |
| Area programme built as population counts | Programme = named real spaces (P5) |
| 291-space sheet was overwhelming | Key zones in detail, rest as one-liners (P5) |
| Chairs in front of doors, bench blocking the counter, toilet door facing urinals, stairs 175 mm riser | Accuracy checklist automated on every plan (P8) |
| Numbers disagreed between sheets (roof area over cap, floor areas, tower height) | Single source of truth + consistency sweep (Principle 6) |
| Code tags and "verify" text leaked onto sheets | Defence pack separation (Principle 8) |
| PNG drawings blurry when zoomed | Vector PDFs (P9) |
| Long single agents stalled or lost all work at usage limits | Short jobs, STATUS lines, save as you go, resume the same worker (Section 1) |
| Agent restarted work it could have resumed, wasting budget | Resume, don't restart (Section 1) |
| Student needed to explain furniture and roof choices to the jury | Defence pack with Q&A (P12) |
| Text sounded AI-written | Student-voice copy check (P11) |
| Parking demand from research (20 trucks) didn't fit the plot | Capacity questions offer research-backed ranges checked against the site (P3) |
| Borrowed big-city rules looked suspicious on a small-town site | Borrow plausibly and tell the student what was borrowed (P2) |
| (Design rule, not from a past failure) A student's theme found late would waste the research and form work | Ask about the theme and how fixed it is before research, check it fits the site, then filter all phases through it (P0.5) |

---

## 15. Change requests and versions

- **Small change** (move a room, restyle arrows): edit the JSON and regenerate the affected outputs only.
- **Step rejected** (forms, style, programme): redo that phase only. Earlier gates stay approved.
- **Foundations wrong** (the student says the whole approach is off): propose a new version (`v2/`) and write a one-page diagnosis of why v1 failed. Carry forward everything still valid (research, programme items, style). Old files stay untouched.
- **Scope trim** ("I don't need the technical detail"): drop tier outputs, keep the accuracy.
- Every change → `DECISIONS.md` entry → downstream regeneration → consistency sweep.

---

## 16. Interaction rules

- Students often dictate long, rambling voice messages. Extract the intent, act, and confirm in plain words. Don't ask about details that can be inferred.
- When the student asks a question, **answer it**. Don't start work until they say so.
- Give a status on request: the % done, what's running, what's next and an ETA. Report honestly ("running but quiet", "lost at limit, resuming").
- Offer choices as small numbered or lettered options. The student usually answers with "B" or "#6, #4, #9".
- Always explain *why*. Every space, placement and form move has a one-line reason the student could repeat to a jury.
- Never stop or restart running work without telling the student.
- Budget awareness: warn before an expensive step (renders, Tier-3 sets). If the budget is nearly used, finish nearly-done jobs and save-and-pause the rest.

---

## 17. Project state (for implementation)

```
/projects/<id>/
  project.json         # tier, current phase, gate status, budget used
  00_fact_sheet.md
  DESIGN_DNA.md
  STYLE_GUIDE.md
  DECISIONS.md         # every gate answer and ruling, dated
  _progress.md         # worker status lines
  research/            # site, climate, rules, standards, precedents (tagged)
  data/                # program.json, site.json, building_*.json, structure.json  ← source of truth
  scripts/             # generators: diagrams, DXF, PDF, checks
  outputs/
    diagrams/  dxf/  pdf_presentation/  pdf_technical/  renders/  sheets/
  defence/             # private guide, Q&A, know-this cards
  v1/ v2/ …            # only when a foundation restart happens
```

`project.json.phase` drives the UI: each gate becomes a screen that shows the options and records the answer. A web UI needs only to:
1. upload files;
2. show gate cards (options with images);
3. stream progress;
4. preview PDFs, images and 3D;
5. download outputs.
