# Issue #22 – Nachweis und offene Freigabepunkte

Basis: main `ce42fa3`, gelesen: `AGENTS.md`, bisheriger Domainwechsel-/Rückfallplan, Staging-Importcode, Child-Theme und bestehende Tests. Dieser Auftrag ändert keine Theme-, Plugin-Laufzeitdateien, Inhalte, statischen Vorschauen oder Hostingkonfiguration.

## Vereinbart

Laut Issue vom 15.11.2026: echte ALL-INKL-Import-/Editor-/Desktop-/iPhone-/iPad-Abnahme erfolgt, Child 0.3.1 bestätigt, Hauptdomainwechsel grundsätzlich gewünscht. Keine Zustimmung zu unkontrolliertem Deployment. Tarif ohne SSH; daher Browser-Admin/KAS und ein zeitlich begrenztes etabliertes URL-Werkzeug. Die Zustimmung zu `www` → Hauptdomain und tatsächliche KAS-/Backupwerte müssen noch dokumentiert werden.

## Umgesetzt

- Alter CLI-orientierter `CUTOVER.md` durch konkrete Browser-Reihenfolge mit erwarteten Anzeigen, Stopbedingungen und Rückfall ersetzt.
- Privates KAS-/WP-Prüfblatt, frischer vollständiger Sicherungsauftrag inklusive Probe, Supporttext zur eigenständigen Verwendung. Nicht an Support versandt, keine Hostingzugänge angefordert.
- Vorhandenes WP-Verzeichnis behalten; Domainzuordnung zuerst, dann beide WP-Adressen im Admin, danach auf dem neuen Host serialisierungssichere Inhaltsanpassung. Der Datenbanklauf ändert die aktiven Admin-Adressen dadurch nicht mehr mitten in seiner AJAX-Verarbeitung.
- Better Search Replace nur vorübergehend, keine Pro-Lizenz vorausgesetzt, kein selbst entwickeltes Tool/Installer und daher **kein neues Deployment-ZIP** erforderlich.
- Getrennte Behandlung des bisherigen `neu`-Hosts vor Indexierungsfreigabe; kein globaler Schutz des dann gemeinsam genutzten WordPress-Ordners.

## Technische Inspektion

- `wordpress/theme/andreas-spricht-bordeaux/functions.php`: Pattern-URLs werden aus `home_url()`/`get_permalink()` berechnet. Gespeicherte zentrale Template-Teile und Seiten enthalten dagegen absolute Links; bloßes KAS-Umschalten genügt nicht.
- Template-Teile, Global Styles und Zuordnungsoptionen sind native WP-Daten. Die Primärschlüssel/Blocktypen/Theme-Zuordnung werden bei einem URL-Wechsel nicht neu importiert.
- Better Search Replace **1.4.11**, offizieller Quelltag [1.4.11, Commit 7838902](https://github.com/deliciousbrains/better-search-replace/tree/7838902445fb854dd9f64e0f7ecfd670e94a5d6d): `includes/class-bsr-db.php` enthält rekursive serialisierungssichere Verarbeitung, überspringt `guid` ohne aktivierte Ersetzung und behandelt `siteurl` gesondert. `class-bsr-ajax.php` prüft Administratorberechtigung/Nonce; kein ungeschütztes Migrationsskript nötig.
- Git-Quellen enthalten keine fertigen minimierten Admin-Assets; für die lokale Probe wurden sie mit den mitgelieferten Grunt-Aufgaben `cssmin uglify` gebaut. Keine Veränderung des Plugin-Quellcodes, keine Entwicklungsversion und kein von Codex neu verteiltes Plugin-ZIP. Die Anleitung verweist auf das offizielle Installationsangebot.

## Lokale Probe

Siehe [maschinenlesbare Ergebnisse](evidence/results.json) und [Testskript](../../tests/cutover-browser.cjs). Getrenntes Compose-Projekt `andreas-spricht-issue22` mit eigenen Dateien/DB und ausschließlich lokalem Port 8890; WP 7.1.4, TT5 1.5, Child 0.3.1, PHP 8.4.27, MariaDB 10.6.23. Die lokale Browserprobe verwendet `http://127.0.0.1:8890` → `http://localhost:8890`, **keine echten Domains und kein öffentliches HTTPS**.

Der Test verwendet Docker/WP-CLI ausschließlich zur Bereitstellung isolierter Testdaten und zur lesenden Verifikation/privaten DB-Rücksicherung. Die vorgeschlagenen WordPress-Adressänderungen und Datenbank-Suchläufe werden tatsächlich über die Browser-Oberfläche ausgeführt. Daraus wird kein im ALL-INKL-Tarif verfügbarer CLI-Weg abgeleitet.

**Bestanden:**

| Prüfung | Nachweis |
| --- | --- |
| Nativer BSR-Testlauf, 12 bestätigte Core-Tabellen | 15 Treffer, 0 Schreibänderungen; verschachtelte Testoption und GUID-Hash unverändert ([Screenshot](evidence/dry-run.png)) |
| Beide Adressen über Einstellungen → Allgemein geändert | Neue Anmeldung auf dem neuen lokalen Host bestanden; vorheriger Speichervorgang vollständig abgewartet |
| Neuer Testlauf und echter URL-Lauf am neuen Host | 13 Treffer nach separater Änderung der zwei URL-Optionen, 13 Updates; keine GUID-Ersetzung |
| JSON-escaped URL separat trocken/real ersetzt | 1 Treffer, 1 Update; verschachtelte serialisierte Option inklusive Unicode, JSON und unveränderter E-Mail korrekt ausgelesen |
| Aktuelle Start-/Impressums-/Datenschutzseite | Je ein Header/Footer, keine alten gerenderten Host-URLs; [neuer lokaler Header](evidence/new-host-header.png) |
| 390 / 1024 / 1440 px, drei MP3s | Kein horizontaler Überlauf; Wiedergabe/Pause und Sprung zu 50 % in Chromium bestanden |
| Indexierung | `blog_public=0` blieb während der Probe erhalten |
| Private SQL-Rücksicherung in derselben wegwerfbaren lokalen DB | Alter Host, verschachtelte ursprüngliche Option, GUID-Hash und Startseite wiederhergestellt; keine globale Rückersetzung |

Das ist **kein Test des KAS-Exports oder einer Browser-Rücksicherung beim Hoster** und kein vollständiger Dateirestore. Die separate native Header-/Footer-Editorprüfung aus [Issue #20](../../updates/issue-20/evidence/site-editor-results.json) und die laut Issue gemeldete echte Nutzerabnahme bleiben vorhandene Nachweise; im neuen Hosting muss der Editor nach dem Domainwechsel nochmals abgenommen werden.

JavaScript-Syntax und `git diff --check` bestanden. Nach der Probe wurde nur das eigene lokale Issue-22-Projekt mit seinen zwei Testvolumes entfernt; andere vorhandene Projekte/Volumes blieben unangetastet. Die private SQL-Testkopie lag ausschließlich unter ignoriertem `work/` und wurde nach der Probe entfernt; kein Dump, Benutzerpasswort, Konfigurationsschlüssel oder Dateiarchiv wird committet.

## Was offen bleibt

Kein KAS-Zugang/Hosting-Test, keine verifizierten Document-Roots/DNS/SSL-/Weiterleitungsregeln, kein tatsächliches ALL-INKL-Backup oder Restore, kein echter Safari-Test. Auch die Fähigkeit des konkreten Tarifs/Supports, eine frische vollständige private Dateisicherung samt Probe bereitzustellen, ist **vorab zu bestätigen**. Ohne diese Bestätigung ist nicht allein anhand dieses PR umzuschalten.

Ein lokaler SQL-Restore ersetzt weder einen Hosting-Dateirestore noch die vorherige Hosting-Wiederherstellungsprobe. Keine pauschale Aussage „Migration produktionsfertig“ und keine erfundene KAS-Redirectkonfiguration. Hauptdomain und `www` sind bei unverändertem DNS vor dem Wechsel bereits dem richtigen Hosting zuzuordnen; andernfalls benötigt der Plan eine gesonderte DNS-Variante.

## Offizielle Grundlagen

- [ALL-INKL Domainziel/SSL/PHP](https://all-inkl.com/wichtig/anleitungen/kas/domain/einstellungen-bearbeiten/einstellungen-uebersicht_503.html): dokumentiertes Ziel-Feld, tatsächliche Kontowerte trotzdem ungeprüft.
- [ALL-INKL phpMyAdmin-Export](https://all-inkl.com/wichtig/anleitungen/datensicherung/datenbank/phpmyadmin/datenbanksicherung-anlegen_283.html): direktes SQL-Downloadverfahren, Größenlimits beachten.
- [ALL-INKL Sicherungen](https://all-inkl.com/webhosting/datensicherung): vorhandener Service ist kein Nachweis einer frischen aktuellen Vollsicherung.
- [WordPress Migration / Adressen](https://developer.wordpress.org/advanced-administration/upgrade/migrating/): zwei URL-Optionen, Single-Site-Grenze und GUIDs.
- [Better Search Replace offiziell](https://wordpress.org/plugins/better-search-replace/): freie Version mit Serialisierung/Tabellenwahl/Testlauf; Einzeländerungsvorschau/Backup nicht als freie Funktion behaupten.
