> Historischer Stand aus PR #9. Für den aktuellen Phase-2-Stand und seine Tests siehe [README.md](README.md).

# WordPress Phase 1 – isolierter Bordeaux-Prototyp

## Vereinbart

Issue #8: aktuelle statische Referenz prüfen, lokal WordPress mit Twenty Twenty-Five aufsetzen, eine repräsentative Sektion mit nativen Blöcken nachbilden und Text-/Bildänderung im echten Editor nachweisen. Nur Feature-Branch und PR, kein Merge oder Deployment.

Die Bordeaux-Referenz wurde bei `26979db128d6f791fe3666f0a342f3c4632764f0` geprüft: `bordeaux/index.html`, `styles.css`, `hero-image-v2.css`, `fit-sample-intro.js`, `mobile-about-portrait.js`, `studio-content.js`, `sample-content.js`, gemeinsame `app.js`/`content.js` sowie Impressum und Datenschutz mit ihren Stylesheets. Keine dieser Dateien wird verändert. Die bestehende ALL-INKL-WordPress-Installation wurde weder angesprochen noch geprüft. Ihr Zustand bleibt unbekannt.

## Implementiert

- Docker Compose als dokumentierte gleichwertige Alternative zu wp-env: eigenes Projekt, eigene Datenbank und eigenes WordPress-Volume; ausschließlich `127.0.0.1:8890`, keine Domain und kein externer Datenbankport.
- WordPress **6.8.3**, PHP/Apache-Image mit PHP **8.3.28**, MariaDB **11.4**, mitgeliefertes Twenty Twenty-Five **1.3**; Container-Images durch SHA-256-Digests fixiert. Das ist eine reproduzierbare **Testbasis**, keine Empfehlung für einen späteren Produktionsversionsstand. Vor einer späteren Migration aktuelle unterstützte Versionen wählen und erneut testen.
- Minimales Child-Theme `andreas-spricht-bordeaux`, ohne Parent-Änderungen, Pagebuilder oder aktive Zusatzplugins. Keine neuen Blocktypen, keine Shortcodes, kein Frontend-JavaScript. Compose wurde gewählt, weil Docker hier verfügbar ist und die offiziellen WordPress-Images Parent-Theme und Laufzeit mitbringen; keine SQLite-/Datenbank-Erweiterung nötig.
- Der Hero einschließlich Sprecherzeile, Überschrift, Einleitung, Button, Porträt, Slogan und Abschlusszeile besteht aus **13 nativen Gutenberg-Blöcken**: Group, Paragraph, Heading, Buttons, Button und Image. Keine Custom-HTML-Blöcke, keine Sperren, kein in PHP/CSS generierter Website-Text.
- Inhalte liegen nach dem einmaligen Seed in `post_content` und der Mediathek. `content/hero.html` ist nur der initiale Ausgangsinhalt; spätere Editoränderungen benötigen keine Dateiänderung. Der Seed überschreibt vorhandenen Seiteninhalt bei erneutem Start nicht.
- `theme.json` definiert Bordeaux/Creme/Rosé und Schriftfamilien. `prototype.css` gestaltet ausschließlich `.as-prototype`; dieselbe CSS-Datei wird im Editor geladen. Editor-spezifische Anpassung füllt Gutenbergs zusätzlichen Bild-Wrapper aus. Die responsiven Bildausschnitte folgen der statischen Referenz; insbesondere greift mobil die effektive 340-px-Bogenhöhe.
- Beide vorhandenen Porträts werden aus lokalen, unveränderten Quellen in die isolierte Mediathek importiert. WordPress erzeugt seine üblichen verkleinerten Bildvarianten; Originaldateien bleiben erhalten und sind bytegleich. Der Bildblock nutzt die normale WordPress-Medien-URL, keine fest codierte Live-URL.
- Lokales `noindex`, externe WordPress-HTTP-Aufrufe und Cron deaktiviert, PHP-Dateieditor deaktiviert. Keine Hosting-Zugangsdaten. Zufällige lokale Zugangsdaten ausschließlich in ignorierter `.env`.

**Begrenzung:** Nur der Hero ist umgesetzt. Kein Header, keine Navigation, keine weiteren Startseitenabschnitte, kein Footer und keine rechtlichen Seiten in WordPress. Die originalen Hero-Links auf `#hoerproben` sind als editierbare Links erhalten; ihr Zielabschnitt existiert in Phase 1 noch nicht. Der Prototyp ist deshalb ausdrücklich keine vollständige oder veröffentlichungsfähige Website.

## Lokal installieren und öffnen

Voraussetzungen: Git-Checkout dieses Branches, Docker Engine mit Compose v2 (`--wait` unterstützt), Bash und Python 3. Für die automatisierten Browsertests zusätzlich Node.js, Playwright und Chromium. Besucher der späteren Website benötigen diese Werkzeuge nicht.

Aus der Repository-Wurzel:

```sh
./wordpress/setup.sh
```

Der erste Start lädt die drei fixierten offiziellen Images, erzeugt die isolierten Volumes und installiert die lokale Website. Die Bilder werden in `.local-assets/` kopiert, damit Container sie trotz restriktiver Workspace-Dateirechte lesen können. Referenzdateien bleiben unverändert. Das Skript setzt nur Lese-/Verzeichnisrechte auf seinen eigenen Theme-/Bootstrap-Dateien und Bildkopien; `.env` bleibt privat (0600).

- Frontend: <http://127.0.0.1:8890/>
- Verwaltung: <http://127.0.0.1:8890/wp-admin/>
- Zugang: `WP_ADMIN_USER` und `WP_ADMIN_PASSWORD` in der **lokalen** Datei `wordpress/.env`. Datei nicht committen, verschicken oder in Screenshots zeigen.
- Im Backend **Seiten → Bordeaux – Phase 1 → Bearbeiten** wählen. Die englische Editor-Oberfläche der fixierten Basis ist hier praktisch getestet. Deutsche Sprachpakete werden nicht heimlich nachinstalliert; alle Website-Texte sind deutsch.

`127.0.0.1` bezeichnet den Rechner, auf dem Docker läuft, und ist **kein öffentlicher Vorschau-Link für das iPad**. Es wurde keine Portfreigabe oder öffentliche Cloud-Vorschau eingerichtet. Für eine spätere gemeinsame Vorschau erst eine getrennte Testumgebung und ihren Zugang vereinbaren; keine bestehende Domain umhängen.

Ein erneuter Aufruf von `setup.sh` erhält Seiteninhalt, Mediathek und Datenbank. `.env` und Volumes zusammen aufbewahren: neue Zugangsdaten in einer neu erzeugten `.env` passen nicht automatisch zu einer bereits vorhandenen Datenbank.

Stoppen/erneut starten:

```sh
cd wordpress
docker compose stop
docker compose up -d --wait wordpress
```

Vollständiges Entfernen **nur dieser lokalen Testdaten** ist optional und löscht Editoränderungen und Medien:

```sh
cd wordpress
docker compose down --volumes
```

Danach erstellt `setup.sh` mit der erhaltenen `.env` einen frischen Prototyp. Keinen dieser Schritte in einem Hosting-/Produktionsverzeichnis ausführen.

## Selbst Text und Bild bearbeiten

1. Im visuellen Seiteneditor die Sprecherzeile oder einen anderen Textblock anklicken und schreiben; **Save/Speichern** drücken.
2. Für das Porträt gegebenenfalls über **Document Overview/List View** den Block **Group → Image** auswählen. In dessen Werkzeugleiste **Replace → Open Media Library → Media Library** wählen, ein Bild anklicken und **Select** drücken. Alternativ im Medienfenster ein eigenes Bild hochladen; das lokale PHP-Limit beträgt 32 MB. Der Upload eines weiteren Bildes wurde in Phase 1 nicht automatisiert nachgewiesen, der Wechsel zwischen vorhandenen Medien schon.
3. Alternativtext im Bildblock bearbeiten; danach speichern und Frontend neu laden. Das Motiv wird proportional innerhalb der unveränderten Bogenfläche beschnitten.
4. Kein Code-Editor und keine Dateiänderung sind für diese Inhaltsänderungen nötig. Bogenmaße und geräteabhängige Bildposition sind derzeit Präsentations-CSS; eine redaktionelle Bildausschnitt-Steuerung ist eine offene Folgeentscheidung.

## Technisch überprüft

Siehe [Prüfbericht](TEST-REPORT-PHASE-1.md) und [kompakten maschinenlesbaren Nachweis](evidence/results.json). Die dortigen Aussagen trennen tatsächliche Editor-/Frontend-Tests von offenen Folgeaufgaben.

Read-only Laufzeit-/Block-/Originaldateiprüfung:

```sh
docker compose -f wordpress/compose.yml exec -T wordpress php /prototype/verify.php
```

Automatisierter echter Editor-Test (ändert nur die lokale Testseite und stellt die Originalinhalte danach über denselben Editor wieder her):

```sh
node wordpress/tests/editor.cjs
```

Referenzvergleich, acht Breiten, ohne Zugriff auf Live-Domains:

```sh
node wordpress/tests/responsive.cjs
```

Die beiden Browsertests nacheinander ausführen, da der Editor-Test vorübergehend den lokalen Seiteninhalt ändert. Sie setzen bereits verfügbares `playwright` und Chromium voraus. Bei Bedarf in einer eigenen Entwicklungsumgebung lokal `npm install --no-save --package-lock=false playwright`; für einen anderen Chromium-Pfad `CHROMIUM_PATH` setzen. Die Repository-Abhängigkeiten und die bestehende statische Vorschau werden dafür nicht geändert. Rohdaten und weitere Screenshots entstehen ausschließlich in `work/issue-8/`.

## Offene Fragen und weitere Phasen

1. **Phase-1-Abnahme:** Hero-Look, native Bearbeitung und Child-Theme-Ansatz prüfen. Der hier ausdrücklich beauftragte minimale Ansatz fügt keine Plugins hinzu. Erweiterungen oder ein anderer Architekturansatz bedürfen vorheriger Begründung und Zustimmung.
2. **Versionen/Redaktion:** aktuelle unterstützte WordPress-/Twenty-Twenty-Five-/PHP-Versionen für eine spätere Zielumgebung festlegen; deutsche Backend-Sprache und gewünschte Redakteursrolle vereinbaren. Der aktuelle Nachweis wurde mit lokalem Admin durchgeführt, nicht mit einem eingeschränkten Redakteurskonto.
3. **Weitere native Abschnitte:** Hörproben mit Core Audio (statt gemeinsamem statischem JS), Über mich mit Bild-/Absatzblöcken und mobiler Reihenfolge, Bücher als Gruppen mit Image/Heading/Paragraph/Buttons. Für jeden Inhalt Editoränderung und Frontend erneut praktisch nachweisen. Keine zusätzliche Inhaltsverwaltung oder Plugins ohne Zustimmung.
4. **Header/Footer:** Logo, Navigation, Facebook und Kontakt mit nativen Navigation-/Site-/Group-/Buttons-Blöcken und Template-Parts; responsive Kontrolle und Tastaturbedienung. Linkziele erst mit echten WordPress-Seiten und Ankern verbinden.
5. **Rechtliche Seiten:** vorhandenes Impressum und vollständige Datenschutzerklärung aus der Referenz zunächst in ihrer Quelle belassen. In einer späteren Phase als native Textblöcke übernehmen und für die tatsächliche WordPress-/Hosting-Konfiguration prüfen lassen; WordPress-, Medien-, Cookie- und etwaige Plugin-Dienste können gegenüber der statischen Seite abweichen. In Phase 1 keine Rechtstexte ergänzt oder umgeschrieben.
6. **Vollständige isolierte Abnahme:** alle Medien/Audios, Links, SEO, Accessibility, Ladezeit, Editorrollen und echte Safari-/iPhone-/iPad-Tests. Chromium-Viewporttests sind kein Safari-Nachweis. Die offene Safari-Diagnose aus Issue #6 wird durch diesen Prototyp nicht als gelöst erklärt.
7. **Spätere Hosting-Prüfung separat freigeben:** Zustand der existierenden ALL-INKL-WordPress-Installation, Datenbank, Plugins, Versionen, Backups und Erreichbarkeit erst nach gesonderter Erlaubnis prüfen. Bisher keinerlei Zugriff. Migration, DNS/SSL/Domainzuweisung und Live-Umschaltung sind nicht Teil dieses PR und benötigen eine eigene Freigabe mit Rückfallplan.

Die funktionierende lokale Sektion belegt den Ansatz und die Bearbeitbarkeit **dieser Sektion**, nicht die Fertigstellung der gesamten WordPress-Website.
