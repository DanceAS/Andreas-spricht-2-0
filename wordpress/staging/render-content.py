#!/usr/bin/env python3
"""Offline URL/ID mapping only. Input maps come from a later approved target import."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.parse import urlsplit


def map_document(content, tokens):
    # Block JSON needs raw URL values; HTML attributes need escaped values.
    comments = {}
    def block_comment(match):
        key = "@@AS_BLOCK_" + str(len(comments)) + "@@"
        comment = match.group()
        for token, value in tokens.items():
            comment = comment.replace(token, value)
        comments[key] = comment
        return key
    content = re.sub(r"<!-- wp:.*?-->", block_comment, content, flags=re.S)
    for token, value in tokens.items():
        content = content.replace(token, html.escape(value, quote=True))
    for key, comment in comments.items():
        content = content.replace(key, comment)
    return content


def render(package, mapping, output):
    manifest = json.loads((package / "manifest.json").read_text())
    if manifest.get("schema") != 1:
        raise ValueError("Unknown manifest")
    for name, digest in manifest["files"].items():
        path = package / name
        if path.resolve().is_relative_to(package.resolve()) is False or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("Package integrity mismatch: " + name)
    values = json.loads(mapping.read_text())
    target = urlsplit(values["home"])
    if target.path != "/" or target.query or target.fragment:
        raise ValueError("Home must be the root URL with trailing slash")
    if set(values["media"]) != set(manifest["assets"]):
        raise ValueError("Exactly the seven package assets must be mapped")
    def url(value):
        u = urlsplit(value)
        # No live target support in this preparation package. Local target is test-only.
        if (u.scheme, u.netloc) not in (("https", "neu.andreasspricht.de"), ("http", "127.0.0.1:8890")):
            raise ValueError("Only approved staging URL or isolated local test URL")
        if (u.scheme, u.netloc) != (target.scheme, target.netloc):
            raise ValueError("All mapped URLs must use the same target origin")
        if any(c in value for c in ('"', "<", ">", "\\")) or re.search(r"\s", value) or u.fragment:
            raise ValueError("Invalid mapping URL")
        return value
    tokens = {"__HOME_URL__": url(values["home"]), "__IMPRINT_URL__": url(values["impressum"]), "__PRIVACY_URL__": url(values["datenschutz"])}
    ids = []
    for name, asset in manifest["assets"].items():
        m = values["media"][name]
        if type(m["id"]) is not int or m["id"] <= 0:
            raise ValueError("Positive target attachment ID required")
        ids.append(m["id"])
        tokens["__ID_" + asset["key"] + "__"] = str(m["id"])
        tokens["__URL_" + asset["key"] + "__"] = url(m["url"])
    if len(set(ids)) != 7:
        raise ValueError("Seven distinct target attachment IDs required")
    documents = {}
    for name in manifest["files"]:
        if not name.startswith(("pages/", "parts/")):
            continue
        content = map_document((package / name).read_text(), tokens)
        if re.search(r"__[A-Z][A-Za-z0-9_]*__", content):
            raise ValueError("Unresolved token: " + name)
        documents[name] = content
    output.mkdir(parents=True, exist_ok=False)
    for name, content in documents.items():
        path = output / name
        path.parent.mkdir(exist_ok=True)
        path.write_text(content)
    print(json.dumps({"documents": len(documents), "output": str(output), "hosting_writes": 0}))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("package", type=Path)
    p.add_argument("mapping", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    render(a.package, a.mapping, a.output)
