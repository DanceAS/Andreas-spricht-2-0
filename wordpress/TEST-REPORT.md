# Prüfbericht – WordPress Phase 2 / Issue #10

Stand: **2. November 2026 (Europe/Berlin)**. Referenz-main: `bfc8f3022a65a4b294921bb20d85573ee6aba92f`.

## Vereinbart

Vollständige aktuelle Bordeaux-Website als isolierte WordPress-Version auf unverändertem Twenty Twenty-Five; sämtliche redaktionellen Inhalte ohne Code im Gutenberg-Editor bearbeitbar. Tatsächliche Editoränderungen, Speichern, Frontend-/Reload-Nachweis und Wiederherstellung; responsive und funktionale Browserprüfung. Nur Branch und PR. Keine Veröffentlichung oder Hosting-/Domainänderung.

AGENTS.md, gemergter Phase-1-Stand, dessen Anleitung/Prüfbericht und tatsächliche statische HTML-/CSS-/JS-Dateien einschließlich rechtlicher Seiten wurden vor der Umsetzung geprüft. Die bisherigen Phase-1-Dokumente sind als historische Berichte erhalten.

## Umgesetzt

Alle sichtbaren Bereiche: Header/Navigation, Hero, drei Hörproben, Über mich, Bücher, Kontakt/CTA, Footer/Facebook, dazu eigene Impressums- und Datenschutzseiten. Der frühere unbenutzte geschlossene Platzhalterdialog und der veraltete statische Noscript-Hinweis „Audiodateien sind noch nicht hinterlegt“ wurden nicht als aktive Inhalte übernommen.

Die neue Startseite enthält 110 native Blöcke, Impressum 23 und Datenschutz 101. Keine `core/html`-Blöcke, keine eigenen Blocktypen und keine aktiven Zusatzplugins. Texte, Linkziele und Medienzuordnungen liegen in WordPress-Seiteninhalt/Mediathek, nicht im Laufzeit-JavaScript oder in PHP-Templates. Die wenigen JS-/PHP-Ergänzungen betreffen Playerbedienung, bestehende responsive Layoutfunktionen und Darstellungsanpassungen für native Wrapper.

Vier wichtige Umsetzungsdetails wurden praktisch berücksichtigt:

- Native Audio-Blöcke behalten ihre editierbare Medienzuordnung. Der angepasste Player liest die tatsächlichen Audioelemente und die zugehörige Überschrift; er enthält keine fest codierten Hörprobentitel oder Datei-URLs.
- Die beim Link-Editieren möglicherweise entfernten Inline-Klassen sind keine Voraussetzung der Gestaltung mehr. Stabile Blockklassen erhalten CTA-/Amazon-Link-Stile auch nach normalen Editoränderungen.
- Editor-Styles verwenden Alias-Klassen für gespeicherte Anker-IDs: Gutenberg setzt an deren Stelle eigene Client-IDs. Der Frontend-CSS-Stand bleibt die Referenzkopie.
- WordPress-Blocktemplates rufen `wptexturize` auch direkt auf. Der Filter `run_wptexturize` deaktiviert die automatische Interpunktionsänderung im Child-Theme. Dadurch bleibt beispielsweise der originale Bindestrich in „ALL-INKL.COM - Neue Medien Münnich“ erhalten. Keine manuelle rechtliche Umformulierung.

## Technisch überprüft: echter Editor

Playwright bediente den tatsächlich laufenden visuellen WordPress-Editor. Die Inhaltsänderungen erfolgen über sichtbare RichText-Felder, Linkdialoge, Mediathek und native Blockeinstellungen. `wp.data` dient nur dem Lesen von Lade-/Speicherstatus und Blockgültigkeit; keine REST-/SQL-Schreibzugriffe ersetzen die Editor-Nachweise.

| Inhaltstyp | Tatsächlicher Nachweis |
| --- | --- |
| Absatz/Überschrift | Sprecherzeile, Hörprobentitel, Genre/Autor, Über-mich-Einleitung und Buchtitel geändert und gespeichert |
| Bilder | Hero-Porträt und Buchcover über Replace → Mediathek ausgetauscht |
| MP3/Zuordnung | Erste Hörprobe im nativen Audio-Block durch die dritte MP3 ersetzt; im Frontend auch tatsächlich abgespielt |
| Bücher | Titel, Autor und bisher leere Status-/Beschreibungsabsätze geändert; ausgefüllte Zusatzfelder im Frontend sichtbar |
| Links/CTA/Navigation | Beschriftung und URL eines Navigationslinks, Amazon-Links und Kontakt-CTA über den Linkdialog geändert |
| Kontakt/Footer | Kontaktabsatz und Copyright-Absatz geändert |
| Facebook | URL und zugängliche Beschriftung im nativen Social-Link-Block geändert |
| Impressum/Datenschutz | Je ein rechtlicher Absatz geändert; auf beiden Seiten Speichern und Editor-Neuladen geprüft |
| Liste | Datenschutz-Listeneintrag im inneren RichText-Feld geändert |

Für alle genannten Fälle wurden die Änderungen **nach Speichern im Frontend und nach erneutem Öffnen des Editors bestätigt**. Anschließend wurden die Originalwerte über denselben Editor wiederhergestellt. Vorher/nachher und nach dem letzten Listentest erkennt Gutenberg weiterhin **110/23/101 gültige native Blöcke**, ohne ungültige Blöcke.

Originale Phase-2-Mediendateien: vier JPGs und drei MP3s sind bytegleich mit der Referenz. Parent-Dateien stimmen per Hash mit Twenty Twenty-Five im fixierten offiziellen WordPress-Image überein. Der erneute Setup-Aufruf erhält die SHA-256-Werte der drei gespeicherten Seiten unverändert.

## Technisch überprüft: Frontend und Referenz

Linux **Chromium 154.0.8037.57**, anonyme Browserkontexte bei allen geforderten Breiten. Kein echter iOS-Browser.

37 repräsentative Elemente wurden relativ zum Dokument vermessen, darunter Header/Logo/Navigation, Hero-Texte/Bild/Slogan, Hörproben/Player, Über-mich-Bild/Text, Bücher/Cover/Link und Kontakt/Footer. Verglichen wurden x/y/width/height sowie wirksame Schriftgröße, Schriftstärke, Zeilenhöhe, Farbe, Schriftfamilie und Laufweite. Bildfüllung und Bildposition wurden zusätzlich aus den erfassten Browserwerten abgeglichen.

| Breite | Größte gemessene Geometriedifferenz | Horizontaler Überlauf | Funktionsprüfungen |
| --- | ---: | ---: | --- |
| 320 px | 0,094 px | 0 px | bestanden |
| 375 px | 0,094 px | 0 px | bestanden |
| 390 px | 0,094 px | 0 px | bestanden |
| 430 px | 0,094 px | 0 px | bestanden |
| 820 px | 0,016 px | 0 px | bestanden |
| 1024 px | 0 px | 0 px | bestanden |
| 1366 px | 0 px | 0 px | bestanden |
| 1440 px | 0 px | 0 px | bestanden |

Die Subpixelwerte sind Rundungsdifferenzen, kein behaupteter pixelweiser Gesamtbildvergleich. Kein Vergleich überschreitet die 1,1-px-Prüftoleranz; die verglichenen typografischen Werte stimmen überein. Am Footer endet das Dokument innerhalb von weniger als 0,5 px Rundungsdifferenz, ohne zusätzlichen großen Leerraum.

In jedem der acht Fälle außerdem erfolgreich:

- Originaltexte der geprüften Onepager-Bereiche stimmen nach Whitespace-Normalisierung überein.
- **Vollständiger** Impressums-/Datenschutz-Wortlaut stimmt nach Whitespace-Normalisierung überein; die Höhe des jeweiligen rechtlichen Hauptbereichs stimmt ebenfalls mit der Referenz überein. Weiche Trennzeichen und Interpunktion werden nicht aus dem Vergleich entfernt.
- Alle drei Audios ohne Autoplay, jeweils Play/Pause und Positionswechsel auf 50 % mit tatsächlich fortschreitender Wiedergabe und erfolgreichem Seek.
- Vier Header-Anker, rechtliche Links und jeweilige Rücknavigation funktionieren. Footer-Kontakt ist `mailto:kontakt@andreasspricht.de`; Facebook hat die vorgegebene URL, zugängliche Beschriftung und neuen Tab.
- Alle Bilder dekodierbar, keine JavaScript-Laufzeitfehler, kein horizontaler Überlauf auch auf den rechtlichen Seiten.

PHP-/Bash-/Node-Syntax, Compose-Konfiguration und `git diff --check` sind erfolgreich. Die lokale Seite bleibt `noindex`; die geprüfte Basis bleibt WordPress 6.8.3 / Twenty Twenty-Five 1.3 / Web-PHP 8.3.28 / MariaDB 11.4.13, keine Produktionsversions-Empfehlung.

## Screenshots und Daten

Die „EDITORTEST“-Änderungen in den Editor-/Testbildern waren ausschließlich lokal und wurden danach zurückgesetzt.

- [Vollständige wiederhergestellte Startseite – Smartphone](evidence/phase2/home-mobile.png)
- [Vollständige wiederhergestellte Startseite – Desktop](evidence/phase2/home-desktop.png)
- [Gespeicherte Teständerungen im Frontend](evidence/phase2/edited-home.png)
- [Buchangaben nach erneutem Öffnen des Editors](evidence/phase2/editor-book-persisted.png)
- [Impressumsänderung nach Editor-Neuladen](evidence/phase2/editor-impressum-persisted.png)
- [Facebook-Beschriftung nach Editor-Neuladen](evidence/phase2/editor-facebook-persisted.png)
- [Listeneintrag nach Editor-Neuladen](evidence/phase2/editor-list-persisted.png)
- [Wiederhergestelltes Impressum](evidence/phase2/impressum.png)
- [Ausschnitt der wiederhergestellten Datenschutzerklärung](evidence/phase2/datenschutz-excerpt.png)
- [Maschinenlesbare Nachweise, Codehashes und Wiederholbarkeitsprüfung](evidence/phase2/results.json)

Installation, Bedienung, Testbefehle und Deployment-Mindestvoraussetzungen: [README.md](README.md).

## Offen und ausdrücklich nicht nachgewiesen

- **WebKit/Safari/iPhone/iPad:** offizieller Playwright-WebKit-Download scheiterte an der Umgebungs-Netzwerkfreigabe mit HTTP 403 „Domain forbidden“. Keine Umgehung. Viewporttests ersetzen keine echten Safari-/Gerätetests; auch Issue #6 wird dadurch nicht als geräteübergreifend gelöst erklärt.
- **Hosting:** keinerlei Zugriff auf bestehende ALL-INKL-Installation oder Live-Seite, keine Aussage über deren Versionen, Datenbank, Plugins oder Sicherheit. Eigene Hosting-/Editor-Abnahme vor jeder Veröffentlichung bleibt zwingend.
- **Redaktion:** mit lokalem Administratorkonto getestet. Eingeschränkte Redakteursrolle und Upload eines zusätzlichen eigenen Mediums noch nicht praktisch geprüft; Austausch vorhandener Mediathek-Dateien ist geprüft. Seitenweiter Header/Footer-Abgleich ist manuell, keine globale Synchronisierung.
- **Editor-Vorschau:** dynamische mobile Porträtumpositionierung und Textanpassung laufen im Frontend. Die Editor-Listenansicht behält die gespeicherte Reihenfolge; neue Bildmotive müssen im Frontend geprüft werden. Kein visueller Focal-Point-Regler implementiert.
- **Produktion:** aktuelle unterstützte Versionen, HTTPS/Byte-Range/Uploadrechte, fachliche Datenschutzprüfung für WordPress, SEO-Metadaten, vollständige Accessibility- und Geräteabnahme stehen vor einem möglichen Deployment aus. Die vorhandenen Rechtstexte wurden nur unverändert migriert, nicht fachlich neu freigegeben.

**Keine Änderungen an statischer Bordeaux-/grüner Variante, bestehenden Workflows, Live-Website, WordPress bei ALL-INKL, DNS, Domain, SSL oder Wix. Kein Merge und keine Veröffentlichung.**
