"""Research and references: stage S1 of the Arch Studio workflow, run for real.

Runs narrow Claude Code jobs in parallel, one per topic, through the `claude` CLI on this machine:
  - research jobs (site, climate, rules, space standards, precedents) search the web and return notes in
    which every point cites a source that was actually opened. Anything not found goes under "gaps".
  - reference jobs (one per drawing type) find real published drawings and sheets (ArchDaily, Dezeen,
    student portfolios, award sheets, Behance, Pinterest...): Claude finds direct image links, the server
    downloads them, and a second pass looks at each image and keeps only strong ones. Nothing is drawn or
    invented here, and Claude never gets a shell.

Writes into the project folder, as in the pack's templates/folder_structure.md:
  02_research/<topic>.md, 02_research/data/<topic>.json
  03_references/<type>/<P01_...>.jpg, 03_references/found.json, sources.csv, INDEX.md
  outputs/Research.pdf   the research notes, for the student to read (the chat only links it; references are picked in the chat)
  research.json   job status (also served live while running)

Only one research run at a time, across all projects. It never starts on its own: the student presses Start.
"""

import csv
import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

import html

import report
from brief_engine import get_analysis, now, read_json, write_json

MODEL = os.environ.get("YA_RESEARCH_MODEL", "sonnet")
EFFORT = os.environ.get("YA_RESEARCH_EFFORT", "medium")
PARALLEL = int(os.environ.get("YA_RESEARCH_PARALLEL", "4"))
TIMEOUT = 25 * 60
KEEP = 6  # references kept per type; the board shows 3, starting at the project's seed offset

RESEARCH = {
    "site": ("Site and context", """Locate the site. Record the roads on each edge (type, traffic, noise), neighbours and landmarks,
views, where people and vehicles arrive from, existing trees and levels if known. Describe the four edges: what each edge
offers or demands (e.g. "south = highway noise"). Add one short local-context idea that could inspire the form: an
industry, craft, history or landscape of the place, with its source. If the student has no site yet, describe a typical
plot for this brief in the stated region, say clearly that it is hypothetical, and cite what you based it on."""),
    "climate": ("Climate", """Find the climate at the site: monthly mean max/min temperature and rainfall, prevailing winds by
season, and the sun path at the site latitude (noon sun altitude at both solstices and the equinox; compute from the
latitude and say so). Use real data sources: India Meteorological Department climatological normals, EPW/TMY files
(climate.onebuilding.org), or published normals for the nearest station; name the station. Never invent numbers.
End with 3-5 design moves in plain words (e.g. "shade the west", "open to the monsoon breeze")."""),
    "rules": ("Rules and envelope", """Find the rules that apply: FAR/FSI, ground coverage, height, setbacks, parking norms,
fire (exits, travel distance, stair widths), accessibility, and toilet fixture norms. Use the local development
control regulations or bylaws; if none are found, use the nearest larger city's or the National Building Code of India
2016, and say which one and why. Values must agree with each other. Include one point headed "Envelope summary" with
the maximum footprint, height and setbacks for this site. This note is internal; only the envelope summary reaches a
sheet."""),
    "standards": ("Space standards", """Size every space the brief lists (see the programme in the context). For each space give
one point: the unit test-fit (furniture plus clearances, e.g. "4-seat table unit 2.4 x 2.4 m"), a cross-check rate
(e.g. m2 per seat), and any code minimum. Source hierarchy: the brief, local bylaws, NBC 2016, the Harmonised
Guidelines and Standards for Universal Accessibility in India 2021, typology guidelines, then Neufert, Time-Saver
Standards, the Metric Handbook. Books you cannot open online may be cited by title and edition with an empty url, but
then mark the point "verified": false."""),
    "precedents": ("Precedents", """Pick 4-5 well-regarded built projects, of any type, that solved a driver similar to this
brief's (climate, site, structure, user experience). One point per building: heading = building, architect, place and
year; text = why the form is the way it is, in 2-3 lines (you are learning reasons, not copying shapes). Link each to
its page on ArchDaily, Dezeen, the architect's site or a similar publication."""),
}

# reference types: (label, file prefix, what to look for, the user's upload slot that replaces the search)
REFS = {
    "foundation_tables": ("Area programme tables", "T", "area programme tables / space programme tables as laid out on architecture presentation sheets (rows of spaces with areas, grouped by zone)", "diagrams"),
    "bubble": ("Bubble diagrams", "B", "bubble diagrams and adjacency diagrams from architecture presentation sheets", "diagrams"),
    "zoning": ("Zoning diagrams", "Z", "zoning diagrams (plan or axonometric) with clear legends: functional zones, public to private, circulation arrows", "diagrams"),
    "plan": ("Plans", "P", "furnished presentation floor plans (walls as poche or hatch, furniture shown, legible room labels)", "plan"),
    "section": ("Sections", "S", "presentation sections and section perspectives (cut elements clearly drawn, people, trees, ground and structure)", "section"),
    "elevation": ("Elevations", "E", "presentation elevations (fine linework, shading or watercolour, trees and context)", "elevation"),
    "sheets_composition": ("Sheet layouts", "C", "whole architecture presentation sheets / boards (A1 or A0 layouts with drawings, diagrams and text)", "sheet_composition"),
}

RESEARCH_PROMPT = """You are a research assistant for an architecture student's design project. You research one topic only.

Rules:
- Use WebSearch and WebFetch. Cite only sources you actually opened in this session; never invent a URL, title or number.
- Every point lists the indices of its sources (0-based, into "sources"). A point without a source must say so and be "verified": false.
- Numbers must come from a source or be computed from sourced numbers (say how). If you cannot find something, put it in "gaps" instead of guessing.
- Plain, short sentences a student can say aloud. No code clause numbers in "summary".
- Stop once the topic is answered; don't read whole websites. Aim for 6-14 points."""

REFS_PROMPT = """You find presentation references for an architecture student: real, published drawings that show a drawing STYLE the student might pick. Search for the drawing style, NOT for the student's building type: an excellent drawing of any building works.

Where to search, in this order:
1. ArchDaily and Dezeen project pages that include drawings (plans, sections, elevations, diagrams);
2. student portfolio collections: CEPT Portfolio, ArchiDiaries, NASA India entries, issuu portfolios;
3. award sheets: AIA COTE, RIBA President's Medals, international student competitions;
4. Behance and Pinterest ("architecture presentation sheet", "zoning diagram", "furnished floor plan", "section perspective", "elevation watercolour").

How to get the image links:
- ArchDaily: WebFetch a project page and ask for the image URLs of its DRAWINGS with their captions (e.g. "Section", "Plan", "Diagram"). Files look like https://images.adsttc.com/media/images/<id>/large_jpg/<name>.jpg ; give the large_jpg version.
- Pinterest: WebSearch "site:pinterest.com <style terms>", WebFetch a pin page and take its og:image (https://i.pinimg.com/originals/... or /736x/...).
- Dezeen, Behance, CEPT and others: take the direct .jpg/.png URL of the drawing from the page you opened.
- Only give URLs you actually saw on a page in this session. Never make one up. Skip photos and renders.

Return 10-14 candidates of the requested drawing type, from at least 3 different projects and at least 2 different sites, chosen for professional presentation quality and for variety of style. Someone else downloads and checks them, so do not try to download anything yourself."""

PICK_PROMPT = """You are an architecture tutor choosing presentation references for a student. Look at the downloaded candidate images with the Read tool and keep the best.

Read every listed file. Reject a candidate if it is not the requested drawing type, is a photo or render, is low resolution or blurry, is mostly watermark or text, looks AI-generated, or looks amateur or cartoonish. The student is judged on professional presentation, so quality comes first.

Keep up to 6, best first, genuinely different from each other in style (e.g. solid poche walls vs outlined hatched walls vs black walls with coloured zones). For each kept file write "traits": one plain line describing its key style traits, e.g. "solid dark walls, furniture in thin lines, soft floor colours, one orange accent". Keep none rather than keep weak ones."""

_S = {"type": "string"}


def _obj(props):
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


RESEARCH_SCHEMA = _obj({
    "summary": _S,
    "points": {"type": "array", "items": _obj({"heading": _S, "text": _S, "verified": {"type": "boolean"},
                                                "sources": {"type": "array", "items": {"type": "integer"}}})},
    "design_moves": {"type": "array", "items": _S},
    "gaps": {"type": "array", "items": _S},
    "sources": {"type": "array", "items": _obj({"title": _S, "publisher": _S, "url": _S})},
})
CANDIDATES_SCHEMA = _obj({
    "candidates": {"type": "array", "items": _obj({"image_url": _S, "page_url": _S, "caption": _S, "project": _S,
                                                    "author": _S, "source_site": _S})},
})
PICK_SCHEMA = _obj({"keep": {"type": "array", "items": _obj({"file": _S, "traits": _S})}})

_status = {}  # project id -> live status
_procs = {}   # project id -> running claude processes, so a run can be stopped
_lock = threading.Lock()
PDF_NAME = "Research.pdf"
IMG_MAGIC = {b"\xff\xd8\xff": ".jpg", b"\x89PNG": ".png", b"RIFF": ".webp", b"GIF8": ".gif"}


def get_status(pdir):
    with _lock:
        live = _status.get(pdir.name)
        if live:
            return json.loads(json.dumps(live))
    st = read_json(pdir / "research.json")
    if st and st.get("state") == "running":  # the server stopped mid-run: nothing is running any more
        for j in st["jobs"].values():
            if j["state"] in ("queued", "running"):
                j.update(state="error", error="Interrupted because the server stopped. Try again.")
        st["state"] = "done"
    return st


def results(pdir):
    """Everything the UI shows: research notes per topic and the kept references per type."""
    notes = {k: read_json(pdir / "02_research" / "data" / f"{k}.json") for k in RESEARCH}
    return {"notes": {k: v for k, v in notes.items() if v}, "found": read_json(pdir / "03_references" / "found.json", {})}


def running_project():
    """The id of the project whose research is running, if any (only one may run at a time)."""
    with _lock:
        return next((pid for pid, st in _status.items() if st["state"] == "running"), None)


def stop(pdir):
    """Stops a running research: no new jobs start and the running claude processes are killed."""
    with _lock:
        st = _status.get(pdir.name)
        if not st or st["state"] != "running":
            return False
        st["stop"] = True
        procs = list(_procs.get(pdir.name, ()))
    for proc in procs:
        try:
            proc.kill()
        except OSError:
            pass
    return True


def start(pdir, only=None):
    """Starts the research in the background. `only` limits it to some job ids (e.g. ["plan"] to search plans again)."""
    state = read_json(pdir / "state.json", {}) or {}
    analysis = (get_analysis(pdir) or {}).get("result")
    if not analysis:
        raise ValueError("Read the brief first")
    if not shutil.which("claude"):
        raise ValueError("Claude Code isn't installed or isn't on PATH")
    jobs = list(RESEARCH) + list(REFS)
    if only:
        jobs = [j for j in jobs if j in only]
        if not jobs:
            raise ValueError("Unknown research topic")
    with _lock:
        live = _status.get(pdir.name)
        if live and live["state"] == "running":
            return False
        other = next((pid for pid, st in _status.items() if st["state"] == "running"), None)
        if other:
            name = (read_json(pdir.parent / other / "project.json", {}) or {}).get("name", other)
            raise ValueError(f"Research is already running for “{name}”. Only one runs at a time: stop it or wait for it to finish.")
        prev = read_json(pdir / "research.json", {}) or {}
        st = {"state": "running", "started": now(), "finished": None, "jobs": dict(prev.get("jobs", {})) if only else {}}
        for j in jobs:
            st["jobs"][j] = {"label": (RESEARCH.get(j) or REFS.get(j))[0], "kind": "research" if j in RESEARCH else "refs",
                             "state": "queued", "log": [], "error": None, "started": None, "finished": None, "cost_usd": None}
        _status[pdir.name] = st
    threading.Thread(target=_run_all, args=(pdir, jobs, state, analysis), daemon=True).start()
    return True


def _set(pid, job, **fields):
    with _lock:
        _status[pid]["jobs"][job].update(fields)


def _log(pid, job, text):
    with _lock:
        log = _status[pid]["jobs"][job]["log"]
        if not log or log[-1]["text"] != text:
            log.append({"at": now(), "text": text})
            del log[:-40]


_save_lock = threading.Lock()  # parallel jobs save the same file; on Windows two renames at once collide


def _save(pdir):
    with _lock:
        snap = json.loads(json.dumps(_status[pdir.name]))
    with _save_lock:
        try:
            write_json(pdir / "research.json", snap)
        except OSError:  # the next save writes it again; never let a save kill a worker
            pass


def _context(state, analysis):
    i = state.get("intake", {})
    facts = "\n".join(f"- {f['group']} / {f['label']}: {f['value']}" + (" (assumed)" if f.get("status") == "inferred" else "")
                      for f in analysis.get("facts", []))
    prog = "\n".join(f"- {s['space']}: {s.get('area') or 'area not given'}, qty {s.get('qty') or '1'}. {s.get('note', '')}"
                     for s in analysis.get("programme", []))
    site = "No site chosen yet: use a typical plot for this brief." if i.get("typicalSite") else i.get("site") or "See the brief."
    gaps = "\n".join(f"- {q['question']} → {(i.get('gaps') or {}).get(str(n), 'not answered')}" for n, q in enumerate(analysis.get("missing", [])))
    return f"""Project: {analysis.get('project_name')}
{analysis.get('one_line')}
Typology: {analysis.get('typology')}
Purpose: {i.get('purpose', 'not given')}; detail: {i.get('detail', 'not given')}
Site: {site}
Site size and roads: {i.get('siteSize') or i.get('sizeMode') or 'see the brief'}
Student's ideas: {i.get('ideas') or 'none given'}
Numbers: {i.get('numbersText') or 'typical for this type'}

Facts from the brief:
{facts or '- none'}

Spaces listed in the brief:
{prog or '- none listed'}

Gaps the student answered:
{gaps or '- none'}"""


def _run_all(pdir, jobs, state, analysis):
    pid = pdir.name
    ctx = _context(state, analysis)
    user_refs = pdir / "03_references" / "user"
    queue = list(jobs)
    qlock = threading.Lock()

    def worker():
        while True:
            with qlock:
                if not queue or _status[pid].get("stop"):
                    return
                job = queue.pop(0)
            try:
                if job in REFS and any((user_refs / REFS[job][3]).glob("*")):
                    _set(pid, job, state="skipped", finished=now(), note="Using your own references")
                elif job in REFS:
                    _refs_job(pdir, job, ctx)
                else:
                    _research_job(pdir, job, ctx)
            except Exception as e:  # one failed topic must not stop the others
                stopped = _status[pid].get("stop")
                _set(pid, job, state="error", error="Stopped by you" if stopped else str(e), finished=now())
            _save(pdir)

    threads = [threading.Thread(target=worker, daemon=True) for _ in range(max(1, min(PARALLEL, len(jobs))))]
    [t.start() for t in threads]
    [t.join() for t in threads]
    with _lock:
        st = _status[pid]
        for j in st["jobs"].values():
            if j["state"] == "queued":
                j.update(state="error", error="Stopped by you", finished=now())
        states = [j["state"] for j in st["jobs"].values()]
        st["state"] = "error" if all(s == "error" for s in states) else "done"
        st["stopped"] = bool(st.pop("stop", False))
        st["finished"] = now()
        st["cost_usd"] = round(sum(j.get("cost_usd") or 0 for j in st["jobs"].values()), 4)
    try:
        if build_pdf(pdir):
            with _lock:
                st["pdf"] = PDF_NAME
    except Exception:  # the notes and images are saved anyway; the PDF is only a reading copy
        pass
    _save(pdir)
    with _lock:
        _status.pop(pid, None)


def _claude(pdir, job, prompt, system, schema, tools, workdir):
    """Runs one headless Claude Code job and streams its tool calls into the job log. Returns structured output."""
    pid = pdir.name
    workdir.mkdir(parents=True, exist_ok=True)
    cmd = [shutil.which("claude"), "-p", "--output-format", "stream-json", "--verbose",
           "--json-schema", json.dumps(schema), "--append-system-prompt", system,
           "--model", MODEL, "--effort", EFFORT, "--tools", ",".join(tools), "--allowedTools", ",".join(tools),
           "--permission-mode", "dontAsk", "--no-session-persistence", "--strict-mcp-config", "--add-dir", str(workdir)]
    with _lock:
        j = _status[pid]["jobs"][job]
        j.update(state="running", started=j.get("started") or now())
    errlog = (workdir / "claude_stderr.log").open("w", encoding="utf-8")
    proc = subprocess.Popen(cmd, cwd=str(workdir), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errlog,
                            text=True, encoding="utf-8", errors="replace", creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    with _lock:
        _procs.setdefault(pid, set()).add(proc)
        stopped = _status[pid].get("stop")
    if stopped:
        proc.kill()
    proc.stdin.write(prompt)
    proc.stdin.close()
    timer = threading.Timer(TIMEOUT, proc.kill)
    timer.start()
    result, error, cost = None, None, None
    stream = (workdir / "stream.jsonl").open("w", encoding="utf-8")  # kept for debugging a job that went wrong
    try:
        for raw in proc.stdout:
            stream.write(raw)
            try:
                ev = json.loads(raw)
            except ValueError:
                continue
            if ev.get("type") == "assistant":
                for b in ev.get("message", {}).get("content", []):
                    if b.get("type") != "tool_use":
                        continue
                    name, inp = b.get("name"), b.get("input") or {}
                    if name == "WebSearch":
                        _log(pid, job, f"Searching: {inp.get('query', '')}")
                    elif name == "WebFetch":
                        _log(pid, job, f"Opening {re.sub(r'^https?://(www\\.)?', '', inp.get('url', ''))[:90]}")
                    elif name == "Read":
                        _log(pid, job, f"Looking at {Path(inp.get('file_path', '')).name}")
                    elif name == "StructuredOutput":
                        _log(pid, job, "Writing it up")
            elif ev.get("type") == "result":
                cost = ev.get("total_cost_usd")
                if ev.get("is_error") or not ev.get("structured_output"):
                    error = ev.get("result") or ev.get("subtype") or "Claude stopped without a result."
                else:
                    result = ev["structured_output"]
        proc.wait()
    finally:
        timer.cancel()
        errlog.close()
        stream.close()
        with _lock:
            _procs.get(pid, set()).discard(proc)
    with _lock:
        j = _status[pid]["jobs"][job]
        j["cost_usd"] = round((j.get("cost_usd") or 0) + (cost or 0), 4)
    if result is None:
        if not error:
            err = (workdir / "claude_stderr.log").read_text(encoding="utf-8", errors="replace").strip()
            error = "Timed out." if proc.returncode and proc.returncode < 0 else (err.splitlines()[-1] if err else f"Claude Code exited with code {proc.returncode}.")
        raise RuntimeError(error)
    return result


def _research_job(pdir, job, ctx):
    label, brief = RESEARCH[job]
    prompt = f"Topic: {label}\n\n{brief}\n\nProject context:\n{ctx}"
    r = _claude(pdir, job, prompt, RESEARCH_PROMPT, RESEARCH_SCHEMA, ["WebSearch", "WebFetch"], pdir / "work" / f"research_{job}")
    n = len(r["sources"])
    for pt in r["points"]:
        pt["sources"] = [s for s in pt["sources"] if isinstance(s, int) and 0 <= s < n]
    r.update(topic=job, title=label, made=now(), model=MODEL)
    write_json(pdir / "02_research" / "data" / f"{job}.json", r)
    (pdir / "02_research" / f"{job}.md").write_text(_note_md(r), encoding="utf-8")
    _set(pdir.name, job, state="done", finished=now(), note=f"{len(r['points'])} points from {n} sources")


def _note_md(r):
    out = [f"# {r['title']}", "", r["summary"], ""]
    for p in r["points"]:
        refs = "".join(f"[{s + 1}]" for s in p["sources"])
        out.append(f"- **{p['heading']}**: {p['text']} {refs}{'' if p['verified'] else ' (not verified)'}")
    if r["design_moves"]:
        out += ["", "## Design moves", *[f"- {m}" for m in r["design_moves"]]]
    if r["gaps"]:
        out += ["", "## Not found / to verify", *[f"- {g}" for g in r["gaps"]]]
    out += ["", "## Sources", *[f"{k + 1}. {s['title']}, {s['publisher']}. {s['url']}" for k, s in enumerate(r["sources"])]]
    return "\n".join(out) + "\n"


def _download(url, referer, dest):
    """Downloads one candidate image. Returns the saved path, or None if it isn't a real, decent-sized image."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                               "(KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Referer": referer or url})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read(15 * 1024 * 1024 + 1)
    except (OSError, ValueError):
        return None
    ext = next((e for m, e in IMG_MAGIC.items() if data.startswith(m)), None)
    if not ext or len(data) < 40_000 or len(data) > 15 * 1024 * 1024:
        return None
    path = dest.with_suffix(ext)
    path.write_bytes(data)
    return path


def _refs_job(pdir, job, ctx):
    """Three steps: Claude finds direct image links on real pages; the server downloads them; Claude looks at
    the downloaded files and keeps the best. Claude never gets a shell."""
    label, prefix, what, _slot = REFS[job]
    pid, work = pdir.name, pdir / "work" / f"refs_{job}"
    shutil.rmtree(work, ignore_errors=True)
    ideas = re.search(r"Student's ideas: (.*)", ctx)
    prompt = (f"Find references for: {label}, meaning {what}."
              + (f"\nThe student's own ideas, if they help choose between equally good styles: {ideas.group(1)}" if ideas else ""))
    found = _claude(pdir, job, prompt, REFS_PROMPT, CANDIDATES_SCHEMA, ["WebSearch", "WebFetch"], work)["candidates"]

    _log(pid, job, f"Downloading {len(found)} candidates")
    cands, seen = [], set()
    for c in found:
        url = c["image_url"].strip()
        if not url.startswith("http") or url in seen:
            continue
        seen.add(url)
        for u in ([url.replace("/medium_jpg/", "/large_jpg/"), url] if "/medium_jpg/" in url else [url]):
            path = _download(u, c["page_url"], work / f"cand_{len(cands) + 1:02d}")
            if path:
                cands.append({**c, "image_url": u, "file": path.name})
                break
    write_json(work / "candidates.json", cands)
    if not cands:
        raise RuntimeError("None of the candidate images could be downloaded. Try again, or add your own references for this type.")

    _log(pid, job, f"Looking at {len(cands)} images and keeping the best")
    listing = "\n".join(f"- {c['file']}: {c['caption']} ({c['project']}, {c['source_site']})" for c in cands)
    keep = _claude(pdir, job, f"Requested drawing type: {label}, meaning {what}.\n\nCandidate files in this folder:\n{listing}",
                   PICK_PROMPT, PICK_SCHEMA, ["Read"], work)["keep"]
    write_json(work / "keep.json", keep)
    by_file = {c["file"]: c for c in cands}

    dest = pdir / "03_references" / job
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.iterdir():
        if old.is_file():
            old.unlink()
    kept = []
    for k in keep:
        c = by_file.get(Path(k["file"]).name)
        if not c or any(x["image_url"] == c["image_url"] for x in kept):
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", f"{c['source_site']} {c['project']}".lower()).strip("-")[:48] or "ref"
        name = f"{prefix}{len(kept) + 1:02d}_{slug}{Path(c['file']).suffix}"
        shutil.copy2(work / c["file"], dest / name)
        kept.append({"file": name, "title": c["caption"], "project": c["project"], "author": c["author"],
                     "page_url": c["page_url"], "image_url": c["image_url"], "source_site": c["source_site"], "traits": k["traits"]})
        if len(kept) >= KEEP:
            break
    if not kept:
        raise RuntimeError("No candidate was good enough. Try again, or add your own references for this type.")
    found_path = pdir / "03_references" / "found.json"
    with _lock:
        all_found = read_json(found_path, {}) or {}
        all_found[job] = kept
        write_json(found_path, all_found)
        _write_index(pdir, all_found)
    _set(pid, job, state="done", finished=now(), note=f"{len(kept)} kept of {len(cands)} downloaded")


def _write_index(pdir, found):
    refs = pdir / "03_references"
    with (refs / "sources.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["type", "file", "project", "author", "source_site", "page_url", "image_url", "what we like"])
        for t, items in found.items():
            for it in items:
                w.writerow([t, it["file"], it["project"], it["author"], it["source_site"], it["page_url"], it["image_url"], it["traits"]])
    lines = ["# Reference index", "", "Style references only. They are for study and are never placed on the final sheets.", ""]
    for t, items in found.items():
        lines += [f"## {REFS[t][0]} (`{t}/`)", *[f"- `{it['file']}`: {it['traits']}. {it['project']}, {it['author']} ({it['source_site']}) {it['page_url']}" for it in items], ""]
    (refs / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")


# ---------- the reading copy: every research note in one PDF ----------
PDF_CSS = """@page { size: A4; margin: 16mm 15mm; }
body { font: 9.5pt/1.45 Arial, Helvetica, sans-serif; color: #1d1d1f; }
h1 { font-size: 17pt; margin: 0 0 2mm; } h2 { font-size: 12.5pt; margin: 8mm 0 2mm; border-bottom: 1.2pt solid #1d1d1f; padding-bottom: 1mm; }
h3 { font-size: 10.5pt; margin: 5mm 0 1.5mm; } .sub { color: #555; margin-bottom: 5mm; }
ul { margin: 1mm 0 2mm; padding-left: 5mm; } li { margin: 1mm 0; } .src { color: #2f5f9e; font-size: 8pt; }
.nv { color: #a35b00; font-size: 8pt; } ol { font-size: 8.5pt; color: #333; padding-left: 6mm; } a { color: #2f5f9e; }
.gap { color: #a35b00; } .note { color: #555; font-size: 8.5pt; }"""


def build_pdf(pdir):
    """Writes outputs/Research.pdf from the saved research notes. Returns True if made.
    The references are not in it: they are shown and picked in the chat."""
    e = lambda x: html.escape(str(x or ""))
    project = read_json(pdir / "project.json", {}) or {}
    notes = [n for n in (read_json(pdir / "02_research" / "data" / f"{k}.json") for k in RESEARCH) if n]
    if not notes:
        return False
    H = [f"<!doctype html><html><head><meta charset='utf-8'><title>Research</title><style>{PDF_CSS}</style></head><body>",
         f"<h1>Research</h1><div class='sub'>{e(project.get('name'))} · working document, not for presentation</div>",
         "<p class='note'>Every point links to the source it came from. Points marked “not verified” "
         "and the items under “not found” need checking before they go on a sheet.</p>"]
    for n in notes:
        src = n.get("sources", [])
        H.append(f"<div class='topic'><h3>{e(n['title'])}</h3><p>{e(n['summary'])}</p><ul>")
        for pt in n["points"]:
            refs = " ".join(f"[{k + 1}]" for k in pt["sources"])
            H.append(f"<li><b>{e(pt['heading'])}.</b> {e(pt['text'])} <span class='src'>{refs}</span>"
                     f"{'' if pt['verified'] else ' <span class=nv>(not verified)</span>'}</li>")
        H.append("</ul>")
        if n.get("design_moves"):
            H.append("<b>Design moves</b><ul>" + "".join(f"<li>{e(m)}</li>" for m in n["design_moves"]) + "</ul>")
        if n.get("gaps"):
            H.append("<b class='gap'>Not found, to verify</b><ul>" + "".join(f"<li>{e(g)}</li>" for g in n["gaps"]) + "</ul>")
        H.append("<b>Sources</b><ol>" + "".join(f"<li>{e(s['title'])}, {e(s['publisher'])}. <a href='{e(s['url'])}'>{e(s['url'])}</a></li>"
                                                for s in src) + "</ol></div>")
    H.append("</body></html>")
    out = pdir / "outputs"
    out.mkdir(exist_ok=True)
    return report.render_pdf("".join(H), out / PDF_NAME, pdir / "work")
