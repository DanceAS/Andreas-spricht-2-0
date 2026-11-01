"""Checks for the deploy-free ALL-INKL packager; Python standard library only."""
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("package_allinkl", ROOT / "scripts/package_allinkl.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class AllinklPackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ref = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        cls.commit, cls.files, cls.origins = packager.snapshot(cls.ref)
        (ROOT / "work").mkdir(exist_ok=True)

    def test_flat_zip_is_reproducible_and_matches_committed_files(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "work") as folder:
            a = Path(folder) / "a.zip"
            b = Path(folder) / "b.zip"
            manifest = packager.package(self.ref, a)
            packager.package(self.ref, b)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            with zipfile.ZipFile(a) as archive:
                self.assertEqual(archive.namelist(), sorted(self.files))
                for name in archive.namelist():
                    self.assertFalse(name.startswith(("bordeaux/", "_site/", "Andreas-spricht-2-0/")))
                    self.assertEqual(archive.read(name), self.files[name])
                self.assertTrue(packager.REQUIRED.issubset(archive.namelist()))
            self.assertEqual(manifest["archive_sha256"], hashlib.sha256(a.read_bytes()).hexdigest())

    def test_shared_runtime_comes_from_repository_root(self):
        self.assertEqual(self.origins["app.js"], "app.js")
        self.assertEqual(self.origins["content.js"], "content.js")
        self.assertEqual(self.files["app.js"], packager.git("show", f"{self.commit}:app.js"))

    def test_missing_audio_is_rejected(self):
        files = dict(self.files)
        del files["assets/hoerprobe-letzte-vorstellung.mp3"]
        with self.assertRaises(packager.PackagingError):
            packager.validate(files)

    def test_missing_shared_script_is_rejected(self):
        files = dict(self.files)
        del files["content.js"]
        with self.assertRaises(packager.PackagingError):
            packager.validate(files)

    def test_wrong_footer_contact_is_rejected(self):
        files = dict(self.files)
        files["index.html"] = files["index.html"].replace(b'href="mailto:kontakt@andreasspricht.de">Kontakt</a>', b'href="#kontakt">Kontakt</a>')
        with self.assertRaises(packager.PackagingError):
            packager.validate(files)

    def test_github_pages_base_url_is_rejected(self):
        files = dict(self.files)
        files["app.js"] += b'\nconst obsoleteBase="https://danceas.github.io/Andreas-spricht-2-0/";'
        with self.assertRaises(packager.PackagingError):
            packager.validate(files)

    def test_missing_anchor_is_rejected(self):
        files = dict(self.files)
        files["index.html"] = files["index.html"].replace(b'href="#hoerproben"', b'href="#missing-anchor"', 1)
        with self.assertRaises(packager.PackagingError):
            packager.validate(files)

    def test_external_resource_is_rejected(self):
        files = dict(self.files)
        files["index.html"] += b'<script src="https://example.org/runtime.js"></script>'
        with self.assertRaises(packager.PackagingError):
            packager.validate(files)

    def test_invalid_ref_does_not_replace_existing_output(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "work") as folder:
            output = Path(folder) / "keep.zip"
            output.write_bytes(b"keep existing file")
            with self.assertRaises(packager.PackagingError):
                packager.package("refs/heads/nonexistent-allinkl-test-ref", output)
            self.assertEqual(output.read_bytes(), b"keep existing file")


if __name__ == "__main__":
    unittest.main()
