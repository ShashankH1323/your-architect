"""Brief reader: phase P0 of ARCHITECT_WORKFLOW.md, run for real.

Reads a project's uploads with Claude (the headless Claude Code CLI, using the login on this
machine) and returns a fact sheet plus a deliverables checklist. Saving the student's ticks
writes the fact sheet, checklist, decision log and a PDF into the project folder.

Project folder layout (matches ARCHITECT_WORKFLOW.md section 17):
  projects/<id>/project.json  analysis.json  checklist.json
  projects/<id>/00_fact_sheet.md  CHECKLIST.md  DECISIONS.md
  projects/<id>/uploads/   outputs/   work/
"""

import json
import os
import re
import shutil
import subprocess
import threading
import time
import zipfile
from datetime import datetime
from pathlib import Path

import report

ROOT = Path(__file__).resolve().parent
PROMPT = (ROOT / "prompts" / "brief_reader.md").read_text(encoding="utf-8")
MODEL = os.environ.get("YA_MODEL", "opus")
EFFORT = os.environ.get("YA_EFFORT", "high")
TIMEOUT = 20 * 60

TIERS = ["Student Simple", "Studio Standard", "Professional"]
GROUPS = ["Brief & research", "Site & climate analysis", "Programme", "Concept & form", "Drawings (2D + DXF)",
          "3D & renders", "Presentation sheets", "Physical model", "Defence pack"]
FACT_GROUPS = ["Project", "Site", "Users", "Limits", "Programme", "Deliverables", "Schedule", "Other"]


def _obj(props):
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


_S = {"type": "string"}
SCHEMA = _obj({
    "project_name": _S,
    "one_line": _S,
    "typology": _S,
    "stage": _S,
    "deadline": _S,
    "facts": {"type": "array", "items": _obj({
        "group": {"type": "string", "enum": FACT_GROUPS}, "label": _S, "value": _S,
        "status": {"type": "string", "enum": ["given", "inferred"]}, "source": _S})},
    "missing": {"type": "array", "items": _obj({"question": _S, "why": _S})},
    "programme": {"type": "array", "items": _obj({"space": _S, "area": _S, "qty": _S, "note": _S})},
    "mismatches": {"type": "array", "items": _S},
    "recommended_tier": {"type": "string", "enum": TIERS},
    "tier_reason": _S,
    "checklist": {"type": "array", "items": _obj({
        "id": _S, "group": {"type": "string", "enum": GROUPS}, "title": _S, "detail": _S,
        "required_by_brief": {"type": "boolean"},
        "tiers": {"type": "array", "items": {"type": "string", "enum": TIERS}}})},
    "files": {"type": "array", "items": _obj({"name": _S, "read": {"type": "boolean"}, "used_for": _S})},
})


# ---------- small file helpers ----------
def now():
    return datetime.now().isoformat(timespec="seconds")


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def docx_text(path):
    """Plain text of a .docx (paragraphs only), so Claude can read Word briefs."""
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8", "replace")
    xml = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


# ---------- analysis jobs ----------
_status = {}  # project id -> live status dict (also saved to analysis.json)
_lock = threading.Lock()


def get_analysis(pdir):
    with _lock:
        live = _status.get(pdir.name)
        if live:
            return json.loads(json.dumps(live))
    return read_json(pdir / "analysis.json")


def start_analysis(pdir, note=""):
    """Starts reading the brief in the background. Returns False if a run is already going."""
    with _lock:
        live = _status.get(pdir.name)
        if live and live["state"] == "running":
            return False
        _status[pdir.name] = {"state": "running", "started": now(), "log": [], "result": None, "error": None}
    threading.Thread(target=_run, args=(pdir, note), daemon=True).start()
    return True


def _log(pid, kind, text, file=None):
    with _lock:
        st = _status[pid]
        if st["log"] and st["log"][-1]["text"] == text:
            return
        st["log"].append({"t": round(time.time() - st["_t0"], 1) if "_t0" in st else 0, "kind": kind, "text": text, "file": file})


def _finish(pdir, **fields):
    with _lock:
        st = _status[pdir.name]
        st.update(fields, finished=now())
        st.pop("_t0", None)
        snapshot = json.loads(json.dumps(st))
    write_json(pdir / "analysis.json", snapshot)


def _run(pdir, note):
    pid = pdir.name
    with _lock:
        _status[pid]["_t0"] = time.time()
    uploads, work = pdir / "uploads", pdir / "work"
    work.mkdir(parents=True, exist_ok=True)
    files = sorted(f for f in uploads.iterdir() if f.is_file()) if uploads.exists() else []
    for f in files:
        if f.suffix.lower() == ".docx":
            try:
                (work / (f.name + ".txt")).write_text(docx_text(f), encoding="utf-8")
            except (OSError, KeyError, zipfile.BadZipFile):
                pass

    claude = shutil.which("claude")
    if not claude:
        return _finish(pdir, state="error", error="Claude Code isn't installed or isn't on PATH, so the brief can't be read.")

    project = read_json(pdir / "project.json", {})
    lines = ["Read the uploaded files for this architecture project and fill in the structured output."]
    lines.append("Files uploaded: " + (", ".join(f.name for f in files) if files else "none (work from the student's note only)"))
    if project.get("group"):
        lines.append(f"Project type chosen by the student: {project['group']}.")
    if note.strip():
        lines.append("Student's note:\n" + note.strip())
    prompt = "\n\n".join(lines)

    cmd = [claude, "-p", "--output-format", "stream-json", "--verbose",
           "--json-schema", json.dumps(SCHEMA), "--append-system-prompt", PROMPT,
           "--model", MODEL, "--effort", EFFORT,
           "--tools", "Read,Glob", "--allowedTools", "Read,Glob", "--permission-mode", "dontAsk",
           "--no-session-persistence", "--strict-mcp-config", "--add-dir", str(work)]
    _log(pid, "start", f"Opening {len(files)} file{'s' if len(files) != 1 else ''}" if files else "Reading your note")
    errlog = (work / "claude_stderr.log").open("w", encoding="utf-8")
    try:
        proc = subprocess.Popen(cmd, cwd=str(uploads if uploads.exists() else pdir), stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE, stderr=errlog, text=True, encoding="utf-8", errors="replace",
                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except OSError as e:
        errlog.close()
        return _finish(pdir, state="error", error=f"Couldn't start Claude Code: {e}")
    proc.stdin.write(prompt)
    proc.stdin.close()
    timer = threading.Timer(TIMEOUT, proc.kill)
    timer.start()

    result, error, cost = None, None, None
    try:
        for raw in proc.stdout:
            try:
                ev = json.loads(raw)
            except ValueError:
                continue
            kind = ev.get("type")
            if kind == "assistant":
                for block in ev.get("message", {}).get("content", []):
                    if block.get("type") != "tool_use":
                        continue
                    name, inp = block.get("name"), block.get("input") or {}
                    if name == "Read" and inp.get("file_path"):
                        fname = Path(inp["file_path"]).name
                        if fname.endswith(".docx.txt"):
                            fname = fname[:-4]
                        page = f" (pages {inp['pages']})" if inp.get("pages") else ""
                        _log(pid, "read", f"Reading {fname}{page}", fname)
                    elif name == "Glob":
                        _log(pid, "note", "Listing your files")
                    elif name == "StructuredOutput" or "project_name" in inp:
                        _log(pid, "write", "Writing the fact sheet and checklist")
            elif kind == "system" and ev.get("subtype") == "thinking_tokens":
                _log(pid, "think", "Working out facts, gaps and deliverables")
            elif kind == "result":
                cost = ev.get("total_cost_usd")
                if ev.get("is_error") or not ev.get("structured_output"):
                    error = ev.get("result") or ev.get("subtype") or "Claude stopped without a result."
                else:
                    result = ev["structured_output"]
        proc.wait()
    finally:
        timer.cancel()
        errlog.close()

    if result is None:
        if not error:
            err = (work / "claude_stderr.log").read_text(encoding="utf-8", errors="replace").strip()
            error = ("Timed out after 20 minutes." if proc.returncode and proc.returncode < 0
                     else err.splitlines()[-1] if err else f"Claude Code exited with code {proc.returncode}.")
        if re.search(r"log ?in|auth|credential", error, re.I):
            error += " Run `claude` once in a terminal and log in, then try again."
        return _finish(pdir, state="error", error=error, cost_usd=cost)

    result = _tidy(result)
    _log(pid, "write", "Making the brief summary PDF")
    try:  # the digest goes to a PDF; the chat shows only a few lines and the link
        tier = result.get("recommended_tier", "Studio Standard")
        draft = {"tier": tier, "checked": [it["id"] for it in result["checklist"] if tier in it["tiers"]], "answers": {}}
        (pdir / "outputs").mkdir(exist_ok=True)
        report.render_pdf(report.report_html(read_json(pdir / "project.json", {}), result, draft),
                          pdir / "outputs" / "Brief summary and checklist.pdf", work)
    except Exception:
        pass
    _finish(pdir, state="done", result=result, error=None, cost_usd=cost)
    project = read_json(pdir / "project.json", {})
    if not project.get("name_set_by_user") and result.get("project_name"):
        project["name"] = result["project_name"]
    project.update(updated=now(), phase=0, status="wait")
    write_json(pdir / "project.json", project)
    (pdir / "00_fact_sheet.md").write_text(report.fact_sheet_md(project, result, {}), encoding="utf-8")


def _tidy(r):
    """Unique checklist ids, groups in workflow order, required items in every tier."""
    seen = set()
    for i, item in enumerate(r.get("checklist", [])):
        slug = re.sub(r"[^a-z0-9-]+", "-", (item.get("id") or "").lower()).strip("-") or f"item-{i + 1}"
        while slug in seen:
            slug += "-2"
        seen.add(slug)
        item["id"] = slug
        if item.get("required_by_brief"):
            item["tiers"] = list(TIERS)
    r["checklist"].sort(key=lambda it: GROUPS.index(it["group"]) if it.get("group") in GROUPS else len(GROUPS))
    return r


# ---------- saving the student's checklist ----------
def save_checklist(pdir, body):
    analysis = get_analysis(pdir) or {}
    result = analysis.get("result")
    if not result:
        raise ValueError("Read the brief first")
    project = read_json(pdir / "project.json", {})
    tier = body.get("tier") if body.get("tier") in TIERS else result.get("recommended_tier", "Studio Standard")
    ids = {it["id"] for it in result["checklist"]}
    chosen = [i for i in body.get("checked", []) if i in ids]
    answers = {str(k): str(v).strip() for k, v in (body.get("answers") or {}).items() if str(v).strip()}
    first = not (pdir / "checklist.json").exists()
    checklist = {"tier": tier, "checked": chosen, "answers": answers, "saved": now()}
    write_json(pdir / "checklist.json", checklist)

    (pdir / "00_fact_sheet.md").write_text(report.fact_sheet_md(project, result, answers), encoding="utf-8")
    (pdir / "CHECKLIST.md").write_text(report.checklist_md(project, result, checklist), encoding="utf-8")
    with (pdir / "DECISIONS.md").open("a", encoding="utf-8") as f:
        if first:
            f.write(f"# Decision log: {project.get('name', pdir.name)}\n\n")
        f.write(f"- {datetime.now():%Y-%m-%d %H:%M}: Detail level {tier}. Checklist {'saved' if first else 'updated'} "
                f"with {len(chosen)} of {len(ids)} items. {len(answers)} gap question(s) answered.\n")

    out = pdir / "outputs"
    out.mkdir(exist_ok=True)
    name = "Brief summary and checklist"
    pdf_ok = report.render_pdf(report.report_html(project, result, checklist), out / f"{name}.pdf", pdir / "work")
    if not pdf_ok:
        (out / f"{name}.html").write_text(report.report_html(project, result, checklist), encoding="utf-8")
    project.update(updated=now(), tier=tier, phase=1, status="wait")
    write_json(pdir / "project.json", project)
    return checklist
