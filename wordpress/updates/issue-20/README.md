# Issue #20 – einheitlicher Kontakt-Pfeil

## Ursache und begrenzte Änderung

Geprüfte Basis: main `8dc9ddb`. Das Header-Pattern enthält den nativen Absatz/Link `Kontakt <span aria-hidden="true">↗</span>`. In `reference.css` wurde das Unicode-Zeichen ausschließlich bis 600 px durch eine SVG-Maske ersetzt. Ab 601 px blieb die Darstellung dem Systemfont überlassen: Die tatsächliche Form konnte sich zwischen iPhone, iPad und Desktop unterscheiden (einschließlich Emoji-/Ersatzglyphen). Der vorhandene [Desktop-Nachweis aus Issue #18](../../staging/admin-import/evidence/issue-18/desktop.png) zeigt bereits eine Ersatzglyphe. Ein verlässlicher iPad-Safari-Glyphenvergleich ist damit nicht möglich; deshalb wurde die alte und neue Fassung in derselben lokalen WordPress-Umgebung neu aufgenommen.

Child-Theme **0.3.1** verwendet die bereits vorhandene mobile SVG-Pfeilform an allen Breiten, mit `mask` und `-webkit-mask`, in der jeweiligen Textfarbe. Bis 600 px bleiben 14 × 14 px und 6 px Abstand erhalten; darüber 16 × 16 px und die bisherigen 20 px Abstand. Der Link richtet Text und Symbol vertikal mittig aus. Stabile Blockklassen sichern die Darstellung auch beim normalen Link-Editieren. Das gespeicherte Markup wird nicht migriert. Text, Ziel und Bearbeitbarkeit im nativen Website-Editor bleiben erhalten.

Nur Pfeil-CSS, Theme-Version und Cache-Version der geänderten CSS-Datei wurden angepasst. Parent-Theme, Import-Plugin, Datenbankinhalte und statische Vorschauen werden nicht geändert.

## Child-Theme ohne SSH austauschen

1. Vorher über die vorhandene Sicherungsmöglichkeit bei ALL-INKL Dateien und Datenbank sichern. Nicht das Theme löschen und keine Vorlagen zurücksetzen.
2. [andreas-spricht-bordeaux-0.3.1.zip](andreas-spricht-bordeaux-0.3.1.zip) herunterladen (auf GitHub **Download raw file / Rohdatei herunterladen**). Das ZIP enthält ausschließlich das vollständige Child-Theme im gleichnamigen Ordner, keine Inhalte und kein Import-Plugin.
3. Im WordPress-Admin der vorgesehenen Installation **Design → Themes → Theme hinzufügen → Theme hochladen** öffnen. ZIP auswählen und **Jetzt installieren** drücken.
4. In der Vergleichsansicht prüfen: installiertes Child-Theme **Andreas spricht Bordeaux**, hochgeladene Version **0.3.1**, gleicher Theme-Ordner `andreas-spricht-bordeaux`. Dann **Aktuelles durch Hochgeladenes ersetzen** wählen und den Abschluss abwarten. Das aktive Child-Theme bleibt aktiv; Twenty Twenty-Five behalten.
5. **Keinen Import erneut ausführen.** Keine Seiten/Template-Teile importieren oder zurücksetzen. Die im Editor gespeicherten Inhalte bleiben in der Datenbank; der Austausch ersetzt nur Theme-Dateien.
6. Seite neu laden, bei vorhandener Cache-Lösung deren Cache leeren. Die geänderte CSS-Datei hat eine neue Versionskennung. Auf iPhone, iPad (auch quer) und Desktop den Pfeil und Kontakt-Sprung prüfen. Bei ungewöhnlicher Darstellung zunächst frisch laden; der echte iPad-Safari-Vergleich ist die Nutzerabnahme.

Für den Rückfall die vorher gesicherten Child-Theme-Dateien unter demselben Ordner wiederherstellen; keine Datenbank zurücksetzen, um nur diese Darstellungsänderung rückgängig zu machen. Manuelle Änderungen direkt an Child-Theme-Dateien würden bei einem Theme-Austausch ersetzt; die üblichen redaktionellen Editoränderungen sind davon getrennt.

## Lokale Prüfung

Erfolgreich geprüft mit WordPress **7.1.4**, Twenty Twenty-Five **1.5**, PHP **8.4.27** in einem getrennten Compose-Projekt mit eigener Datenbank und eigenen Dateien. Der echte Admin-Austausch von 0.3.0 auf das beigefügte ZIP 0.3.1 wurde ohne erneuten Import durchgeführt. Die Hashes sämtlicher Posts, Post-Metadaten und Template-/Taxonomie-Zuordnungen blieben dabei gleich. Kontakt-Sprung und stabile Blockklassen wurden geprüft. Der vorhandene native Website-Editor-Test hat Header und Footer geändert, gespeichert, neu geladen und auf allen drei Seiten wiederhergestellt: **8 bzw. 10 gültige native Blöcke**, siehe [Editor-Ergebnis](evidence/site-editor-results.json).

Breiten: **320, 390, 600, 601, 768, 820, 1024, 1180 und 1440 px**. Überall SVG-Maske, mittige Ausrichtung (0 px Abweichung), korrekte Größen/Abstände, kein horizontaler Seitenüberlauf. Der mobile Header-Screenshot bei 390 px ist vor und nach dem Update sogar bytegleich (SHA256 `1ecbc3dd02e9b2e6617d8620532979123b0c55c058f4963a981812356adb3ed4`).

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Smartphone, 390 px | [Bild](evidence/before-390.png) | [Bild](evidence/after-390.png) |
| Tablet quer, 1024 px | [Bild](evidence/before-1024.png) | [Bild](evidence/after-1024.png) |
| Desktop, 1440 px | [Bild](evidence/before-1440.png) | [Bild](evidence/after-1440.png) |

[Messwerte und Inhalts-Hashes](evidence/results.json), [ZIP-Manifest](BUILD.json). ZIP-SHA256: `4bdb3eac442a3899985c17eafb9b219d28f839a728b3fa81e5736d868ef0858f`. Alle 17 enthaltenen Dateien stimmen mit den Quellen überein; gegenüber der Basis sind ausschließlich die oben genannten drei Theme-Dateien geändert.

Die Nachweise unter [evidence](evidence/) dokumentieren Chromium, nicht echtes iOS/Safari. WebKit konnte wegen der Download-Sperre der Cloud-Umgebung nicht installiert werden. Die standardisierte SVG-Maske und ihr WebKit-Präfix wurden im Code geprüft; daraus wird kein bestandener Safari-Gerätetest abgeleitet.

Reproduzierbarer fokussierter Test: `NODE_PATH=work/issue-16/tooling/node_modules node wordpress/tests/contact-arrow.cjs`. Er benötigt eine **isolierte lokale** WordPress-Installation mit dem alten Child-Theme 0.3.0 auf `127.0.0.1:8890`, die Compose-Datei `wordpress/tests/contact-arrow.compose.yml` und die ignorierten lokalen Zugangsdaten. Er ersetzt dort das Theme über den nativen Admin und erwartet deshalb beim Start ausdrücklich den alten Stand; nicht gegen Hosting ausführen.

Kein Merge, keine Veröffentlichung und kein Hostingzugriff im Rahmen dieses PR.
