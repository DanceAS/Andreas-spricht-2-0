# Prüfbericht Phase 3 – Issue #14

Stand **2. November 2026, Europe/Berlin**. Basis main `b4fa624958492d91365c89aef251e3b6da23cd64` (gemergter PR #13). AGENTS.md, aktuelle WordPress-Anleitung, vorhandener Prüfbericht, Seeds, Migrationsbibliothek, Theme-Dateien und Browser-/Editortests wurden gelesen.

## Vereinbart

Vorhandene ALL-INKL-Installation und Versionsunterschiede untersuchen, ein Staging-Quellpaket und verständliche Installations-/Umstellungs-/Rückfallpläne vorbereiten. Kein Hostingzugriff, keine Änderung an vorhandener Installation, Live-Seite, Domain, DNS, SSL oder Workflows. Nur Feature-Branch und PR, kein Merge/Deployment. Bordeaux, Twenty Twenty-Five und native Bearbeitbarkeit bleiben verbindlich.

## Umgesetzt

- [Nutzeranleitung und offene Hostinginformationen](README.md), [technische Staging-Schritte](OPERATOR.md), [Umstellungs-/Rückfallplan](CUTOVER.md).
- Nur lesender Export aus der geprüften lokalen Datenbank: drei Seiten ohne eingebettete Header/Footer, zwei zentrale native Template-Teile, sieben Originalmedien mit Alttexten/Prüfwerten.
- Offline-Paketbuilder: unverändertes Child-ZIP, Medien, fünf tokenisierte Gutenberg-Dateien, Manifest und Anleitung. Kein Core-/Parent-/Plugin-/Benutzer-/DB-/wp-config-Export. Wiederverwendung eines Ausgabeordners wird verweigert.
- Offline-Renderer mit explizitem Ziel-ID-/URL-Mapping, Integritätsprüfung und Beschränkung auf die Stagingdomain bzw. den isolierten lokalen Test. Keine Netzwerk-/Hosting-Schreibfunktion. Die Zielexistenz der manuell angegebenen Medien-IDs ist später separat zu prüfen.
- Lesendes WP-CLI-Inventar für die **später gesondert genehmigte** Bestandsaufnahme, einschließlich vorhandener Overrides/Global Styles, Seitenzuordnungen, URLs, Plugins, Uploadkonfiguration und Tabellenengines.
- Isolierte lokale Kompatibilitätsumgebung mit denselben gemeldeten Core-/Parent-/PHP-/MariaDB-Versionen. Bestehende Tests erhalten lediglich optionale Testkonfigurationen (Compose/Service/Ausgabepfad und Linkdialog-Buttonname); Standardverhalten für die bisherige lokale Basis bleibt erhalten.

Keine Änderung an Child-Theme, Layout-/CSS-/Playercode, statischer Bordeaux-/grüner Variante oder bestehenden Workflows. Die früheren lokalen Seed-/Migrationssperren bleiben unverändert. Es wird kein unbeaufsichtigter Hostinginstaller geliefert. Der manuelle Importplan ist vorbereitet, **nicht als vollständiger ALL-INKL-Import praktisch abgenommen**.

## Versionsanalyse und tatsächlich geprüfte Umgebung

| Komponente | Bisherige Basis | Laut Issue am Hosting | In dieser Aufgabe isoliert geprüft |
| --- | --- | --- | --- |
| WordPress | 6.8.3 | 7.1.4 | 7.1.4 aus offiziellem GitHub-Release-Tag |
| Twenty Twenty-Five | 1.3 | 1.5 | 1.5 aus demselben offiziellen Core-Archiv, Parent bytegleich |
| PHP | 8.3.28 / Apache | 8.4.27 / Apache | 8.4.27 CLI und CLI-Webserver, **kein Apache** |
| MariaDB | 11.4.13 | 10.6.23 | 10.6.23, separate frische Datenbank |
| Plugins | keine | Antispam Bee aktiv, Akismet inaktiv | keine; reale Plugin-/MU-/Cache-Kombination offen |
| Sprache | deutsche Inhalte | de_DE | deutsche Inhalte, englischer Testeditor ohne deutschen Sprachpaketnachweis |

WordPress 7.1.4 und TT5 1.5 wurden als offizielle Quellstände tatsächlich gefunden. `wp-includes/version.php` nennt PHP >=7.4 und MySQL >=5.5.5; das sind Mindestangaben, **kein Kompatibilitätsnachweis** für dieses Theme oder eine Empfehlung für den produktiven Versionsstand. Theme-Header nennt TT5 1.5 / getestet bis 7.1. Ausführbare Theme-Funktionen, native Blockstruktur, `theme.json` v3, Template-Teil-Taxonomien und Gutenberg-Renderpfade funktionieren im geprüften Versionssatz. Der Linkdialog im Website-Editor hat im neuen Stand **Apply** statt **Save**; nur der lokale Testselektor wurde angepasst.

Ein vollständiges `wordpress:7.1.4-php8.4-apache`-Image ließ sich hier wegen des Dateisystem-Speicherlimits nicht entpacken. Stattdessen wurde das offizielle WordPress-Archiv mit dem PHP-8.4-CLI-Image und MariaDB isoliert betrieben. Der PHP-Testserver erhielt für MP3s einen lokalen Byte-Range-Router; ohne ihn scheiterte zunächst der Seek-Test. Das ist eine Testserver-Eigenschaft, **kein Nachweis** für Audio-/Rewrite-/Headerverhalten von ALL-INKL-Apache. Kein Produktionsrouter oder `.htaccess` wurde daraus abgeleitet.

Keine bestehende Datenbank wurde auf eine andere MariaDB-Version heruntergestuft. Neue Datenbank, keine vorhandenen Hostingdaten kopiert. Schema-Upgrades, Zeichensatz-/Collationunterschiede, Rechte, zusätzliche Plugins und vorhandene gespeicherte Overrides müssen im Ziel geprüft werden. Keine Annahme, dass ein SQL-Dump von MariaDB 11.4 unverändert nach 10.6 importiert werden darf; der gewählte Inhaltsimport nutzt WordPress-APIs und neue Ziel-IDs.

## Technisch überprüft

### Paket und Schutzfälle

Zehn Offline-Prüfungen bestanden:

1. Paket lässt sich bauen; erneutes Bauen ins gleiche Ziel wird verweigert.
2. Alle fünf nativen Dokumente werden auf neue URLs und alle sieben neuen Medien-IDs abgebildet; Blockattribut-JSON bleibt lesbar.
3. Child-ZIP ist dateiweise identisch mit dem bisherigen Theme, ohne Core/Config/Plugins.
4. Live-Domain als Ziel wird verweigert.
5. Gemischte Zielursprünge werden verweigert.
6. Doppelte Attachment-IDs werden verweigert.
7. Veränderte Paketdateien werden verweigert.
8. Ungültige Mappings hinterlassen keine gerenderten Ausgabedateien.
9. Vom Original abweichende Medienprüfwerte werden verweigert.
10. URL-Parameter werden im HTML maskiert und im Block-JSON unverändert erhalten.

Das WP-CLI-Inventar wurde in der isolierten neuen Datenbank ausgeführt. Vorher-/Nachher-Hashes aller sechs verwendeten Tabellen (`posts`, `postmeta`, `options`, `terms`, `term_taxonomy`, `term_relationships`) blieben identisch. Die in der Anleitung verwendete `wp option add ... --format=json`-Übergabe per stdin wurde lokal mit einer temporären Testoption geprüft und diese danach entfernt. Keine Prüfung wurde gegen das Hosting ausgeführt.

### Frontend und echter Website-Editor mit neuem Versionssatz

Chromium 154.0.8037.57, acht Breiten, tatsächliche statische Bordeaux-Dateien als lokale Referenz:

| Breite | Größtes gemessenes Geometriedelta der Startseite | Links / drei Seiten / alle drei Audio-Player |
| --- | ---: | --- |
| 320 px | 0,094 px | bestanden |
| 375 px | 0,094 px | bestanden |
| 390 px | 0,094 px | bestanden |
| 430 px | 0,094 px | bestanden |
| 820 px | 0,016 px | bestanden |
| 1024 px | 0 px | bestanden |
| 1366 px | 0 px | bestanden |
| 1440 px | 0 px | bestanden |

37 repräsentative Elemente mit Schriftwerten/Farben verglichen, keine Unterschiede über die bisherige 1,1-px-Toleranz. Keine Aussage eines vollständigen Screenshot-Pixelvergleichs. Genau ein Header/Footer auf allen drei Seiten, identische zentrale Bereiche, rechtlicher Hauptwortlaut/Höhe wie Referenz; Startseitenanker, Mailto, Facebook, Amazon-/Rechtslinks, Bilddekodierung und fehlender horizontaler Überlauf geprüft. Die drei Player wurden bei jeder Breite real abgespielt/pausiert und auf 50 % gesucht; kein Autoplay, keine JS-Laufzeitfehler.

Im echten visuellen Site-Editor jeweils Headerbeschriftung und Footer-Copyright geändert, gespeichert, auf allen drei Seiten nachgewiesen, nach erneutem Öffnen erhalten und anschließend auf allen drei Seiten wiederhergestellt. Nach Reload 8 bzw. 10 gültige native Blöcke. Kein REST-/SQL-Schreiben als Ersatz für den Editor-Nachweis. Die deutschen redaktionellen Inhalte und das Originalbildmaterial blieben erhalten.

Ergebnisdatei und Screenshots: [evidence/results.json](evidence/results.json), [Startseite mobil](evidence/home-mobile.png), [Startseite Desktop](evidence/home-desktop.png), [Header im neuen Editor](evidence/editor-header.png), [Footer im neuen Editor](evidence/editor-footer.png).

## Reproduktion ausschließlich lokal

Nie auf ALL-INKL ausführen. Docker ist nur ein Entwicklungswerkzeug. Zuerst lokale Basiseinrichtung gemäß übergeordneter README, damit ignorierte `.env` und `.local-assets` vorhanden sind. Keine echten Hostingzugänge verwenden. Das Paket aus der Basis erzeugen, bevor der Port für den Versionstest umgeschaltet wird.

```sh
mkdir -p work/issue-14/core
curl -fsSL https://codeload.github.com/WordPress/WordPress/tar.gz/refs/tags/7.1.4 -o work/issue-14/wordpress-7.1.4.tar.gz
# SHA-256 vor Entpacken mit evidence/results.json vergleichen.
tar -xzf work/issue-14/wordpress-7.1.4.tar.gz -C work/issue-14/core --strip-components=1
chmod -R a+rX work/issue-14/core wordpress/staging
export AS_CORE_DIR="$PWD/work/issue-14/core"
docker compose -f wordpress/compose.yml stop wordpress
```

Test-Compose: `wordpress/staging/tests/compatibility.compose.yml`, eigenes Projekt `andreas-spricht-issue14` mit eigenen Datenbank-/Sitevolumes, nur Loopback-Port 8890. Für alle folgenden Compose-Aufrufe dieselbe `.env` und denselben Testpfad explizit angeben:

```sh
docker compose --env-file wordpress/.env -f wordpress/staging/tests/compatibility.compose.yml run --rm --no-deps --user 0 app sh -c 'cp -a /core/. /var/www/html/; mkdir -p /var/www/html/wp-content/uploads; chown 33:33 /var/www/html /var/www/html/wp-content /var/www/html/wp-content/uploads'
docker compose --env-file wordpress/.env -f wordpress/staging/tests/compatibility.compose.yml up -d --wait db
docker compose --env-file wordpress/.env -f wordpress/staging/tests/compatibility.compose.yml run --rm -T app sh -c 'wp core install --url=http://127.0.0.1:8890 --title="Lokaler Versionstest" --admin_user="$WP_ADMIN_USER" --admin_password="$WP_ADMIN_PASSWORD" --admin_email=prototype@example.invalid --skip-email && wp eval-file /prototype/seed.php && wp eval-file /prototype/seed-phase2.php'
docker compose --env-file wordpress/.env -f wordpress/staging/tests/compatibility.compose.yml up -d app
```

Nur mit frischen **Test**volumes ausführen. Der Kopierschritt ist kein Updateverfahren für redaktionelle Daten. Playwright/Chromium gemäß übergeordneter README lokal bereitstellen, Tests nacheinander:

```sh
AS_TEST_OUTPUT=work/issue-14 node wordpress/tests/shared-site.cjs
AS_TEST_COMPOSE=wordpress/staging/tests/compatibility.compose.yml AS_TEST_ENV_FILE=wordpress/.env AS_TEST_SERVICE=app AS_TEST_LINK_CONFIRM=Apply AS_TEST_OUTPUT=work/issue-14 node wordpress/tests/site-editor-shared.cjs
python3 wordpress/staging/test-package.py work/issue-14/export.json
```

In dieser Cloud lag Playwright separat unter `work/issue-14/tooling/node_modules`; dafür `NODE_PATH` setzen. Das Archiv-SHA und beide fixierten Image-Digests stehen in den Nachweisen. Der Router und die lokale wp-config sind **Testfixtures**, niemals ins Hostingpaket aufnehmen.

Nach den Tests ausschließlich das zusätzliche Testprojekt entfernen und den bisherigen lokalen Stand wieder starten:

```sh
docker compose --env-file wordpress/.env -f wordpress/staging/tests/compatibility.compose.yml down --volumes
docker compose -f wordpress/compose.yml up -d --wait wordpress
```

## Offen / keine Hostingfreigabe

Gemeldete Hostingversionen sind nicht selbst am Hosting bestätigt. Kein Apache-/echter Safari-/iPhone-/iPad-/SSL-/KAS-/DNS-/Plugin-/Redakteursrollen-Test. Kein Nachweis des vollständigen Zielimports in die bestehende ALL-INKL-Datenbank und kein Domainwechsel-Dry-Run am Hoster. Diese Abnahme folgt erst nach späterer Nutzerfreigabe und Installation gemäß [Operatorprüfliste](OPERATOR.md#5-abnahme-auf-dem-echten-staging).

Der vorhandene Sprachpaket-/Sitekonfigurationsstand auf dem Hosting wird nicht vom englischen Testeditor abgeleitet. Datenschutz-/SEO-/Betriebsfreigabe muss die tatsächliche WordPress-/Plugin-Konfiguration berücksichtigen. Keine Aussage über garantierte Unterbrechungsfreiheit oder reine Domain-Umschaltbarkeit.

Die zusätzliche Testinstanz einschließlich ihrer zwei Volumes wurde nach Abschluss entfernt. Die bisherige lokale Basis wurde wieder gestartet und unverändert verifiziert: WP 6.8.3 / TT5 1.3, 94/13/90 Seitenblöcke, 8/10 zentrale Blöcke, sieben unveränderte Originalmedien, unverändertes Parent, keine Zusatzplugins.

**Keine Hostingverbindung aufgebaut, keine Hostingzugangsdaten angefordert, kein Merge, keine Veröffentlichung.**
