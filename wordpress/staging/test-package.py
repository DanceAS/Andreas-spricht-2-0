#!/usr/bin/env python3
"""Offline package/mapping safety tests, using an explicitly supplied local export."""
import copy
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import re
import sys
import tempfile
import zipfile


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def refused(action):
    try:
        action()
    except (ValueError, FileExistsError):
        return True
    raise AssertionError("Unsafe input was accepted")


if __name__ == "__main__":
    build = module("build-package")
    render = module("render-content")
    source = Path(sys.argv[1])
    results = {}
    with tempfile.TemporaryDirectory(prefix="as-package-", dir="/tmp") as tmp:
        root = Path(tmp)
        package = root / "package"
        with contextlib.redirect_stdout(io.StringIO()):
            build.build(source, package)
        manifest = json.loads((package / "manifest.json").read_text())
        results["repeat_build_refused"] = refused(lambda: build.build(source, package))
        target = "https://neu.andreasspricht.de"
        mapping = {"home": target + "/", "impressum": target + "/?page_id=501", "datenschutz": target + "/?page_id=502", "media": {}}
        for i, name in enumerate(manifest["assets"]):
            mapping["media"][name] = {"id": 9001 + i, "url": target + "/wp-content/uploads/2026/11/" + name}
        mapfile = root / "mapping.json"
        def run(values, out):
            mapfile.write_text(json.dumps(values))
            with contextlib.redirect_stdout(io.StringIO()):
                render.render(package, mapfile, root / out)
        run(mapping, "rendered")
        documents = list((root / "rendered").rglob("*.html"))
        assert len(documents) == 5
        ids = set()
        for doc in documents:
            content = doc.read_text()
            assert "127.0.0.1" not in content and "__ID_" not in content and "__URL_" not in content
            for attrs in re.findall(r'<!-- wp:[\w/-]+ (\{[^\n]*\})\s*(?:/)?-->', content):
                parsed = json.loads(attrs)
                if "id" in parsed:
                    ids.add(parsed["id"])
        assert ids == set(range(9001, 9008))
        results["all_native_id_attributes_and_five_documents_mapped"] = True
        query = copy.deepcopy(mapping)
        audio = next(n for n in query["media"] if n.endswith(".mp3"))
        query["media"][audio]["url"] += "?a=1&b=2"
        run(query, "query")
        content = (root / "query/pages/home.html").read_text()
        assert "?a=1&amp;b=2" in content
        sample = render.map_document('<!-- wp:paragraph {"metadata":{"name":"__URL_X__"}} --><p>__URL_X__</p>', {"__URL_X__": target + "/?a=1&b=2"})
        attrs = re.search(r'<!-- wp:paragraph (\{.*\}) -->', sample).group(1)
        assert json.loads(attrs)["metadata"]["name"].endswith("?a=1&b=2")
        assert "<p>" + target + "/?a=1&amp;b=2</p>" in sample
        results["url_json_and_html_escaping_correct"] = True
        with zipfile.ZipFile(package / "andreas-spricht-bordeaux.zip") as z:
            for item in z.namelist():
                assert item.startswith("andreas-spricht-bordeaux/") and ".." not in item
                assert z.read(item) == (build.ROOT / "wordpress/theme" / item).read_bytes()
        results["child_zip_byte_identical_no_core_config_or_plugins"] = True
        wrong = copy.deepcopy(mapping)
        wrong["home"] = "https://andreasspricht.de/"
        results["live_target_refused"] = refused(lambda: run(wrong, "live"))
        wrong = copy.deepcopy(mapping)
        wrong["media"][next(iter(wrong["media"]))]["url"] = "http://127.0.0.1:8890/a.mp3"
        results["mixed_origins_refused"] = refused(lambda: run(wrong, "mixed"))
        wrong = copy.deepcopy(mapping)
        for asset in wrong["media"].values():
            asset["id"] = 1
        results["duplicate_ids_refused"] = refused(lambda: run(wrong, "ids"))
        (package / "pages/home.html").write_text("changed")
        results["tampered_package_refused"] = refused(lambda: run(mapping, "tampered"))
        assert not any((root / n).exists() for n in ("live", "mixed", "ids", "tampered"))
        results["invalid_inputs_leave_no_rendered_output"] = True
        bad = json.loads(source.read_text())
        bad["assets"][next(iter(bad["assets"]))]["sha256"] = "0" * 64
        badfile = root / "bad-export.json"
        badfile.write_text(json.dumps(bad))
        results["modified_original_refused"] = refused(lambda: build.build(badfile, root / "bad"))
    print(json.dumps({"tests": results}, indent=2))
