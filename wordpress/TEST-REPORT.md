# Prüfbericht – zentrale Header/Footer / Issue #12

Stand: **2. November 2026 (Europe/Berlin)**. Ausgangspunkt: gemergter PR #11, main `502644c`.

## Vereinbart

Header und Footer einmal zentral im nativen WordPress-Website-Editor verwalten; Startseite, Impressum und Datenschutz verwenden dieselben Template-Teile. Bestehende Editoränderungen sicher behandeln, Duplikate entfernen, Bordeaux-Gestaltung und Funktionen erhalten. Nur lokale Entwicklung, Branch und PR; kein Merge, kein Deployment, keine Hosting-/Domainänderung.

AGENTS.md, aktuelle README, Phase-2-Prüfbericht und tatsächlicher Code wurden zuerst gelesen. Die WordPress-Basis und das unveränderte Parent-Theme Twenty Twenty-Five bleiben erhalten. Der bisherige [Phase-2-Bericht](TEST-REPORT-PHASE-2.md) ist historisch archiviert.

## Umgesetzt

- Zwei native `wp_template_part`-Einträge des Child-Themes, Bereiche `header` und `footer`, mit 8 bzw. 10 gültigen nativen Blöcken. Logo, Navigationslinks, Copyright, Kontakt, Rechtslinks und Facebook sind dort bearbeitbar.
- Die Child-Templates `front-page`, `page` und `index` referenzieren dieselben Teile. Seiteninhalte enthalten danach keine eingebetteten Header/Footer mehr: 94 / 13 / 90 native Blöcke für Startseite / Impressum / Datenschutz.
- Versionierte `parts/*.html` und native, nicht synchronisierte Default-Patterns bieten passende Rücksetz-Defaults. Die redaktionellen Texte stehen in HTML-Blöcken bzw. WordPress, nicht in PHP/JS. PHP löst nur installationsabhängige URLs auf.
- Die aktuelle Startseite dient als geprüfte kanonische Quelle einschließlich dort gespeicherter Änderungen. Lokale Anker werden auf Startseiten-URLs umgesetzt, damit dieselbe Navigation auch von rechtlichen Seiten funktioniert.
- Bei vorhandenen Installationen bleibt bis zur geprüften Migration die alte Darstellung aktiv, ohne zusätzliche Teile. Bestehende gespeicherte Template-Overrides werden dabei nicht verdeckt. Setup migriert vorhandene Seiten nicht automatisch.
- Migration mit explizitem Planhash, Transaktion, vollständiger Sicherung aller ursprünglichen Seiten/Varianten und Rückbaumöglichkeit. Bereits vorhandene Teile, individuelle Template-Zuweisungen, veraltete Pläne und unbekannte Seitenstrukturen werden nicht überschrieben.
- Frische Installationen erzeugen die Teile unmittelbar nach dem erstmaligen Seed automatisch. Spätere Setup-Aufrufe ändern weder Seiten noch zentrale Teile.

**Keine CSS-Regeln oder Frontend-JavaScript-Dateien geändert.** Zusätzliche native Wrapper wirken im geprüften Layout nicht sichtbar. Das Child-Theme hat Version 0.3.0; Parent-Dateien bleiben bytegleich.

## Bewusster Unterschied auf den rechtlichen Seiten

Die zuvor verkürzten Header/Footer von Impressum und Datenschutz werden durch die vollständigen gemeinsamen Startseitenbereiche ersetzt – entsprechend dem Auftrag, dieselben zentralen Bereiche zu verwenden. Damit stehen auch dort die vier Startseiten-Anker, beide Rechtslinks und Facebook bereit. Die Rückkehr zur Startseite erfolgt über das Logo bzw. die Startseiten-Anker.

Der vollständige rechtliche Hauptinhalt bleibt unverändert. Die alten verkürzten Varianten werden im Plan sichtbar ausgewiesen und vollständig gesichert; sie werden nicht heimlich zusammengeführt. Etwaige zusätzliche individuelle Änderungen solcher Varianten müssen vor Anwendung in der kanonischen Quelle konsolidiert oder anhand der Sicherung manuell abgeglichen werden.

## Praktisch überprüft: echter Website-Editor

Der Browser öffnete **`wp-admin/site-editor.php`**, Entität `wp_template_part`, nicht den normalen Seiteneditor. Änderungen erfolgten über sichtbare native Block-/Linkfelder und Save, nicht durch REST-/SQL-Schreibzugriffe als Ersatz für die Editorbedienung.

| Prüfung | Ergebnis |
| --- | --- |
| Header ändern | Navigationsbeschriftung zentral zu „Hörproben ZENTRALTEST“ geändert und gespeichert |
| Header auf drei Seiten | Änderung auf Startseite, Impressum und Datenschutz bestätigt; jeweils genau ein Header/Footer |
| Header erneut öffnen | Änderung nach Website-Editor-Reload vorhanden; 8 gültige native Blöcke |
| Header wiederherstellen | Originalbeschriftung gespeichert und auf allen drei Seiten bestätigt |
| Footer ändern | Copyright zentral um „ZENTRALTEST“ ergänzt und gespeichert |
| Footer auf drei Seiten | Änderung auf allen drei Seiten bestätigt; keine Duplikate |
| Footer erneut öffnen | Änderung nach Website-Editor-Reload vorhanden; 10 gültige native Blöcke |
| Footer wiederherstellen | Originaltext gespeichert und auf allen drei Seiten bestätigt |

Der normale Setup-Aufruf wurde danach erneut ausgeführt: SHA-256 aller **drei Seiten und beider zentralen Teile** blieb unverändert. Die Hauptinhaltsblöcke aller drei Seiten stimmen außerdem per Hash mit dem geprüften Eingang der tatsächlichen Migration überein.

## Praktisch überprüft: Migrationssicherheit

Zwölf gemeldete Schutz-/Erhaltungsprüfungen erfolgreich, einschließlich absichtlich erzeugter Fehler. Die Tests liefen in einer isolierten lokalen Datenbank und stellten ihre Eingabeseiten wieder her:

- Nicht-lokale URL wird abgewiesen (nur temporärer Lesefilter, keine Domainänderung).
- Individuelle Seiten-Template-Zuweisung wird abgewiesen.
- Gespeichertes eigenes Template wird nicht überschrieben und bleibt bis zur Umstellung unverändert gerendert.
- Vorhandener eigener Template-Teil wird abgewiesen.
- Falscher Planhash wird abgewiesen.
- Nach Planerstellung geänderte Seite erzeugt einen anderen Prüfwert; alter Plan wird abgewiesen.
- Erzwungener Fehler mitten in der Migration rollt bereits erstellte Teile und vorherige Seitenupdates vollständig zurück.
- Absichtlich geänderter kanonischer Headertext wird übernommen.
- Sämtliche Nicht-Header-/Footer-Blöcke bleiben erhalten.
- Alle ursprünglichen Seiten und abweichenden Varianten liegen in der Sicherung.
- Automatischer Rückbau nach späteren Änderungen wird verweigert.
- Unveränderte Migration lässt sich auf die ursprünglichen Seiten zurückbauen; Sicherung bleibt bestehen.

Zusätzlich: ausstehende Migration verwendet die alte Dateivorlage ohne doppelte Teile; native Datei-/Pattern-Defaults rendern genau einen Header/Footer und lösen Startseiten-/Rechtslinks korrekt auf. Eigene Template-Overrides werden nicht vom Übergangs-Fallback verdeckt.

**Frische Installation:** zusätzliches Compose-Projekt mit eigener Datenbank und eigenen Volumes, **ohne veröffentlichten Port**. Core-Installation → Phase-1-/Phase-2-Seed erzeugt automatisch zentrale Teile. Auch dort wurden Migrationsschutzfälle geprüft; nach erneuter Migration stimmen native Struktur, Originalmedien und Parent-Hashes. Das zusätzliche Testprojekt wurde danach entfernt; die bestehende lokale Entwicklung blieb erhalten.

## Praktisch überprüft: Browser und Referenz

Linux Chromium **154.0.8037.57**, echte Browserlayouts bei allen geforderten Breiten. In jedem Fall wurden alle drei Seiten geprüft:

| Breite | Größte Geometriedifferenz der Startseite zur statischen Referenz | Alle drei Seiten / Links | Drei Player |
| --- | ---: | --- | --- |
| 320 px | 0,094 px | bestanden | Play/Pause/Seek bestanden |
| 375 px | 0,094 px | bestanden | bestanden |
| 390 px | 0,094 px | bestanden | bestanden |
| 430 px | 0,094 px | bestanden | bestanden |
| 820 px | 0,016 px | bestanden | bestanden |
| 1024 px | 0 px | bestanden | bestanden |
| 1366 px | 0 px | bestanden | bestanden |
| 1440 px | 0 px | bestanden | bestanden |

37 repräsentative Elemente und ihre wirksamen Schriftwerte/Farben wurden gegen die tatsächliche lokale statische Referenz gemessen. Keine Abweichung über 1,1 px Toleranz; die kleinen Werte sind Subpixelrundung, kein behaupteter Gesamtbild-Pixelvergleich.

Für alle 24 Seitenaufrufe genau ein Header und ein Footer. Gerendertes Header-/Footer-HTML ist auf allen drei Seiten identisch. Die zentralen Headermaße entsprechen auch auf rechtlichen Seiten der Startseitenreferenz. Deren vollständiger Hauptinhalt stimmt nach Whitespace-Normalisierung im Wortlaut und in der Höhe weiterhin mit der statischen Referenz überein.

Weitere erfolgreiche Prüfungen: alle vier Anker, Startseiten-Navigation aus rechtlichen Seiten, Rechtslinks, Mailto und Facebook mit zugänglicher Beschriftung/neuem Tab, alle Bilder dekodierbar, alle drei MP3s ohne Autoplay mit echter Wiedergabe/Pause/Seek auf 50 %, kein horizontaler Überlauf und keine JavaScript-Laufzeitfehler.

PHP-/Bash-/Node-Syntax, Compose-Konfiguration und `git diff --check` geprüft. Parent und vier JPG-/drei MP3-Originale unverändert; keine aktiven Zusatzplugins. Lokale Basis weiterhin WordPress 6.8.3 / Twenty Twenty-Five 1.3 / Web-PHP 8.3.28 / MariaDB 11.4.13, keine Produktionsversions-Empfehlung.

## Nachweise und Anleitung

Die ZENTRALTEST-Texte waren nur lokale Teständerungen und wurden wiederhergestellt.

- [Header im Website-Editor nach Speichern und Neuladen](evidence/shared-parts/site-editor-header-saved.png)
- [Footer im Website-Editor nach Speichern und Neuladen](evidence/shared-parts/site-editor-footer-saved.png)
- [Wiederhergestellte Startseite mobil](evidence/shared-parts/home-mobile.png)
- [Wiederhergestellte Startseite Desktop](evidence/shared-parts/home-desktop.png)
- [Impressum mit denselben zentralen Bereichen mobil](evidence/shared-parts/impressum-mobile.png)
- [Impressum Desktop](evidence/shared-parts/impressum-desktop.png)
- [Datenschutz-Ausschnitt mit zentralem Header](evidence/shared-parts/datenschutz-excerpt.png)
- [Messwerte, Schutzfälle, Hashes und Editor-Ergebnisse](evidence/shared-parts/results.json)
- [Installation, Migration, Rückbau und Website-Editor-Bedienung](README.md)

`test-shared-migration.php` verändert absichtlich lokale Testdaten und verweigert eine bereits aktive Migration. Nur in einer zusätzlichen, disponiblen Vor-Migrations-Datenbank ausführen, nicht als Routineprüfung der redaktionellen Arbeitsdaten. `test-part-defaults.php`, `verify.php` und `verify-shared-body.php` sind lesend; Letzteres vergleicht mit dem Migrationseingang und ist nach späteren legitimen Seiteninhaltsänderungen kein Unverändertheitsnachweis mehr.

## Offen / unverändert

Kein echter Safari-/iPhone-/iPad-Test und kein ALL-INKL-/Hosting-/Editor-Test. WebKit ist hier nicht installiert; die bekannte Download-Sperre dieser Umgebung besteht fort. Die vorhandenen Tests sind Chromium-Viewporttests. Eingeschränkte Redakteursrolle, Produktionsversionen und spätere Hosting-/Datenschutz-/SEO-/Accessibility-Abnahme bleiben separat zu prüfen.

Keine Änderung an `bordeaux/`, grüner Variante, Live-Website, bestehender ALL-INKL-WordPress-Installation, Domain, DNS, SSL, Wix oder bestehenden Workflows. **Kein Merge und keine Veröffentlichung.**
