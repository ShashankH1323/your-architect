"""Your Architect — local dev server.

Serves the UI from ui/ and stores uploaded files on disk under uploads/<project>/.
Standard library only. Run:  python server.py   then open http://localhost:5173

API
  POST   /api/upload?project=<id>&name=<file name>   body = raw file bytes
  GET    /api/files[?project=<id>]                    list uploads (all projects if omitted)
  DELETE /api/files?project=<id>&name=<file name>     remove one upload
  GET    /files/<project>/<file name>[?download=1]    open or download an upload
"""

import json
import mimetypes
import os
import re
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse

ROOT = Path(__file__).resolve().parent
UI_DIR = ROOT / "ui"
UPLOAD_DIR = ROOT / "uploads"
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

mimetypes.add_type("image/vnd.dwg", ".dwg")
mimetypes.add_type("image/vnd.dxf", ".dxf")


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


def unique_path(folder, name):
    path = folder / name
    stem, ext = os.path.splitext(name)
    n = 1
    while path.exists():
        path = folder / f"{stem} ({n}){ext}"
        n += 1
    return path


def describe(project, path):
    st = path.stat()
    return {
        "project": project,
        "name": path.name,
        "size": st.st_size,
        "modified": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
        "url": f"/files/{quote(project)}/{quote(path.name)}",
    }


def list_files(project=None):
    if not UPLOAD_DIR.exists():
        return []
    folders = [UPLOAD_DIR / project] if project else [p for p in UPLOAD_DIR.iterdir() if p.is_dir()]
    out = []
    for folder in folders:
        if folder.is_dir():
            out += [describe(folder.name, f) for f in folder.iterdir() if f.is_file() and not f.name.endswith(".part")]
    return sorted(out, key=lambda f: f["modified"], reverse=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(UI_DIR), **kwargs)

    # ---------- helpers ----------
    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def query(self):
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    # ---------- routes ----------
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/files":
            try:
                project = self.query().get("project")
                return self.send_json({"files": list_files(clean_project(project) if project else None)})
            except ValueError as e:
                return self.send_json({"error": str(e)}, 400)
        if url.path.startswith("/files/"):
            return self.serve_upload(url)
        return super().do_GET()

    def serve_upload(self, url):
        parts = url.path.split("/", 3)
        try:
            project, name = clean_project(unquote(parts[2])), clean_name(unquote(parts[3]))
        except (IndexError, ValueError):
            return self.send_error(404)
        path = UPLOAD_DIR / project / name
        if not path.is_file():
            return self.send_error(404)
        ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
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
        if urlparse(self.path).path != "/api/upload":
            return self.send_error(404)
        q = self.query()
        try:
            project, name = clean_project(q.get("project")), clean_name(q.get("name"))
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        if os.path.splitext(name)[1].lower() not in ALLOWED:
            return self.send_json({"error": f"{name}: this file type isn't supported"}, 415)
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BYTES:
            return self.send_json({"error": f"{name} is larger than 2 GB"}, 413)

        folder = UPLOAD_DIR / project
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
        return self.send_json({"file": describe(project, target)}, 201)

    def do_DELETE(self):
        if urlparse(self.path).path != "/api/files":
            return self.send_error(404)
        q = self.query()
        try:
            path = UPLOAD_DIR / clean_project(q.get("project")) / clean_name(q.get("name"))
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        if not path.is_file():
            return self.send_json({"error": "File not found"}, 404)
        path.unlink()
        return self.send_json({"ok": True})

    def end_headers(self):
        # Keep the prototype's JS/CSS fresh while it is being edited.
        if not self.path.startswith("/files/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    UPLOAD_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Your Architect running at http://localhost:{PORT}  (uploads saved to {UPLOAD_DIR})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        sys.exit(0)
