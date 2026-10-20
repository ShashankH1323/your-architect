"""Your Architect — local server.

Serves the UI from ui/, stores each project under projects/<id>/ (uploads, outputs, working
files) and reads uploaded briefs with Claude via brief_engine.py. Standard library only.
Run:  python server.py   then open http://localhost:5173

API
  POST   /api/upload?project=<id>&name=<file name>[&slot=<slot>]   body = raw file bytes
  GET    /api/files[?project=<id>]                     uploads, reference files and outputs (all projects if omitted)
  DELETE /api/files?project=<id>&name=<file name>[&slot=<slot>]     remove one upload or reference file
  GET    /api/projects                                 saved projects
  POST   /api/projects                                 create or update {id, name?, group?, brief?}
  GET    /api/projects/<id>                            project, analysis, checklist
  DELETE /api/projects/<id>                            delete the project and all its files (refused while Claude works on it)
  POST   /api/projects/<id>/analyze                    read the brief with Claude (runs in background)
  GET    /api/projects/<id>/analysis                   live status, log and result
  POST   /api/projects/<id>/checklist                  save ticks {tier, checked, answers} → fact sheet, checklist, PDF
  POST   /api/projects/<id>/state                      save the workflow state {state} (route, answers, picks, gates)
  POST   /api/projects/<id>/research                   start research + reference search {only?: [topic ids]} (background)
  GET    /api/projects/<id>/research                   live job status, research notes and the references found
  POST   /api/projects/<id>/research-stop              stop the running research (kills its claude jobs)
  GET    /files/<id>/<name>[?slot=<slot>], /outputs/<id>/<name>   open (add download=1 to download)

Slots are the workflow's upload folders: `site` → 01_brief/site_images/, and one folder per reference type
(plan, section, elevation, sheet_composition, diagrams, axo_3d, details, other, previous_project)
→ 03_references/user/<type>/. `found_<type>` serves references the research found (03_references/<type>/) and
`research` serves the research notes (02_research/).
"""

import json
import mimetypes
import os
import re
import shutil
import socket
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse

import brief_engine as engine
import research_engine as research

ROOT = Path(__file__).resolve().parent
UI_DIR = ROOT / "ui"
PROJECTS_DIR = ROOT / "projects"
MAX_BYTES = 2 * 1024**3  # 2 GB per file: enough for large DWGs, point clouds and photo sets
CHUNK = 1024 * 1024
PORT = int(os.environ.get("PORT", "5173"))

# Extensions accepted for upload (the same list is offered by the browser's file picker).
ALLOWED = {
    ".pdf", ".dwg", ".dxf", ".skp", ".3dm", ".rvt", ".ifc", ".blend", ".obj", ".fbx", ".stl", ".glb", ".gltf",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".tif", ".tiff", ".heic", ".bmp", ".svg",
    ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx", ".txt", ".md", ".rtf",
    ".kml", ".kmz", ".geojson", ".zip",
}
GROUPS = {"Studio", "Thesis", "Competitions"}
REF_SLOTS = {"plan", "section", "elevation", "sheet_composition", "diagrams", "axo_3d", "details", "other", "previous_project"}

mimetypes.add_type("image/vnd.dwg", ".dwg")
mimetypes.add_type("image/vnd.dxf", ".dxf")
mimetypes.add_type("text/markdown", ".md")


def clean_project(value):
    value = (value or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value):
        raise ValueError("Invalid project id")
    return value


def clean_name(value):
    name = os.path.basename((value or "").replace("\\", "/")).strip()
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip(" .")
    if not name or name in {".", ".."}:
        raise ValueError("Invalid file name")
    if len(name) > 180:
        stem, ext = os.path.splitext(name)
        name = stem[: 180 - len(ext)] + ext
    return name


def slot_dir(project, slot=None):
    """Folder for an upload slot: the brief's uploads/, the site images, or one reference type folder."""
    if not slot:
        return PROJECTS_DIR / project / "uploads"
    if slot == "site":
        return PROJECTS_DIR / project / "01_brief" / "site_images"
    if slot in REF_SLOTS:
        return PROJECTS_DIR / project / "03_references" / "user" / slot
    if slot.startswith("found_") and slot[6:] in research.REFS:
        return PROJECTS_DIR / project / "03_references" / slot[6:]
    if slot == "research":
        return PROJECTS_DIR / project / "02_research"
    raise ValueError("Invalid upload slot")


def unique_path(folder, name):
    path = folder / name
    stem, ext = os.path.splitext(name)
    n = 1
    while path.exists():
        path = folder / f"{stem} ({n}){ext}"
        n += 1
    return path


def describe(project, path, kind="upload", slot=None):
    st = path.stat()
    base = "outputs" if kind == "output" else "files"
    return {
        "project": project,
        "name": path.name,
        "size": st.st_size,
        "kind": kind,
        "slot": slot,
        "modified": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
        "url": f"/{base}/{quote(project)}/{quote(path.name)}" + (f"?slot={slot}" if slot else ""),
    }


def list_files(project=None, kinds=("upload", "ref", "output")):
    if not PROJECTS_DIR.exists():
        return []
    folders = [PROJECTS_DIR / project] if project else [p for p in PROJECTS_DIR.iterdir() if p.is_dir()]
    out = []
    for folder in folders:
        dirs = [("upload", None, folder / "uploads"), ("output", None, folder / "outputs")]
        dirs += [("ref", s, slot_dir(folder.name, s)) for s in ["site", *sorted(REF_SLOTS)]]
        for kind, slot, d in dirs:
            if kind in kinds and d.is_dir():
                out += [describe(folder.name, f, kind, slot) for f in d.iterdir()
                        if f.is_file() and not f.name.endswith((".part", ".tmp.pdf"))]
    return sorted(out, key=lambda f: f["modified"], reverse=True)


def project_info(pdir):
    p = engine.read_json(pdir / "project.json") or {"id": pdir.name, "name": "Untitled project", "group": "Studio"}
    analysis = engine.get_analysis(pdir)
    if analysis and analysis.get("state") == "running":
        p["status"] = "run"
    elif analysis and analysis.get("state") == "error":
        p["status"] = "wait"
    p["reading"] = bool(analysis and analysis.get("state") == "running")
    p["state"] = engine.read_json(pdir / "state.json")
    return p


def migrate_old_uploads():
    """Moves uploads saved by the first version (uploads/<id>/) into projects/<id>/uploads/."""
    old = ROOT / "uploads"
    if not old.is_dir():
        return
    for pdir in old.iterdir():
        if pdir.is_dir():
            dest = PROJECTS_DIR / pdir.name / "uploads"
            dest.mkdir(parents=True, exist_ok=True)
            for f in pdir.iterdir():
                if f.is_file():
                    shutil.move(str(f), str(unique_path(dest, f.name)))
            if not (PROJECTS_DIR / pdir.name / "project.json").exists():
                engine.write_json(PROJECTS_DIR / pdir.name / "project.json",
                                  {"id": pdir.name, "name": "Earlier uploads", "group": "Studio", "created": engine.now(),
                                   "updated": engine.now(), "phase": 0, "status": "wait"})
            shutil.rmtree(pdir, ignore_errors=True)
    shutil.rmtree(old, ignore_errors=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(UI_DIR), **kwargs)

    # ---------- helpers ----------
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def query(self):
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    def read_body_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 1024 * 1024:
            raise ValueError("Request too large")
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            raise ValueError("Invalid JSON")

    def project_route(self):
        """Splits /api/projects/<id>[/<action>] → (project dir, action)."""
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts) < 3 or parts[:2] != ["api", "projects"]:
            return None, None
        pdir = PROJECTS_DIR / clean_project(unquote(parts[2]))
        return pdir, (parts[3] if len(parts) > 3 else "")

    # ---------- routes ----------
    def do_GET(self):
        url = urlparse(self.path)
        try:
            if url.path == "/api/files":
                project = self.query().get("project")
                return self.send_json({"files": list_files(clean_project(project) if project else None)})
            if url.path == "/api/projects":
                items = [project_info(d) for d in PROJECTS_DIR.iterdir() if (d / "project.json").exists()] if PROJECTS_DIR.exists() else []
                return self.send_json({"projects": sorted(items, key=lambda p: p.get("updated", ""), reverse=True)})
            if url.path.startswith("/api/projects/"):
                pdir, action = self.project_route()
                if not (pdir / "project.json").exists():
                    return self.send_json({"error": "Project not found"}, 404)
                if action == "analysis":
                    return self.send_json({"analysis": engine.get_analysis(pdir)})
                if action == "research":
                    return self.send_json({"research": research.get_status(pdir), "running": research.running_project(), **research.results(pdir)})
                if action == "":
                    return self.send_json({
                        "project": project_info(pdir),
                        "analysis": engine.get_analysis(pdir),
                        "checklist": engine.read_json(pdir / "checklist.json"),
                        "files": list_files(pdir.name),
                    })
                return self.send_error(404)
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        if url.path.startswith(("/files/", "/outputs/")):
            return self.serve_project_file(url)
        if url.path in ("/", "/index.html"):
            return self.serve_index()
        return super().do_GET()

    def serve_index(self):
        """index.html with ?v=<file time> on app.js and styles.css, so a browser that cached an
        older copy (e.g. from `python -m http.server`) always loads the current code."""
        page = (UI_DIR / "index.html").read_text(encoding="utf-8")
        for asset in ("app.js", "styles.css"):
            version = int((UI_DIR / asset).stat().st_mtime)
            page = page.replace(f'"{asset}"', f'"{asset}?v={version}"')
        body = page.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_project_file(self, url):
        parts = url.path.split("/", 3)
        try:
            project, name = clean_project(unquote(parts[2])), clean_name(unquote(parts[3]))
            folder = slot_dir(project, self.query().get("slot")) if parts[1] == "files" else PROJECTS_DIR / project / "outputs"
        except (IndexError, ValueError):
            return self.send_error(404)
        path = folder / name
        if not path.is_file():
            return self.send_error(404)
        ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
        if ctype.startswith("text/"):
            ctype += "; charset=utf-8"
        disp = "attachment" if self.query().get("download") else "inline"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.send_header("Content-Disposition", f"{disp}; filename*=UTF-8''{quote(name)}")
        self.end_headers()
        with path.open("rb") as f:
            while chunk := f.read(CHUNK):
                self.wfile.write(chunk)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/upload":
                return self.upload()
            if path == "/api/projects":
                return self.save_project(self.read_body_json())
            if path.startswith("/api/projects/"):
                pdir, action = self.project_route()
                if not (pdir / "project.json").exists():
                    return self.send_json({"error": "Project not found"}, 404)
                if action == "analyze":
                    body = self.read_body_json()
                    uploads = pdir / "uploads"
                    has_files = uploads.is_dir() and any(f.is_file() for f in uploads.iterdir())
                    note = body.get("note") or (engine.read_json(pdir / "project.json") or {}).get("brief", "")
                    if not has_files and not note.strip():
                        return self.send_json({"error": "Upload a brief or describe the project first"}, 400)
                    if not engine.start_analysis(pdir, note):
                        return self.send_json({"error": "Already reading this brief"}, 409)
                    return self.send_json({"analysis": engine.get_analysis(pdir)}, 202)
                if action == "research-stop":
                    return self.send_json({"stopped": research.stop(pdir)})
                if action == "research":
                    only = self.read_body_json().get("only")
                    if not research.start(pdir, only if isinstance(only, list) else None):
                        return self.send_json({"error": "Research is already running"}, 409)
                    return self.send_json({"research": research.get_status(pdir)}, 202)
                if action == "state":
                    state = self.read_body_json().get("state")
                    if not isinstance(state, dict):
                        return self.send_json({"error": "Missing state"}, 400)
                    engine.write_json(pdir / "state.json", state)
                    p = engine.read_json(pdir / "project.json")
                    p["updated"] = engine.now()
                    engine.write_json(pdir / "project.json", p)
                    return self.send_json({"ok": True})
                if action == "checklist":
                    checklist = engine.save_checklist(pdir, self.read_body_json())
                    return self.send_json({"checklist": checklist, "files": list_files(pdir.name), "project": project_info(pdir)})
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        return self.send_error(404)

    def save_project(self, body):
        pid = clean_project(body.get("id"))
        path = PROJECTS_DIR / pid / "project.json"
        p = engine.read_json(path) or {"id": pid, "name": "New project", "group": "Studio", "created": engine.now(),
                                       "phase": 0, "status": "run"}
        if body.get("name"):
            p["name"], p["name_set_by_user"] = str(body["name"])[:120], True
        if body.get("group") in GROUPS:
            p["group"] = body["group"]
        if "brief" in body:
            p["brief"] = str(body["brief"])[:20000]
        p["updated"] = engine.now()
        engine.write_json(path, p)
        return self.send_json({"project": p})

    def upload(self):
        q = self.query()
        project, name = clean_project(q.get("project")), clean_name(q.get("name"))
        slot = q.get("slot") or None
        folder = slot_dir(project, slot)
        if os.path.splitext(name)[1].lower() not in ALLOWED:
            return self.send_json({"error": f"{name}: this file type isn't supported"}, 415)
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BYTES:
            return self.send_json({"error": f"{name} is larger than 2 GB"}, 413)

        folder.mkdir(parents=True, exist_ok=True)
        target = unique_path(folder, name)
        tmp = target.with_name(target.name + ".part")
        remaining = length
        try:
            with tmp.open("wb") as f:
                while remaining > 0:
                    chunk = self.rfile.read(min(CHUNK, remaining))
                    if not chunk:
                        raise ConnectionError("Upload interrupted")
                    f.write(chunk)
                    remaining -= len(chunk)
            tmp.replace(target)
        except Exception as e:
            tmp.unlink(missing_ok=True)
            return self.send_json({"error": str(e)}, 500)
        return self.send_json({"file": describe(project, target, "ref" if slot else "upload", slot)}, 201)

    def do_DELETE(self):
        if urlparse(self.path).path.startswith("/api/projects/"):
            return self.delete_project()
        if urlparse(self.path).path != "/api/files":
            return self.send_error(404)
        q = self.query()
        try:
            path = slot_dir(clean_project(q.get("project")), q.get("slot") or None) / clean_name(q.get("name"))
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        if not path.is_file():
            return self.send_json({"error": "File not found"}, 404)
        path.unlink()
        return self.send_json({"ok": True})

    def delete_project(self):
        try:
            pdir, action = self.project_route()
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        if action or not (pdir / "project.json").exists():
            return self.send_json({"error": "Project not found"}, 404)
        if (engine.get_analysis(pdir) or {}).get("state") == "running":
            return self.send_json({"error": "Claude is still reading this brief. Wait for it to finish, then delete the project."}, 409)
        if research.running_project() == pdir.name:
            return self.send_json({"error": "Research is running for this project. Stop it first, then delete the project."}, 409)
        try:
            shutil.rmtree(pdir)
        except OSError as e:
            return self.send_json({"error": f"Some files couldn't be deleted (is one open in another program?): {e}"}, 500)
        engine._status.pop(pdir.name, None)
        research._status.pop(pdir.name, None)
        return self.send_json({"ok": True})

    def end_headers(self):
        # Keep the prototype's JS/CSS and API responses fresh while they're being edited.
        if not self.path.startswith(("/files/", "/outputs/")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/analysis" not in self.path and not (self.command == "GET" and "/research" in self.path):  # polled by the UI
            super().log_message(fmt, *args)


if __name__ == "__main__":
    PROJECTS_DIR.mkdir(exist_ok=True)
    migrate_old_uploads()
    # Windows lets a second server bind a port that's already in use, and `localhost` may still
    # reach the old one (e.g. a leftover `python -m http.server`). Refuse to start if anything answers.
    busy = False
    for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        with socket.socket(family, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            busy = busy or s.connect_ex((host, PORT)) == 0
    ThreadingHTTPServer.allow_reuse_address = False
    try:
        if busy:
            raise OSError
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        sys.exit(f"Port {PORT} is already in use, probably by an older copy of the app (or `python -m http.server`).\n"
                 f"Close that terminal window or stop it, then run `python server.py` again.")
    print(f"Your Architect running at http://localhost:{PORT}  (projects saved in {PROJECTS_DIR})", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        sys.exit(0)
