#!/usr/bin/env python3
"""Offline, source-only package. Never connects to or writes to WordPress/hosting."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = {"pages/home.html", "pages/impressum.html", "pages/datenschutz.html", "parts/header.html", "parts/footer.html"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(source, output):
    data = json.loads(source.read_text())
    if data.get("schema") != 1 or set(data["documents"]) != EXPECTED:
        raise ValueError("Expected three pages and two central parts")
    if len(data["assets"]) != 7 or sum(n.endswith(".mp3") for n in data["assets"]) != 3:
        raise ValueError("Expected four JPGs and three MP3s")
    # Validate before writing anything; refuse output reuse, path traversal, changed originals.
    for name, asset in data["assets"].items():
        if Path(name).name != name or not name.endswith((".jpg", ".mp3")):
            raise ValueError("Unsafe asset name")
        path = ROOT / "bordeaux/assets" / name
        if sha(path) != asset["sha256"] or path.stat().st_size != asset["bytes"]:
            raise ValueError("Original mismatch: " + name)
    output.mkdir(parents=True, exist_ok=False)
    for name, content in data["documents"].items():
        dest = output / name
        dest.parent.mkdir(exist_ok=True)
        dest.write_text(content, encoding="utf-8")
    (output / "media").mkdir()
    for name in data["assets"]:
        shutil.copyfile(ROOT / "bordeaux/assets" / name, output / "media" / name)
    theme = ROOT / "wordpress/theme/andreas-spricht-bordeaux"
    with zipfile.ZipFile(output / "andreas-spricht-bordeaux.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(theme.rglob("*")):
            if path.is_file():
                archive.write(path, str(path.relative_to(theme.parent)))
    for name in ("README.md", "OPERATOR.md", "CUTOVER.md", "render-content.py", "preflight.php"):
        shutil.copyfile(Path(__file__).parent / name, output / name)
    # The source report/evidence stay in Git; keep the package's report link usable.
    readme = output / "README.md"
    readme.write_text(readme.read_text().replace(
        "(TEST-REPORT.md)",
        "(https://github.com/DanceAS/Andreas-spricht-2-0/blob/issue-14-staging-preparation/wordpress/staging/TEST-REPORT.md)"))
    manifest = {"schema": 1, "kind": "source-only-not-an-installer", "source": data["source"],
                "assets": data["assets"], "files": {}}
    for path in sorted(output.rglob("*")):
        if path.is_file():
            manifest["files"][str(path.relative_to(output))] = sha(path)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"package": str(output), "files": len(manifest["files"]), "media": 7, "documents": 5}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.export, args.output)
