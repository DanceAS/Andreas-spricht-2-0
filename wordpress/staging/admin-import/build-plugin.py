#!/usr/bin/env python3
"""Build the one-upload Admin ZIP offline. Never contacts or writes to hosting."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(source, output, local_test=False):
    data = json.loads(source.read_text())
    if data.get("schema") != 1 or len(data["assets"]) != 7 or list(data["documents"]) != ["pages/home.html","pages/impressum.html","pages/datenschutz.html","parts/header.html","parts/footer.html"]:
        raise ValueError("Expected three pages, two central parts and seven media")
    if any("127.0.0.1" in content or "EDITORTEST" in content or "ZENTRALTEST" in content for content in data["documents"].values()):
        raise ValueError("Unmapped local URL or unrestored editor test")
    files = {}
    for name, asset in data["assets"].items():
        if Path(name).name != name or not name.endswith((".jpg", ".mp3")):
            raise ValueError("Unsafe media name")
        if asset["key"] != re.sub("[^a-z0-9]", "_", name.lower()):
            raise ValueError("Unexpected media token key")
        content = (ROOT / "bordeaux/assets" / name).read_bytes()
        if digest(content) != asset["sha256"] or len(content) != asset["bytes"]:
            raise ValueError("Original mismatch: " + name)
        files["media/" + name] = content
    theme = ROOT / "wordpress/theme/andreas-spricht-bordeaux"
    data["theme"] = {}
    for p in sorted(theme.rglob("*")):
        if p.is_symlink():
            raise ValueError("Symlink in theme")
        if p.is_file():
            content = p.read_bytes()
            data["theme"][str(p.relative_to(theme))] = {"base64": base64.b64encode(content).decode(), "sha256": digest(content)}
    payload = b"<?php exit; ?>\n" + json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    files["payload.php"] = payload
    for p in sorted((HERE / "plugin").rglob("*")):
        if p.is_file():
            content = p.read_bytes().replace(b"__PAYLOAD_SHA__", digest(payload).encode())
            if local_test:
                content = content.replace(b"https://neu.andreasspricht.de", b"http://127.0.0.1:8890")
                content = content.replace("Plugin Name: Andreas spricht".encode(), "Plugin Name: LOCAL TEST Andreas spricht".encode())
            files[str(p.relative_to(HERE / "plugin"))] = content
    output.parent.mkdir(parents=True, exist_ok=True)
    # Refuse accidental overwrites. Fixed timestamps make repeat builds byte-identical.
    with output.open("xb") as dest, zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo("andreas-staging-import/" + name, (2026, 11, 14, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, content)
    print(json.dumps({"file": str(output), "sha256": digest(output.read_bytes()), "bytes": output.stat().st_size,
                      "local_test_only": local_test, "payload_sha256": digest(payload)}))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--local-test", action="store_true", help="Separate localhost-only ZIP; NEVER deliver as staging installer")
    a = p.parse_args()
    build(a.source, a.output, a.local_test)
