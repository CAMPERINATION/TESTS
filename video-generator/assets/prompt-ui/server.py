#!/usr/bin/env python3
"""Prompt UI local server with upload + JSON brief persistence."""

from __future__ import annotations

import cgi
import json
import shutil
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
BRIEFS_DIR = DATA_DIR / "briefs"


class PromptUIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send_json({"ok": True})
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/submit":
            self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)
            return

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self._send_json(
                {"error": "Expected multipart/form-data"},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": content_type,
                },
            )

            prompt = (form.getvalue("prompt") or "").strip()
            if not prompt:
                self._send_json(
                    {"error": "Prompt is required."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return

            duration = int(form.getvalue("duration") or 30)
            aspect_ratio = form.getvalue("aspect") or "16:9"

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            run_upload_dir = UPLOADS_DIR / timestamp
            run_upload_dir.mkdir(parents=True, exist_ok=True)
            BRIEFS_DIR.mkdir(parents=True, exist_ok=True)

            saved_a_roll = []
            a_roll_items = form["aRoll"] if "aRoll" in form else []
            if not isinstance(a_roll_items, list):
                a_roll_items = [a_roll_items]

            for item in a_roll_items:
                if not getattr(item, "filename", None):
                    continue
                safe_name = Path(item.filename).name
                target = run_upload_dir / f"a-roll-{len(saved_a_roll)+1}-{safe_name}"
                with target.open("wb") as f:
                    shutil.copyfileobj(item.file, f)
                saved_a_roll.append(
                    {
                        "originalName": item.filename,
                        "storedPath": str(target.relative_to(BASE_DIR)),
                        "sizeBytes": target.stat().st_size,
                    }
                )

            voice_over_payload = None
            if "voiceOver" in form and getattr(form["voiceOver"], "filename", None):
                voice_item = form["voiceOver"]
                safe_name = Path(voice_item.filename).name
                target = run_upload_dir / f"voice-over-{safe_name}"
                with target.open("wb") as f:
                    shutil.copyfileobj(voice_item.file, f)
                voice_over_payload = {
                    "originalName": voice_item.filename,
                    "storedPath": str(target.relative_to(BASE_DIR)),
                    "sizeBytes": target.stat().st_size,
                }

            brief = {
                "prompt": prompt,
                "durationSeconds": duration,
                "aspectRatio": aspect_ratio,
                "media": {
                    "aRoll": saved_a_roll,
                    "voiceOver": voice_over_payload,
                },
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }

            brief_path = BRIEFS_DIR / f"brief-{timestamp}.json"
            brief_path.write_text(json.dumps(brief, indent=2), encoding="utf-8")

            self._send_json(
                {
                    "ok": True,
                    "brief": brief,
                    "savedBrief": str(brief_path.relative_to(BASE_DIR)),
                }
            )
        except Exception as exc:  # pragma: no cover - defensive for local server
            self._send_json(
                {"error": f"Failed to process submission: {exc}"},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Serve prompt UI and save uploaded assets.")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    server = ThreadingHTTPServer(("0.0.0.0", args.port), PromptUIHandler)
    print(f"Prompt UI running on http://0.0.0.0:{args.port}")
    server.serve_forever()
