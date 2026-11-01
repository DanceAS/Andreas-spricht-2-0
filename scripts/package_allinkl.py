#!/usr/bin/env python3
"""Package a committed Bordeaux snapshot for ALL-INKL; no uploads or deployment."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit
import zipfile

REPO = Path(__file__).resolve().parents[1]
REQUIRED = {"index.html", "impressum/index.html", "datenschutz/index.html", "styles.css", "app.js", "content.js"}
GITHUB_BASE = re.compile(r"danceas\.github\.io|/Andreas-spricht-2-0(?:/|[?#\"'])", re.I)


class PackagingError(ValueError):
    pass


def git(*args: str, repo: Path = REPO) -> bytes:
    try:
        return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True).stdout
    except subprocess.CalledProcessError as exc:
        raise PackagingError(exc.stderr.decode("utf-8", errors="replace").strip()) from exc


def snapshot(ref: str, repo: Path = REPO) -> tuple[str, dict[str, bytes], dict[str, str]]:
    commit = git("rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}", repo=repo).decode().strip()
    files: dict[str, bytes] = {}
    origins: dict[str, str] = {}
    for entry in git("ls-tree", "-r", "-z", commit, repo=repo).split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        source = raw_path.decode("utf-8")
        if source.startswith("bordeaux/"):
            target = source.removeprefix("bordeaux/")
        elif source in {"app.js", "content.js"}:
            target = source
        else:
            continue
        if metadata.split()[0] not in {b"100644", b"100755"}:
            raise PackagingError(f"Unsupported file type: {source}")
        if target in files:
            raise PackagingError(f"Duplicate package path: {target}")
        if PurePosixPath(target).is_absolute() or ".." in PurePosixPath(target).parts:
            raise PackagingError(f"Unsafe package path: {target}")
        files[target] = git("show", f"{commit}:{source}", repo=repo)
        origins[target] = source
    return commit, files, origins


class Document(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.links: list[tuple[str, bool]] = []
        self.footer_links: list[tuple[str, str]] = []
        self.in_footer = False
        self.current_footer_link: list[str] | None = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "footer":
            self.in_footer = True
        if attrs.get("src"):
            self.links.append((attrs["src"], True))
        if attrs.get("href"):
            self.links.append((attrs["href"], tag != "a"))
        if tag == "a" and self.in_footer:
            self.current_footer_link = [attrs.get("href", ""), ""]

    def handle_data(self, data):
        if self.current_footer_link is not None:
            self.current_footer_link[1] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.current_footer_link is not None:
            href, text = self.current_footer_link
            self.footer_links.append((href, text.strip()))
            self.current_footer_link = None
        if tag == "footer":
            self.in_footer = False


def validate(files: dict[str, bytes]) -> None:
    missing = REQUIRED - files.keys()
    if missing:
        raise PackagingError(f"Required files missing: {', '.join(sorted(missing))}")
    if any(not data for data in files.values()):
        raise PackagingError("Empty resource in package")
    text_files = {name: data.decode("utf-8") for name, data in files.items() if name.endswith((".html", ".css", ".js"))}
    documents = {name: Document(text) for name, text in text_files.items() if name.endswith(".html")}

    def check_url(current: str, value: str, resource: bool = False):
        url = urlsplit(value.strip())
        if url.scheme or url.netloc:
            if resource and url.scheme != "data":
                raise PackagingError(f"Resource is not local: {current} → {value}")
            return
        decoded = unquote(url.path)
        if decoded.startswith("/"):
            raise PackagingError(f"Root-absolute path would break subfolder hosting: {current} → {value}")
        target = current if not decoded else posixpath.normpath(posixpath.join(posixpath.dirname(current), decoded))
        if target == ".":
            target = "index.html"
        elif decoded.endswith("/"):
            target += "/index.html"
        if target.startswith("../") or target == ".." or target not in files:
            raise PackagingError(f"Missing/escaping local resource: {current} → {value} ({target})")
        if url.fragment and target in documents and unquote(url.fragment) not in documents[target].ids:
            raise PackagingError(f"Missing anchor: {current} → {value}")

    for name, text in text_files.items():
        if GITHUB_BASE.search(text):
            raise PackagingError(f"GitHub-Pages-specific base URL in {name}")
        if name in documents:
            for value, resource in documents[name].links:
                check_url(name, value, resource)
        elif name.endswith(".css"):
            for match in re.finditer(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)''', text):
                check_url(name, next(value for value in match.groups() if value is not None).strip(), True)
            for match in re.finditer(r'''@import\s+["']([^"']+)["']''', text):
                check_url(name, match.group(1), True)
        elif name.endswith(".js"):
            # Current sample data assigns assets/... URLs relative to the start document.
            for match in re.finditer(r'''["'](assets/[^"']+)["']''', text):
                check_url("index.html", match.group(1), True)
    contacts = [href for href, label in documents["index.html"].footer_links if label == "Kontakt"]
    if contacts != ["mailto:kontakt@andreasspricht.de"]:
        raise PackagingError("Start-page footer contact must link to mailto:kontakt@andreasspricht.de")


def package(ref: str, output: Path, repo: Path = REPO) -> dict:
    commit, files, origins = snapshot(ref, repo)
    validate(files)
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    # Commit-based UTC timestamps, fixed permissions and ZIP_STORED are reproducible.
    # New source commits also receive new mtimes when extracted by the web host.
    # JPG/MP3 files already account for nearly all data and are already compressed.
    stamp = datetime.fromtimestamp(int(git("show", "-s", "--format=%ct", commit, repo=repo)), timezone.utc)
    if stamp.year < 1980:
        stamp = datetime(1980, 1, 1, tzinfo=timezone.utc)
    elif stamp.year > 2107:
        stamp = datetime(2107, 12, 31, 23, 59, 58, tzinfo=timezone.utc)
    zip_date = stamp.timetuple()[:6]
    with tempfile.NamedTemporaryFile(dir=output.parent, suffix=".tmp", delete=False) as temp:
        temporary = Path(temp.name)
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_STORED) as archive:
            for name in sorted(files):
                info = zipfile.ZipInfo(name, date_time=zip_date)
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_STORED
                archive.writestr(info, files[name])
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None or archive.namelist() != sorted(files):
                raise PackagingError("ZIP integrity/file-list validation failed")
            if any(archive.read(name) != files[name] for name in files):
                raise PackagingError("ZIP content differs from committed source")
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    manifest = {
        "source_ref": ref,
        "source_commit": commit,
        "archive": output.name,
        "archive_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "file_count": len(files),
        "files": [{"path": name, "source": origins[name], "bytes": len(files[name]), "sha256": hashlib.sha256(files[name]).hexdigest()} for name in sorted(files)],
    }
    output.with_suffix(".manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="origin/main", help="Committed source (default: origin/main; fetch main first)")
    parser.add_argument("--output", type=Path, default=REPO / "work/allinkl/andreas-spricht-static-allinkl.zip")
    args = parser.parse_args()
    try:
        manifest = package(args.ref, args.output)
    except (PackagingError, OSError, UnicodeError) as exc:
        parser.exit(1, f"Packaging failed: {exc}\n")
    print(f"Source commit: {manifest['source_commit']}")
    print(f"ZIP: {args.output.resolve()}")
    print(f"SHA256: {manifest['archive_sha256']}")
    print(f"Files ({manifest['file_count']}):")
    for entry in manifest["files"]:
        print(f"  {entry['path']} ({entry['bytes']} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
