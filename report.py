"""Working documents written from a brief analysis: fact sheet, checklist and the PDF summary.

The PDF is a private working document for the student (it lists gaps and assumptions),
not a presentation sheet. It is laid out in HTML and printed by headless Chrome or Edge.
"""

import html
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

TIERS = ["Student Simple", "Studio Standard", "Professional"]
BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]


def _groups(items, key):
    out = {}
    for it in items:
        out.setdefault(it.get(key) or "Other", []).append(it)
    return out


# ---------- markdown ----------
def fact_sheet_md(project, r, answers):
    L = [f"# Fact sheet: {r.get('project_name') or project.get('name', '')}", "", r.get("one_line", ""), ""]
    for group, facts in _groups(r.get("facts", []), "group").items():
        L += [f"## {group}", "", "| Item | Value | Status | Source |", "|---|---|---|---|"]
        L += [f"| {f['label']} | {f['value']} | {'Given' if f['status'] == 'given' else 'Assumed'} | {f['source']} |" for f in facts]
        L.append("")
    if r.get("programme"):
        L += ["## Required spaces (from the brief)", "", "| Space | Area | Qty | Note |", "|---|---|---|---|"]
        L += [f"| {p['space']} | {p['area']} | {p['qty']} | {p['note']} |" for p in r["programme"]]
        L.append("")
    if r.get("missing"):
        L += ["## Gaps", ""]
        for i, m in enumerate(r["missing"]):
            a = answers.get(str(i))
            L.append(f"{i + 1}. {m['question']} ({m['why']})" + (f"\n   Answer: {a}" if a else "\n   Answer: not given yet"))
        L.append("")
    if r.get("mismatches"):
        L += ["## Things that don't add up", ""] + [f"- {m}" for m in r["mismatches"]] + [""]
    return "\n".join(L)


def checklist_md(project, r, cl):
    chosen = set(cl["checked"])
    L = [f"# Deliverables checklist: {r.get('project_name') or project.get('name', '')}", "",
         f"Detail level: {cl['tier']}. {len(chosen)} items to produce.", ""]
    for group, items in _groups(r["checklist"], "group").items():
        picked = [it for it in items if it["id"] in chosen]
        if picked:
            L += [f"## {group}", ""]
            L += [f"- [ ] {it['title']}{' (required by brief)' if it['required_by_brief'] else ''}: {it['detail']}" for it in picked]
            L.append("")
    return "\n".join(L)


# ---------- PDF ----------
CSS = """
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #1d1d1f; font-size: 9.6pt; line-height: 1.38; margin: 0; }
h1 { font-size: 20pt; margin: 0 0 3pt; font-weight: bold; }
h2 { font-size: 11.5pt; font-weight: bold; margin: 15pt 0 5pt; padding-bottom: 3pt; border-bottom: 1.4pt solid #1d1d1f; break-after: avoid; }
h3 { font-size: 9.6pt; font-weight: bold; margin: 9pt 0 3pt; color: #d35400; text-transform: uppercase; letter-spacing: .4pt; break-after: avoid; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3pt solid #d35400; padding-bottom: 7pt; }
.head .sub { font-size: 10.5pt; color: #444; max-width: 125mm; }
.head .meta { text-align: right; font-size: 8.4pt; color: #555; line-height: 1.5; white-space: nowrap; padding-left: 10mm; }
.note { font-size: 8.2pt; color: #666; margin: 5pt 0 0; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: .8pt solid #bbb; margin-top: 10pt; }
.cards div { padding: 6pt 8pt; border-right: .8pt solid #bbb; }
.cards div:last-child { border-right: 0; }
.cards small { display: block; font-size: 7.4pt; color: #777; text-transform: uppercase; letter-spacing: .4pt; }
.cards b { font-size: 10pt; }
table { width: 100%; border-collapse: collapse; margin: 0 0 4pt; }
th { text-align: left; font-size: 7.6pt; color: #666; text-transform: uppercase; letter-spacing: .3pt; font-weight: bold; padding: 4pt 5pt; border-bottom: .8pt solid #999; }
td { padding: 4pt 5pt; border-bottom: .5pt solid #ddd; vertical-align: top; }
tr { break-inside: avoid; }
td.k { width: 30%; font-weight: bold; }
td.s { width: 15%; color: #666; font-size: 8.4pt; }
.tag { display: inline-block; font-size: 7.2pt; font-weight: bold; padding: .5pt 4pt; border-radius: 2pt; border: .6pt solid #999; color: #555; white-space: nowrap; }
.tag.req { border-color: #d35400; color: #d35400; }
.tag.inf { border-color: #8a8a8a; color: #6a6a6a; }
.box { width: 9pt; height: 9pt; border: .9pt solid #1d1d1f; display: inline-block; margin-top: 1pt; }
td.c { width: 16pt; }
td.d { color: #444; }
ol.q { margin: 0; padding-left: 16pt; }
ol.q li { margin: 0 0 6pt; break-inside: avoid; }
ol.q .why { color: #666; font-size: 8.6pt; }
ol.q .ans { margin-top: 2pt; border-left: 2pt solid #d35400; padding-left: 6pt; }
ol.q .ans.empty { border-left-color: #bbb; color: #888; }
ul.plain { margin: 0; padding-left: 14pt; }
.cols { columns: 2; column-gap: 10mm; }
.cols .grp { break-inside: avoid; }
.foot { margin-top: 14pt; font-size: 7.8pt; color: #888; border-top: .6pt solid #ccc; padding-top: 4pt; }
"""


def _area(a):
    a = (a or "").strip()
    return f"{a} m²" if a and all(c.isdigit() or c in " ,.x×" for c in a) else (a or "-")


def report_html(project, r, cl):
    e = lambda s: html.escape(str(s or ""))
    chosen = set(cl["checked"])
    answers = cl.get("answers", {})
    by_fact = _groups(r.get("facts", []), "group")
    req = sum(1 for it in r["checklist"] if it["id"] in chosen and it["required_by_brief"])
    H = [f"<!doctype html><html><head><meta charset='utf-8'><title>{e(r.get('project_name'))}: brief summary and checklist</title><style>{CSS}</style></head><body>"]
    H.append(f"""<div class="head"><div><h1>{e(r.get('project_name') or project.get('name'))}</h1><div class="sub">{e(r.get('one_line'))}</div></div>
      <div class="meta"><b>Brief summary and checklist</b><br/>{e(project.get('group') or '')}{' · ' if project.get('group') else ''}{datetime.now():%d %b %Y}<br/>Working document, not for presentation</div></div>""")
    H.append(f"""<div class="cards"><div><small>Typology</small><b>{e(r.get('typology') or '-')}</b></div><div><small>Stage</small><b>{e(r.get('stage') or 'Not stated')}</b></div>
      <div><small>Deadline</small><b>{e(r.get('deadline') or 'Not stated')}</b></div><div><small>Detail level</small><b>{e(cl['tier'])}</b></div></div>""")

    H.append("<h2>1. What the brief says</h2>")
    for group, facts in by_fact.items():
        H.append(f"<h3>{e(group)}</h3><table>")
        for f in facts:
            tag = "" if f["status"] == "given" else ' <span class="tag inf">Assumed</span>'
            H.append(f"<tr><td class='k'>{e(f['label'])}</td><td>{e(f['value'])}{tag}</td><td class='s'>{e(f['source'])}</td></tr>")
        H.append("</table>")

    if r.get("programme"):
        H.append("<h2>2. Required spaces</h2><table><tr><th>Space</th><th>Area</th><th>Qty</th><th>Note</th></tr>")
        H += [f"<tr><td class='k'>{e(p['space'])}</td><td>{e(_area(p['area']))}</td><td>{e(p['qty'] or '-')}</td><td class='d'>{e(p['note'])}</td></tr>" for p in r["programme"]]
        H.append("</table>")

    n = 3 if r.get("programme") else 2
    if r.get("missing") or r.get("mismatches"):
        H.append(f"<h2>{n}. Gaps to close</h2>")
        n += 1
        if r.get("missing"):
            H.append("<ol class='q'>")
            for i, m in enumerate(r["missing"]):
                a = answers.get(str(i))
                ans = f"<div class='ans'>{e(a)}</div>" if a else "<div class='ans empty'>Not answered yet</div>"
                H.append(f"<li><b>{e(m['question'])}</b><div class='why'>{e(m['why'])}</div>{ans}</li>")
            H.append("</ol>")
        if r.get("mismatches"):
            H.append("<h3>Things that don't add up</h3><ul class='plain'>" + "".join(f"<li>{e(m)}</li>" for m in r["mismatches"]) + "</ul>")

    H.append(f"<h2>{n}. Deliverables checklist</h2>")
    H.append(f"<p class='note'>{len(chosen)} items at <b>{e(cl['tier'])}</b> detail, {req} of them required by the brief. Tick each box when it is done.</p>")
    for group, items in _groups(r["checklist"], "group").items():
        picked = [it for it in items if it["id"] in chosen]
        if not picked:
            continue
        H.append(f"<h3>{e(group)}</h3><table>")
        for it in picked:
            tag = ' <span class="tag req">Required by brief</span>' if it["required_by_brief"] else ""
            H.append(f"<tr><td class='c'><span class='box'></span></td><td class='k'>{e(it['title'])}{tag}</td><td class='d'>{e(it['detail'])}</td></tr>")
        H.append("</table>")
    left = [it for it in r["checklist"] if it["id"] not in chosen]
    if left:
        H.append("<h3>Not included this time</h3><ul class='plain'>" + "".join(f"<li>{e(it['title'])}</li>" for it in left) + "</ul>")

    if r.get("files"):
        H.append("<h2>Files read</h2><table><tr><th>File</th><th>Used for</th></tr>")
        H += [f"<tr><td class='k'>{e(f['name'])}{'' if f['read'] else ' <span class=\"tag inf\">Not readable</span>'}</td><td class='d'>{e(f['used_for'])}</td></tr>" for f in r["files"]]
        H.append("</table>")
    H.append("<div class='foot'>Your Architect · generated from your uploaded brief. Check every given fact against the original brief before relying on it.</div></body></html>")
    return "\n".join(H)


def find_browser():
    for p in BROWSERS:
        if Path(p).exists():
            return p
    return shutil.which("chrome") or shutil.which("msedge") or shutil.which("chromium") or shutil.which("google-chrome")


def render_pdf(html_text, pdf_path, work_dir):
    """Prints HTML to a vector PDF with headless Chrome/Edge. Returns False if no browser is available."""
    browser = find_browser()
    if not browser:
        return False
    work_dir.mkdir(parents=True, exist_ok=True)
    src = work_dir / "report.html"
    src.write_text(html_text, encoding="utf-8")
    tmp = pdf_path.with_suffix(".tmp.pdf")
    cmd = [browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--no-first-run",
           f"--user-data-dir={work_dir / 'browser-profile'}", f"--print-to-pdf={tmp}", src.resolve().as_uri()]
    try:
        subprocess.run(cmd, timeout=90, capture_output=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired):
        return False
    if not tmp.exists() or tmp.stat().st_size == 0:
        return False
    tmp.replace(pdf_path)
    return True
