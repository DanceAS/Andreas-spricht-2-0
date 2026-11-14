"""Offline checks for the delivered production ZIP and reproducible builds."""
import base64
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("builder", HERE / "build-plugin.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def build(source, output, local=False):
    with contextlib.redirect_stdout(io.StringIO()):
        builder.build(source, output, local)


def refused(call):
    try:
        call()
    except (ValueError, FileExistsError):
        return True
    raise AssertionError("Unsafe build accepted")


with tempfile.TemporaryDirectory(prefix="as-i16-", dir="/tmp") as temp:
    t = Path(temp)
    source = HERE / "source.json"
    build(source,t/"one.zip"); build(source,t/"two.zip"); build(source,t/"local.zip",True)
    assert (t/"one.zip").read_bytes() == (t/"two.zip").read_bytes()
    results = {"byteReproducible":True,"overwriteRefused":refused(lambda:build(source,t/"one.zip"))}
    with zipfile.ZipFile(t/"one.zip") as z:
        assert all(n.startswith("andreas-staging-import/") and ".." not in n for n in z.namelist())
        assert len(z.namelist()) == 11
        code = z.read("andreas-staging-import/includes/importer.php").decode()
        assert "const ORIGIN = 'https://neu.andreasspricht.de';" in code
        raw = z.read("andreas-staging-import/payload.php")
        assert re.search(r"const PAYLOAD_SHA = '([^']+)'",code).group(1) == hashlib.sha256(raw).hexdigest()
        payload = json.loads(raw[len(b"<?php exit; ?>\n"):])
        assert len(payload["theme"]) == 17 and len(payload["assets"]) == 7
        for name, file in payload["theme"].items():
            data = base64.b64decode(file["base64"])
            assert data == (builder.ROOT/"wordpress/theme/andreas-spricht-bordeaux"/name).read_bytes()
            assert hashlib.sha256(data).hexdigest() == file["sha256"]
        for name, asset in payload["assets"].items():
            assert hashlib.sha256(z.read("andreas-staging-import/media/"+name)).hexdigest() == asset["sha256"]
        assert not any(".env" in n or "wp-config" in n or "/tests/" in n for n in z.namelist())
        results.update({"productionOriginFixed":True,"protectedPayloadHashMatches":True,"onlyElevenWhitelistedZipMembers":True,"unchangedThemeAndOriginalMedia":True,"noCredentialsTestsOrWpConfig":True})
    with zipfile.ZipFile(t/"local.zip") as z:
        assert "const ORIGIN = 'http://127.0.0.1:8890';" in z.read("andreas-staging-import/includes/importer.php").decode()
        assert b"Plugin Name: LOCAL TEST" in z.read("andreas-staging-import/andreas-staging-import.php")
        results["separateLocalOnlyArtifact"] = True
    bad = json.loads(source.read_text()); first = next(iter(bad["assets"])); bad["assets"]["../evil.php"] = bad["assets"].pop(first)
    (t/"bad.json").write_text(json.dumps(bad))
    results["traversalRefused"] = refused(lambda:build(t/"bad.json",t/"unsafe.zip"))
    bad = json.loads(source.read_text()); bad["assets"][first]["sha256"]="0"*64
    (t/"bad.json").write_text(json.dumps(bad))
    results["modifiedOriginalRefused"] = refused(lambda:build(t/"bad.json",t/"unsafe.zip"))
    bad = json.loads(source.read_text()); bad["documents"]["pages/home.html"]+="http://127.0.0.1:8890/"
    (t/"bad.json").write_text(json.dumps(bad))
    results["unmappedReferenceUrlRefused"] = refused(lambda:build(t/"bad.json",t/"unsafe.zip"))
    assert not (t/"unsafe.zip").exists()
    print(json.dumps(results,indent=2))
