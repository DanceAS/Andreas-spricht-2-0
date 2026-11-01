# Phase-1-Prüfbericht zu Issue #8

Datum: 2026-11-01. Referenz-main: `26979db128d6f791fe3666f0a342f3c4632764f0`.

## Nachgewiesen

| Prüfung | Tatsächlich geprüftes Ergebnis |
| --- | --- |
| Isolierte Installation | Eigener Compose-Projektname, Datenbank und WordPress-Volume; HTTP ausschließlich an 127.0.0.1:8890 gebunden |
| WordPress/Parent | WordPress 6.8.3, Twenty Twenty-Five 1.3, PHP 8.3.28 (Web-/Prüfcontainer); MariaDB-Image 11.4.13 |
| Parent unverändert | Alle Parent-Dateihashes stimmen mit dem unveränderten Parent im offiziellen, fixierten WordPress-Image überein |
| Plugins | Null aktive Zusatzplugins; keine zusätzlichen Blocktypen oder Pagebuilder |
| Native Inhalte | 13 rekursiv geprüfte `core/*`-Blöcke, kein `core/html`; Gutenberg erkennt alle Blöcke vor und nach Speichern als gültig |
| Text über Editor geändert | Sprecherzeile per sichtbarem Rich-Text-Feld um „– EDITORTEST“ ergänzt, über Save gespeichert |
| Bild über Editor geändert | Bildblock ausgewählt; Replace → Open Media Library → Media Library; vorhandenes zweites Porträt gewählt und gespeichert |
| Speichereffekt | Geänderter Text und Bild-URL danach im Frontend nachgewiesen, Bild dekodiert; nach Editor-Neuladen ebenfalls vorhanden |
| Wiederherstellung | Ursprüngliche Sprecherzeile und ursprüngliches Hero-Porträt über dieselbe Editor-Oberfläche wiederhergestellt und gespeichert |
| Bild im Editor | Nach Reload deckt das Bild die komplette Bogenhöhe ab, einschließlich Gutenberg-Wrapper |
| Originalmedien | In WordPress aufbewahrte Original-JPGs stimmen bytegleich mit den Referenzdateien überein; normale WordPress-Bildvarianten zusätzlich vorhanden |
| Responsivität | Vergleich mit echter lokaler statischer Referenz bei 320, 375, 390, 430, 820, 1024, 1366 und 1440 px |
| Gemessene Designkonsistenz | Bei Überschrift, Einleitung, Sprecherzeile, Bildcontainer, Bild und Slogan: relative x/y/width/height in allen acht Fällen identisch (maximale gemessene Differenz 0 px). Ausgewählte wirksame Schriftwerte/Farben, Bogenradius, object-fit und object-position stimmen überein |
| Kein horizontaler Überlauf | In allen acht anonymen WordPress-Frontend-Viewports 0 px |
| Seed nicht destruktiv | Erneuter setup.sh-Aufruf erhält den SHA-256 des gespeicherten Seiteninhalts unverändert |
| Indexierung | Lokales Frontend liefert `<meta name='robots' content='noindex, nofollow' />` |
| Syntax/Konfiguration | PHP-Lint für Theme/Seed/Verifikation, Bash-Syntax, Node-Syntax, Compose-Konfiguration und git diff --check erfolgreich |
| Statische Referenz | Keine Änderungen an Bordeaux, grüner Variante, gemeinsamen Frontend-Dateien oder Deployment-Workflows |

Der echte visuelle Editor wurde mit Playwright bedient. `wp.data` wird im Test ausschließlich zum Lesen des Lade-/Speicherzustands und der Blockgültigkeit verwendet. Die nachgewiesenen Text- und Bildänderungen erfolgen über sichtbare Editorfelder und Medienauswahl, nicht per REST-/SQL-Schreibzugriff oder als Dateiänderung. Die erste Erstellung des Startinhalts erfolgt separat über das dokumentierte lokale Seed-Skript.

## Bildnachweise

Die Teständerungen in den folgenden zwei Bildern existierten nur lokal und wurden anschließend zurückgesetzt:

- [Editor nach Speichern und erneutem Öffnen: geänderte Sprecherzeile und zweites Porträt](evidence/editor-persisted.png)
- [Frontend mit denselben gespeicherten Teständerungen](evidence/edited-frontend.png)
- [Wiederhergestellter Hero bei 390 px](evidence/hero-mobile.png)
- [Wiederhergestellter Hero bei 1440 px](evidence/hero-desktop.png)

[Kompakter JSON-Nachweis mit Codehashes](evidence/results.json). Weitere Rohdaten und Referenz-Screenshots erzeugt der lokale Test in `work/issue-8/`. Screenshots des Heroes sind Ausschnitte dieser Sektion; der fehlende Header ist Bestandteil der ausdrücklich begrenzten Phase 1.

## Grenzen und offene Nachweise

- Kein echter iPhone-/iPad-/Safari- oder WebKit-Test. Desktop-Chromium mit verschiedenen Viewports ersetzt diese Geräte nicht.
- Der geometrische Vergleich betrifft die genannten sechs Elemente. Kein pixelweiser Vergleich der gesamten Website; native Button- und Abschlusslink-Markups sind ein Phase-1-Prototyp, kein Nachweis vollständiger Deckung aller Details.
- Keine übrigen Abschnitte, Hörproben, Bücher, Navigation, Footer oder rechtlichen WordPress-Seiten migriert. Die beiden Hero-Anker zeigen noch auf einen in WordPress nicht umgesetzten Abschnitt.
- Mediathekwechsel und Speichern getestet; Upload eines weiteren eigenen Bildes und eingeschränkte Redakteursrolle noch nicht getestet. Das lokale Uploadlimit wurde auf 32 MB gesetzt.
- Der Editor läuft in der englischen Sprache der fixierten Testinstallation. Website-Inhalte sind deutsch; deutsche Backend-Sprachpakete sind offen.
- Festgehaltene Versionen dienen der reproduzierbaren lokalen Basis. Produktionsaktualität, Hosting-Sicherheit, SEO, Cookie-/Datenschutzkonfiguration und vollständige Barrierefreiheit sind nicht abgenommen.
- WordPress-Updateabfragen können im abgeschotteten lokalen Betrieb Warnungen zur nicht erreichbaren WordPress.org-Verbindung melden. Externe WP-HTTP-Aufrufe sind bewusst blockiert; es wird keine unsichere TLS-Konfiguration verwendet.
- Keine Aussage über die unberührte ALL-INKL-Installation, keine Remote-/Domain-/SSL-/DNS-Prüfung. Keine Veröffentlichung und kein Merge.

Die vereinbarte Phase-1-Bearbeitbarkeit des Hero-Prototyps ist implementiert und praktisch nachgewiesen. Die komplette WordPress-Umsetzung ist weiterhin offen. Nächste Schritte und nötige Folgeentscheidungen stehen in [README.md](README.md).
