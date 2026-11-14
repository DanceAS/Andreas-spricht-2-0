# Issue #16 – Browser-/WordPress-Admin-Einmalimport

Stand: **14. November 2026 (Europe/Berlin)**. Basis: aktuelles main `2da92f5` mit gemergtem PR #15. AGENTS.md, Staging-README, OPERATOR, CUTOVER, bisheriger Prüfbericht, Seeds/Export, Child-Theme und vorhandene Editor-/Browsertests zuerst geprüft. Der fehlende SSH-Zugang ist durch Issue #16 bestätigt.

## Vereinbart

Ein vollständiger, nach Freigabe ohne SSH/WP-CLI/Terminal/Docker/phpMyAdmin auf ALL-INKL bedienbarer Einmalimport über WordPress-Admin. Bestehende Installation gezielt ergänzen, Inhalte nativ editierbar, Bordeaux unverändert, bestehende Daten schützen. Nur Feature-Branch und PR; kein Merge, keine Hostinginstallation oder Domainänderung.

## Umgesetzt

- Ein vollständig gebündeltes [Produktions-ZIP](dist/andreas-staging-import.zip), ca. **9,2 MB**, mit temporärem Import-Plugin, unverändertem Child, vier JPG-/drei MP3-Originalen und fünf nativen Gutenberg-Dokumenten. Kein zweiter Upload, keine manuelle ID-/URL-/Optionsbearbeitung nötig.
- [Drei-Schritte-Anleitung für Andreas](README.md): ZIP über Plugins installieren/aktivieren; Vorprüfung in Werkzeuge bestätigen und Import starten; Vorschau prüfen, Plugin deaktivieren/löschen. Zusätzliche native Löschbestätigung berücksichtigt.
- Fest auf `https://neu.andreasspricht.de` begrenzt, Adminrolle/Capabilities/Nonce, unveränderter Prüfplan und ausdrückliche Zustimmung erforderlich. Keine Aktivierungs-/Cron-/öffentliche Importfunktion. Gespeicherte und wirksame URLs sowie Request-Host/HTTPS werden geprüft.
- Vorprüfung von bestehendem Child, Seiten-/Attachment-Slugs, vorhandenen Bordeaux-Maps, Templates/Teilen/Global Styles, Pfaden/Rechten/Cache/Tabellenengines. Anzeige bestehender IDs, geplanter Inhalte und Zuordnungen. Kein Reset-/Lösch-/Überschreibmodus.
- 24 gespeicherte, einzeln authentifizierte Schritte. Medienregistrierung getrennt von Metadatenaufbereitung, Transaktionen für Posts/Metadaten/Taxonomien/Fortschritt, Named Lock gegen parallele Requests, Bestands-/Objektsignaturen gegen redaktionelle Änderungen. Letzter Schritt veröffentlicht nur die neuen Seiten, aktiviert das neue Child und setzt Front-/Datenschutz-/Bordeaux-Zuordnungen.
- Nach Erfolg kein erneutes Schreiben importierter Inhalte; native Pluginlöschung entfernt keine WordPress-Seiten, Medien, Theme oder Marker. Keine dauerhafte Laufzeitabhängigkeit. Technische Grenzen im [Sicherheitsmodell](SECURITY.md).
- Reproduzierbarer Offline-Builder und tokenisierte Referenz `source.json`. Produktions-ZIP im PR direkt herunterladbar. Separates, nicht ausgeliefertes LOCAL-TEST-ZIP für die isolierte Adresse; keine per Request/Filter umschaltbare Produktionsdomain.

Keine Änderung an statischer Bordeaux-/grüner Variante, Child-/Parent-Quellcode, Layout, Playercode oder bestehenden Workflows. Alte WP-CLI-Pläne sind als historische Referenz markiert; der spätere Domainwechsel ist weiterhin nicht freigegeben und benötigt wegen des fehlenden SSH-Zugangs einen gesonderten Ausführungsweg.

## Tatsächliche lokale Testumgebung

| Komponente | Isoliert praktisch verwendet |
| --- | --- |
| WordPress / Parent | **7.1.4 / Twenty Twenty-Five 1.5** |
| Webserver / PHP | **Apache / PHP 8.4.27**, vollständiges offizielles Apache-Image |
| Datenbank | **MariaDB 10.6.23**, eigene frische Datenbanken/Volumes |
| Pluginbestand Hauptlauf | Antispam Bee **2.11.9 aktiv**, Akismet/Hello inaktiv; unverändert erhalten |
| Browser | Linux Chromium **154.0.8037.57**, echte Browserlayouts und UI-Eingaben |
| Ziel vor Import | Parent aktiv, eine alte veröffentlichte Startseite sowie ein bestehendes JPG mit gleichem Dateinamen wie ein neues Medium |
| Rollen | Admin sowie zusätzlicher lokaler Editor für den Ablehnungstest; Import erzeugt keine Benutzer |
| Sprache | Deutsche Inhalte und Importoberfläche; englische native WordPress-Testoberfläche. de_DE auf ALL-INKL nicht selbst geprüft/geändert |

Anders als in Issue #14 konnte hier das vollständige Apache-Image verwendet werden; kein eigener Audio-Range-Router im Haupt-/Fehlerlauf. Images durch Digests fixiert, siehe [Nachweisdatei](evidence/results.json). Die Hostingangaben sind weiterhin gemeldete Werte, kein eigener Zugriff auf ALL-INKL.

## Technisch überprüft: echter Admin-Import

Die Installation des Import-Plugins erfolgte **über Plugins → Plugin hochladen → Install Now → Activate Plugin** im Browser. Der Import selbst über die sichtbare Vorprüfung, Checkbox und Start-/Fortsetzen-Buttons. **Kein WP-CLI-/SQL-Import als Ersatz**. CLI wurde nur zur lokalen Fixture-Vorbereitung, Fehler-Injektion und lesenden Verifikation verwendet; der Anwender braucht sie nicht.

| Fall | Praktisches Ergebnis |
| --- | --- |
| Produktions-ZIP auf localhost | Domain-Sperre, keine Importdaten erzeugt; auch am final gebauten ZIP wiederholt |
| Abgemeldet / Editor | Importrequest abgewiesen |
| Falsche Nonce / fehlende Zustimmung / alter Plan / `next` ohne Start | abgewiesen, kein Importzustand erzeugt |
| Suchmaschinenfreigabe statt `blog_public=0` | Vorprüfung blockiert |
| Fremder gespeicherter Template-Override | blockiert, Inhalt erhalten |
| Vorhandenes gleichnamiges Child / vorhandene Bordeaux-Option | blockiert, fremde Datei/Option erhalten |
| Verändertes Payload | Paketprüfung blockiert |
| Unterbrechung nach Medienregistrierung | Cursor 2 bleibt gespeichert; Fortsetzen verwendet dieselbe Attachment-ID |
| Alte Seite während Pause geändert | Bestandssignatur blockiert statt überschrieben |
| Vollständiger Import | 3 neue Seiten, 2 zentrale Teile, 7 neue Medien; 24 Schritte abgeschlossen |
| Erneuter Aufruf nach Abschluss | keine Duplikate, Inhalts-/Objekt-/Zuordnungshashes erhalten |
| Andere Plugins / bestehende Medien | aktivierte Antispam Bee erhalten; vorhandenes JPG/Alttext und alter Seiteninhalt unverändert |

Der Titel der alten Seite wurde im Konflikttest ausdrücklich durch das Testfixture geändert und zurückgesetzt; damit verbundene native Änderungszeitstempel stammen vom Test, nicht vom Importer. Alte Inhalte, Status, Slug und das bestehende Medium wurden separat geprüft. Keine unkontrollierte Löschung.

### Getrennter Fehlerlauf am finalen ZIP-Stand

Zusätzliche frische lokale Datenbank, erneuter echter Admin-Upload/-Import, keine Änderungen an der Haupt-Testdatenbank:

- Falscher HTTP-Host innerhalb einer **lokalen** Anfrage und aktivierter Persistenz-Cache-Schalter werden abgewiesen. Keine Anfrage an die reale Live-Domain.
- Ein existierendes Attachment mit reserviertem Seiten-Slug blockiert die Vorprüfung; sein Slug wird nicht überschrieben.
- Über einen lokalen MU-Testfilter absichtlich erzeugter Core-Seitenfehler: Cursor bleibt **16**, sieben Medien und erster neuer Entwurf bleiben erhalten, Parent/alte Startseitenzuordnung weiter aktiv.
- Eine redaktionelle Änderung am neuen Entwurf wird erkannt und nicht überschrieben.
- Zweite DB-Verbindung hält den Named Lock: paralleler HTTP-Request erhält Konfliktantwort und verändert den Cursor nicht.
- Absichtlich erzwungener Taxonomiefehler **nach Anlegen des neuen Header-Posts**: Transaktion entfernt den nicht bestätigten Post wieder; **0** Template-Teil-Posts, Cursor weiterhin **21**. Nach Beseitigung des Fehlers genau zwei Teile, keine Duplikate.
- Nach Fortsetzen genau **3 Seiten / 2 Teile / 7 Medien**, Cursor **24**, abgeschlossen. Die lokalen MU-Fehlerfilter wurden danach entfernt; sie sind niemals Bestandteil des ausgelieferten ZIP.

Die Wiederholung des vollständigen Fehlerlaufs prüft den finalen Paketstand einschließlich zusätzlichem Cache-/Slugschutz. Daten-/Theme-Payload bleibt gegenüber dem Hauptlauf identisch. Die Hauptlauf-Editor-/Frontendnachweise beziehen sich auf dessen identische importierte native Inhalte nach Entfernung des Importers.

## Technisch überprüft: Redaktion und Plugin-Entfernung

- Echter visueller Seiteneditor: Texte, Überschriften, Genre/Autor, Über-mich-Einstieg, Buchtitel/Autor, optionale Buchfelder, Kontakt, Buch-/Mailtolinks, Hero-Bild, Cover und Audio-Zuordnung geändert, gespeichert, neu geöffnet, im Frontend geprüft und wiederhergestellt. Ersetzte MP3 tatsächlich abgespielt.
- Impressum und Datenschutz ebenfalls visuell geändert, gespeichert, erneut geöffnet und Originaltext wiederhergestellt. **94 / 13 / 90 gültige native Blöcke**, vor und nach Reload; keine Custom-HTML-Blöcke.
- Import-Plugin über native Verwaltung deaktiviert und **vollständig gelöscht**. Objekt-/Metadaten-/Maphashes erhalten (flüchtiger Editor-Lock aus Vergleich ausgenommen).
- Anschließend eine echte gespeicherte redaktionelle Änderung erhalten, Plugin nochmals über Admin installiert/aktiviert: nur Abschlussanzeige, kein Startbutton, kein Überschreiben. Wieder gelöscht; Demoänderung danach im nativen Editor zurückgesetzt.
- Ohne Import-Plugin alle drei MP3s mit Range-Anfrage **206 / Content-Range** geprüft.
- **Nach Löschung** zentralen Header/Footer im echten Website-Editor geändert und gespeichert, auf allen drei Seiten bestätigt, nach Editor-Reload erhalten und wiederhergestellt. **8 / 10 gültige native Blöcke** und korrekte Theme-/Bereichstaxonomien.
- Lesende Abschlussprüfung: 17 Child-Dateien bytegleich, Parent bytegleich zum offiziellen Image, alle sieben Originalmedien und das vorher existierende Medium bytegleich, Front-/Datenschutzzuordnungen korrekt, `blog_public=0`, nur Antispam Bee weiterhin aktiv.

## Technisch überprüft: Frontend ohne Import-Plugin

Alle acht Breiten mit tatsächlicher lokaler statischer Bordeaux-Referenz, jeweils drei Seiten und alle drei Player:

| Breite | Größtes Geometriedelta der 37 verglichenen Elemente | Navigation / Rechtsseiten / Play-Pause-Seek |
| --- | ---: | --- |
| 320 px | 0,094 px | bestanden |
| 375 px | 0,094 px | bestanden |
| 390 px | 0,094 px | bestanden |
| 430 px | 0,094 px | bestanden |
| 820 px | 0,016 px | bestanden |
| 1024 px | 0 px | bestanden |
| 1366 px | 0 px | bestanden |
| 1440 px | 0 px | bestanden |

Wirksame Schriftwerte/Farben mitverglichen, keine Differenz über die bisherige 1,1-px-Toleranz. Kein behaupteter Gesamtbild-Pixelvergleich. Genau ein Header/Footer je Seite, gemeinsame Bereiche identisch, rechtlicher Hauptwortlaut/Höhe wie Referenz, alle Bilder dekodierbar, kein horizontaler Überlauf, keine JS-Laufzeitfehler. Drei echte Audio-Play/Pause-/50%-Seek-Prüfungen pro Breite. Kontakt-/Anker-/Rechts-/Facebooklinks geprüft; Amazonlinks wurden im nativen Editor geändert/zurückgesetzt, keine externen Zielseiten besucht.

## Offline-/Codeprüfungen und Nachweise

Elf Offline-Bau-/Paketprüfungen: byteidentischer Wiederholungsbuild, Überschreibschutz, feste Produktionsdomain, korrekter geschützter Payloadhash, exakt elf erlaubte ZIP-Mitglieder, unverändertes Child/Originalmedien, keine Zugangsdaten/Testdateien/wp-config im ZIP, separates lokales Testartefakt, Pfadtraversal-, Medienhash- und lokale-Quell-URL-Ablehnung. PHP-/Node-/Python-Syntax, Compose-Konfiguration und `git diff --check` geprüft.

- [Maschinenlesbare Ergebnisse und Code-/ZIP-Hashes](evidence/results.json)
- [Admin-Vorprüfung](evidence/admin-preview.png), [Fortsetzen nach Unterbrechung](evidence/admin-resume.png), [Abschluss](evidence/admin-complete.png)
- [Gespeicherte Buch-/Medienbearbeitung](evidence/editor-book.png), [Header nach Pluginlöschung](evidence/editor-header.png)
- [Fehler nach Postanlage vollständig zurückgenommen](evidence/term-rollback.png)
- [Mobile Startseite ohne Importer](evidence/home-mobile.png), [Desktop ohne Importer](evidence/home-desktop.png)

## Reproduktion ausschließlich lokal

Der Builder benötigt nur Python und die Repository-Originale. Die folgenden Testwerkzeuge sind **Entwicklerwerkzeuge**, keine Voraussetzungen für Andreas oder ALL-INKL. Eine frische, disposable Docker-Umgebung verwenden; keine Hostingdaten kopieren. Lokale `.env`/Referenzmedien gemäß übergeordneter Testanleitung bereitstellen; geheime Werte bleiben ignoriert. ZIPs in `work/issue-16/` bauen, für das lokale ZIP `--local-test` verwenden. Apache-/CLI-/MariaDB-Digests in `tests/compose.yml`.

```sh
export AS_I16_ARTIFACTS="$PWD/work/issue-16"
docker compose --env-file wordpress/.env -f wordpress/staging/admin-import/tests/compose.yml up -d --wait wordpress
# Core lokal installieren, dann ausschließlich in dieser frischen Test-DB:
docker compose --env-file wordpress/.env -f wordpress/staging/admin-import/tests/compose.yml run --rm -T cli wp eval-file /staging/admin-import/tests/setup-fixture.php
```

Das Setup-Fixture entfernt ausschließlich die automatisch angelegten lokalen Beispielseiten, erstellt die alte Versuchseite/ein bestehendes Medium und blockiert jede andere Umgebung. Für den Hauptlauf Antispam Bee 2.11.9 lokal aus dem offiziellen Quell-ZIP installieren und einen lokalen Benutzer `import_editor` mit Rolle Editor und dem lokalen Testpasswort anlegen. Keine dieser Benutzer-/Plugin-Testdateien steckt im Importpaket.

Bei bereitgestelltem Playwright/Chromium Tests **nacheinander** ausführen:

```sh
node wordpress/staging/admin-import/tests/admin.cjs
node wordpress/staging/admin-import/tests/content-editor.cjs
node wordpress/staging/admin-import/tests/remove.cjs
AS_TEST_OUTPUT=work/issue-16/browser node wordpress/tests/shared-site.cjs
AS_TEST_COMPOSE=wordpress/staging/admin-import/tests/compose.yml AS_TEST_ENV_FILE=wordpress/.env AS_TEST_LINK_CONFIRM=Apply AS_TEST_OUTPUT=work/issue-16/site-editor node wordpress/tests/site-editor-shared.cjs
python3 wordpress/staging/admin-import/tests/build.py
```

In dieser Cloud lag Playwright unter `work/issue-16/tooling/node_modules`; entsprechend `NODE_PATH` setzen. Der separate Fehlerlauf nutzt denselben Compose-Pfad mit `-p andreas-spricht-issue16-faults`, frische eigene Volumes und `tests/fault.cjs`. Die Haupt-App davor wegen desselben Loopbackports stoppen; nach Entfernen des Fehlerprojekts wieder starten. Die Fehlerfixture verändert absichtlich nur ihre eigene lokale DB und hängt kurz einen Core-Filter ein. Nicht als Wartungstest auf redaktionellen Daten ausführen.

## Offen / Grenzen

Kein Zugriff auf ALL-INKL und keine Verifikation seiner tatsächlichen Pfade, Rechte, Limits, Konfiguration oder exakten Antispam-/MU-/Cache-Versionen. Echter Safari/iPhone/iPad-, HTTPS-/Zertifikats-/KAS-/Hosting-/Sprachpakettest, finale redaktionelle Rolle sowie fachliche Datenschutz-/SEO-/Accessibility-Abnahme bleiben nach gesonderter Staging-Freigabe offen. Keine Garantie für fremde Hooks oder vollständigen Filesystem-Rollback; eigene temporäre Dateien können nach einem Fehler verbleiben. Inkompatible Bedingungen werden gesperrt statt erzwungen umgangen.

**Nur Branch und PR, kein Merge, keine Veröffentlichung, keine Installation oder Änderung bei ALL-INKL, keine Domain-/DNS-/SSL-/Live-Änderung.**
