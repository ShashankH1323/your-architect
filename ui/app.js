/* Your Architect — UI for the Arch Studio workflow.
   Brief → two short rounds of questions → research and references → style boards → foundation (the one hard
   stop) → form → drawing styles → drawings → sheet layout → final set and guides.
   Everything shown is real (server.py): uploads, per-type reference folders, brief reading, the brief checklist
   PDF, the research (web sources only) and the references (published drawings, downloaded and credited).
   Stages without an engine yet say so instead of showing sample content.
   Chat shows only choices, caveats and a few summary lines; the full content goes into PDFs.
   Nothing runs on its own: research starts when you press Start, one project at a time. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const ICON = {
  send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7L10.2 17a1.7 1.7 0 0 1-2.4-2.4L15.5 7"/></svg>',
  panel: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  plug: '<svg viewBox="0 0 24 24"><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="2.6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/></svg>',
};
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ================= workflow (from the Arch Studio pack) ================= */

/* Round 1 of the intake: exact wording from templates/intake_questions.md */
const R1 = [
  { id: 'purpose', h: 'Purpose', q: 'What is this project for? This decides how strictly I follow the brief.', o: [
    ['Studio submission', 'Graded by a jury; follow the brief’s intent, keep it explainable.'],
    ['Practice / self-study', 'Brief is a guide; I can drop non-essential items to keep it simple.'],
    ['Competition entry', 'Every requirement and sheet rule of the brief must be met.'],
    ['Professional / client', 'Full code compliance and technical detail.']] },
  { id: 'detail', h: 'Detail', q: 'How detailed should the project be?', rec: 'Balanced', o: [
    ['Balanced', 'Furnished plans, sections, elevations, simple structure; easy to explain.'],
    ['Simple', 'Keeps everything the brief really tests; leaves out rarely-noticed or very technical extras. Very easy to explain.'],
    ['Detailed', 'Full technical depth: schedules, structure sheets, detailed CAD layers.']] },
  { id: 'scope', h: 'Scope', q: 'How far should I take it?', rec: 'Full sheets + guides', o: [
    ['Full sheets + guides', 'Foundation, form, drawings, DXF, final presentation sheets, explainer guides.'],
    ['Up to drawings + DXF', 'Foundation, form, plans, sections, elevations; no final sheet layout.'],
    ['Concept only', 'Area programme, zoning, bubble diagrams and form options.']] },
  { id: 'presenter', h: 'Presenter', q: 'Who will present and defend this work?', o: [
    ['Me, as a student', 'Keep wording and structure simple enough to explain on the spot.'],
    ['A team', 'Same, plus a short split of who explains what in the guide.']] },
];
const PURPOSE_SHORT = { 'Studio submission': 'Studio jury', 'Practice / self-study': 'Practice', 'Competition entry': 'Competition', 'Professional / client': 'Professional' };
const SCOPE_SHORT = { 'Full sheets + guides': 'full sheets and guides', 'Up to drawings + DXF': 'up to drawings and DXF', 'Concept only': 'concept only' };
const TIER_OF = { Simple: 'Student Simple', Balanced: 'Studio Standard', Detailed: 'Professional' };
const ROUTES = {
  W0: { name: 'Concept sprint', line: 'Foundation and form only. The project can continue to drawings later from the same folder.' },
  W1: { name: 'Student, simple', line: 'The smallest correct project. Every core test stays; peripheral spaces are left out, each with a reason you can give.' },
  W2: { name: 'Student, balanced', line: 'The studio-jury route. Every brief item is accounted for: provided, merged, or dropped with your OK.' },
  W3: { name: 'Competition, strict', line: 'The brief is a contract: every space, area, sheet rule and anonymity rule is met and tracked.' },
  W4: { name: 'Professional', line: 'Explicit code compliance, a separate technical set, schedules and professional CAD layers.' },
};
/* S0 §5 route table */
function routeFor(i) {
  if (i.scope === 'Concept only') return 'W0';
  if (i.purpose === 'Competition entry') return 'W3';
  if (i.purpose === 'Professional / client') return 'W4';
  if (i.purpose === 'Practice / self-study') return i.detail === 'Detailed' ? 'W2' : 'W1';
  return i.detail === 'Simple' ? 'W1' : 'W2';
}
const layersFor = (i) => (i.purpose === 'Professional / client' || i.detail === 'Detailed' ? 'Professional' : i.detail === 'Simple' ? 'Simple' : 'Standard');
const routeLine = (wf) => `${PURPOSE_SHORT[wf.intake.purpose]}, ${String(wf.intake.detail).toLowerCase()}, ${SCOPE_SHORT[wf.intake.scope]}`;

/* `todo` lists what an engine-less stage will do once it is connected (from the pack's stage files) */
const STAGE = {
  intake: { t: 'Brief and questions', s: 'Two short rounds', short: 'Questions', gate: 'Intake' },
  research: { t: 'Research and references', s: 'Site, climate, rules, standards, precedents; real references', short: 'Research' },
  fstyle: { t: 'Foundation style', s: 'How the tables and diagrams look', short: 'Style', gate: 'Foundation style', star: true },
  foundation: { t: 'Foundation', s: 'Programme, journeys, bubbles, zoning, site test-fit', short: 'Foundation', gate: 'Foundation approval', star: true, hard: true,
    todo: ['Users and step-by-step journeys for each user group', 'Space list and triage (core, essential, peripheral, technical)', 'Area programme: every space sized by a furniture test-fit from the space-standards research, with its source', 'Adjacency matrix, and bubbles for the site and each floor', 'Zoning: functional, public to private, movement, climate', 'Site test-fit: footprint, parking, vehicle loop, setbacks', 'Foundation PDF and Sources and Standards PDF, in the style you locked', 'Then the approval gate, with the warning, before anything else starts'] },
  form: { t: 'Form', s: 'Options from clear drivers', short: 'Form', gate: 'Form pick', star: true,
    todo: ['Drivers ranked from the research: climate, site edges, journey, structure, local story', 'Reasons taken from the precedents', '3–5 options, each from one named driver, with axo, roof plan and form steps', 'Checks per option: coverage, height, setbacks, parking loop, daylight', 'Form Options PDF, then your pick and one refinement round'] },
  dstyle: { t: 'Drawing styles', s: 'Plan, section and elevation looks', short: 'Style', gate: 'Drawing styles', star: true },
  drawings: { t: 'Drawings', s: 'Model, plans, sections, elevations, 3D views, DXF, checks', short: 'Drawings',
    todo: ['One model that every drawing reads', 'Furnished plans, sections, elevations and vector 3D views in your locked styles', 'DXF for AutoCAD with furniture as blocks and named layers', 'Model checks, consistency audit and an independent review'] },
  techreview: { t: 'Technical set review', s: 'Drawings and schedules before export', short: 'Tech review', gate: 'Technical review', star: true,
    todo: ['Technical plans, schedules, room data and structural grid', 'Your review, with a revision letter for every change'] },
  layout: { t: 'Sheet layout', s: 'Pick a composition', short: 'Layout', gate: 'Sheet layout', star: true },
  final: { t: 'Final set', s: 'Sheets, checks and explainer guides', short: 'Final set',
    todo: ['Presentation sheets built from the data, vector only', 'Legibility, plain-language and jury-sensitive checks', 'An independent review of the sheets', 'Explainer guides for your route'] },
  compliance: { t: 'Compliance review', s: 'Every brief requirement checked before export', short: 'Compliance', gate: 'Compliance review', star: true,
    todo: ['A compliance summary: every requirement, where it is met, ticked or flagged'] },
  delivered: { t: 'Delivered', s: 'PDFs, DXF and guides', short: 'Done' },
};
const BUILT = new Set(['intake', 'research', 'fstyle']); // stages with an engine; the rest stop and say so
function stagesFor(wf) {
  const r = wf.route || 'W2', scope = wf.intake.scope || 'Full sheets + guides';
  const s = ['intake', 'research', 'fstyle', 'foundation', 'form'];
  if (r === 'W0') s.push('final');
  else {
    s.push('dstyle', 'drawings');
    if (r === 'W4') s.push('techreview');
    if (scope === 'Full sheets + guides') s.push('layout', 'final');
  }
  if (r === 'W3') s.push('compliance');
  return [...s, 'delivered'];
}
const stageTitle = (wf, id) => (id === 'final' && wf.route === 'W0' ? 'Concept set' : STAGE[id].t);
const nextStatus = () => 'wait';
const newWf = () => ({ stage: 'intake', status: 'wait', round: 1, intake: {}, route: null, layers: null, picks: {}, gates: {}, slots: {}, changes: [] });

/* user upload slots = 03_references/user/<type>/ */
const SLOTS = [
  ['plan', 'Plans', 'Furnished floor plans, site plans'],
  ['section', 'Sections', 'Cuts, section perspectives'],
  ['elevation', 'Elevations', 'Facades, street views'],
  ['sheet_composition', 'Sheet layouts', 'Whole presentation sheets'],
  ['diagrams', 'Diagrams', 'Zoning, bubbles, programme tables'],
  ['axo_3d', '3D views', 'Axos, exploded floors, form steps'],
  ['details', 'Details', 'Wall sections, joints, footings'],
  ['other', 'Other', 'Anything else you like'],
];
const SLOT_NAME = Object.fromEntries([...SLOTS.map((s) => [s[0], s[1]]), ['previous_project', 'Previous project'], ['site', 'Site images']]);
/* references the research finds = 03_references/<type>/, and the user slot that replaces each search */
const FOUND = { foundation_tables: ['Area programme tables', 'diagrams'], bubble: ['Bubble diagrams', 'diagrams'], zoning: ['Zoning diagrams', 'diagrams'], plan: ['Plans', 'plan'], section: ['Sections', 'section'], elevation: ['Elevations', 'elevation'], sheets_composition: ['Sheet layouts', 'sheet_composition'] };
const RESEARCH_TOPICS = ['site', 'climate', 'rules', 'standards', 'precedents'];

const ACCENTS = [['Terracotta', '#C8643B'], ['Ochre', '#C9962B'], ['Teal', '#2F7F86'], ['Brick red', '#A8432F'], ['Sage', '#6E8B5E'], ['Indigo', '#3E4C8A']];

/* style boards (S3) and the composition board (S8): every option is a real reference */
const BOARDS = {
  fstyle: { tag: 'Style board', title: 'How should your tables and diagrams look?', desc: 'Real published examples, found and checked during research. Pick one per row; if you like parts of two, say so in the box below.', accent: true, rows: [
    { id: 'programme', label: 'Area programme table', found: 'foundation_tables', slot: 'diagrams' },
    { id: 'bubble', label: 'Bubble diagram', found: 'bubble', slot: 'diagrams' },
    { id: 'zoning', label: 'Zoning diagram', found: 'zoning', slot: 'diagrams' }] },
  dstyle: { tag: 'Style board', title: 'How should your drawings look?', desc: 'Every plan, section and elevation is then drawn in the style you lock here.', rows: [
    { id: 'plan', label: 'Plans', found: 'plan', slot: 'plan' }, { id: 'section', label: 'Sections', found: 'section', slot: 'section' }, { id: 'elevation', label: 'Elevations', found: 'elevation', slot: 'elevation' }] },
  layout: { tag: 'Sheet layout', title: 'Which sheet layout do you like?', desc: 'Real presentation sheets. Your drawings will be laid out like the one you pick.', rows: [
    { id: 'composition', label: 'Layout', found: 'sheets_composition', slot: 'sheet_composition' }] },
};

/* what the route will produce: [file, folder, stage, routes, condition, what it is] */
const DELIV = [
  ['Foundation.pdf', '04_foundation/PDF', 'foundation', 'W0 W1 W2 W3 W4', '', 'Programme, journeys, bubbles, zoning, site test-fit'],
  ['Foundation_Summary.pdf', '04_foundation/PDF', 'foundation', 'W2 W3 W4', '', 'The foundation in four pages'],
  ['Sources_and_Standards.pdf', '04_foundation/PDF', 'foundation', 'W0 W1 W2 W3 W4', '', 'Where every area and rule came from'],
  ['Triage.pdf', '04_foundation/PDF', 'foundation', 'W1 W2', '', 'Spaces left out or merged, with reasons'],
  ['Area_Statement.pdf', '04_foundation/PDF', 'foundation', 'W4', '', 'FAR, coverage, parking, occupant load'],
  ['Form_Options.pdf', '05_form/PDF', 'form', 'W0 W1 W2 W3 W4', '', 'One page per option, plus a comparison'],
  ['Drawings.pdf', '07_drawings/PDF', 'drawings', 'W1 W2 W3 W4', '', 'Plans, sections, elevations, 3D views'],
  ['Technical.pdf', '07_drawings/PDF/tech', 'drawings', 'W2 W3 W4', '', 'Grid, dimensions, areas, levels'],
  ['Drawings.dxf (per drawing)', '07_drawings/DXF', 'drawings', 'W1 W2 W3 W4', '', 'Furniture as blocks, named layers, for AutoCAD'],
  ['START_HERE_3D.md', '10_3D_handoff', 'drawings', 'W1 W2 W3 W4', 'handoff', 'Model, levels and materials for a Blender render phase'],
  ['Schedules (CSV + PDF)', '07_drawings/PDF/tech', 'techreview', 'W4', '', 'Doors, windows, rooms, columns'],
  ['Compliance_Register.pdf', '00_admin', 'techreview', 'W4', '', 'Code clauses with sources and verified flags'],
  ['Assumptions.pdf', '00_admin', 'techreview', 'W4', '', 'Soil, loads and services assumed'],
  ['Presentation.pdf', '08_sheets/PDF', 'final', 'W1 W2 W3 W4', 'full', 'The jury sheets'],
  ['Concept_Sheets.pdf', '08_sheets/PDF', 'final', 'W0', 'sheets', 'Two to four concept sheets'],
  ['Project_Guide.pdf', '09_guides/PDF', 'final', 'W1 W2 W3', 'full', 'Your project in six sentences, and how it works'],
  ['Space_Guide.pdf', '09_guides/PDF', 'final', 'W1 W2 W3', 'full', 'What each space is and why it sits there'],
  ['Furniture_Guide.pdf', '09_guides/PDF', 'final', 'W2 W3', 'full', 'Non-obvious items a juror may ask about'],
  ['Structure_Guide.pdf', '09_guides/PDF', 'final', 'W2 W3', 'full', 'Frame, load path, roof and drainage'],
  ['Jury_QA.pdf', '09_guides/PDF', 'final', 'W3', 'full', 'Ten likely questions with short answers'],
  ['Design_Report.pdf', '09_guides/PDF', 'final', 'W4', 'full', 'Narrative and area statement'],
  ['Compliance_Summary.pdf', '01_brief', 'compliance', 'W3', '', 'Every requirement ticked or flagged; for you, not the jury'],
  ['compliance_matrix.csv', '01_brief', 'compliance', 'W3', '', 'Requirement → where it is met → status'],
];
function delivFor(wf) {
  const r = wf.route || 'W2', list = stagesFor(wf);
  return DELIV.filter((d) => d[3].includes(r) && list.includes(d[2]) && (!d[4] || (d[4] === 'full' && wf.intake.scope === 'Full sheets + guides') || (d[4] === 'sheets' && wf.conceptSheets) || (d[4] === 'handoff' && wf.renders === 'handoff')))
    .map(([file, folder, stage, , , what]) => ({ file, folder, stage, what }));
}

function bot(mode = '', size = '') {
  return `<span class="bot ${mode} ${size}"><svg viewBox="0 0 32 32"><g class="whole">
    <rect x="15.2" y="5.5" width="1.6" height="4.5" rx=".8" fill="#a8532f"/>
    <circle class="ant" cx="16" cy="5" r="2.3"/>
    <rect class="head" x="4.5" y="9" width="23" height="19" rx="7"/>
    <rect class="face" x="7.5" y="12.5" width="17" height="11.5" rx="4.5"/>
    <g class="eyes"><rect class="eye" x="11" y="15.5" width="3" height="5" rx="1.5"/><rect class="eye" x="18" y="15.5" width="3" height="5" rx="1.5"/></g>
    <g class="lens"><circle cx="16" cy="17" r="4"/><line x1="19" y1="20" x2="22" y2="23"/></g>
    <g class="pen"><path d="M24 24 l5 -5 1.6 1.6 -5 5 -2.4 .8z"/></g>
  </g></svg></span>`;
}
function ring(p) {
  const Cc = 2 * Math.PI * 15;
  return `<span class="ring-wrap ring"><svg viewBox="0 0 38 38"><circle class="bg" cx="19" cy="19" r="15"/><circle class="fg" cx="19" cy="19" r="15" stroke-dasharray="${Cc}" stroke-dashoffset="${Cc * (1 - p)}"/></svg><span>${Math.round(p * 100)}%</span></span>`;
}

/* ================= uploads (real, via server.py) ================= */
const EXTS = ['pdf', 'dwg', 'dxf', 'skp', '3dm', 'rvt', 'ifc', 'blend', 'obj', 'fbx', 'stl', 'glb', 'gltf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff', 'heic', 'bmp', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'kml', 'kmz', 'geojson', 'zip'];
const MAX_BYTES = 2 * 1024 ** 3;
const IMG_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'];
const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
const dlUrl = (url) => url + (url.includes('?') ? '&' : '?') + 'download=1';
const outUrl = (p, name) => `/outputs/${encodeURIComponent(p.id)}/${encodeURIComponent(name)}`;
const foundUrl = (p, type, file) => `/files/${encodeURIComponent(p.id)}/${encodeURIComponent(file)}?slot=found_${type}`;
function fileKind(name) {
  const x = extOf(name);
  if (x === 'pdf') return ['PDF', 'pdf'];
  if (x === 'dwg' || x === 'dxf') return [x.toUpperCase(), 'dxf'];
  if (IMG_EXTS.includes(x) || ['tif', 'tiff', 'heic'].includes(x)) return ['IMG', 'img'];
  return [(x || 'FILE').toUpperCase().slice(0, 4), 'md'];
}
const delivKind = (file) => fileKind(file.includes('.dxf') ? 'x.dxf' : file.includes('CSV') ? 'x.csv' : file);
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 ** 2) return Math.round(b / 1024) + ' KB';
  if (b < 1024 ** 3) return (b / 1024 ** 2).toFixed(1) + ' MB';
  return (b / 1024 ** 3).toFixed(2) + ' GB';
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function pickFiles(onFiles, accept) {
  const i = document.createElement('input');
  i.type = 'file'; i.multiple = true; i.accept = accept || EXTS.map((x) => '.' + x).join(',');
  i.onchange = () => onFiles([...i.files]);
  i.click();
}
/* Uploads each file to the project (or one of its slots) and returns one live item per file.
   item.done resolves when that file finishes (status 'done', 'error' or 'aborted'). */
function startUploads(project, files, onChange, slot = '') {
  return files.map((file) => {
    const f = { name: file.name, size: file.size, status: 'uploading', pct: 0 };
    const fail = (msg) => { f.status = 'error'; f.error = msg; onChange(f); };
    f.done = new Promise((res) => {
      if (!EXTS.includes(extOf(file.name))) { f.status = 'error'; f.error = 'File type not supported'; return res(f); }
      if (file.size > MAX_BYTES) { f.status = 'error'; f.error = 'Larger than 2 GB'; return res(f); }
      const x = new XMLHttpRequest(); f.xhr = x;
      x.open('POST', `/api/upload?project=${encodeURIComponent(project)}&name=${encodeURIComponent(file.name)}${slot ? '&slot=' + slot : ''}`);
      x.upload.onprogress = (e) => { if (e.lengthComputable) { f.pct = (e.loaded / e.total) * 100; onChange(f); } };
      x.onload = () => {
        let r = {}; try { r = JSON.parse(x.responseText); } catch { /* non-JSON error page */ }
        if (x.status === 201 && r.file) { Object.assign(f, r.file, { status: 'done', pct: 100 }); onChange(f); }
        else fail(r.error || ([404, 405, 501].includes(x.status) ? 'Run python server.py to upload' : `Upload failed (${x.status})`));
        res(f);
      };
      x.onerror = () => { fail('Server not reachable'); res(f); };
      x.onabort = () => { f.status = 'aborted'; res(f); };
      x.send(file);
    });
    return f;
  });
}
async function deleteUpload(f) {
  const r = await fetch(`/api/files?project=${encodeURIComponent(f.project)}&name=${encodeURIComponent(f.name)}${f.slot ? '&slot=' + f.slot : ''}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Delete failed');
}
async function listUploads(project) {
  const r = await fetch('/api/files' + (project ? `?project=${encodeURIComponent(project)}` : ''));
  if (!r.ok) throw new Error('Server not reachable');
  return (await r.json()).files;
}
/* the user's reference files grouped by slot: p.refs = { plan: [...], ... } */
async function loadRefs(p) {
  try { const list = await listUploads(p.id); p.refs = {}; list.filter((f) => f.kind === 'ref').forEach((f) => (p.refs[f.slot] = p.refs[f.slot] || []).push(f)); }
  catch { p.refs = p.refs || {}; }
  return p.refs;
}
/* research status, notes and found references: p.research = { status, notes, found } */
async function loadResearch(p) {
  try { const r = await api(`/api/projects/${p.id}/research`); p.research = { status: r.research, notes: r.notes || {}, found: r.found || {}, running: r.running }; }
  catch { p.research = p.research || { status: null, notes: {}, found: {}, running: null }; }
  return p.research;
}
const ensureData = (p) => Promise.all([p.refs ? p.refs : loadRefs(p), p.research ? p.research : loadResearch(p)]);

function fileChip(f, onRemove) {
  const k = fileKind(f.name);
  const c = el(`<span class="file-chip"><span class="fi ${k[1]}">${k[0]}</span><span class="fc-t"><span class="fc-n"></span><small></small></span>${onRemove ? `<button class="fc-x" title="Remove">${ICON.x}</button>` : ''}<i class="fc-bar"></i></span>`);
  c.title = f.name;
  if (onRemove) $('.fc-x', c).onclick = (e) => { e.stopPropagation(); onRemove(); };
  c.onclick = () => { if (f.url) window.open(f.url, '_blank'); };
  updateChip(c, f);
  return c;
}
function updateChip(c, f) {
  if (!c) return;
  const up = f.status === 'uploading';
  c.classList.toggle('up', up); c.classList.toggle('err', f.status === 'error'); c.classList.toggle('link', !!f.url);
  $('.fc-n', c).textContent = f.name;
  $('small', c).textContent = up ? `Uploading ${Math.round(f.pct)}%` : f.status === 'error' ? f.error : fmtSize(f.size);
  $('.fc-bar', c).style.width = up ? f.pct + '%' : '0';
}
function dropTarget(node, onFiles) {
  let depth = 0;
  node.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; node.classList.add('drag'); });
  node.addEventListener('dragover', (e) => e.preventDefault());
  node.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; node.classList.remove('drag'); } });
  node.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); depth = 0; node.classList.remove('drag'); onFiles([...e.dataTransfer.files]); });
}
/* uploads straight into an open project, shown as a message in its thread */
function attachToProject(p, list) {
  if (!list.length) return;
  const th = thOf(p);
  const m = userMsg('<div class="files" style="margin:0"></div>');
  const items = startUploads(p.id, list, (f) => updateChip(f.chip, f));
  items.forEach((f) => { f.chip = fileChip(f); $('.files', m).appendChild(f.chip); });
  th.appendChild(m); scrollDown(p.id);
  Promise.all(items.map((f) => f.done)).then((res) => {
    const ok = res.filter((f) => f.status === 'done').length, bad = res.filter((f) => f.status === 'error').length;
    const msg = ok ? `<p>Saved ${ok} file${ok > 1 ? 's' : ''} with your brief. ${ok > 1 ? 'They are' : 'It is'} under <b>Files</b> in the side panel. Style references go in <b>References</b>, one folder per drawing type.${bad ? ` ${bad} couldn’t be uploaded; see the red ${bad > 1 ? 'chips' : 'chip'} above.` : ''}</p>` : '<p>Nothing was uploaded. See the red chips above for the reason.</p>';
    const reply = aiMsg(msg);
    if (ok) {
      const b = el('<button class="btn">Read the brief again with these files</button>');
      b.onclick = () => { b.disabled = true; readBrief(p); };
      $('.body', reply).appendChild(b);
    }
    th.appendChild(reply); scrollDown(p.id);
    if (state.view === 'project' && state.project === p.id && state.panelTab === 'files') renderPanel();
  });
}

/* ================= projects (all real, from projects/ on disk) ================= */
const PROJECTS = [];
const GROUPS = ['Studio', 'Thesis', 'Competitions'];
const state = { view: 'home', project: null, panel: false, panelTab: 'progress', tab: 'All', libTab: 'All', refProject: null, attached: [], draftId: null };
const threads = {}; // project id → DOM node (keeps running stages alive while switching)
const seedOf = (p) => hash(p.id);
const stageShort = (p) => (p.reading ? 'Reading' : !p.wf ? 'Brief' : p.wf.stage === 'delivered' ? 'Done' : STAGE[p.wf.stage].short);
const stagePct = (p) => { if (!p.wf) return 0; const l = stagesFor(p.wf); return l.indexOf(p.wf.stage) / (l.length - 1); };
const notBuilt = (p) => !!p.wf && !BUILT.has(p.wf.stage) && p.wf.stage !== 'delivered';

/* ================= sidebar and routing ================= */
function renderSidebar() {
  const q = ($('#searchInput').value || '').toLowerCase();
  const wrap = $('#projectGroups');
  const closed = new Set($$('.sb-group.closed', wrap).map((g) => g.dataset.g));
  wrap.innerHTML = '';
  if (!PROJECTS.length) wrap.innerHTML = '<p class="muted sm" style="padding:6px 10px">No projects yet. Upload a brief to start one.</p>';
  GROUPS.forEach((g) => {
    const items = PROJECTS.filter((p) => p.group === g && p.name.toLowerCase().includes(q));
    if (!items.length) return;
    const grp = el(`<div class="sb-group ${closed.has(g) ? 'closed' : ''}" data-g="${g}"><div class="sb-group-h"><button>${ICON.chev}${g}</button><button title="New in ${g}">${ICON.plus}</button></div><div class="sb-group-list"></div></div>`);
    $$('.sb-group-h button', grp)[0].onclick = () => grp.classList.toggle('closed');
    $$('.sb-group-h button', grp)[1].onclick = () => go('home');
    items.forEach((p) => {
      const it = el(`<div class="sb-row"><button class="sb-item ${state.view === 'project' && state.project === p.id ? 'active' : ''}"><span class="dot ${p.status}"></span><span class="t"></span><span class="ph">${stageShort(p)}</span></button><button class="sb-more" title="More">${ICON.more}</button></div>`);
      $('.t', it).textContent = p.name;
      $('.sb-item', it).onclick = () => openProject(p.id);
      $('.sb-more', it).onclick = (e) => projectMenu(e.currentTarget, p);
      $('.sb-group-list', grp).appendChild(it);
    });
    wrap.appendChild(grp);
  });
  $$('.sb-link').forEach((b) => b.classList.toggle('active', b.dataset.nav === state.view));
}
/* Research runs only for the project on screen. Leaving it asks whether to keep it running in the background. */
const researching = (p) => p?.research?.status?.state === 'running';
function leaveGuard(next) {
  const cur = state.view === 'project' && PROJECTS.find((x) => x.id === state.project);
  if (!cur || !researching(cur) || cur.background) return next();
  const M = modal({ title: 'Research is still running', sub: cur.name });
  M.body.innerHTML = '<p>Keep it running in the background while you work elsewhere, or stop it? Only one project can research at a time, so another project can’t start until this one finishes or stops. Anything already found is kept either way.</p>';
  M.actions([['Stay here', () => M.close()], ['Stop it', async () => { M.close(); await api(`/api/projects/${cur.id}/research-stop`, {}).catch(() => {}); next(); }],
    ['Keep running in the background', () => { cur.background = true; M.close(); next(); }, true]]);
}
function go(view) { leaveGuard(() => goNow(view)); }
function goNow(view) {
  state.view = view;
  if (view !== 'project') state.panel = false;
  render();
  $('#app').classList.remove('sb-mobile-open');
}
function openProject(id) {
  if (state.view === 'project' && state.project === id) return;
  leaveGuard(() => openNow(id));
}
function openNow(id) {
  state.project = id; state.view = 'project'; state.panel = window.innerWidth > 1100;
  render(); $('#app').classList.remove('sb-mobile-open');
}
function topbar(title, crumb = '', right = '') {
  return `<div class="topbar"><button class="icon-btn mobile-only" data-act="menu">${ICON.menu}</button>${crumb ? `<span class="crumb">${crumb} /</span>` : ''}<h1>${title}</h1><span class="sp"></span>${right}</div>`;
}
function render() {
  const main = $('#main');
  main.innerHTML = '';
  if (state.view === 'project' && !PROJECTS.some((x) => x.id === state.project)) state.view = 'home';
  if (state.view === 'home') main.append(...homeView());
  else if (state.view === 'projects') main.append(...projectsView());
  else if (state.view === 'library') main.append(...libraryView());
  else if (state.view === 'references') main.append(...referencesView());
  else if (state.view === 'project') main.append(...projectView());
  $$('[data-act="menu"]', main).forEach((b) => (b.onclick = () => $('#app').classList.toggle('sb-mobile-open')));
  renderPanel();
  renderSidebar();
}

/* ================= home ================= */
function homeView() {
  const top = el(topbar('New project'));
  const steps = ['Upload your brief', 'Answer two short rounds', 'Research from real sources', 'Pick styles from real references', 'Approve the foundation'];
  const v = el(`<div class="view"><div class="home">
    <div class="home-bot">${bot('thinking', 'lg')}</div>
    <h2>What are we designing today?</h2>
    <p class="sub">Upload your brief. I’ll read it, ask only what it doesn’t say, research it from real sources and show you real references to pick from.</p>
    <div class="drop" id="drop"><span class="ic">${ICON.up}</span><span><b>Drop your brief here</b><small>PDF, Word, images, site survey (DWG/DXF), professor’s notes</small></span></div>
    <div class="composer"><div class="files" id="homeFiles"></div>
      <textarea id="homeInput" rows="2" placeholder="Describe the project: typology, site, anything your professor said…"></textarea>
      <div class="composer-row"><button class="c-btn" id="attach" title="Attach files">${ICON.clip}</button><span class="sp"></span><button class="send" id="homeSend" disabled>${ICON.send}</button></div>
    </div>
    <div class="chips">${[['Studio project', 'Studio'], ['Thesis', 'Thesis'], ['Competition entry', 'Competitions'], ['Skip the questions, use defaults', '', 'skip'], ['I already have a programme'], ['Only drawings from my sketch']].map(([c, g, k]) => `<button class="chip"${g ? ` data-g="${g}"` : ''}${k ? ` data-k="${k}"` : ''}>${c}</button>`).join('')}</div>
    <div class="how">${steps.map((s, i) => `<span><i>${i + 1}</i>${s}</span>`).join('')}</div>
    <div class="recent-h"><span>Continue where you left off</span><button data-nav2="projects">View all</button></div>
    <div class="grid" id="recent"></div>
  </div></div>`);
  const files = $('#homeFiles', v), input = $('#homeInput', v), send = $('#homeSend', v);
  const sync = () => (send.disabled = state.attached.some((f) => f.status === 'uploading') || !(input.value.trim() || state.attached.some((f) => f.status === 'done')));
  const remove = (f) => {
    if (f.status === 'uploading') f.xhr.abort();
    else if (f.status === 'done') deleteUpload(f).catch(() => toast('Couldn’t delete ' + f.name + ' from the server'));
    state.attached = state.attached.filter((x) => x !== f); f.chip.remove(); sync();
  };
  const addFiles = (list) => {
    if (!list.length) return;
    state.draftId = state.draftId || 'p' + Date.now();
    startUploads(state.draftId, list, (f) => { updateChip(f.chip, f); sync(); }).forEach((f) => {
      f.chip = fileChip(f, () => remove(f));
      state.attached.push(f); files.appendChild(f.chip);
    });
    sync();
  };
  state.attached.forEach((f) => files.appendChild(f.chip));
  $('#drop', v).onclick = () => pickFiles(addFiles); $('#attach', v).onclick = () => pickFiles(addFiles);
  dropTarget($('#drop', v), addFiles);
  dropTarget($('.composer', v), addFiles);
  input.oninput = sync; sync();
  $$('.chip', v).forEach((c) => (c.onclick = () => {
    if (c.dataset.g) $$('.chip[data-g]', v).forEach((x) => x !== c && x.classList.remove('on'));
    c.classList.toggle('on');
  }));
  const start = async () => {
    send.disabled = true;
    const id = state.draftId || 'p' + Date.now();
    const group = ($('.chip.on[data-g]', v) || {}).dataset?.g || 'Studio';
    const skip = !!$('.chip.on[data-k="skip"]', v);
    const note = [input.value.trim(), ...$$('.chip.on:not([data-g]):not([data-k])', v).map((c) => c.textContent + '.')].filter(Boolean).join('\n');
    const wf = Object.assign(newWf(), { skipAll: skip, group });
    try {
      await api('/api/projects', { id, group, brief: note });
      await api(`/api/projects/${id}/state`, { state: wf });
      await api(`/api/projects/${id}/analyze`, {});
    } catch (e) { toast(e.message); sync(); return; }
    PROJECTS.unshift({ id, name: 'New project', group, status: 'run', reading: true, updated: 'Just now', brief: note, wf });
    state.attached = []; state.draftId = null;
    openNow(id);
  };
  send.onclick = start;
  input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !send.disabled) { e.preventDefault(); start(); } };
  $('[data-nav2]', v).onclick = () => go('projects');
  if (!PROJECTS.length) $('.recent-h', v).remove();
  PROJECTS.slice(0, 3).forEach((p, i) => $('#recent', v).appendChild(projectCard(p, i)));
  return [top, v];
}
function projectCard(p, i = 0) {
  const c = el(`<div class="card" style="animation-delay:${i * 50}ms"><div class="card-thumb plain"><span class="ct-ic">${ICON.folder}</span><span class="ring">${ring(stagePct(p))}</span><button class="icon-btn card-more" title="More">${ICON.more}</button></div>
    <div class="card-body"><b></b><div class="card-meta"><span>${esc(p.group)} · ${p.wf ? esc(stageTitle(p.wf, p.wf.stage)) : 'Reading the brief'}</span><span>${esc(p.updated)}</span></div></div></div>`);
  $('b', c).textContent = p.name;
  c.onclick = () => openProject(p.id);
  $('.card-more', c).onclick = (e) => { e.stopPropagation(); projectMenu(e.currentTarget, p); };
  return c;
}
/* a small menu next to a project (sidebar, cards, top bar) */
function projectMenu(anchor, p) {
  popMenu(anchor, [['Open', ICON.folder, () => openProject(p.id)], ['Delete project…', ICON.trash, () => confirmDelete(p), true]]);
}
function popMenu(anchor, items) {
  $$('.pop-menu').forEach((m) => m.remove());
  const m = el('<div class="pop-menu" role="menu"></div>');
  items.forEach(([label, icon, fn, danger]) => {
    const b = el(`<button role="menuitem" class="${danger ? 'danger' : ''}">${icon}<span></span></button>`);
    $('span', b).textContent = label;
    b.onclick = (e) => { e.stopPropagation(); close(); fn(); };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  m.style.top = (r.bottom + 4 + h > window.innerHeight - 8 ? r.top - h - 4 : r.bottom + 4) + 'px';
  const away = (e) => { if (!m.contains(e.target)) close(); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  function close() { m.remove(); document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', key); window.removeEventListener('resize', close); }
  setTimeout(() => { document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key); window.addEventListener('resize', close); });
}
/* deleting a project removes its whole folder on the server; refused while Claude is working on it */
function confirmDelete(p) {
  const M = modal({ title: 'Delete this project?', sub: p.name });
  M.body.innerHTML = `<p style="margin-top:0">This deletes <b></b> and all its files: the brief you uploaded, your own references, the research notes, the references that were found and every PDF made for it.</p><p class="muted sm" style="margin-bottom:0">It can’t be undone. Download anything you want to keep first.</p>`;
  $('b', M.body).textContent = p.name;
  const busy = p.reading ? 'Claude is still reading this brief. Wait for it to finish, then delete the project.' : researching(p) ? 'Research is running for this project. Stop it first, then delete the project.' : '';
  const warn = (msg) => { $('.warn', M.body)?.remove(); M.body.appendChild(el('<div class="warn sm" style="margin-top:12px"></div>')).textContent = msg; };
  if (busy) warn(busy);
  M.actions([['Cancel', () => M.close()], ['Delete project', async () => {
    const btn = $('.modal-f .btn.danger', M.bg); btn.disabled = true; btn.textContent = 'Deleting…';
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Server error (${r.status})`);
    } catch (e) { warn(e.message === 'Failed to fetch' ? 'The server isn’t running. Start it with python server.py.' : e.message); btn.disabled = false; btn.textContent = 'Delete project'; return; }
    M.close();
    removeProject(p);
    toast(`Deleted ${p.name}`);
  }, true]]);
  const del = $('.modal-f .btn.primary', M.bg); del.classList.replace('primary', 'danger'); if (busy) del.disabled = true;
}
function removeProject(p) {
  const k = PROJECTS.findIndex((x) => x.id === p.id);
  if (k >= 0) PROJECTS.splice(k, 1);
  delete threads[p.id];
  if (state.project === p.id) {
    state.project = null;
    if (state.view === 'project') return goNow('home');
  }
  render();
}

/* ================= all projects ================= */
function projectsView() {
  const top = el(topbar('All projects', '', `<button class="btn primary" data-n>${ICON.plus} New project</button>`));
  $('[data-n]', top).onclick = () => go('home');
  const v = el(`<div class="view"><div class="page">
    <div class="page-h"><div><h2>Projects</h2><p>Studio assignments, thesis and competitions. Each follows its own route from brief to sheets.</p></div></div>
    <div class="tabs">${['All', ...GROUPS, 'Waiting for you'].map((t) => `<button class="tab ${state.tab === t ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="grid" id="pgrid"></div></div></div>`);
  $$('.tab', v).forEach((t) => (t.onclick = () => { state.tab = t.textContent; render(); }));
  const list = PROJECTS.filter((p) => state.tab === 'All' || p.group === state.tab || (state.tab === 'Waiting for you' && p.status === 'wait'));
  list.forEach((p, i) => $('#pgrid', v).appendChild(projectCard(p, i)));
  const n = el(`<div class="card new"><span style="text-align:center">${ICON.plus}<br/>New project</span></div>`); n.onclick = () => go('home'); $('#pgrid', v).appendChild(n);
  return [top, v];
}

/* ================= library: every real file across projects ================= */
const LIB_TABS = ['All', 'Your uploads', 'References', 'Made for you'];
function libraryView() {
  const top = el(topbar('Library'));
  const v = el(`<div class="view"><div class="page"><div class="page-h"><div><h2>Library</h2><p>Every file in your projects: what you uploaded, your own references, and what has been made for you.</p></div></div>
    <div class="tabs">${LIB_TABS.map((t) => `<button class="tab ${state.libTab === t ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="lib-row h"><span></span><span>Name</span><span>Project</span><span>Folder</span><span></span></div><div class="lib-list"><p class="muted sm" style="padding:14px 12px">Loading…</p></div></div></div>`);
  $$('.tab', v).forEach((t) => (t.onclick = () => { state.libTab = t.textContent; render(); }));
  const box = $('.lib-list', v);
  const kindOf = { 'Your uploads': 'upload', References: 'ref', 'Made for you': 'output' }[state.libTab];
  listUploads().then((list) => {
    box.innerHTML = '';
    list.filter((f) => !kindOf || f.kind === kindOf).forEach((f) => {
      const proj = PROJECTS.find((x) => x.id === f.project), k = fileKind(f.name);
      const where = f.kind === 'output' ? 'outputs' : f.kind === 'ref' ? (f.slot === 'site' ? '01_brief/site_images' : `03_references/user/${f.slot}`) : 'uploads';
      const r = el(`<div class="lib-row"><span class="fi ${k[1]} fi-sq">${k[0]}</span><span><a class="lib-link" href="${f.url}" target="_blank"></a><br/><small class="muted"></small></span><span class="muted lp"></span><span class="muted lf"></span><a class="icon-btn" title="Download" href="${dlUrl(f.url)}">${ICON.dl}</a></div>`);
      $('.lib-link', r).textContent = f.name;
      $('small', r).textContent = `${f.kind === 'output' ? 'Made for you' : f.kind === 'ref' ? 'Your reference' : 'Your upload'} · ${fmtSize(f.size)} · ${fmtDate(f.modified)}`;
      $('.lp', r).textContent = proj ? proj.name : f.project; $('.lf', r).textContent = where;
      box.appendChild(r);
    });
    if (!box.children.length) box.innerHTML = '<p class="muted sm" style="padding:14px 12px">Nothing here yet.</p>';
  }).catch(() => { box.innerHTML = '<p class="muted sm" style="padding:14px 12px">The server isn’t running. Start it with <b>python server.py</b>.</p>'; });
  return [top, v];
}

/* ================= references (global view): one folder per project ================= */
function referencesView() {
  const top = el(topbar('Style references'));
  const v = el(`<div class="view"><div class="page"><div class="page-h"><div><h2>Style references</h2><p>Each project keeps its own reference folders. Open a project to see its folders: the ones you filled and the ones the research found.</p></div></div><div class="pfolders"></div></div></div>`);
  const box = $('.pfolders', v);
  if (!PROJECTS.length) box.innerHTML = '<p class="muted">Start a project first.</p>';
  PROJECTS.forEach((p) => {
    const t = el(`<button class="pfolder"><span class="pf-ic">${ICON.folder}</span><span class="pf-t"><b></b><small>${esc(p.group)}</small><small class="pf-c muted">Counting…</small></span></button>`);
    $('b', t).textContent = p.name;
    t.onclick = () => refsModal(p);
    ensureData(p).then(() => {
      const mine = Object.entries(p.refs || {}).filter(([k]) => k !== 'site').reduce((n, [, l]) => n + l.length, 0);
      const found = Object.values(p.research?.found || {}).reduce((n, l) => n + l.length, 0);
      $('.pf-c', t).textContent = `${mine} of yours · ${found} found`;
    });
    box.appendChild(t);
  });
  return [top, v];
}
function lockedRows(p) {
  const P = p.wf?.picks || {}, out = [];
  Object.values(BOARDS).forEach((B) => B.rows.forEach((r) => { if (P[r.id]) out.push([r.label, `${P[r.id].k}: ${P[r.id].d}`]); }));
  if (P.accent) out.push(['Accent colour', P.accent]);
  return out;
}

/* ================= project workspace ================= */
function projectView() {
  const p = PROJECTS.find((x) => x.id === state.project);
  const top = el(topbar('<span class="pt"></span>', esc(p.group), `<span class="pill st"></span><span class="pill rt"></span><span class="pill sg"></span><button class="icon-btn" data-more title="More">${ICON.more}</button><button class="icon-btn" data-panel title="Progress, research, references and files">${ICON.panel}</button>`));
  $('[data-panel]', top).onclick = () => { state.panel = !state.panel; renderPanel(); };
  $('[data-more]', top).onclick = (e) => popMenu(e.currentTarget, [['Delete project…', ICON.trash, () => confirmDelete(p), true]]);
  const ws = el('<div class="ws"></div>');
  if (!threads[p.id]) buildThread(p);
  ws.appendChild(threads[p.id]);
  const dock = el(`<div class="dock"><div class="dock-in"><div class="composer"><textarea rows="1" placeholder="Reply, change something, or ask why…"></textarea>
    <div class="composer-row"><button class="c-btn" data-attach title="Upload files to this project">${ICON.clip}</button><button class="c-btn" data-route title="Route and progress">${ICON.layers} <span></span></button><span class="sp"></span><button class="send" disabled>${ICON.send}</button></div></div>
    <div class="dock-hint">Every choice is saved. After a gate, use Change in the Progress panel and I’ll show what it affects first.</div></div></div>`);
  const ta = $('textarea', dock), sb = $('.send', dock);
  ta.oninput = () => { sb.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; };
  const send = () => { const txt = ta.value.trim(); if (!txt) return; ta.value = ''; ta.style.height = 'auto'; sb.disabled = true; chat(p, txt); };
  sb.onclick = send;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  $('[data-attach]', dock).onclick = () => pickFiles((list) => attachToProject(p, list));
  $('[data-route]', dock).onclick = () => { state.panel = true; state.panelTab = 'progress'; renderPanel(); };
  dropTarget(ws, (list) => attachToProject(p, list));
  ws.appendChild(dock);
  paintTop(p, top, dock);
  if (!p.refs) loadRefs(p);
  requestAnimationFrame(() => scrollDown(p.id));
  return [top, ws];
}
function paintTop(p, top = $('.topbar'), dock = $('.dock')) {
  if (!top) return;
  const st = $('.pill.st', top), wf = p.wf;
  if (!st) return;
  const nb = notBuilt(p);
  st.className = 'pill st ' + (nb ? '' : p.status === 'run' ? 'run' : p.status === 'wait' ? 'accent' : 'ok');
  st.textContent = nb ? 'Next stage not connected' : p.status === 'run' ? 'Working' : p.status === 'wait' ? 'Waiting for you' : 'Complete';
  $('.pt', top).textContent = p.name;
  $('.pill.rt', top).textContent = wf?.route ? `${PURPOSE_SHORT[wf.intake.purpose]} · ${wf.intake.detail}` : 'Route not set';
  $('.pill.sg', top).textContent = wf ? stageTitle(wf, wf.stage) : 'Reading the brief';
  if (dock && $('[data-route] span', dock)) $('[data-route] span', dock).textContent = wf?.route ? ROUTES[wf.route].name : 'Route: after round 1';
}
function scrollDown(id) { const t = threads[id]; if (t) t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }); }
const thOf = (p) => { if (!threads[p.id]) buildThread(p); return $('.thread-in', threads[p.id]); };
function userMsg(html) { return el(`<div class="msg user"><div class="bubble">${html}</div></div>`); }
function aiMsg(html, mode = '') { return el(`<div class="msg ai"><div class="who">${bot(mode)}</div><div class="body">${html}</div></div>`); }

/* free text in the composer: renders policy, skip, or a change after a gate (impact note first) */
async function chat(p, txt) {
  const th = thOf(p), wf = p.wf;
  th.appendChild(userMsg(esc(txt).replace(/\n/g, '<br/>'))); scrollDown(p.id);
  const t = aiMsg('<div class="typing"><i></i><i></i><i></i></div>', 'thinking'); th.appendChild(t); scrollDown(p.id);
  await wait(500);
  const reply = (html) => { $('.body', t).innerHTML = html; $('.bot', t).className = 'bot'; scrollDown(p.id); };
  if (!wf || !p.analysis) return reply('<p>I’m still reading your brief. Once it’s read I’ll ask my questions, and you can reply here.</p>');
  if (/render|photo ?real|blender|lumion|v-?ray|enscape/i.test(txt)) { t.replaceWith(renderPolicyMsg(p)); return scrollDown(p.id); }
  if (wf.stage === 'intake') {
    if (/skip|just do it|defaults|you decide/i.test(txt)) { t.remove(); return applyDefaults(p); }
    return reply('<p>Please answer the questions above first. Type “skip” and I’ll use the recommended answers for all of them.</p>');
  }
  const s = guessStage(wf, txt);
  if (s) { t.replaceWith(impactMsg(p, s, txt)); return scrollDown(p.id); }
  reply('<p>Free-text replies aren’t connected to the engine yet, so I can’t act on this. Use the cards above, and Change in the Progress panel for anything you already approved.</p>');
}
function guessStage(wf, txt) {
  const list = stagesFor(wf), cur = list.indexOf(wf.stage), done = (s) => list.includes(s) && list.indexOf(s) < cur;
  const tests = [['fstyle', /diagram|table style|bubble|zoning|accent|colour|color|style/i], ['intake', /route|purpose|detail|scope|site|presenter|team/i]];
  const hit = tests.find(([s, re]) => re.test(txt) && done(s));
  return hit ? hit[0] : null;
}

/* ================= the stage flow ================= */
function buildThread(p) {
  const wrap = el('<div class="thread"><div class="thread-in"></div></div>');
  threads[p.id] = wrap;
  runReal(p, $('.thread-in', wrap));
  return wrap;
}
function startFlow(p, th) {
  const wf = p.wf, list = stagesFor(wf), cur = list.indexOf(wf.stage);
  list.slice(0, cur).forEach((s) => th.appendChild(doneNode(p, s)));
  th.appendChild(activeNode(p, wf.stage));
}
function saveWf(p) {
  p.status = notBuilt(p) ? 'wait' : p.wf.status; p.updated = 'Just now';
  api(`/api/projects/${p.id}/state`, { state: p.wf }).catch(() => toast('Couldn’t save progress. Is server.py running?'));
  refreshChrome();
}
function finishStage(p, note = '') {
  const wf = p.wf, id = wf.stage, list = stagesFor(wf), th = thOf(p);
  if (STAGE[id].gate) wf.gates[STAGE[id].gate] = { date: today(), note };
  const node = $(`.stage-node[data-stage="${id}"]:not(.static)`, th);
  if (node) { if (id === 'research') node.classList.add('static'); else node.replaceWith(doneNode(p, id)); }
  wf.stage = list[list.indexOf(id) + 1] || 'delivered';
  wf.status = nextStatus(wf.stage);
  saveWf(p);
  th.appendChild(activeNode(p, wf.stage));
  scrollDown(p.id);
}
function stageMsg(p, id, mode = '') {
  const m = aiMsg('', mode); m.classList.add('stage-node'); m.dataset.stage = id;
  return m;
}
function activeNode(p, id) {
  if (id === 'intake') return intakeNode(p);
  if (id === 'research') return researchNode(p);
  if (id === 'fstyle') return boardNode(p, id);
  return pendingNode(p, id);
}
function summary(p, id) {
  const wf = p.wf, P = wf.picks, pk = (r) => (P[r] ? P[r].k : '–');
  return {
    intake: wf.route ? `Route: ${routeLine(wf)}` : '',
    research: 'Notes with sources and real references',
    fstyle: `Table ${pk('programme')} · Bubbles ${pk('bubble')} · Zoning ${pk('zoning')}${P.accent ? ` · ${P.accent} accent` : ''}`,
    dstyle: `Plans ${pk('plan')} · Sections ${pk('section')} · Elevations ${pk('elevation')}`,
    layout: `Layout ${pk('composition')}`,
  }[id] || '';
}
/* the reference picked on each row of a locked board, with its image, so the choice can be seen later in the chat */
const pickUrl = (p, pk) => (!pk?.file ? '' : pk.slot ? `/files/${encodeURIComponent(p.id)}/${encodeURIComponent(pk.file)}?slot=${pk.slot}` : foundUrl(p, pk.type, pk.file));
function pickedRows(p, id) {
  const P = p.wf.picks, box = el('<div class="done-picks"></div>');
  BOARDS[id].rows.forEach((r) => {
    const pk = P[r.id];
    if (!pk) return;
    const url = pickUrl(p, pk), img = url && IMG_EXTS.includes(extOf(pk.file));
    const thumb = img ? `<img src="${url}" alt="" loading="lazy"/>` : url ? `<span class="fi pdf">${fileKind(pk.file)[0]}</span>` : '<span class="muted sm">None</span>';
    const it = el(`<div class="dp">${url ? `<a class="dp-img" href="${url}" target="_blank" title="Open full size">${thumb}</a>` : `<span class="dp-img">${thumb}</span>`}<span class="dp-t"><b></b><small></small></span></div>`);
    $('b', it).textContent = `${r.label}: ${pk.k}`;
    $('small', it).textContent = pk.d;
    box.appendChild(it);
  });
  if (BOARDS[id].accent && P.accent) {
    const hex = (ACCENTS.find((a) => a[0] === P.accent) || [])[1] || 'transparent';
    const it = el(`<div class="dp"><span class="dp-img" style="background:${hex}"></span><span class="dp-t"><b>Accent colour</b><small></small></span></div>`);
    $('small', it).textContent = P.accent;
    box.appendChild(it);
  }
  if (P[id + 'Note']) { const n = el('<p class="muted sm dp-note"></p>'); n.textContent = `Your note: ${P[id + 'Note']}`; box.appendChild(n); }
  return box;
}
function doneNode(p, id) {
  const wf = p.wf, g = wf.gates[STAGE[id].gate] || {};
  const m = el(`<div class="msg ai done-node stage-node static" data-stage="${id}"><div class="who"></div><div class="body"><div class="done-row"><span class="check">${ICON.check}</span><b>${esc(stageTitle(wf, id))}</b><span class="muted ds"></span>${g.date ? `<span class="muted dt">${fmtDay(g.date)}</span>` : ''}</div></div></div>`);
  $('.ds', m).textContent = summary(p, id);
  if (id === 'research') { const host = el('<div class="done-sum"></div>'); $('.body', m).appendChild(host); loadResearch(p).then(() => host.appendChild(researchSummary(p))); }
  if (BOARDS[id]) $('.body', m).appendChild(pickedRows(p, id));
  return m;
}

/* an engine-less stage: say what comes next, don't fake it */
function pendingNode(p, id) {
  const wf = p.wf, m = stageMsg(p, id), S = STAGE[id];
  setTimeout(() => { if (p.status !== 'wait') { p.status = 'wait'; refreshChrome(); } });
  $('.body', m).appendChild(el(`<div class="gate pending"><div class="gate-h"><span class="tag plug-tag">${ICON.plug} Not connected yet</span><b>Next: ${esc(stageTitle(wf, id))}</b></div>
    <p>This stage isn’t connected to the engine yet, so I’ve stopped here rather than show you made-up content. Your answers, the research and your picks are saved, and it will continue from exactly this point.</p>
    ${S.todo ? `<div class="row-h">When connected, it will</div><ul class="todo">${S.todo.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="gate-foot"><small>Everything made so far is under <b>Research</b> and <b>Files</b> in the side panel.</small><button class="btn" data-files>${ICON.folder} Open files</button></div></div>`));
  $('[data-files]', m).onclick = () => { state.panel = true; state.panelTab = 'files'; renderPanel(); };
  return m;
}

/* ---------- S0 intake: two rounds ---------- */
function intakeNode(p) {
  const wf = p.wf, m = stageMsg(p, 'intake'), body = $('.body', m);
  if (wf.skipAll) { body.innerHTML = '<p>You asked me to skip the questions, so I’m using the recommended answers. I’ll still stop once at the foundation, because that check prevents a full redo.</p>'; setTimeout(() => applyDefaults(p, true), 300); return m; }
  const r1Done = () => el(`<div class="done-row in"><span class="check">${ICON.check}</span><b>Round 1</b><span class="muted">${esc(PURPOSE_SHORT[wf.intake.purpose])} · ${esc(wf.intake.detail)} · ${esc(wf.intake.scope)}${wf.intake.presenter ? ' · ' + esc(wf.intake.presenter) : ''}</span><button class="link-btn">Change</button></div>`);
  const showR2 = () => { body.innerHTML = ''; const d = r1Done(); $('.link-btn', d).onclick = () => { wf.round = 1; saveWf(p); showR1(); }; body.append(d, round2Card(p)); };
  const showR1 = () => {
    body.innerHTML = '<p>Two short rounds of questions, then I get to work. I won’t ask about standards, codes, sizes or styles: I research those, and styles come later as real references to pick from.</p>';
    body.appendChild(round1Card(p, () => { wf.round = 2; saveWf(p); showR2(); scrollDown(p.id); }));
  };
  if (wf.round >= 2) showR2(); else showR1();
  return m;
}
function routeCardHTML(i) {
  const wf = { ...newWf(), intake: i, route: routeFor(i) }, r = wf.route;
  const gates = stagesFor(wf).filter((s) => STAGE[s].star).map((s) => STAGE[s].gate);
  const files = delivFor(wf).map((d) => d.file);
  return `<div class="route-card"><div class="rc-h">${ICON.layers}<b>Your route: ${esc(ROUTES[r].name)}</b></div><div class="rc-l">${esc(ROUTES[r].line)}${r === 'W0' && ['Competition entry', 'Professional / client'].includes(i.purpose) ? ' Rules are still checked in full.' : ''}${i.purpose === 'Studio submission' && i.detail === 'Simple' ? ' Every brief item is still accounted for.' : ''}</div>
    <div class="rc-cols"><div><small>I’ll stop and ask you at</small><ul>${gates.map((g) => `<li>${g === 'Foundation approval' ? `<b>${g}</b> (the one hard stop)` : g}</li>`).join('')}</ul></div><div><small>You’ll get</small><ul>${files.slice(0, 9).map((f) => `<li>${esc(f)}</li>`).join('')}${files.length > 9 ? `<li class="muted">and ${files.length - 9} more</li>` : ''}</ul></div></div></div>`;
}
function round1Card(p, onDone) {
  const wf = p.wf, ans = { detail: 'Balanced', scope: 'Full sheets + guides', ...wf.intake };
  if (!ans.purpose && (wf.group || p.group) === 'Competitions') ans.purpose = 'Competition entry';
  const g = el(`<div class="gate"><div class="gate-h"><span class="tag">Round 1 of 2</span><b>The route</b></div><p>These answers decide how strictly I follow the brief and how far I take it.</p><div class="qs"></div><div class="rp"></div><div class="gate-foot"><small></small><button class="btn primary" disabled>Continue to round 2</button></div></div>`);
  const qs = $('.qs', g), btn = $('.gate-foot .btn', g);
  const draw = () => {
    qs.innerHTML = '';
    const need = R1.filter((q) => !(q.id === 'presenter' && ans.purpose === 'Professional / client'));
    need.forEach((q) => {
      const row = el(`<div class="q-row"><div class="q-h"><span class="q-tag">${q.h}</span><span>${esc(q.q)}</span></div><div class="opts"></div></div>`);
      q.o.forEach(([t, s]) => {
        const b = el(`<button class="opt ${ans[q.id] === t ? 'sel' : ''}">${q.rec === t ? '<span class="rec">Recommended</span>' : ''}<b>${esc(t)}</b><small>${esc(s)}</small></button>`);
        b.onclick = () => { ans[q.id] = t; if (q.id === 'purpose' && t === 'Professional / client') delete ans.presenter; draw(); };
        $('.opts', row).appendChild(b);
      });
      qs.appendChild(row);
    });
    const n = need.filter((q) => ans[q.id]).length;
    $('.gate-foot small', g).textContent = `${n} of ${need.length} answered`;
    btn.disabled = n < need.length;
    $('.rp', g).innerHTML = n === need.length ? routeCardHTML(ans) : '';
  };
  draw();
  btn.onclick = () => { Object.assign(wf.intake, ans); onDone(); };
  return g;
}
function briefFact(p, re, group = 'Site') {
  const f = p.analysis?.facts.find((x) => x.group === group && re.test(x.label));
  return f ? f.value : '';
}
function round2Card(p) {
  const wf = p.wf, i = wf.intake, gaps = p.analysis?.missing || [];
  const siteB = briefFact(p, /locat|site|address|place|city|where/i), sizeB = briefFact(p, /size|area|dimension|plot|frontage/i);
  i.gaps = i.gaps || {};
  if (!i.site && siteB) i.site = siteB;
  i.numbers = i.numbers || 'Typical for this type';
  if (!i.sizeMode && sizeB) i.sizeMode = 'Use the brief’s drawing';
  const g = el(`<div class="gate r2"><div class="gate-h"><span class="tag">Round 2 of 2</span><b>The facts I can’t look up</b></div><p>Only what your brief doesn’t already say. Leave anything blank and I’ll take a stated default.</p>
    <div class="f-row"><label>Where is the site?</label><small>City and a landmark, or coordinates, or attach a Google Earth screenshot or site plan.</small>
      <div class="f-in"><input class="inp" data-k="site" placeholder="e.g. NH-16 bypass, 3 km south of Kharagpur station"/><button class="btn sm" data-site>${ICON.clip} Attach image</button></div>
      ${siteB ? `<small class="from">From your brief: ${esc(siteB)}</small>` : ''}<div class="files" data-site-files></div>
      <div class="chips l"><button class="chip" data-typical>No site yet: use a typical plot for this brief</button></div></div>
    <div class="f-row"><label>Site size and road sides</label><small>Dimensions or area, which sides face roads, and north.</small>
      <div class="chips l" data-size>${['Use the brief’s drawing', 'I’ll type it', 'Estimate from the satellite image'].map((t) => `<button class="chip">${t}</button>`).join('')}</div>
      <input class="inp hide" data-k="siteSize" placeholder="e.g. 60 × 50 m; highway on the south, service road on the east; north up"/>${sizeB ? `<small class="from">From your brief: ${esc(sizeB)}</small>` : ''}</div>
    <div class="f-row"><label>Your ideas <span class="muted">(optional)</span></label><small>Any theme, material, climate idea or feeling you want? Leave blank and I’ll propose some.</small>
      <textarea class="inp" data-k="ideas" rows="2" placeholder="e.g. curved roof, exposed brick, courtyard, steel and glass, local craft as inspiration, lots of shade, keep it low-cost…"></textarea></div>
    <div class="f-row"><label>Your own style references</label><small>Do you already have references you like, from your own past projects or others? Add them per type and skip any type.</small>
      <div class="opts cols3" data-refs>${[['No, find them for me', 'I’ll search real sources and show you 3 options per drawing type.', 1], ['Yes, I’ll add some', 'One folder per type below. Any type you leave empty, I search for.'], ['Use my previous project', 'Upload its PDFs or DXFs so its sheets can be studied.']].map(([t, s, r]) => `<button class="opt">${r ? '<span class="rec">Recommended if unsure</span>' : ''}<b>${t}</b><small>${s}</small></button>`).join('')}</div>
      <div class="refs-inline"></div></div>
    <div class="f-row"><label>Key numbers</label><small>Seats, users, vehicles or staff, where the brief leaves them open.</small>
      <div class="chips l" data-num>${['Typical for this type', 'I’ll give numbers'].map((t, k) => `<button class="chip">${t}${k ? '' : ' (recommended)'}</button>`).join('')}</div>
      <input class="inp hide" data-k="numbersText" placeholder="e.g. 150 seats, 3 trucks, 3 buses, 10 cars"/></div>
    ${gaps.length ? `<div class="f-row"><label>Gaps in your brief</label><small>Answer what you can; I’ll assume the rest and say so.</small>${gaps.map((x, k) => `<div class="gap"><b>${esc(x.question)}</b><small>${esc(x.why)}</small><input class="inp" data-gap="${k}" placeholder="Your answer, or leave blank"/></div>`).join('')}</div>` : ''}
    <div class="gate-foot"><button class="link-btn" data-skip>Skip the rest, use defaults</button><button class="btn primary" data-go>Start research</button></div></div>`);
  $$('input[data-k], textarea[data-k]', g).forEach((inp) => { inp.value = i[inp.dataset.k] || ''; inp.oninput = () => (i[inp.dataset.k] = inp.value); });
  $$('[data-gap]', g).forEach((inp) => { inp.value = i.gaps[inp.dataset.gap] || ''; inp.oninput = () => (i.gaps[inp.dataset.gap] = inp.value); });
  const chipGroup = (box, key, onPick) => {
    $$('.chip', box).forEach((c) => {
      const val = c.textContent.replace(' (recommended)', '');
      c.classList.toggle('on', i[key] === val);
      c.onclick = () => { i[key] = val; $$('.chip', box).forEach((x) => x.classList.toggle('on', x === c)); onPick && onPick(val); };
    });
  };
  const sizeIn = $('[data-k="siteSize"]', g), numIn = $('[data-k="numbersText"]', g);
  chipGroup($('[data-size]', g), 'sizeMode', (v) => sizeIn.classList.toggle('hide', v !== 'I’ll type it'));
  sizeIn.classList.toggle('hide', i.sizeMode !== 'I’ll type it');
  chipGroup($('[data-num]', g), 'numbers', (v) => numIn.classList.toggle('hide', v !== 'I’ll give numbers'));
  numIn.classList.toggle('hide', i.numbers !== 'I’ll give numbers');
  const typ = $('[data-typical]', g), siteIn = $('[data-k="site"]', g);
  typ.onclick = () => { const on = !typ.classList.contains('on'); typ.classList.toggle('on', on); i.typicalSite = on; siteIn.disabled = on; };
  typ.classList.toggle('on', !!i.typicalSite); siteIn.disabled = !!i.typicalSite;
  const siteFiles = $('[data-site-files]', g);
  const addSite = (list) => startUploads(p.id, list, (f) => updateChip(f.chip, f), 'site').forEach((f) => { f.chip = fileChip(f); siteFiles.appendChild(f.chip); });
  $('[data-site]', g).onclick = () => pickFiles(addSite, '.png,.jpg,.jpeg,.webp,.pdf,.dwg,.dxf,.kml,.kmz');
  (p.refs?.site || []).forEach((f) => siteFiles.appendChild(fileChip({ ...f, status: 'done' })));
  const refsBox = $('[data-refs]', g), inline = $('.refs-inline', g);
  const drawRefs = () => {
    $$('.opt', refsBox).forEach((o) => o.classList.toggle('sel', $('b', o).textContent === i.refs));
    inline.innerHTML = '';
    if (i.refs === 'Yes, I’ll add some') inline.append(el('<small class="hint">One or more images or PDFs per folder. Empty folders are fine; those types get searched. You can add or replace files later under References.</small>'), refsGrid(p, { compact: true }));
    if (i.refs === 'Use my previous project') inline.append(refsGrid(p, { only: ['previous_project'] }));
  };
  $$('.opt', refsBox).forEach((o) => (o.onclick = () => { i.refs = $('b', o).textContent; drawRefs(); }));
  drawRefs();
  $('[data-skip]', g).onclick = () => applyDefaults(p);
  $('[data-go]', g).onclick = () => completeIntake(p);
  return g;
}
function applyDefaults(p, all = false) {
  const wf = p.wf, i = wf.intake;
  if (all || !i.purpose) Object.assign(i, { purpose: i.purpose || ((wf.group || p.group) === 'Competitions' ? 'Competition entry' : 'Studio submission'), detail: i.detail || 'Balanced', scope: i.scope || 'Full sheets + guides' });
  if (!i.presenter && i.purpose !== 'Professional / client') i.presenter = 'Me, as a student';
  i.refs = i.refs || 'No, find them for me'; i.numbers = i.numbers || 'Typical for this type'; i.sizeMode = i.sizeMode || 'Use the brief’s drawing';
  if (!i.site && !briefFact(p, /locat|site|address|place|city|where/i)) i.typicalSite = true;
  if (all) { wf.skipBoards = true; wf.skipAll = false; }
  completeIntake(p, all ? 'Recommended answers used' : 'Rest left to defaults');
}
function completeIntake(p, note = '') {
  const wf = p.wf, i = wf.intake;
  i.refs = i.refs || 'No, find them for me'; i.numbers = i.numbers || 'Typical for this type';
  wf.route = routeFor(i); wf.layers = layersFor(i); wf.round = 3;
  const r = p.analysis, tier = TIER_OF[i.detail] || 'Studio Standard';
  const checked = r.checklist.filter((it) => it.required_by_brief || it.tiers.includes(tier)).map((it) => it.id);
  api(`/api/projects/${p.id}/checklist`, { tier, checked, answers: i.gaps || {} })
    .then((res) => { p.checklist = res.checklist; showOutputs(p, thOf(p), res.files, true); })
    .catch((e) => toast(e.message));
  finishStage(p, note || `Route: ${ROUTES[wf.route].name}`);
}

/* ---------- S1 research and references (real: research_engine.py). Starts only when you press Start. ---------- */
const JOB_STATE = { queued: 'Waiting', running: 'Working', done: 'Done', skipped: 'Your refs', error: 'Failed' };
function researchNode(p) {
  const m = stageMsg(p, 'research', 'search'), body = $('.body', m);
  const host = el('<div class="muted sm">Checking…</div>'); body.appendChild(host);
  loadResearch(p).then((R) => {
    const st = R.status;
    host.replaceWith(st && (st.state === 'running' || Object.keys(st.jobs || {}).length) ? researchCard(p, m) : researchStart(p, m));
  });
  return m;
}
function researchStart(p, node) {
  const R = p.research || {}, busyId = R.running && R.running !== p.id ? R.running : null, other = busyId && PROJECTS.find((x) => x.id === busyId);
  const g = el(`<div class="gate"><div class="gate-h"><span class="tag">Research</span><b>Ready to research</b></div>
    <p>Site, climate, rules, space standards and precedents from real sources, plus real references for every drawing type you left empty. About 10–20 minutes, using your Claude usage. The research notes come as one PDF; the references are shown here in the chat for you to pick from.</p>
    ${busyId ? `<div class="warn sm"><b>Another project is researching:</b> ${esc(other ? other.name : busyId)}. Only one runs at a time.</div>` : ''}
    <div class="gate-foot"><small>Runs only while you’re on this project, unless you choose to keep it going in the background.</small><div class="btns">${other ? '<button class="btn" data-open>Open that project</button>' : ''}<button class="btn primary" data-go ${busyId ? 'disabled' : ''}>Start research</button></div></div></div>`);
  if ($('[data-open]', g)) $('[data-open]', g).onclick = () => openProject(other.id);
  $('[data-go]', g).onclick = async () => {
    $('[data-go]', g).disabled = true;
    try { await api(`/api/projects/${p.id}/research`, {}); p.background = false; g.replaceWith(researchCard(p, node)); }
    catch (e) { toast(e.message); await loadResearch(p); g.replaceWith(researchStart(p, node)); }
  };
  return g;
}
/* compact live card: one bar and one line; the per-job rows are folded away */
function researchCard(p, node) {
  const c = el(`<div class="task rcard"><div class="task-h">${bot('search')}<div class="tt"><b>Research and references</b><div class="shimmer">Starting…</div></div><span class="elapsed muted"></span><button class="btn sm" data-stop>Stop</button></div>
    <div class="rbar"><i></i></div><details class="rdet"><summary>Details</summary><div class="workers"><div class="wk-h">Research</div><div class="rw"></div><div class="wk-h">References</div><div class="fw"></div></div></details><div class="res-foot"></div></div>`);
  const rows = {};
  $('[data-stop]', c).onclick = async () => { $('[data-stop]', c).disabled = true; await api(`/api/projects/${p.id}/research-stop`, {}).catch((e) => toast(e.message)); };
  const row = (id, job) => {
    if (rows[id]) return rows[id];
    const r = el('<div class="wk"><span class="st"><span class="queued"></span></span><span class="name"><span class="nm"></span><small></small></span><span class="pct"></span></div>');
    $('.nm', r).textContent = job.label;
    $(job.kind === 'refs' ? '.fw' : '.rw', c).appendChild(r);
    return (rows[id] = r);
  };
  const paint = (st) => {
    const jobs = Object.entries(st.jobs || {});
    jobs.forEach(([id, j]) => {
      const r = row(id, j);
      $('.st', r).innerHTML = j.state === 'running' ? '<span class="spin"></span>' : j.state === 'done' || j.state === 'skipped' ? `<span class="check">${ICON.check}</span>` : j.state === 'error' ? `<span class="x-ic">${ICON.x}</span>` : '<span class="queued"></span>';
      $('small', r).textContent = j.state === 'error' ? j.error || 'Failed' : j.state === 'running' ? (j.log.at(-1)?.text || 'Starting…') : j.note || '';
      $('.pct', r).textContent = JOB_STATE[j.state] || j.state;
      r.classList.toggle('err', j.state === 'error');
    });
    const done = jobs.filter(([, j]) => !['queued', 'running'].includes(j.state)).length;
    $('.rbar i', c).style.width = (jobs.length ? (done / jobs.length) * 100 : 0) + '%';
    if (st.started) {
      const end = st.finished ? new Date(st.finished) : Date.now(), secs = Math.max(0, (end - new Date(st.started)) / 1000);
      $('.elapsed', c).textContent = `${done} of ${jobs.length} · ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    }
    const live = jobs.map(([, j]) => j).find((j) => j.state === 'running');
    if (live && $('.shimmer', c)) $('.shimmer', c).textContent = `${live.label}: ${live.log.at(-1)?.text || 'starting'}…`;
  };
  const finished = (st) => {
    $('.bot', c).className = 'bot done'; $('[data-stop]', c).remove();
    const sh = $('.shimmer', c); if (sh) sh.outerHTML = `<div class="muted sm">${st.stopped ? 'Stopped' : 'Finished'}${st.cost_usd ? ` · about $${st.cost_usd.toFixed(2)} of usage` : ''}</div>`;
    const failed = Object.entries(st.jobs).filter(([, j]) => j.state === 'error').map(([id]) => id);
    const foot = $('.res-foot', c); foot.innerHTML = '';
    foot.appendChild(researchSummary(p));
    const isCurrent = p.wf.stage === 'research' && !node.classList.contains('static');
    const note = st.stopped ? `Stopped with ${failed.length} topic${failed.length > 1 ? 's' : ''} not done. You can carry on from here.` : failed.length ? `${failed.length} topic${failed.length > 1 ? 's' : ''} failed (see Details). Try again, or continue without.` : '';
    const bar = el(`<div class="gate-foot wrap"><small>${note}</small><div class="btns">${failed.length ? `<button class="btn" data-retry>${st.stopped ? 'Carry on' : 'Try the failed ones again'}</button>` : ''}<button class="btn" data-rerun>Run it all again</button>${isCurrent ? '<button class="btn primary" data-go>Continue to the style board</button>' : ''}</div></div>`);
    if ($('[data-retry]', bar)) $('[data-retry]', bar).onclick = () => rerun(p, c, node, failed);
    $('[data-rerun]', bar).onclick = () => { if (confirm('Run all the research and reference searches again? This uses your Claude usage again and replaces what was found.')) rerun(p, c, node, null); };
    if ($('[data-go]', bar)) $('[data-go]', bar).onclick = () => finishStage(p, failed.length ? `${failed.length} topic(s) skipped` : '');
    foot.appendChild(bar);
    p.background = false; p.status = 'wait'; refreshChrome();
    scrollDown(p.id);
  };
  const poll = async () => {
    const R = await loadResearch(p);
    if (!R.status) return setTimeout(poll, 2500);
    paint(R.status);
    if (R.status.state === 'running') { if (p.status !== 'run') { p.status = 'run'; refreshChrome(); } return setTimeout(poll, 2500); }
    finished(R.status);
  };
  poll();
  return c;
}
function rerun(p, card, node, only) {
  api(`/api/projects/${p.id}/research`, only ? { only } : {}).then(() => card.replaceWith(researchCard(p, node))).catch((e) => toast(e.message));
}
/* a few lines and the PDF; the notes themselves are only in the PDF */
function researchSummary(p) {
  const R = p.research || { notes: {}, found: {} }, st = R.status || {};
  const notes = RESEARCH_TOPICS.filter((t) => R.notes[t]), sources = notes.reduce((n, t) => n + (R.notes[t].sources || []).length, 0);
  const types = Object.keys(FOUND).filter((t) => R.found[t]?.length), refs = types.reduce((n, t) => n + R.found[t].length, 0);
  const gaps = notes.reduce((n, t) => n + (R.notes[t].gaps || []).length, 0);
  const box = el(`<div class="rs"><p class="note-line" style="margin:0 0 8px">${notes.length} research note${notes.length === 1 ? '' : 's'} from ${sources} sources${gaps ? `, ${gaps} item${gaps > 1 ? 's' : ''} still to verify` : ''} · ${refs} reference${refs === 1 ? '' : 's'} across ${types.length} drawing type${types.length === 1 ? '' : 's'}. The notes are in the PDF; you pick from the references on the style board.</p><div class="out-list"></div></div>`);
  if (st.pdf) $('.out-list', box).appendChild(pdfRow(st.pdf, outUrl(p, st.pdf), 'Every research point with its source'));
  else if (notes.length) $('.out-list', box).innerHTML = '<p class="muted sm">The PDF couldn’t be made (Chrome or Edge is needed). The notes are in 02_research.</p>';
  if (types.length) { const b = el(`<button class="btn sm">${ICON.folder} Browse the references</button>`); b.onclick = () => refsModal(p); box.appendChild(b); }
  return box;
}

/* ---------- S3 style boards and the S8 composition board, from real references ---------- */
function boardNode(p, id) {
  const wf = p.wf, m = stageMsg(p, id), body = $('.body', m);
  const intro = { fstyle: 'Before the foundation is drawn, pick how its tables and diagrams should look.', dstyle: 'Pick the style of the plans, sections and elevations.', layout: 'Last choice: how the sheets are laid out.' }[id];
  body.appendChild(el(`<p>${intro}</p>`));
  const holder = el('<div class="muted sm">Loading the references…</div>'); body.appendChild(holder);
  ensureData(p).then(() => {
    if (wf.skipBoards) {
      BOARDS[id].rows.forEach((r) => { const f = shownRefs(p, r.found, 0)[0], u = p.refs?.[r.slot]?.[0]; wf.picks[r.id] = u ? { k: 'Yours', d: `Your reference (${u.name})`, file: u.name, slot: r.slot } : f ? { k: 'A', d: f.traits, file: f.file, type: r.found } : { k: '–', d: 'No reference found' }; });
      if (BOARDS[id].accent) wf.picks.accent = ACCENTS[seedOf(p) % ACCENTS.length][0];
      holder.replaceWith(el('<p>Using the first option of each row (you asked to skip the questions). Change it any time from the Progress panel.</p>'));
      setTimeout(() => finishStage(p, 'Recommended style used'), 400);
      return;
    }
    holder.replaceWith(boardCard(p, id, (note) => finishStage(p, note)));
  });
  return m;
}
/* 3 references of a type, starting at the project's seed offset (so classmates on one brief see different ones) */
function shownRefs(p, type, round) {
  const items = p.research?.found?.[type] || [];
  if (items.length <= 3) return items;
  const off = (seedOf(p) + round * 3) % items.length;
  return [0, 1, 2].map((k) => items[(off + k) % items.length]);
}
function refOption(p, type, it, k) {
  const page = safeUrl(it.page_url);
  const b = el(`<div class="opt bopt" role="button" tabindex="0"><div class="thumb paper"><img src="${foundUrl(p, type, it.file)}" alt="" loading="lazy"/></div>
    <div class="cap"><span class="k">${k}</span><small></small></div><div class="credit"><span></span><span class="links">${page ? `<a href="${esc(page)}" target="_blank" rel="noopener noreferrer">${ICON.ext} Source</a>` : ''}<a href="${foundUrl(p, type, it.file)}" target="_blank">Full size</a></span></div></div>`);
  $('.cap small', b).textContent = it.traits;
  $('.credit > span', b).textContent = [it.project, it.author, it.source_site].filter(Boolean).join(' · ');
  $$('.credit a', b).forEach((a) => (a.onclick = (e) => e.stopPropagation()));
  b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } };
  return b;
}
function boardCard(p, id, onLock) {
  const B = BOARDS[id], wf = p.wf, seed = seedOf(p);
  const round = {}, picks = {};
  const g = el(`<div class="gate board"><div class="gate-h"><span class="tag">${B.tag}</span><b>${B.title}</b></div><p>${B.desc}</p><div class="brows"></div>
    ${B.accent ? '<div class="acc-row"><div class="row-h">Accent colour<small>One accent on every sheet</small></div><div class="swatches"></div></div>' : ''}
    ${id === 'layout' ? `<div class="sheet-rules">${ICON.flag}<span></span></div>` : ''}
    <input class="inp mix" placeholder="Mix or adjust, e.g. “table A but with B’s zone colours” (optional)"/>
    <div class="gate-foot"><small class="cnt"></small><button class="btn primary" data-lock disabled>Lock ${B.rows.length > 1 ? 'these styles' : 'this layout'}</button></div></div>`);
  if (id === 'layout') {
    const rule = briefFact(p, /sheet|drawing size|format|presentation/i, 'Deliverables');
    $('.sheet-rules span', g).textContent = rule ? `Sheet rules from your brief: ${rule}` : 'Sheet size, count and orientation follow your brief.';
  }
  const hasOptions = (r) => (p.refs?.[r.slot] || []).length || (p.research?.found?.[r.found] || []).length;
  const count = () => {
    const rows = B.rows.filter(hasOptions); // a row with nothing to pick from doesn't block the lock
    const n = rows.filter((r) => picks[r.id]).length + (B.accent && picks.accent ? 1 : 0), need = rows.length + (B.accent ? 1 : 0);
    $('.cnt', g).textContent = `${n} of ${need} picked`; $('[data-lock]', g).disabled = n < need;
  };
  const drawRow = (row) => {
    const mine = (p.refs?.[row.slot] || []).slice(0, 3), found = p.research?.found?.[row.found] || [];
    const r = el(`<div class="brow" data-row="${row.id}"><div class="row-h">${row.label}<small></small></div><div class="bopts"></div><div class="row-a"></div><div class="adj hide"><input class="inp" placeholder="What should change? e.g. “like this but lighter lines”"/></div></div>`);
    const opts = $('.bopts', r), acts = $('.row-a', r);
    const pick = (o, b) => { picks[row.id] = o; $$('.opt', opts).forEach((x) => x.classList.toggle('sel', x === b)); count(); };
    const userCard = (f, k, text) => {
      const b = el(`<div class="opt bopt" role="button" tabindex="0"><div class="thumb paper">${IMG_EXTS.includes(extOf(f.name)) ? `<img src="${f.url}" alt=""/>` : `<span class="fi pdf big">${fileKind(f.name)[0]}</span>`}</div><div class="cap"><span class="k">${k}</span><small></small></div></div>`);
      $('.cap small', b).textContent = text;
      return b;
    };
    if (mine.length) {
      $('.row-h small', r).textContent = 'From your references';
      if (mine.length === 1) {
        const f = mine[0], use = userCard(f, '✓', `Use the style of your reference (${f.name})`);
        const adj = el(`<div class="opt bopt adj-b" role="button" tabindex="0"><div class="thumb paper flat">${ICON.refresh}</div><div class="cap"><span class="k">~</span><small>Like mine, but adjusted: say what to change</small></div></div>`);
        use.onclick = () => { $('.adj', r).classList.add('hide'); pick({ k: 'Yours', d: `Your reference (${f.name})`, file: f.name, slot: row.slot }, use); };
        adj.onclick = () => { $('.adj', r).classList.remove('hide'); pick({ k: 'Yours, adjusted', d: `Your reference (${f.name}), adjusted`, file: f.name, slot: row.slot }, adj); };
        opts.append(use, adj);
      } else mine.forEach((f, k) => { const b = userCard(f, 'ABC'[k], `Your reference: ${f.name}`); b.onclick = () => pick({ k: 'ABC'[k], d: `Your reference (${f.name})`, file: f.name, slot: row.slot }, b); opts.appendChild(b); });
    } else if (found.length) {
      $('.row-h small', r).textContent = `${found.length} found; showing ${Math.min(3, found.length)}`;
      shownRefs(p, row.found, round[row.id] || 0).forEach((it, k) => {
        const b = refOption(p, row.found, it, 'ABC'[k]);
        if (picks[row.id]?.file === it.file) b.classList.add('sel');
        b.onclick = () => pick({ k: 'ABC'[k], d: it.traits, file: it.file, type: row.found, source: it.page_url }, b);
        opts.appendChild(b);
      });
      if (found.length > 3) { const more = el(`<button class="btn sm">${ICON.refresh} Show other options</button>`); more.onclick = () => { round[row.id] = (round[row.id] || 0) + 1; delete picks[row.id]; r.replaceWith(drawRow(row)); count(); }; acts.appendChild(more); }
    } else {
      $('.row-h small', r).textContent = 'Nothing found for this type';
      opts.replaceWith(el('<p class="muted sm" style="margin:0 0 6px">The search found no usable references for this type. Search again, or upload one image you like.</p>'));
    }
    const again = el(`<button class="btn sm">${ICON.refresh} Search again</button>`);
    again.onclick = () => {
      if (!confirm(`Search the web again for ${FOUND[row.found][0].toLowerCase()}? This uses your Claude usage and replaces the ones found.`)) return;
      again.disabled = true; again.textContent = 'Searching… (a few minutes)';
      api(`/api/projects/${p.id}/research`, { only: [row.found] }).then(() => waitResearch(p)).then(() => { r.replaceWith(drawRow(row)); count(); }).catch((e) => { toast(e.message); again.disabled = false; });
    };
    const up = el(`<button class="btn sm">${ICON.up} Upload my own</button>`);
    up.onclick = () => pickFiles((list) => Promise.all(startUploads(p.id, list, () => {}, row.slot).map((f) => f.done)).then(() => loadRefs(p)).then(() => { r.replaceWith(drawRow(row)); count(); }), '.png,.jpg,.jpeg,.webp,.pdf');
    if (!mine.length) acts.appendChild(again);
    acts.appendChild(up);
    return r;
  };
  B.rows.forEach((row) => $('.brows', g).appendChild(drawRow(row)));
  if (B.accent) {
    const sw = $('.swatches', g);
    ACCENTS.map((a, k) => ACCENTS[(seed + k) % ACCENTS.length]).forEach(([n, hex], k) => {
      const b = el(`<button class="sw"><i style="background:${hex}"></i>${n}${k ? '' : ' <small>suggested</small>'}</button>`);
      b.onclick = () => { picks.accent = n; $$('.sw', sw).forEach((x) => x.classList.toggle('on', x === b)); count(); };
      sw.appendChild(b);
    });
  }
  count();
  $('[data-lock]', g).onclick = () => {
    B.rows.forEach((r) => (wf.picks[r.id] = picks[r.id] || { k: '–', d: 'No reference found; follows the other picks' }));
    if (B.accent) wf.picks.accent = picks.accent;
    const mix = $('.mix', g).value.trim(), adj = $$('.adj:not(.hide) input', g).map((x) => x.value.trim()).filter(Boolean).join('; ');
    if (mix || adj) wf.picks[id + 'Note'] = [mix, adj].filter(Boolean).join('; ');
    onLock(B.rows.map((r) => `${r.label} ${wf.picks[r.id].k}`).join(', '));
  };
  return g;
}
async function waitResearch(p) {
  for (;;) { await wait(4000); const R = await loadResearch(p); if (!R.status || R.status.state !== 'running') return R; }
}

/* ---------- renders policy (S7): the choice is recorded for the drawings stage ---------- */
function renderPolicyMsg(p) {
  const wf = p.wf;
  const m = aiMsg(`<p>Photoreal renders need a full 3D model (e.g. in Blender) and take much more time and cost. Clean 3D views can instead be drawn straight from your drawings: aerial, exploded floors, a street-level line perspective. Which do you want? I’ll use your answer when the drawings stage runs.</p>
    <div class="opts cols2"><button class="opt" data-k="vector"><span class="rec">Recommended</span><b>Vector 3D views</b><small>Aerial, exploded floors and a street-level perspective, in your locked style.</small></button><button class="opt" data-k="handoff"><b>A 3D-model hand-off</b><small>A folder with the model, levels, materials and your style, for a separate Blender render phase.</small></button></div>`);
  $$('.opt', m).forEach((o) => (o.onclick = () => {
    wf.renders = o.dataset.k; saveWf(p);
    $$('.opt', m).forEach((x) => x.classList.toggle('sel', x === o));
  }));
  return m;
}

/* ---------- change after a gate: impact note first ---------- */
const APPROVED_AS = { intake: 'route and your answers', fstyle: 'foundation style' };
const IMPACT = { intake: 'Your answers and the route. The research uses them, so you can run it again afterwards.', fstyle: 'The style of the foundation tables and diagrams' };
function impactMsg(p, stageId, txt = '') {
  const wf = p.wf, list = stagesFor(wf), from = list.indexOf(stageId), cur = list.indexOf(wf.stage);
  const redo = list.slice(from, Math.min(cur + 1, list.length)).filter((s) => IMPACT[s]);
  const m = aiMsg(`<div class="gate impact"><div class="gate-h"><span class="tag warn-tag">${ICON.warn} Before I change this</span><b>This changes the approved ${esc(APPROVED_AS[stageId] || STAGE[stageId].t.toLowerCase())}</b></div>
    ${txt ? `<p>You asked: “${esc(txt)}”</p>` : ''}
    <div class="imp"><div><small>What gets redone</small><ul>${redo.map((s) => `<li>${IMPACT[s]}</li>`).join('')}</ul></div></div>
    <div class="gate-foot"><small>Earlier picks stay in the log; nothing is changed silently.</small><div class="btns"><button class="btn" data-no>Keep it as it is</button><button class="btn primary" data-go>Go ahead</button></div></div></div>`);
  $('[data-no]', m).onclick = () => { $('.gate', m).innerHTML = '<p class="muted" style="margin:0">Kept as it is.</p>'; };
  $('[data-go]', m).onclick = () => {
    wf.changes.push({ date: today(), stage: STAGE[stageId].gate || STAGE[stageId].t, what: txt || 'Reopened from the Progress panel' });
    $('.gate', m).innerHTML = '<p class="muted" style="margin:0">Reopened below. Logged under “Changes after approval”.</p>';
    reopen(p, stageId);
  };
  return m;
}
function reopen(p, stageId) {
  const wf = p.wf, list = stagesFor(wf), th = thOf(p);
  list.slice(list.indexOf(stageId)).forEach((s) => { if (STAGE[s].gate) delete wf.gates[STAGE[s].gate]; });
  $$('.stage-node:not(.static)', th).forEach((n) => n.classList.add('static', 'stale'));
  if (stageId === 'intake') wf.round = 1;
  wf.stage = stageId; wf.status = 'wait';
  saveWf(p);
  th.appendChild(activeNode(p, stageId)); scrollDown(p.id);
}

/* ================= brief reading (server.py → brief_engine.py → Claude) ================= */
async function api(url, body) {
  const r = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch { /* non-JSON error page */ }
  if (!r.ok) throw new Error(j.error || (r.status === 404 || r.status === 501 ? 'Run python server.py to use this' : `Server error (${r.status})`));
  return j;
}
function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso), mins = (Date.now() - d) / 60000;
  if (mins < 1) return 'Just now';
  if (mins < 60) return Math.round(mins) + ' min ago';
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return fmtDate(iso);
}
const fromServer = (s) => ({ id: s.id, name: s.name, group: s.group || 'Studio', reading: !!s.reading, status: s.reading ? 'run' : s.state ? s.state.status : 'wait', updated: fmtWhen(s.updated), brief: s.brief || '', wf: s.state || null });

async function loadProjects() {
  try {
    const { projects } = await api('/api/projects');
    projects.forEach((s) => { if (!PROJECTS.some((x) => x.id === s.id)) PROJECTS.push(fromServer(s)); });
    render();
  } catch {
    document.body.appendChild(el('<div class="server-warn"><b>The app server isn’t running.</b> Uploads and brief reading won’t work. Stop this server, then start the app from the project folder with <b>python server.py</b> and reload.</div>'));
  }
}
async function runReal(p, th) {
  let info;
  try { info = await api(`/api/projects/${p.id}`); } catch (e) { th.appendChild(aiMsg(`<p>${esc(e.message)}.</p>`)); return; }
  if (info.project.state) p.wf = info.project.state;
  p.checklist = info.checklist;
  const files = info.files.filter((f) => f.kind === 'upload');
  const um = userMsg(`${p.brief ? esc(p.brief).replace(/\n/g, '<br/>') : ''}${p.brief && files.length ? '<br/><br/>' : ''}${files.length ? '<div class="files" style="margin:0"></div>' : ''}`);
  files.forEach((f) => $('.files', um).appendChild(fileChip(f)));
  if (p.brief || files.length) th.appendChild(um);
  const a = info.analysis;
  if (!a) {
    const m = aiMsg('<p>I haven’t read this project’s files yet.</p><button class="btn primary">Read the brief</button>');
    $('.btn', m).onclick = () => { m.remove(); readBrief(p); };
    th.appendChild(m);
  } else if (a.state === 'running') followAnalysis(p, th);
  else if (a.state === 'error') showReadError(p, th, a.error);
  else { await ensureData(p); showAnalysis(p, th, a.result, info.files); }
  scrollDown(p.id);
}
async function readBrief(p) {
  try { await api(`/api/projects/${p.id}/analyze`, {}); } catch (e) { toast(e.message); return; }
  p.status = 'run'; p.reading = true; refreshChrome();
  followAnalysis(p, thOf(p));
}
function showReadError(p, th, error) {
  const m = aiMsg('<p>I couldn’t finish reading the brief.</p><p class="err-line"></p><button class="btn">Try again</button>');
  $('.err-line', m).textContent = error || 'Unknown error';
  $('.btn', m).onclick = () => { $('.btn', m).disabled = true; readBrief(p); };
  th.appendChild(m); scrollDown(p.id);
  p.status = 'wait'; p.reading = false; refreshChrome();
}
/* live progress card that follows the real run */
async function followAnalysis(p, th) {
  let files = [];
  try { files = (await listUploads(p.id)).filter((f) => f.kind === 'upload').map((f) => f.name); } catch { /* the poll below reports errors */ }
  const card = el(`<div class="task"><div class="task-h">${bot('search')}<div class="tt"><b>Reading your brief</b><div class="shimmer">Starting Claude…</div></div><span class="elapsed muted"></span><button class="icon-btn" title="Show log">${ICON.chev}</button></div><div class="workers"></div><div class="task-log"></div></div>`);
  $('.task-h .icon-btn', card).onclick = () => $('.task-log', card).classList.toggle('open');
  const rows = {};
  [...files, '__out'].forEach((f) => {
    const r = el('<div class="wk"><span class="st"><span class="queued"></span></span><span class="name"></span><span class="pct">Waiting</span></div>');
    $('.name', r).innerHTML = f === '__out' ? 'Brief digest<small>Facts, gaps, spaces, deliverables, sheet rules</small>' : `${esc(f)}<small>${fileKind(f)[0]}</small>`;
    rows[f] = r; $('.workers', card).appendChild(r);
  });
  const set = (r, s) => {
    if (!r || r.dataset.s === s) return;
    r.dataset.s = s;
    $('.st', r).innerHTML = s === 'busy' ? '<span class="spin"></span>' : s === 'done' ? `<span class="check">${ICON.check}</span>` : '<span class="queued"></span>';
    $('.pct', r).textContent = s === 'busy' ? (r === rows.__out ? 'Writing' : 'Reading') : s === 'done' ? 'Done' : 'Waiting';
  };
  const m = aiMsg(''); $('.body', m).appendChild(card); th.appendChild(m); scrollDown(p.id);
  let shown = 0;
  const tick = async () => {
    let a;
    try { a = (await api(`/api/projects/${p.id}/analysis`)).analysis; } catch { return setTimeout(tick, 3000); }
    if (!a) return setTimeout(tick, 1500);
    const secs = Math.max(0, (Date.now() - new Date(a.started)) / 1000);
    $('.elapsed', card).textContent = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    a.log.slice(shown).forEach((l) => $('.task-log', card).appendChild(el(`<div>${esc(l.text)}</div>`)));
    shown = a.log.length;
    const last = a.log[a.log.length - 1];
    if (last && $('.shimmer', card)) $('.shimmer', card).textContent = last.text + '…';
    const readFiles = [...new Set(a.log.filter((l) => l.kind === 'read').map((l) => l.file))];
    readFiles.forEach((f) => set(rows[f], 'done'));
    if (last && last.kind === 'read') set(rows[last.file], 'busy');
    if (last && (last.kind === 'think' || last.kind === 'write')) set(rows.__out, 'busy');
    if (a.state === 'running') return setTimeout(tick, 1500);
    if (a.state === 'error') {
      $('.bot', card).className = 'bot';
      $('.shimmer', card).outerHTML = '<div class="muted" style="font-size:12.5px">Stopped</div>';
      return showReadError(p, th, a.error);
    }
    Object.values(rows).forEach((r) => set(r, 'done'));
    $('.bot', card).className = 'bot done';
    const n = readFiles.length;
    $('.shimmer', card).outerHTML = `<div class="muted" style="font-size:12.5px">Read ${n ? `${n} file${n > 1 ? 's' : ''}` : 'your note'} in ${$('.elapsed', card).textContent}</div>`;
    const info = await api(`/api/projects/${p.id}`);
    p.checklist = info.checklist;
    if (info.project.state) p.wf = info.project.state;
    await ensureData(p);
    showAnalysis(p, th, a.result, info.files);
  };
  tick();
}
/* brief digest: two lines in chat; facts, spaces, deliverables and mismatches are in the PDF */
function showAnalysis(p, th, r, files = []) {
  p.analysis = r; p.reading = false;
  p.name = r.project_name || p.name;
  if (!p.wf) p.wf = Object.assign(newWf(), { group: p.group });
  p.status = notBuilt(p) ? 'wait' : p.wf.status;
  const n = r.mismatches.length;
  th.appendChild(aiMsg(`<p><b>${esc(r.project_name)}</b>. ${esc(r.one_line)}</p>
    <p class="note-line">The full digest (facts, assumptions, spaces and what to hand in) is in the PDF below.${n ? ` ${n} thing${n > 1 ? 's' : ''} in the brief ${n > 1 ? 'don’t' : 'doesn’t'} add up; ${n > 1 ? 'they are' : 'it is'} listed there and settled at the foundation check.` : ''}</p>`));
  showOutputs(p, th, files, false);
  startFlow(p, th);
  refreshChrome();
  scrollDown(p.id);
}
function checklistGate(p, r, saved) {
  const tier = saved ? saved.tier : TIER_OF[p.wf?.intake.detail] || r.recommended_tier;
  const checked = new Set(saved ? saved.checked : []);
  const answers = saved ? { ...saved.answers } : {};
  const byGroup = {};
  r.checklist.forEach((it) => (byGroup[it.group] = byGroup[it.group] || []).push(it));
  const g = el(`<div class="gate cl"><p>Items your brief asks for are marked. Tick anything else you want to hand in; the summary PDF lists them as your plan.</p>
    <div class="cl-list">${Object.entries(byGroup).map(([grp, items]) => `<div class="cl-g"><div class="cl-h"><span>${esc(grp)}</span><button class="cl-all">Select all</button></div>${items.map((it) => `<label class="cl-i"><input type="checkbox" value="${esc(it.id)}"/><span class="cl-t"><b>${esc(it.title)}</b>${it.required_by_brief ? ' <span class="ftag req">Required by brief</span>' : ''}<small>${esc(it.detail)}</small></span></label>`).join('')}</div>`).join('')}</div>
    <div class="gate-foot"><small class="cl-count"></small><button class="btn primary">Update checklist and PDF</button></div></div>`);
  const boxes = $$('input[type=checkbox]', g), btn = $('.gate-foot .btn', g);
  const count = () => { const rq = r.checklist.filter((it) => it.required_by_brief); $('.cl-count', g).textContent = `${checked.size} of ${boxes.length} selected · ${rq.filter((it) => checked.has(it.id)).length} of ${rq.length} required`; btn.disabled = !checked.size; };
  const sync = () => { boxes.forEach((b) => (b.checked = checked.has(b.value))); count(); };
  boxes.forEach((b) => (b.onchange = () => { if (b.checked) checked.add(b.value); else checked.delete(b.value); count(); }));
  $$('.cl-all', g).forEach((b) => (b.onclick = (e) => {
    e.preventDefault();
    const bs = $$('input[type=checkbox]', b.closest('.cl-g')), on = !bs.every((x) => x.checked);
    bs.forEach((x) => (on ? checked.add(x.value) : checked.delete(x.value))); sync();
  }));
  sync();
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Saving and making the PDF…';
    try { const res = await api(`/api/projects/${p.id}/checklist`, { tier, checked: [...checked], answers }); p.checklist = res.checklist; showOutputs(p, thOf(p), res.files, true); }
    catch (e) { toast(e.message); }
    btn.disabled = false; btn.textContent = 'Update checklist and PDF';
  };
  return g;
}
/* the brief summary PDF (real output), placed above the stage that is currently open */
function showOutputs(p, th, files, fresh) {
  const outs = files.filter((f) => f.kind === 'output' && f.name.startsWith('Brief summary'));
  $$('.out-msg', th).forEach((m) => m.remove());
  const m = aiMsg(`${fresh ? '<p class="note-line">Updated with your answers.</p>' : ''}<div class="out-list"></div><details class="prog-d"><summary>Edit what you’ll hand in</summary></details>`);
  m.classList.add('out-msg');
  outs.forEach((f) => $('.out-list', m).appendChild(pdfRow(f.name, f.url, `${fmtSize(f.size)} · ${fmtWhen(f.modified)}`)));
  if (!outs.length) $('.out-list', m).innerHTML = '<p class="muted sm">The brief summary PDF is made when you finish the questions.</p>';
  if (p.analysis) $('details', m).appendChild(checklistGate(p, p.analysis, p.checklist));
  else $('details', m).remove();
  const cur = $('.stage-node:not(.static)', th);
  if (cur) th.insertBefore(m, cur); else th.appendChild(m);
  if (state.view === 'project' && state.project === p.id) renderPanel();
}
function pdfRow(name, url, sub) {
  const k = fileKind(name);
  const row = el(`<div class="file-row out"><span class="fi ${k[1]}">${k[0]}</span><span class="fn"><span class="fc-n"></span><small></small></span><a class="btn sm" href="${url}" target="_blank">Open</a><a class="btn sm" href="${dlUrl(url)}">${ICON.dl} Download</a></div>`);
  $('.fc-n', row).textContent = name; $('small', row).textContent = sub || '';
  return row;
}
function refreshChrome() {
  renderSidebar();
  if (state.view === 'project') {
    const p = PROJECTS.find((x) => x.id === state.project);
    if (p) { paintTop(p); renderPanel(); }
  }
}

/* ================= right panel ================= */
const PANEL_TABS = [['progress', 'Progress'], ['research', 'Research'], ['references', 'References'], ['files', 'Files']];
function renderPanel() {
  const panel = $('#panel');
  const show = state.view === 'project' && state.panel;
  panel.classList.toggle('open', show);
  if (!show) return;
  const p = PROJECTS.find((x) => x.id === state.project);
  if (!p) return;
  const keep = $('.panel-b', panel)?.scrollTop || 0, same = panel.dataset.tab === state.panelTab && panel.dataset.p === p.id;
  panel.dataset.tab = state.panelTab; panel.dataset.p = p.id;
  panel.innerHTML = `<div class="panel-h">${PANEL_TABS.map(([t, n]) => `<button class="tab ${state.panelTab === t ? 'on' : ''}" data-t="${t}">${n}</button>`).join('')}<span class="sp"></span><button class="icon-btn" data-close title="Close">${ICON.x}</button></div><div class="panel-b"></div>`;
  $$('[data-t]', panel).forEach((b) => (b.onclick = () => { state.panelTab = b.dataset.t; renderPanel(); }));
  $('[data-close]', panel).onclick = () => { state.panel = false; renderPanel(); };
  const body = $('.panel-b', panel);
  if (state.panelTab === 'progress') progressPanel(p, body);
  else if (state.panelTab === 'research') {
    const R = p.research;
    if (R && R.status && Object.keys(R.status.jobs || {}).length) body.appendChild(researchSummary(p));
    else body.innerHTML = '<p class="muted sm">Research starts when you press Start, after the questions. The notes come as one PDF, with every point linked to its source. The references are picked in the chat.</p>';
  } else if (state.panelTab === 'references') {
    const open = el(`<button class="btn sm" style="margin:0 0 10px">${ICON.folder} Open all folders</button>`); open.onclick = () => refsModal(p);
    body.append(el('<p class="muted sm" style="margin:0 2px 10px">Click a folder to see what’s inside. Your own files always come first; empty types are searched for during research.</p>'), open, folderTiles(p, (k, id) => refsModal(p, [k, id])));
  } else filesPanel(p, body);
  if (same) body.scrollTop = keep;
}
function progressPanel(p, body) {
  const wf = p.wf;
  if (!wf) { body.innerHTML = '<p class="muted sm">Reading your brief. The route and steps appear after the first round of questions.</p>'; return; }
  const list = stagesFor(wf), cur = list.indexOf(wf.stage), next = list[cur + 1];
  const i = wf.intake;
  body.innerHTML = `${wf.route ? `<div class="route-card"><div class="rc-h">${ICON.layers}<b>${esc(ROUTES[wf.route].name)}</b></div><div class="rc-l">${esc(ROUTES[wf.route].line)}</div>
      <dl class="kv"><dt>Purpose</dt><dd>${esc(i.purpose)}</dd><dt>Detail</dt><dd>${esc(i.detail)}</dd><dt>Scope</dt><dd>${esc(i.scope)}</dd>${i.presenter ? `<dt>Presenter</dt><dd>${esc(i.presenter)}</dd>` : ''}<dt>Site</dt><dd>${esc(i.typicalSite ? 'Typical plot for this brief' : i.site || 'From the brief')}</dd>${i.ideas ? `<dt>Your ideas</dt><dd>${esc(i.ideas)}</dd>` : ''}<dt>CAD layers</dt><dd>${esc(wf.layers)}</dd></dl></div>`
    : '<div class="route-card"><div class="rc-l" style="margin:0">The route is set after the first round of questions.</div></div>'}
    <div class="now-box"><div><span>Status</span><b>${notBuilt(p) ? `Stopped before ${esc(stageTitle(wf, wf.stage).toLowerCase())}: not connected yet` : wf.status === 'wait' ? `Waiting for you: ${esc(STAGE[wf.stage].gate || stageTitle(wf, wf.stage))}` : wf.status === 'run' ? `Working on ${esc(stageTitle(wf, wf.stage).toLowerCase())}` : 'Complete'}</b></div>${next ? `<div><span>Next</span><b>${esc(stageTitle(wf, next))}</b></div>` : ''}</div>
    <div class="sec-h">Steps <small class="muted">${ICON.star} you choose · ${ICON.lock} the one hard stop</small></div>
    <div class="phases">${list.map((s, k) => {
      const cls = k < cur ? 'done' : k === cur && BUILT.has(s) ? (wf.status === 'wait' ? 'now gate-wait' : 'now') : 'lock';
      const sub = !BUILT.has(s) && s !== 'delivered' ? `${STAGE[s].s} · not connected yet` : k === cur ? (wf.status === 'wait' ? 'Waiting for your choice' : 'In progress…') : STAGE[s].s;
      return `<div class="phase ${cls}"><span class="nd">${cls === 'done' ? ICON.check : ''}</span><span><b>${esc(stageTitle(wf, s))}${STAGE[s].hard ? ` <i class="gm hard">${ICON.lock}</i>` : STAGE[s].star ? ` <i class="gm">${ICON.star}</i>` : ''}</b><small>${esc(sub)}</small></span></div>`;
    }).join('')}</div>
    <div class="sec-h">Gates</div><div class="gates"></div>
    ${wf.changes.length ? `<div class="sec-h">Changes after approval</div><div class="chg">${wf.changes.map((c) => `<div><small class="muted">${fmtDay(c.date)} · ${esc(c.stage)}</small><span>${esc(c.what)}</span></div>`).join('')}</div>` : ''}`;
  const gb = $('.gates', body);
  list.filter((s) => STAGE[s].gate).forEach((s) => {
    const g = wf.gates[STAGE[s].gate], k = list.indexOf(s);
    const r = el(`<div class="g-row"><span>${esc(STAGE[s].gate)}</span><span class="muted">${g ? fmtDay(g.date) : k === cur && BUILT.has(s) ? 'Waiting' : '–'}</span>${g ? '<button class="link-btn">Change</button>' : '<span></span>'}</div>`);
    if (g) $('button', r).onclick = () => { thOf(p).appendChild(impactMsg(p, s)); scrollDown(p.id); if (window.innerWidth <= 1100) { state.panel = false; renderPanel(); } };
    gb.appendChild(r);
  });
}
/* the user's per-type reference folders with upload and skip */
function refsGrid(p, { wide = false, compact = false, only = null } = {}) {
  const wf = p.wf || newWf();
  const slots = only ? only.map((s) => [s, SLOT_NAME[s], s === 'previous_project' ? 'Its PDFs, DXFs or a ZIP, so its sheets, layers and blocks can be studied.' : '']) : SLOTS;
  const grid = el(`<div class="slots ${wide ? 'wide' : ''} ${compact ? 'compact' : ''}"></div>`);
  const draw = () => {
    grid.innerHTML = '';
    slots.forEach(([slot, name, hint]) => {
      const files = p.refs?.[slot] || [], skip = wf.slots[slot] === 'find';
      const st = files.length ? ['mine', `Your files (${files.length})`] : slot === 'previous_project' ? ['', 'Optional'] : skip ? ['find', 'I’ll search for these'] : ['', 'Empty'];
      const c = el(`<div class="slot"><div class="slot-h"><span class="slot-ic">${ICON.folder}</span><span class="slot-t"><b>${esc(name)}</b>${compact ? '' : `<small>${esc(hint)}</small>`}</span><span class="slot-st ${st[0]}">${st[1]}</span></div>
        <div class="slot-files"></div>
        <div class="slot-a"><button class="btn sm" data-up>${ICON.up} ${files.length ? 'Add' : 'Upload'}</button>${!files.length && slot !== 'previous_project' ? `<button class="btn sm ${skip ? 'on' : ''}" data-skip>${skip ? `${ICON.check} Searching for these` : 'Skip, find them for me'}</button>` : ''}</div></div>`);
      files.forEach((f) => {
        const t = el(`<span class="sf" title="${esc(f.name)}">${IMG_EXTS.includes(extOf(f.name)) ? `<img src="${f.url}" alt="" loading="lazy"/>` : fileKind(f.name)[0]}<button class="x" title="Remove">${ICON.x}</button></span>`);
        t.onclick = () => window.open(f.url, '_blank');
        $('.x', t).onclick = async (e) => {
          e.stopPropagation();
          if (!confirm(`Remove ${f.name} from ${name}?`)) return;
          try { await deleteUpload(f); await loadRefs(p); draw(); } catch { toast('Couldn’t remove ' + f.name); }
        };
        $('.slot-files', c).appendChild(t);
      });
      const add = (list) => {
        if (!list.length) return;
        toast(`Uploading ${list.length} file${list.length > 1 ? 's' : ''} to ${name}…`);
        Promise.all(startUploads(p.id, list, () => {}, slot).map((f) => f.done)).then(async (res) => {
          const bad = res.filter((f) => f.status === 'error');
          if (bad.length) toast(bad[0].error);
          delete wf.slots[slot];
          await loadRefs(p); if (p.wf) saveWf(p); draw();
        });
      };
      $('[data-up]', c).onclick = () => pickFiles(add, slot === 'previous_project' ? '.pdf,.dxf,.dwg,.zip,.png,.jpg,.jpeg' : '.png,.jpg,.jpeg,.webp,.pdf,.tif,.tiff,.svg');
      if ($('[data-skip]', c)) $('[data-skip]', c).onclick = () => { if (skip) delete wf.slots[slot]; else wf.slots[slot] = 'find'; if (p.wf) saveWf(p); draw(); };
      dropTarget(c, add);
      grid.appendChild(c);
    });
  };
  draw();
  if (!p.refs) loadRefs(p).then(draw);
  return grid;
}
function filesPanel(p, body) {
  const wf = p.wf;
  body.innerHTML = `<div class="sec-h sec-row"><span>Your brief and uploads</span><button class="btn sm" data-up>${ICON.up} Upload</button></div><div class="up-list"><p class="muted sm">Loading…</p></div>
    <div class="sec-h">Made for you</div><div class="out-list"><p class="muted sm">Loading…</p></div><div class="notes-list"></div>
    <div class="sec-h">Planned for your route</div><div class="dlist"></div>`;
  $('[data-up]', body).onclick = () => pickFiles((list) => attachToProject(p, list));
  fillUploads($('.up-list', body), p.id);
  fillUploads($('.out-list', body), p.id, 'output');
  const R = p.research;
  if (R) {
    const nl = $('.notes-list', body);
    RESEARCH_TOPICS.filter((t) => R.notes[t]).forEach((t) => {
      const url = `/files/${encodeURIComponent(p.id)}/${t}.md?slot=research`;
      const r = el(`<div class="file-row"><span class="fi md">MD</span><span class="fn"><span class="fc-n"></span><small>02_research · ${R.notes[t].sources.length} sources</small></span><a class="icon-btn" title="Download" href="${dlUrl(url)}">${ICON.dl}</a></div>`);
      $('.fc-n', r).textContent = `${t}.md`;
      r.onclick = () => window.open(url, '_blank');
      $('a', r).onclick = (e) => e.stopPropagation();
      nl.appendChild(r);
    });
  }
  const dl = $('.dlist', body);
  if (!wf || !wf.route) { dl.innerHTML = '<p class="muted sm">Your file list appears once the route is set.</p>'; return; }
  let folder = '';
  delivFor(wf).forEach((d) => {
    if (d.folder !== folder) { folder = d.folder; dl.appendChild(el(`<div class="dv-h">${ICON.folder}<span>${esc(folder)}</span></div>`)); }
    const k = delivKind(d.file);
    const r = el(`<div class="file-row pending"><span class="fi ${k[1]}">${k[0]}</span><span class="fn"><span class="fc-n"></span><small></small></span></div>`);
    $('.fc-n', r).textContent = d.file;
    $('small', r).textContent = `${d.what} · from ${stageTitle(wf, d.stage).toLowerCase()}`;
    dl.appendChild(r);
  });
}
async function fillUploads(box, projectId, kind = 'upload') {
  let list;
  try { list = (await listUploads(projectId)).filter((f) => f.kind === kind); } catch { box.innerHTML = '<p class="muted sm">The upload server isn’t running. Start the app with <b>python server.py</b>.</p>'; return; }
  if (!list.length) { box.innerHTML = `<p class="muted sm">${kind === 'upload' ? 'No files yet. Drop files anywhere on this project, or use Upload.' : 'Nothing yet. Your brief summary PDF appears here after the questions.'}</p>`; return; }
  box.innerHTML = '';
  list.forEach((f) => {
    const k = fileKind(f.name);
    const row = el(`<div class="file-row" title="Open"><span class="fi ${k[1]}">${k[0]}</span><span class="fn"><span class="fc-n"></span><small>${fmtSize(f.size)} · ${fmtDate(f.modified)}</small></span><a class="icon-btn" title="Download" href="${dlUrl(f.url)}">${ICON.dl}</a>${kind === 'upload' ? `<button class="icon-btn" title="Remove">${ICON.x}</button>` : ''}</div>`);
    $('.fc-n', row).textContent = f.name;
    row.onclick = () => window.open(f.url, '_blank');
    $('a', row).onclick = (e) => e.stopPropagation();
    if (kind === 'upload') $('button', row).onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`Remove ${f.name} from this project? The file is deleted from the uploads folder.`)) return;
      try { await deleteUpload(f); row.remove(); if (!box.children.length) fillUploads(box, projectId); } catch { toast('Couldn’t remove ' + f.name); }
    };
    box.appendChild(row);
  });
}

/* ================= pop-up window ================= */
function modal({ title = '', sub = '', wide = false, onClose } = {}) {
  const bg = el(`<div class="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><button class="icon-btn hide" data-back title="Back">${ICON.back}</button><div class="mt"><b></b><small></small></div><button class="icon-btn" data-x title="Close">${ICON.x}</button></div><div class="modal-b"></div><div class="modal-f hide"></div></div></div>`);
  const close = () => { bg.remove(); document.removeEventListener('keydown', key); onClose && onClose(); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  bg.onclick = (e) => { if (e.target === bg) close(); };
  $('[data-x]', bg).onclick = close;
  document.addEventListener('keydown', key);
  document.body.appendChild(bg);
  const M = {
    bg, body: $('.modal-b', bg), close,
    title(t, s2 = '') { $('.mt b', bg).textContent = t; $('.mt small', bg).textContent = s2; },
    back(fn) { const b = $('[data-back]', bg); b.classList.toggle('hide', !fn); b.onclick = fn; },
    actions(list) {
      const f = $('.modal-f', bg); f.innerHTML = ''; f.classList.toggle('hide', !list.length);
      list.forEach(([label, fn, primary]) => { const b = el(`<button class="btn ${primary ? 'primary' : ''}"></button>`); b.textContent = label; b.onclick = fn; f.appendChild(b); });
    },
  };
  M.title(title, sub);
  return M;
}

/* ================= references window: folders → files ================= */
function folderTiles(p, onOpen) {
  const wrap = el('<div class="ftiles"></div>');
  const draw = () => {
    wrap.innerHTML = '';
    const tile = (kind, id, name, hint, count, st) => {
      const t = el(`<button class="ftile"><span class="ft-ic">${ICON.folder}</span><span class="ft-t"><b></b><small></small></span><span class="ft-n ${st}">${count}</span></button>`);
      $('b', t).textContent = name; $('small', t).textContent = hint;
      t.onclick = () => onOpen(kind, id);
      return t;
    };
    wrap.appendChild(el('<div class="ft-h">Your references</div>'));
    [...SLOTS, ['previous_project', 'Previous project', 'Its PDFs, DXFs or a ZIP'], ['site', 'Site images', 'Google Earth, survey, sketches']].forEach(([id, name, hint]) => {
      const n = (p.refs?.[id] || []).length, skip = p.wf?.slots?.[id] === 'find';
      wrap.appendChild(tile('user', id, name, hint, n ? `${n} file${n > 1 ? 's' : ''}` : skip ? 'Searching' : 'Empty', n ? 'mine' : skip ? 'find' : ''));
    });
    wrap.appendChild(el('<div class="ft-h">Found by the research</div>'));
    Object.entries(FOUND).forEach(([id, [name]]) => {
      const n = (p.research?.found?.[id] || []).length;
      wrap.appendChild(tile('found', id, name, `03_references/${id}/`, n ? `${n} found` : 'Not yet', n ? 'find' : ''));
    });
  };
  draw();
  ensureData(p).then(draw);
  wrap.redraw = () => Promise.all([loadRefs(p), loadResearch(p)]).then(draw);
  return wrap;
}
function refsModal(p, start = null) {
  const M = modal({ wide: true, onClose: () => { if (state.view === 'project' && state.project === p.id) renderPanel(); } });
  const home = () => {
    M.title('References', p.name); M.back(null); M.actions([]);
    M.body.innerHTML = '<p class="muted sm" style="margin:0 0 12px">One folder per drawing type. Your own files come first; for any type you leave empty the research finds real published drawings.</p>';
    M.body.appendChild(folderTiles(p, (k, id) => folder(k, id)));
  };
  const folder = async (kind, id) => {
    await ensureData(p);
    M.back(start ? null : home);
    if (kind === 'user') userFolder(id); else foundFolder(id);
  };
  const userFolder = (id) => {
    const name = SLOT_NAME[id], files = p.refs?.[id] || [];
    M.title(name, `${p.name} · ${id === 'site' ? '01_brief/site_images' : `03_references/user/${id}`}/`);
    M.body.innerHTML = '';
    const drop = el(`<div class="drop mini"><span class="ic">${ICON.up}</span><span><b>Drop images or PDFs here</b><small>or click to choose files</small></span></div>`);
    const add = (list) => { if (!list.length) return; toast(`Uploading ${list.length} file${list.length > 1 ? 's' : ''}…`); Promise.all(startUploads(p.id, list, () => {}, id).map((f) => f.done)).then(async (res) => { const bad = res.find((f) => f.status === 'error'); if (bad) toast(bad.error); if (p.wf) { delete p.wf.slots[id]; saveWf(p); } await loadRefs(p); userFolder(id); }); };
    drop.onclick = () => pickFiles(add, id === 'previous_project' ? '.pdf,.dxf,.dwg,.zip,.png,.jpg,.jpeg' : '.png,.jpg,.jpeg,.webp,.pdf,.tif,.tiff,.svg,.kml,.kmz');
    dropTarget(drop, add);
    M.body.appendChild(drop);
    const grid = el('<div class="fgrid"></div>');
    if (!files.length) grid.appendChild(el(`<p class="muted sm">Empty.${FOUND_FOR_SLOT[id] ? ' If you leave it empty, the research searches for this type.' : ''}</p>`));
    files.forEach((f) => {
      const isImg = IMG_EXTS.includes(extOf(f.name));
      const c = el(`<div class="fcard"><a class="fc-img" href="${f.url}" target="_blank">${isImg ? `<img src="${f.url}" alt="" loading="lazy"/>` : `<span class="fi ${fileKind(f.name)[1]} big">${fileKind(f.name)[0]}</span>`}</a><div class="fc-b"><b></b><small>${fmtSize(f.size)} · ${fmtDate(f.modified)}</small><div class="fc-a"><a class="btn sm" href="${f.url}" target="_blank">Open</a><button class="btn sm">${ICON.x} Remove</button></div></div></div>`);
      $('b', c).textContent = f.name;
      $('button', c).onclick = async () => { if (!confirm(`Remove ${f.name}?`)) return; try { await deleteUpload(f); await loadRefs(p); userFolder(id); } catch { toast('Couldn’t remove ' + f.name); } };
      grid.appendChild(c);
    });
    M.body.appendChild(grid);
    const acts = [['Close', () => M.close()]];
    if (!files.length && FOUND_FOR_SLOT[id] && p.wf) acts.unshift([p.wf.slots[id] === 'find' ? 'Don’t search for these' : 'Skip, find them for me', () => { if (p.wf.slots[id] === 'find') delete p.wf.slots[id]; else p.wf.slots[id] = 'find'; saveWf(p); userFolder(id); }]);
    M.actions(acts);
  };
  const foundFolder = (id) => {
    const items = p.research?.found?.[id] || [];
    M.title(FOUND[id][0], `${p.name} · 03_references/${id}/ · found by the research`);
    M.body.innerHTML = '';
    if (!items.length) M.body.appendChild(el('<p class="muted sm">Nothing found yet. The research looks for this type when you press Start research, unless you add your own.</p>'));
    const grid = el('<div class="fgrid"></div>');
    items.forEach((it) => {
      const page = safeUrl(it.page_url), url = foundUrl(p, id, it.file);
      const c = el(`<div class="fcard"><a class="fc-img" href="${url}" target="_blank"><img src="${url}" alt="" loading="lazy"/></a><div class="fc-b"><b class="tr"></b><small class="cr"></small><div class="fc-a">${page ? `<a class="btn sm" href="${esc(page)}" target="_blank" rel="noopener noreferrer">${ICON.ext} Source</a>` : ''}<a class="btn sm" href="${url}" target="_blank">Full size</a></div></div></div>`);
      $('.tr', c).textContent = it.traits;
      $('.cr', c).textContent = [it.project, it.author, it.source_site].filter(Boolean).join(' · ');
      grid.appendChild(c);
    });
    M.body.appendChild(grid);
    M.actions([['Search this type again', async () => {
      if (!confirm(`Search the web again for ${FOUND[id][0].toLowerCase()}? This uses your Claude usage and replaces what was found.`)) return;
      try { await api(`/api/projects/${p.id}/research`, { only: [id] }); toast('Searching. You can close this window; the folder updates when it’s done.'); M.close(); }
      catch (e) { toast(e.message); }
    }], ['Close', () => M.close(), true]]);
  };
  ensureData(p).then(() => (start ? folder(...start) : home()));
}
const FOUND_FOR_SLOT = { plan: 1, section: 1, elevation: 1, sheet_composition: 1, diagrams: 1 };

/* ================= misc ================= */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200); }

$$('[data-nav]').forEach((b) => (b.onclick = () => go(b.dataset.nav)));
$('#collapseBtn').onclick = () => $('#app').classList.toggle('sb-collapsed');
$('#searchInput').oninput = renderSidebar;
['dragover', 'drop'].forEach((t) => window.addEventListener(t, (e) => e.preventDefault())); // a missed drop shouldn't navigate away
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); go('home'); } });
window.addEventListener('beforeunload', (e) => {
  const cur = state.view === 'project' && PROJECTS.find((x) => x.id === state.project);
  if (cur && researching(cur) && !cur.background) { e.preventDefault(); e.returnValue = ''; }
});
render();
loadProjects();
