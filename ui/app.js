/* Your Architect — UI prototype (front-end only, all data is mock). */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
  slider: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
};

/* ---------------- data ---------------- */
const PHASES = [
  ['Brief', 'Facts, gaps, assumptions'],
  ['Theme', 'Theme and how fixed it is'],
  ['Detail level', 'Simple, Studio or Professional'],
  ['Research', 'Site, climate, rules, precedents'],
  ['Design questions', 'Your choices shape the design'],
  ['Style references', 'Pick how sheets should look'],
  ['Area programme', 'Named spaces and sizes'],
  ['Zoning', 'Adjacency, journeys, placement'],
  ['Form options', 'Driver-based options to pick'],
  ['Development', 'Plans, structure, checks'],
  ['Drawings', 'Plans, sections, elevations, DXF'],
  ['3D views', 'Massing, axo, renders'],
  ['Presentation', 'Final sheets'],
  ['Defence pack', 'Explainer and jury Q&A'],
];

const PROJECTS = [
  { id: 'cafe', name: 'Highway Café & Dhaba', group: 'Studio', course: 'AD-6 Studio', phase: 10, status: 'run', updated: '2 min ago', tier: 'Studio Standard', theme: 'Woven street' },
  { id: 'housing', name: 'Weavers’ Housing Cluster', group: 'Studio', course: 'AD-5 Studio', phase: 4, status: 'wait', updated: 'Yesterday', tier: 'Student Simple', theme: 'Loom grid' },
  { id: 'resort', name: 'Bamboo Eco-Resort', group: 'Thesis', course: 'Thesis', phase: 6, status: 'wait', updated: '3 days ago', tier: 'Professional', theme: 'Bamboo canopy' },
  { id: 'campus', name: 'Digital Creativity Campus', group: 'Thesis', course: 'Thesis (draft)', phase: 13, status: 'done', updated: 'Oct 8', tier: 'Studio Standard', theme: 'Open' },
  { id: 'library', name: 'Lakeside Cultural Centre', group: 'Competitions', course: 'Competition', phase: 8, status: 'wait', updated: 'Oct 6', tier: 'Professional', theme: 'Terraces' },
];
const GROUPS = ['Studio', 'Thesis', 'Competitions'];

const state = { view: 'home', project: null, panel: false, panelTab: 'phases', tab: 'All', attached: [] };
const threads = {}; // project id → DOM node (keeps animations alive while switching)

/* ---------------- drawings (SVG generators) ---------------- */
function rand(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

function planSVG(seed, stroke = '#3a3a40', w = 300, h = 140) {
  const r = rand(seed);
  let s = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="${stroke}" stroke-width="1">`;
  const x0 = 40 + r() * 30, y0 = 22, W = 160 + r() * 60, H = 90;
  s += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" stroke-width="2"/>`;
  for (let i = 1; i < 4; i++) s += `<line x1="${x0 + (W * i) / 4 + r() * 10}" y1="${y0}" x2="${x0 + (W * i) / 4 + r() * 10}" y2="${y0 + H * (0.4 + r() * 0.6)}"/>`;
  s += `<line x1="${x0}" y1="${y0 + H * 0.55}" x2="${x0 + W * 0.6}" y2="${y0 + H * 0.55}"/>`;
  for (let i = 0; i < 6; i++) s += `<circle cx="${x0 + 14 + r() * (W - 28)}" cy="${y0 + 12 + r() * (H - 24)}" r="${3 + r() * 3}"/>`;
  s += `<path d="M${x0 + W * 0.3} ${y0 + H} a14 14 0 0 1 14 -14" stroke-dasharray="2 2"/>`;
  return s + '</g></svg>';
}

function iso(x, y, z, s = 6, ox = 150, oy = 60) { return [ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s]; }
function box(x, y, z, w, d, h, c = ['#2b2b30', '#1f1f23', '#26262a'], s, ox, oy) {
  const P = (a, b, c2) => iso(a, b, c2, s, ox, oy).join(',');
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  return `<polygon points="${left.join(' ')}" fill="${c[1]}"/><polygon points="${right.join(' ')}" fill="${c[2]}"/><polygon points="${top.join(' ')}" fill="${c[0]}"/>`;
}
const ACC = ['#d9774a', '#a8532f', '#c0643c'];
function massSVG(type) {
  let g = '';
  const ground = (s = 5, ox = 150, oy = 50) => { const p = [iso(0, 0, 0, s, ox, oy), iso(26, 0, 0, s, ox, oy), iso(26, 22, 0, s, ox, oy), iso(0, 22, 0, s, ox, oy)]; return `<polygon points="${p.map((q) => q.join(',')).join(' ')}" fill="#141416" stroke="#2a2a2e"/>`; };
  if (type === 'woven') {
    g += ground();
    g += box(3, 3, 0, 20, 3, 3, undefined, 5, 150, 50) + box(3, 10, 0, 20, 3, 4, undefined, 5, 150, 50) + box(3, 17, 0, 20, 3, 3, undefined, 5, 150, 50);
    g += box(2, 2, 5, 22, 19, 0.4, ['rgba(217,119,74,.55)', 'rgba(168,83,47,.6)', 'rgba(192,100,60,.6)'], 5, 150, 50);
  } else if (type === 'wing') {
    g += ground();
    g += box(3, 6, 0, 14, 10, 3, undefined, 5, 150, 50) + box(17, 6, 0, 6, 10, 6, ACC, 5, 150, 50) + box(5, 8, 3, 10, 6, 2, undefined, 5, 150, 50);
  } else {
    g += ground();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g += box(13 + Math.cos(a) * 8 - 1.5, 11 + Math.sin(a) * 8 - 1.5, 0, 3, 3, i % 3 === 0 ? 4 : 3, i === 2 ? ACC : undefined, 5, 150, 50); }
    g += box(11.5, 9.5, 0, 3, 3, 0.3, ['#3a2a22', '#2a1d17', '#2a1d17'], 5, 150, 50);
  }
  return `<svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}

function sheetSVG() {
  let s = '<svg viewBox="0 0 1414 1000"><rect width="1414" height="1000" fill="#f4f2ee"/>';
  s += '<rect x="30" y="30" width="1354" height="940" fill="none" stroke="#1d1d1f" stroke-width="2"/>';
  s += '<rect x="1130" y="30" width="254" height="940" fill="none" stroke="#1d1d1f" stroke-width="1.5"/><rect x="1130" y="30" width="254" height="70" fill="#d35400"/>';
  s += '<text x="1150" y="74" font-family="Arial" font-size="26" font-weight="700" fill="#fff">GROUND FLOOR</text>';
  for (let i = 0; i < 6; i++) s += `<line x1="1150" y1="${140 + i * 26}" x2="${1340 - (i % 3) * 40}" y2="${140 + i * 26}" stroke="#bbb" stroke-width="6" stroke-linecap="round"/>`;
  s += '<text x="1150" y="920" font-family="Arial" font-size="18" fill="#1d1d1f">SCALE 1:100   SHEET A101</text>';
  // grid
  const gx = [130, 330, 530, 730, 930], gy = [170, 370, 570, 770];
  gx.forEach((x, i) => { s += `<line x1="${x}" y1="110" x2="${x}" y2="840" stroke="#999" stroke-dasharray="14 6 3 6"/><circle cx="${x}" cy="90" r="18" fill="#fff" stroke="#333"/><text x="${x}" y="96" text-anchor="middle" font-family="Arial" font-size="16">${'ABCDE'[i]}</text>`; });
  gy.forEach((y, i) => { s += `<line x1="100" y1="${y}" x2="960" y2="${y}" stroke="#999" stroke-dasharray="14 6 3 6"/><circle cx="80" cy="${y}" r="18" fill="#fff" stroke="#333"/><text x="80" y="${y + 6}" text-anchor="middle" font-family="Arial" font-size="16">${i + 1}</text>`; });
  // zones
  s += '<rect x="130" y="170" width="400" height="400" fill="#f3e3d6"/><rect x="530" y="170" width="400" height="200" fill="#e3e9e1"/><rect x="530" y="370" width="200" height="200" fill="#e4e6ec"/>';
  // walls
  s += '<g fill="#2b2b2b"><rect x="124" y="164" width="812" height="12"/><rect x="124" y="764" width="812" height="12"/><rect x="124" y="164" width="12" height="612"/><rect x="924" y="164" width="12" height="612"/><rect x="524" y="164" width="10" height="250"/><rect x="524" y="480" width="10" height="90"/><rect x="530" y="364" width="400" height="10"/><rect x="724" y="370" width="10" height="200"/><rect x="130" y="564" width="800" height="10"/></g>';
  // columns
  gx.forEach((x) => gy.forEach((y) => { s += `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" fill="#d35400"/>`; }));
  // furniture
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const cx = 200 + i * 90, cy = 240 + j * 100; s += `<rect x="${cx - 22}" y="${cy - 16}" width="44" height="32" fill="#fff" stroke="#444"/>`; [[-30, 0], [30, 0]].forEach(([dx]) => (s += `<rect x="${cx + dx - 6}" y="${cy - 12}" width="12" height="24" rx="3" fill="#fff" stroke="#666"/>`)); }
  s += '<rect x="560" y="200" width="340" height="40" fill="#fff" stroke="#444"/>';
  for (let i = 0; i < 6; i++) s += `<circle cx="${590 + i * 55}" cy="300" r="12" fill="#fff" stroke="#666"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${560 + i * 40}" y="400" width="30" height="40" fill="#fff" stroke="#666"/>`;
  // stairs
  for (let i = 0; i < 10; i++) s += `<line x1="760" y1="${400 + i * 15}" x2="900" y2="${400 + i * 15}" stroke="#555"/>`;
  s += '<path d="M830 545 V410 l-8 12 M830 410 l8 12" fill="none" stroke="#d35400" stroke-width="2"/>';
  // labels
  [['DINING HALL', 330, 520], ['KITCHEN', 730, 345], ['WASH', 630, 540], ['STAIR', 830, 590]].forEach(([t, x, y]) => (s += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="700" fill="#333">${t}</text>`));
  // trees
  [[1000, 200], [1040, 400], [1000, 650], [180, 860], [420, 880], [760, 870]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="34" fill="#cfdccb" stroke="#9fb39a"/>`));
  return s + '</svg>';
}

function refSVG(kind, seed) {
  const r = rand(seed);
  if (kind === 'zoning') {
    const cols = ['#f3d9c6', '#d9e6d5', '#d8dfec', '#efe4c8'];
    let s = '<svg viewBox="0 0 300 220"><rect width="300" height="220" fill="#ebe8e2"/>';
    for (let i = 0; i < 6; i++) s += `<rect x="${20 + (i % 3) * 88}" y="${30 + Math.floor(i / 3) * 85}" width="${80 - r() * 20}" height="${75 - r() * 15}" fill="${cols[i % 4]}" stroke="#555" stroke-width=".8"/>`;
    s += '<path d="M10 200 C 90 170, 160 190, 290 150" stroke="#d35400" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>';
    return s + '</svg>';
  }
  if (kind === 'section') {
    let s = '<svg viewBox="0 0 300 160"><rect width="300" height="160" fill="#ebe8e2"/><line x1="0" y1="130" x2="300" y2="130" stroke="#222" stroke-width="3"/>';
    s += `<path d="M40 130 V70 L150 ${40 - r() * 20} L260 70 V130" fill="none" stroke="#222" stroke-width="2.5"/><line x1="40" y1="95" x2="260" y2="95" stroke="#222" stroke-width="2"/>`;
    for (let i = 0; i < 5; i++) s += `<circle cx="${60 + i * 45}" cy="120" r="5" fill="#888"/>`;
    s += '<circle cx="20" cy="105" r="18" fill="#cfdccb"/><circle cx="282" cy="108" r="15" fill="#cfdccb"/>';
    return s + '</svg>';
  }
  if (kind === 'axo') return `<svg viewBox="0 0 300 200"><rect width="300" height="200" fill="#ebe8e2"/>${box(4, 4, 0, 14, 10, 3, ['#fff', '#ddd', '#eee'], 6, 150, 70)}${box(4, 4, 6, 14, 10, 2.5, ['#fff', '#ddd', '#eee'], 6, 150, 70)}${box(6, 6, 11, 10, 6, 1, ['#d35400', '#a8532f', '#c0643c'], 6, 150, 70)}</svg>`;
  return `<svg viewBox="0 0 300 200"><rect width="300" height="200" fill="#ebe8e2"/>${planSVG(seed, '#333', 300, 200).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`;
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
  const C = 2 * Math.PI * 15;
  return `<span class="ring-wrap ring"><svg viewBox="0 0 38 38"><circle class="bg" cx="19" cy="19" r="15"/><circle class="fg" cx="19" cy="19" r="15" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/></svg><span>${Math.round(p * 100)}%</span></span>`;
}

/* ---------------- sidebar ---------------- */
function renderSidebar() {
  const q = ($('#searchInput').value || '').toLowerCase();
  const wrap = $('#projectGroups');
  const closed = new Set($$('.sb-group.closed', wrap).map((g) => g.dataset.g));
  wrap.innerHTML = '';
  GROUPS.forEach((g) => {
    const items = PROJECTS.filter((p) => p.group === g && p.name.toLowerCase().includes(q));
    if (!items.length && q) return;
    const grp = el(`<div class="sb-group ${closed.has(g) ? 'closed' : ''}" data-g="${g}"><div class="sb-group-h"><button>${ICON.chev}${g}</button><button title="New in ${g}">${ICON.plus}</button></div><div class="sb-group-list"></div></div>`);
    $$('.sb-group-h button', grp)[0].onclick = () => grp.classList.toggle('closed');
    $$('.sb-group-h button', grp)[1].onclick = () => go('home');
    items.forEach((p) => {
      const it = el(`<button class="sb-item ${state.view === 'project' && state.project === p.id ? 'active' : ''}"><span class="dot ${p.status}"></span><span class="t">${p.name}</span><span class="ph">${p.status === 'done' ? 'Done' : 'P' + p.phase}</span></button>`);
      it.onclick = () => openProject(p.id);
      $('.sb-group-list', grp).appendChild(it);
    });
    wrap.appendChild(grp);
  });
  $$('.sb-link').forEach((b) => b.classList.toggle('active', b.dataset.nav === state.view));
}

/* ---------------- routing ---------------- */
function go(view) {
  state.view = view;
  if (view !== 'project') { state.panel = false; }
  render();
  document.getElementById('app').classList.remove('sb-mobile-open');
}
function openProject(id) { state.project = id; state.view = 'project'; state.panel = window.innerWidth > 1100; render(); document.getElementById('app').classList.remove('sb-mobile-open'); }

function topbar(title, crumb = '', right = '') {
  return `<div class="topbar"><button class="icon-btn mobile-only" data-act="menu">${ICON.menu}</button>${crumb ? `<span class="crumb">${crumb} /</span>` : ''}<h1>${title}</h1><span class="sp"></span>${right}</div>`;
}

function render() {
  const main = $('#main');
  main.innerHTML = '';
  if (state.view === 'home') main.append(...homeView());
  else if (state.view === 'projects') main.append(...projectsView());
  else if (state.view === 'library') main.append(...libraryView());
  else if (state.view === 'references') main.append(...referencesView());
  else if (state.view === 'project') main.append(...projectView());
  $$('[data-act="menu"]', main).forEach((b) => (b.onclick = () => $('#app').classList.toggle('sb-mobile-open')));
  renderPanel();
  renderSidebar();
}

/* ---------------- home ---------------- */
function homeView() {
  const top = el(topbar('New project'));
  const v = el(`<div class="view"><div class="home">
    <div class="home-bot">${bot('thinking', 'lg')}</div>
    <h2>What are we designing today?</h2>
    <p class="sub">Upload your brief, site and references. I’ll read them and ask the questions that shape your design.</p>
    <div class="drop" id="drop"><span class="ic">${ICON.up}</span><span><b>Drop your brief here</b><small>PDF, DWG/DXF, images, site survey, professor’s notes</small></span></div>
    <div class="composer"><div class="files" id="homeFiles"></div>
      <textarea id="homeInput" rows="2" placeholder="Describe the project: typology, site, anything your professor said…"></textarea>
      <div class="composer-row"><button class="c-btn" id="attach">${ICON.clip}</button><button class="c-btn">${ICON.slider} Detail level: ask me</button><span class="sp"></span><button class="send" id="homeSend" disabled>${ICON.send}</button></div>
    </div>
    <div class="chips">${['Studio project', 'Thesis', 'Competition entry', 'I already have a programme', 'Only drawings from my sketch'].map((c) => `<button class="chip">${c}</button>`).join('')}</div>
    <div class="recent-h"><span>Continue where you left off</span><button data-nav2="projects">View all</button></div>
    <div class="grid" id="recent"></div>
  </div></div>`);
  const files = $('#homeFiles', v), input = $('#homeInput', v), send = $('#homeSend', v);
  const sync = () => (send.disabled = !(input.value.trim() || state.attached.length));
  const addFiles = () => {
    const mock = [['PDF', 'AD7_Brief_Riverside_Library.pdf', '2.4 MB'], ['DWG', 'Site_survey.dwg', '840 KB'], ['IMG', 'Site_photos (12)', '18 MB']];
    mock.slice(state.attached.length, state.attached.length + 3).forEach((f) => state.attached.push(f));
    files.innerHTML = state.attached.map((f) => `<span class="file-chip"><span class="fi">${f[0]}</span><span>${f[1]}<small>${f[2]}</small></span></span>`).join('');
    sync();
  };
  $('#drop', v).onclick = addFiles; $('#attach', v).onclick = addFiles;
  ['dragover', 'dragenter'].forEach((e) => $('#drop', v).addEventListener(e, (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((e) => $('#drop', v).addEventListener(e, (ev) => { ev.preventDefault(); ev.currentTarget.classList.remove('drag'); if (e === 'drop') addFiles(); }));
  input.oninput = sync;
  $$('.chip', v).forEach((c) => (c.onclick = () => { c.classList.toggle('on'); }));
  const start = () => {
    const id = 'p' + Date.now();
    PROJECTS.unshift({ id, name: 'Riverside Public Library', group: 'Competitions', course: 'New', phase: 0, status: 'run', updated: 'Just now', tier: '—', theme: '—', demo: true, brief: input.value.trim(), files: [...state.attached] });
    state.attached = [];
    openProject(id);
  };
  send.onclick = start;
  input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !send.disabled) { e.preventDefault(); start(); } };
  $('[data-nav2]', v).onclick = () => go('projects');
  PROJECTS.filter((p) => !p.demo).slice(0, 3).forEach((p, i) => $('#recent', v).appendChild(projectCard(p, i)));
  return [top, v];
}

function projectCard(p, i = 0) {
  const pct = p.status === 'done' ? 1 : p.phase / (PHASES.length - 1);
  const c = el(`<div class="card" style="animation-delay:${i * 50}ms"><div class="card-thumb">${planSVG(p.name.length)}<span class="ring">${ring(pct)}</span></div>
    <div class="card-body"><b>${p.name}</b><div class="card-meta"><span>${p.course} · ${p.status === 'done' ? 'Complete' : PHASES[p.phase][0]}</span><span>${p.updated}</span></div></div></div>`);
  c.onclick = () => openProject(p.id);
  return c;
}

/* ---------------- projects ---------------- */
function projectsView() {
  const top = el(topbar('All projects', '', `<button class="btn primary" data-n>${ICON.plus} New project</button>`));
  $('[data-n]', top).onclick = () => go('home');
  const v = el(`<div class="view"><div class="page">
    <div class="page-h"><div><h2>Projects</h2><p>Studio assignments, thesis and competitions, each with its own phases and files.</p></div></div>
    <div class="tabs">${['All', ...GROUPS, 'Archived'].map((t) => `<button class="tab ${state.tab === t ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="grid" id="pgrid"></div></div></div>`);
  $$('.tab', v).forEach((t) => (t.onclick = () => { state.tab = t.textContent; render(); }));
  const list = PROJECTS.filter((p) => state.tab === 'All' || p.group === state.tab);
  list.forEach((p, i) => $('#pgrid', v).appendChild(projectCard(p, i)));
  if (state.tab !== 'Archived') { const n = el(`<div class="card new"><span style="text-align:center">${ICON.plus}<br/>New project</span></div>`); n.onclick = () => go('home'); $('#pgrid', v).appendChild(n); }
  else $('#pgrid', v).innerHTML = '<p class="muted">Nothing archived yet.</p>';
  return [top, v];
}

/* ---------------- library ---------------- */
const FILES = [
  ['pdf', 'A101 Ground floor plan', 'Highway Café', 'Drawings', '1.8 MB'],
  ['dxf', 'A101 Ground floor plan', 'Highway Café', 'CAD', '640 KB'],
  ['pdf', 'A201 Section A–A', 'Highway Café', 'Drawings', '1.1 MB'],
  ['img', 'Exploded floor axo', 'Highway Café', 'Diagrams', '2.2 MB'],
  ['pdf', 'Design foundation (27 pp)', 'Highway Café', 'Presentation', '14 MB'],
  ['md', 'Project guide & jury Q&A', 'Highway Café', 'Defence pack', '38 KB'],
  ['pdf', 'Area programme', 'Bamboo Eco-Resort', 'Programme', '920 KB'],
  ['img', 'Bubble diagram', 'Digital Creativity Campus', 'Diagrams', '1.4 MB'],
];
function libraryView() {
  const top = el(topbar('Library'));
  const v = el(`<div class="view"><div class="page"><div class="page-h"><div><h2>Library</h2><p>Every output across projects: drawings, CAD, diagrams, renders and guides.</p></div></div>
    <div class="tabs">${['All', 'Drawings', 'CAD', 'Diagrams', 'Presentation', 'Defence pack'].map((t, i) => `<button class="tab ${i ? '' : 'on'}">${t}</button>`).join('')}</div>
    <div class="lib-row h"><span></span><span>Name</span><span>Project</span><span>Size</span><span></span></div>
    ${FILES.map((f) => `<div class="lib-row"><span class="fi ${f[0]}" style="width:30px;height:30px;border-radius:7px;display:grid;place-items:center;font-size:9.5px;font-weight:600">${f[0].toUpperCase()}</span><span>${f[1]}<br/><small class="muted">${f[3]}</small></span><span class="muted">${f[2]}</span><span class="muted">${f[4]}</span><button class="icon-btn">${ICON.dl}</button></div>`).join('')}
  </div></div>`);
  $$('.tab', v).forEach((t) => (t.onclick = () => { $$('.tab', v).forEach((x) => x.classList.remove('on')); t.classList.add('on'); }));
  $$('.lib-row .icon-btn', v).forEach((b) => (b.onclick = () => toast('Download starts here once the backend is connected')));
  return [top, v];
}

/* ---------------- references ---------------- */
const REFS = [['plan', 'Furnished plan, solid walls', 'Plan style'], ['section', 'Rendered section with trees', 'Section style'], ['zoning', 'Pastel zones, arrow legend', 'Zoning diagram'], ['axo', 'Exploded floor axo', '3D diagram'], ['plan', 'Dark linework, fine hatch', 'Plan style'], ['zoning', 'Thin route overlay', 'Zoning diagram'], ['section', 'Climate section', 'Section style'], ['axo', 'Massing evolution', '3D diagram'], ['plan', 'Minimal site plan', 'Site plan']];
function referencesView() {
  const top = el(topbar('Reference boards', '', '<button class="btn" data-save>Save picks to style guide</button>'));
  const v = el(`<div class="view"><div class="page"><div class="page-h"><div><h2>Style reference board</h2><p>Pick the drawings you like per category. I’ll blend them into one style guide, not copy one.</p></div></div>
    <div class="refboard">${REFS.map((r, i) => `<div class="refcard" style="animation-delay:${i * 40}ms"><span class="num">${i + 1}</span><div class="img">${refSVG(r[0], i + 3)}</div><div class="cap">${r[1]}<small>${r[2]}</small></div></div>`).join('')}</div></div></div>`);
  $$('.refcard', v).forEach((c) => (c.onclick = () => c.classList.toggle('sel')));
  $('[data-save]', top).onclick = () => { const n = $$('.refcard.sel', v).map((c) => '#' + $('.num', c).textContent); toast(n.length ? `Style guide will blend ${n.join(', ')}` : 'Pick a few references first'); };
  return [top, v];
}

/* ---------------- project workspace ---------------- */
function projectView() {
  const p = PROJECTS.find((x) => x.id === state.project);
  const statusPill = p.status === 'run' ? '<span class="pill run">Working</span>' : p.status === 'wait' ? '<span class="pill accent">Waiting for you</span>' : '<span class="pill">Complete</span>';
  const top = el(topbar(p.name, p.group, `${statusPill}<span class="pill">${p.status === 'done' ? 'All phases' : 'P' + p.phase + ' · ' + PHASES[p.phase][0]}</span><button class="icon-btn" data-panel title="Toggle panel">${ICON.panel}</button>`));
  $('[data-panel]', top).onclick = () => { state.panel = !state.panel; renderPanel(); };
  const ws = el('<div class="ws"></div>');
  if (!threads[p.id]) threads[p.id] = buildThread(p);
  ws.appendChild(threads[p.id]);
  const dock = el(`<div class="dock"><div class="dock-in"><div class="composer"><textarea rows="1" placeholder="Reply, change something, or ask why…"></textarea>
    <div class="composer-row"><button class="c-btn">${ICON.clip}</button><button class="c-btn">${ICON.layers} ${p.tier === '—' ? 'Detail: not set' : p.tier}</button><span class="sp"></span><button class="send" disabled>${ICON.send}</button></div></div>
    <div class="dock-hint">Every choice is saved to your decision log. You can change any of them later.</div></div></div>`);
  const ta = $('textarea', dock), sb = $('.send', dock);
  ta.oninput = () => { sb.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; };
  const sendMsg = async () => {
    const txt = ta.value.trim(); if (!txt) return;
    ta.value = ''; sb.disabled = true;
    const th = $('.thread-in', threads[p.id]);
    th.appendChild(userMsg(esc(txt))); scrollDown(p.id);
    const t = aiMsg('<div class="typing"><i></i><i></i><i></i></div>', 'thinking'); th.appendChild(t); scrollDown(p.id);
    await wait(1400);
    $('.body', t).innerHTML = '<p>Noted. I’ve added this to the decision log and will apply it from the current phase onward without redoing approved steps. If it affects something already approved, I’ll show you exactly what changes before touching it.</p>';
    $('.bot', t).className = 'bot';
  };
  sb.onclick = sendMsg;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } };
  ws.appendChild(dock);
  requestAnimationFrame(() => scrollDown(p.id));
  return [top, ws];
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function scrollDown(id) { const t = threads[id]; if (t) t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }); }

function userMsg(html) { return el(`<div class="msg user"><div class="bubble">${html}</div></div>`); }
function aiMsg(html, mode = '') { return el(`<div class="msg ai"><div class="who">${bot(mode)}</div><div class="body">${html}</div></div>`); }

/* gate card */
function gate({ tag, title, desc, options, cols3, cta = 'Continue', onPick, multi }) {
  const g = el(`<div class="gate"><div class="gate-h"><span class="tag">${tag}</span><b>${title}</b></div><p>${desc}</p><div class="opts ${cols3 ? 'cols3' : ''}"></div><div class="gate-foot"><small>${multi ? 'Answer each question' : 'Pick one'} · or type your own answer below</small><button class="btn primary" disabled>${cta}</button></div></div>`);
  const box = $('.opts', g), btn = $('.gate-foot .btn', g);
  let picked = null;
  options.forEach((o) => {
    const b = el(`<button class="opt">${o.thumb ? `<div class="thumb">${o.thumb}</div>` : ''}${o.rec ? '<span class="rec">Recommended</span>' : ''}<b>${o.t}</b><small>${o.s || ''}</small>${o.list ? `<ul>${o.list.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}</button>`);
    b.onclick = () => { if (g.classList.contains('done')) return; $$('.opt', box).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); picked = o; btn.disabled = false; };
    box.appendChild(b);
  });
  btn.onclick = () => { g.classList.add('done'); onPick && onPick(picked); };
  return g;
}

/* multi-question gate (design questions) */
function questionGate(qs, onDone) {
  const g = el(`<div class="gate"><div class="gate-h"><span class="tag">Gate C · Design questions</span><b>These choices make your design yours</b></div><p>Each question comes from your site and brief. Pick one per row, or let me decide.</p><div class="qs"></div><div class="gate-foot"><small>0 of ${qs.length} answered</small><button class="btn primary" disabled>Lock design DNA</button></div></div>`);
  const ans = {};
  qs.forEach((q, i) => {
    const row = el(`<div style="margin:0 0 14px"><div style="font-size:13.5px;margin-bottom:4px">${q.q}</div><div class="muted" style="font-size:12px;margin-bottom:8px">${q.why}</div><div class="chips" style="justify-content:flex-start;margin:0">${q.o.map((o) => `<button class="chip">${o}</button>`).join('')}<button class="chip">You decide</button></div></div>`);
    $$('.chip', row).forEach((c) => (c.onclick = () => {
      if (g.classList.contains('done')) return;
      $$('.chip', row).forEach((x) => x.classList.remove('on')); c.classList.add('on'); ans[i] = c.textContent;
      const n = Object.keys(ans).length; $('.gate-foot small', g).textContent = `${n} of ${qs.length} answered`; $('.gate-foot .btn', g).disabled = n < qs.length;
    }));
    $('.qs', g).appendChild(row);
  });
  $('.gate-foot .btn', g).onclick = () => { g.classList.add('done'); $$('.chip:not(.on)', g).forEach((c) => (c.style.display = 'none')); onDone(ans); };
  return g;
}

/* animated task card */
function task({ title, mode = 'search', workers, logs = [], refs = 0, onDone, doneText }) {
  const t = el(`<div class="task"><div class="task-h">${bot(mode)}<div class="tt"><b>${title}</b><div class="shimmer">${logs[0] || 'Working…'}</div></div><button class="icon-btn" title="Show log">${ICON.chev}</button></div>
    <div class="workers"></div>${refs ? '<div class="found"></div>' : ''}<div class="task-log"></div></div>`);
  const wb = $('.workers', t), log = $('.task-log', t);
  $('.task-h .icon-btn', t).onclick = () => log.classList.toggle('open');
  const rows = workers.map((w) => {
    const r = el(`<div class="wk"><span class="st"><span class="queued"></span></span><span class="name">${w[0]}<small>${w[1]}</small></span><span class="pct">—</span><div class="prog"><i style="width:0%"></i></div></div>`);
    wb.appendChild(r); return r;
  });
  let li = 0;
  const logTimer = setInterval(() => { li = (li + 1) % Math.max(logs.length, 1); if (logs[li]) { $('.shimmer', t).textContent = logs[li]; log.appendChild(el(`<div>· ${logs[li]}</div>`)); } }, 1700);
  const runOne = (r, i) => new Promise((res) => {
    let p = 0; $('.st', r).innerHTML = '<span class="spin"></span>';
    const tick = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 11);
      $('.prog i', r).style.width = p + '%'; $('.pct', r).textContent = Math.round(p) + '%';
      if (refs && Math.random() < 0.25 && $$('.found .ref', t).length < refs) { $('.found', t).appendChild(el(`<div class="ref">${planSVG(i * 7 + $$('.found .ref', t).length, '#4a4a50', 92, 64)}</div>`)); }
      if (p >= 100) { clearInterval(tick); r.classList.add('done'); $('.st', r).innerHTML = `<span class="check">${ICON.check}</span>`; res(); }
    }, 260 + Math.random() * 200);
  });
  (async () => {
    const lanes = 3; let next = 0;
    const lane = async () => { while (next < rows.length) { const i = next++; await wait(150 * i); await runOne(rows[i], i); } };
    await Promise.all(Array.from({ length: Math.min(lanes, rows.length) }, lane));
    clearInterval(logTimer);
    $('.bot', t).className = 'bot done';
    $('.shimmer', t).outerHTML = `<div class="muted" style="font-size:12.5px">${doneText || 'Done'}</div>`;
    onDone && onDone();
  })();
  return t;
}

/* ---------------- threads ---------------- */
function buildThread(p) {
  const wrap = el('<div class="thread"><div class="thread-in"></div></div>');
  const th = $('.thread-in', wrap);
  if (p.demo) { runDemo(p, th); return wrap; }
  if (p.id === 'cafe') buildCafe(th, p);
  else buildWaiting(th, p);
  return wrap;
}

function doneGate(tag, title, choice) { return el(`<div class="gate done"><div class="gate-h"><span class="tag">${tag}</span><b>${title}</b></div><div class="opts"><div class="opt sel"><b>${choice}</b></div></div></div>`); }

function buildCafe(th, p) {
  th.appendChild(userMsg('Here’s my AD-6 brief: a roadside café and dhaba on a 60 × 50 m corner plot opposite a hospital. Steel structure (competition).'));
  const a = aiMsg('<p>Read the brief, site survey and climate data. Your choices so far:</p>');
  $('.body', a).append(doneGate('Theme', 'Theme', 'Woven street · strong preference'), doneGate('Gate B', 'Detail level', 'Studio Standard'), doneGate('Gate D', 'Style', 'Blend of #6, #4, #9 · one orange accent'), doneGate('Gate G', 'Form', 'Option B: The Woven Street'));
  th.appendChild(a);
  const b = aiMsg('<p>Design development passed all checks: door swings, stair risers 150 mm, 1:12 ramps, travel distance, daylight in every room. Now drafting the drawing set from the model.</p>');
  $('.body', b).appendChild(task({
    title: 'Drafting drawing set', mode: 'draft',
    workers: [['A101–A103 Plans', 'Furnished, solid walls, grid'], ['A201–A203 Sections', 'Through hall, kitchen, stair'], ['A301–A302 Elevations', 'Road and garden sides'], ['DXF export', 'Layers + furniture blocks'], ['Sheet check', 'Legends, overlaps, numbers']],
    logs: ['Placing 164 furniture blocks…', 'Cutting section A–A through dining hall…', 'Checking legend matches every line type…', 'Exporting DXF R2018 in mm…', 'Comparing areas against the programme…'],
    doneText: 'Drawing set ready · 11 sheets, 11 DXF files', onDone: () => { p.status = 'wait'; renderSidebar(); },
  }));
  th.appendChild(b);
}

function buildWaiting(th, p) {
  th.appendChild(userMsg(`Continuing ${p.name}.`));
  const a = aiMsg(`<p>We’re at <b>${PHASES[p.phase][0]}</b>. ${p.status === 'done' ? 'Everything is complete and in the Library.' : 'I need one decision from you before I continue.'}</p>`);
  if (p.status !== 'done') {
    $('.body', a).appendChild(gate({
      tag: 'Gate', title: PHASES[p.phase][0], desc: PHASES[p.phase][1],
      options: [{ t: 'Option A', s: 'The safer, more compact choice.', rec: true }, { t: 'Option B', s: 'More open, uses more of the site.' }],
      onPick: (o) => { th.appendChild(aiMsg(`<p>Locked <b>${o.t}</b>. Continuing.</p>`)); },
    }));
  }
  th.appendChild(a);
}

/* full demo for a freshly created project */
async function runDemo(p, th) {
  const step = (n) => { p.phase = n; refreshChrome(); };
  const files = p.files && p.files.length ? p.files : [['PDF', 'Brief.pdf', '2.4 MB']];
  th.appendChild(userMsg(`${p.brief ? esc(p.brief) + '<br/><br/>' : ''}<div class="files" style="margin:0">${files.map((f) => `<span class="file-chip"><span class="fi">${f[0]}</span><span>${f[1]}<small>${f[2]}</small></span></span>`).join('')}</div>`));
  await wait(400);
  const a = aiMsg(''); th.appendChild(a);
  await new Promise((res) => $('.body', a).appendChild(task({
    title: 'Reading your brief', mode: 'thinking',
    workers: [['Brief', 'Typology, users, deliverables'], ['Site survey', 'Area, edges, levels'], ['Rules check', 'FAR, coverage, setbacks']],
    logs: ['Extracting required spaces…', 'Measuring plot from survey: 4,180 m²…', 'Brief says 4,200 m², close enough…', 'Listing deliverables: 6 A1 sheets + model…'],
    doneText: 'Read 3 files · 2 gaps found', onDone: res,
  })));
  const b = aiMsg(`<p>Here’s what I understood. Correct anything that’s wrong.</p>
    <div class="facts"><div><small>Project</small>Public library, 2,400 m² built-up</div><div><small>Site</small>4,180 m², river on north edge</div><div><small>Users</small>Students, families, elderly readers</div><div><small>Limits</small>FAR 1.5 · coverage 40% · 15 m</div><div><small>Deliverables</small>6 A1 sheets + physical model</div><div><small>Missing</small>Parking count, any mandated material</div></div>`);
  th.appendChild(b); scrollDown(p.id);
  await new Promise((res) => $('.body', b).appendChild(gate({
    tag: 'Gate A2 · Theme', title: 'Do you already have a theme in mind?',
    desc: 'Asked before research, so nothing is wasted. A theme filters every question and every form option.',
    options: [
      { t: 'Yes, and it’s fixed', s: 'e.g. “circular”. Every option will be a version of it, adapted to the site.' },
      { t: 'Yes, a strong preference', s: 'Keep it unless the site really fights it. I’ll adapt how it shows up.', rec: true },
      { t: 'Open / no theme', s: 'Form comes from site, climate, users and programme.' },
    ], onPick: res,
  })));
  step(1); scrollDown(p.id);
  const c = aiMsg('<p>Quick fit check for a <b>circular</b> theme on this plot: a single 46 m drum doesn’t fit the 40% coverage. <b>Fits with adaptation:</b> a ring of reading pavilions around a central court, or a circular courtyard inside a river-facing block.</p>');
  th.appendChild(c); scrollDown(p.id);
  await new Promise((res) => $('.body', c).appendChild(gate({
    tag: 'Gate B · Detail level', title: 'How detailed should this project be?', cols3: true,
    desc: 'Accuracy is the same in all three. They differ in how much you get.',
    options: [
      { t: 'Student Simple', s: 'Fast, clear, jury-ready basics.', list: ['1-page programme', '3 form options', 'Furnished plans, 2 sections', '3–6 sheets'] },
      { t: 'Studio Standard', s: 'Mid and final juries.', rec: true, list: ['Programme + adjacency + bubbles', '3–5 options with evolution', 'Plans, 3 sections, 4 elevations, DXF', '6–10 sheets + jury Q&A'] },
      { t: 'Professional', s: 'Thesis and competitions.', list: ['Standards-derived sizes', 'Structure and details', 'Technical + presentation PDFs', 'Full render set'] },
    ], onPick: res,
  })));
  step(3); p.tier = 'Studio Standard'; scrollDown(p.id);
  const d = aiMsg('<p>Researching through the lens of your theme. I’ll save each finding as I go.</p>');
  th.appendChild(d); scrollDown(p.id);
  await new Promise((res) => $('.body', d).appendChild(task({
    title: 'Research', mode: 'search', refs: 8,
    workers: [['Site & context', 'River edge, access, views'], ['Climate', 'Sun path, monsoon winds'], ['Bye-laws', 'Setbacks, fire, parking'], ['Space standards', 'Reading rooms, stacks, toilets'], ['Circular precedents', 'How others made rings work']],
    logs: ['Reading monsoon wind data…', 'Found: Stockholm Public Library (rotunda)…', 'Found: Exeter Library, Louis Kahn…', 'Checking fire travel distance for ring plans…', 'Tagging 3 values as estimates…'],
    doneText: 'Research saved · 5 files, 8 precedents', onDone: res,
  })));
  step(4); scrollDown(p.id);
  const e = aiMsg('<p>What the site is telling us: the river edge is quiet and cool, the road edge is noisy and hot in the afternoon, and monsoon winds come from the south-west. These questions follow from that.</p>');
  th.appendChild(e); scrollDown(p.id);
  await new Promise((res) => $('.body', e).appendChild(questionGate([
    { q: 'Where should the ring open?', why: 'A broken ring can face the river view or the monsoon breeze. You can’t fully have both.', o: ['Open to the river', 'Open to the breeze', 'Closed ring, inner court'] },
    { q: 'What should the reader feel?', why: 'Decides the section: one big volume or many small rooms.', o: ['One calm shared hall', 'Small quiet nooks', 'A walk that changes'] },
    { q: 'Ring height', why: 'Permitted height is 15 m. Coverage is tight, so height buys area.', o: ['Single storey spread', 'G+1 ring', 'Rising spiral'] },
  ], res)));
  step(8); scrollDown(p.id);
  const f = aiMsg('<p>Design DNA locked. Here are three form options. Every one is a version of the circle, adapted to your answers. The evolution strip and checks for each are in the panel.</p>');
  th.appendChild(f); scrollDown(p.id);
  await new Promise((res) => $('.body', f).appendChild(gate({
    tag: 'Gate G · Form', title: 'Pick the form to develop', cols3: true, cta: 'Develop this option',
    desc: 'Coverage, height and setbacks pass for all three.',
    options: [
      { t: 'A · Pavilion ring', s: 'Eight reading pavilions around a court, open to the river.', thumb: massSVG('ring'), rec: true },
      { t: 'B · Woven bands', s: 'Three curved bands under one floating roof.', thumb: massSVG('woven') },
      { t: 'C · Rising arc', s: 'A half-ring that climbs toward the river view.', thumb: massSVG('wing') },
    ], onPick: res,
  })));
  step(9); p.status = 'run'; refreshChrome();
  const h = aiMsg('<p>Good choice. Developing the plans and structure now. I’ll stop at the next gate.</p>');
  th.appendChild(h); scrollDown(p.id);
  $('.body', h).appendChild(task({ title: 'Design development', mode: 'draft', workers: [['Radial column grid', '8 bays, ring beam'], ['Furnished plans', 'Reading rooms, stacks'], ['Accuracy checks', 'Doors, stairs, ramps, daylight']], logs: ['Setting out the radial grid…', 'Checking wedge rooms fit furniture…', 'Stair risers 150 mm, OK…'], doneText: 'Plans ready for your review', onDone: () => { p.status = 'wait'; refreshChrome(); } }));
  scrollDown(p.id);
}

function refreshChrome() {
  renderSidebar();
  if (state.view === 'project') {
    const p = PROJECTS.find((x) => x.id === state.project);
    const pills = $$('.topbar .pill');
    if (pills[0]) { pills[0].className = p.status === 'run' ? 'pill run' : 'pill accent'; pills[0].textContent = p.status === 'run' ? 'Working' : 'Waiting for you'; }
    if (pills[1]) pills[1].textContent = 'P' + p.phase + ' · ' + PHASES[p.phase][0];
    renderPanel();
  }
}

/* ---------------- right panel ---------------- */
function renderPanel() {
  const panel = $('#panel');
  const show = state.view === 'project' && state.panel;
  panel.classList.toggle('open', show);
  if (!show) return;
  const p = PROJECTS.find((x) => x.id === state.project);
  panel.innerHTML = `<div class="panel-h">${['phases', 'files', 'preview'].map((t) => `<button class="tab ${state.panelTab === t ? 'on' : ''}" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}<span class="sp"></span><button class="icon-btn" data-close>${ICON.x}</button></div><div class="panel-b"></div>`;
  $$('[data-t]', panel).forEach((b) => (b.onclick = () => { state.panelTab = b.dataset.t; renderPanel(); }));
  $('[data-close]', panel).onclick = () => { state.panel = false; renderPanel(); };
  const body = $('.panel-b', panel);
  if (state.panelTab === 'phases') {
    body.innerHTML = `<div class="phases">${PHASES.map((ph, i) => {
      const cls = p.status === 'done' || i < p.phase ? 'done' : i === p.phase ? (p.status === 'wait' ? 'now gate-wait' : 'now') : 'lock';
      return `<div class="phase ${cls}"><span class="nd">${cls === 'done' ? ICON.check : cls === 'lock' ? '' : ''}</span><span><b>${ph[0]}</b><small>${i === p.phase && p.status !== 'done' ? (p.status === 'wait' ? 'Waiting for your choice' : 'In progress…') : ph[1]}</small></span></div>`;
    }).join('')}</div>`;
  } else if (state.panelTab === 'files') {
    const out = p.phase >= 9 ? [['pdf', 'A101 Ground floor plan', 'Presentation PDF'], ['dxf', 'A101 Ground floor plan', 'Layers + blocks'], ['pdf', 'A201 Section A–A', '1:100'], ['img', 'Exploded floor axo', 'PNG · 4K']] : [];
    body.innerHTML = `<div class="sec-h">Outputs</div>${out.length ? out.map((f) => `<div class="file-row"><span class="fi ${f[0]}">${f[0].toUpperCase()}</span><span class="fn">${f[1]}<small>${f[2]}</small></span>${ICON.dl}</div>`).join('') : '<p class="muted" style="margin:4px">Nothing yet. Outputs appear here as each phase finishes.</p>'}
      <div class="sec-h">Working files</div>
      ${[['md', 'Fact sheet', 'Brief'], ['md', 'Design DNA', 'Your choices'], ['md', 'Decision log', `${p.phase * 2 + 3} entries`], ['md', 'Research', '5 files']].map((f) => `<div class="file-row"><span class="fi ${f[0]}">${f[0].toUpperCase()}</span><span class="fn">${f[1]}<small>${f[2]}</small></span></div>`).join('')}`;
  } else {
    body.innerHTML = `<div class="sheet">${sheetSVG()}</div><div class="preview-meta"><span>A101 · Ground floor plan</span><span class="ver"><button>v1</button><button class="on">v2</button></span></div>
      <div class="sec-h">Form evolution</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${['ring', 'woven', 'wing', 'ring'].map((m) => `<div class="evo">${massSVG(m)}</div>`).join('')}</div>`;
    $$('.ver button', body).forEach((b) => (b.onclick = () => { $$('.ver button', body).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
  }
}

/* ---------------- misc ---------------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }

$$('[data-nav]').forEach((b) => (b.onclick = () => go(b.dataset.nav)));
$('#collapseBtn').onclick = () => $('#app').classList.toggle('sb-collapsed');
$('#searchInput').oninput = renderSidebar;
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); go('home'); } });
render();
