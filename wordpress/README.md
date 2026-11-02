# Bordeaux in WordPress – zentrale Header/Footer

## Vereinbart

Issue #12 ergänzt die vollständige lokale Migration aus PR #11 um zentrale Template-Teile. Referenz: `bordeaux/` auf main `502644c` (unverändert). Verbindlich: Twenty Twenty-Five als unveränderter Parent, kein Pagebuilder, alle redaktionellen Inhalte in nativen Gutenberg-Blöcken und der Mediathek. Nur Feature-Branch und PR, kein Merge oder Deployment. Bestehende statische Website und angefangene ALL-INKL-WordPress-Installation bleiben unberührt.

## Umgesetzt

- Vollständiger Header mit zweizeiligem Schriftlogo und Anker-Navigation, Hero, drei Hörproben, Über mich mit mobiler Bildreihenfolge, beide Buchkarten, Kontakt, Footer/Facebook.
- Impressum und vollständige Datenschutzerklärung als eigene WordPress-Seiten; bestehender Wortlaut übernommen, keine eigenmächtigen rechtlichen Ergänzungen.
- Ausschließlich native `core/group`, `core/paragraph`, `core/heading`, `core/image`, `core/audio`, `core/social-links`, `core/social-link`, `core/list` und `core/list-item`. Keine Custom-HTML-Blöcke, Shortcodes oder eigenen Blocktypen. Header und Footer sind jetzt zentrale `wp_template_part`-Einträge des Child-Themes. Alle drei Seiten verwenden dieselben Teile; einmal im Website-Editor speichern wirkt überall. Die Inhalte bleiben native Blöcke. Native HTML-Patterns liefern Rücksetz-Defaults mit über WordPress aufgelösten URLs, keine redaktionellen PHP-/JS-Texte.
- MP3s und vier Originalbilder lokal importiert. WordPress bewahrt die Originalbilder auf und erzeugt übliche verkleinerte Varianten. Die Audio-Zuordnung steckt im nativen Audio-Block innerhalb der jeweiligen Hörprobengruppe; Titel und Genre/Autor stehen direkt daneben. Kein Titel, Autor, Buchlink oder MP3-Pfad ist im Laufzeit-JavaScript verdrahtet.
- Das Child-Theme erweitert nur die Darstellung: `reference.css` ist eine gescopte Kopie der vorhandenen Referenz-Styles, `blocks.css` passt Gutenberg-Wrapper an. Der visuelle Editor erhält dieselben Styles mit Klassen-Aliasen für die gespeicherten Anker-IDs, weil Gutenberg im Editor eigene Block-IDs verwendet. Layoutskripte übernehmen unverändert die vorhandene mobile Textanpassung und Porträtumpositionierung. `player.js` ergänzt native Audio-Blöcke um die bestehende Play/Pause-/Seek-Gestaltung. Ohne JavaScript bleiben die nativen HTML5-Audiosteuerungen nutzbar. Diese kleine, begründete Darstellungs-Ergänzung braucht weder Plugin noch eigenen Blocktyp.
- Link-Gestaltung bindet an stabile Blockklassen an: WordPress darf beim normalen Link-Editieren zusätzliche Klassen am eingebetteten `<a>` entfernen, ohne dass der Kontaktbutton oder Amazon-Link sein Aussehen verliert.
- Die beiden optionalen Buchfelder „Buchstatus“ und „Buchbeschreibung“ sind benannte, zunächst leere Absatzblöcke. Leere Felder bleiben im Frontend unsichtbar; es wurden keine neuen Buchangaben erfunden. Die vorhandenen Rubriken/Beschriftungen sind ebenfalls native editierbare Blöcke.

## Lokal starten

Die bereits vereinbarte isolierte Docker-Compose-Umgebung bleibt erhalten: eigenes Projekt `andreas-spricht-phase1`, eigene Volumes und Datenbank, nur Loopback-Port **127.0.0.1:8890**. Keine Verbindung zu ALL-INKL. Container-Images bleiben durch Digests fixiert; getestete Basis: WordPress 6.8.3, Twenty Twenty-Five 1.3, Web-PHP 8.3.28 und MariaDB 11.4.13. Das ist ein reproduzierbarer Teststand, keine Produktionsversions-Empfehlung.

Voraussetzungen: Docker mit Compose v2, Bash, Python 3. Aus der Repository-Wurzel:

```sh
./wordpress/setup.sh
```

Bei einer frischen Installation werden **neue** Seiten und anschließend automatisch die zentralen Template-Teile angelegt. Die gespeicherte Phase-1-Seite bleibt erhalten; die neue vollständige Seite wird zur lokalen Startseite. Wiederholte Aufrufe überschreiben keine gespeicherten Phase-1-/Phase-2-Texte, Medienzuordnungen oder Links. Die gesetzte Seed-Markierung nicht löschen, um erneut Inhalte einzuspielen: stattdessen im Editor arbeiten. Eine frische Datenbank erzeugt reproduzierbare Ausgangsinhalte. Bei einer bereits vorhandenen Phase-2-Installation erfolgt dagegen **keine automatische Umstellung**: Setup meldet den Prüfbedarf und rendert bis zur ausdrücklich angewandten Migration weiter die bisherigen Seiten ohne zusätzliche Header/Footer. Siehe [sichere Migration](#bestehende-lokale-installation-sicher-umstellen).

- Frontend: <http://127.0.0.1:8890/>
- Editor: <http://127.0.0.1:8890/wp-admin/>, dann **Seiten → Andreas spricht / Impressum / Datenschutzerklärung → Bearbeiten**.
- Zugangsdaten ausschließlich in der ignorierten Datei `wordpress/.env`; nicht committen oder weitergeben.
- Rechtliche Links verwenden die von WordPress ermittelten Seiten-URLs, aktuell `?page_id=…`. Keine GitHub-Pages-Basis oder Live-Domain ist als Ziel fest eingebaut.
- `127.0.0.1` ist der Docker-Rechner, **kein öffentlicher iPad-Vorschau-Link**. Es wurde nichts öffentlich freigegeben.

Stoppen bzw. starten, aus `wordpress/`:

```sh
docker compose stop
docker compose up -d --wait wordpress
```

Optionales vollständiges Zurücksetzen **nur der isolierten lokalen Datenbank und Medien** löscht sämtliche dortigen Editoränderungen:

```sh
cd wordpress
docker compose down --volumes
./setup.sh
```

`.env` und vorhandene Volumes zusammen behalten. Neue Passwörter in einer neu angelegten `.env` ändern nicht die Passwörter einer bereits vorhandenen Datenbank. Die Quelldateien und disposable Medienkopien erhalten nur die für die Container benötigten Leserechte; `.env` bleibt 0600.

## Ohne Code bearbeiten

Im visuellen Seiteneditor über **Document Overview / List View** die Gruppe oder den Inhalt auswählen. Die Website ist auf `de_DE` eingestellt. Ohne zusätzliche Sprachpakete bleibt die hier getestete Backend-Oberfläche Englisch; die Website-Texte sind Deutsch. Es werden keine Sprachpakete extern nachgeladen.

| Inhalt | Bedienung |
| --- | --- |
| Texte/Überschriften/Genre/Autor/Signatur/Copyright | Entsprechenden Textblock anklicken, schreiben und Save drücken. Gewünschte feste Zeilenumbrüche mit Shift+Enter setzen. |
| Logo, Header-Navigation | Im **Website-Editor** den zentralen Header öffnen, Text/Link bearbeiten und speichern; zweizeiligen Logo-Umbruch behalten. |
| Amazon-Links und Kontakt-CTA im Seiteninhalt | Link direkt anklicken → Edit link → Text/Link ändern → kleines Save, anschließend Seite speichern. Der CTA bleibt ein echter `mailto:`-Link, kein Versandformular. |
| Fotos/Cover | Image-Block auswählen → Replace → Open Media Library → Media Library → Bild → Select. Alternativ hochladen (lokales Limit 32 MB). Alt-Text im Bildblock bearbeiten. Der Austausch vorhandener Medien ist praktisch getestet; der Upload eines zusätzlichen eigenen Mediums ist separat zu prüfen. |
| Hörprobe/MP3 | In der betreffenden Hörprobengruppe den nativen Audio-Block auswählen → Replace → Open Media Library → gewünschte MP3 → Select. Direkt daneben Titel und Genre/Autor bearbeiten. Kein Code erforderlich. |
| Hörprobenreihenfolge | Komplette Hörprobengruppe verschieben, damit Beschriftung und Audio zusammenbleiben. Die sichtbare Nummer ist ein normaler Absatz und muss beim Umordnen mit angepasst werden. |
| Bücher | Titel, Autor und Link direkt bearbeiten, Cover als Image-Block ersetzen. Optionale benannte Status-/Beschreibungsabsätze ausfüllen; leere Absätze bleiben verborgen. |
| Footer/Copyright/Rechtslinks | Im **Website-Editor** den zentralen Footer öffnen und Absatz oder Link bearbeiten. |
| Facebook | Im zentralen Footer den nativen Social Icon auswählen, URL im Linkfeld und zugängliche Beschriftung im Textfeld bearbeiten. Neue-Tab-Einstellung liegt am übergeordneten Social Icons-Block. |
| Impressum/Datenschutz | Jeweilige Seite öffnen; Überschriften, Absätze, Listen und Links sind native Blöcke. Rechtstexte nur mit fachlich freigegebenem Inhalt ändern. |

Header/Footer sind zentral gespeichert. Direkte, getestete Zugänge zum nativen Website-Editor:

- [Header bearbeiten](http://127.0.0.1:8890/wp-admin/site-editor.php?postId=andreas-spricht-bordeaux%2F%2Fheader&postType=wp_template_part&canvas=edit)
- [Footer bearbeiten](http://127.0.0.1:8890/wp-admin/site-editor.php?postId=andreas-spricht-bordeaux%2F%2Ffooter&postType=wp_template_part&canvas=edit)

Alternativ **Appearance/Design → Editor → Patterns/Vorlagen → Template-Teile → Header oder Footer**. Save gegebenenfalls im Prüfpanel nochmals bestätigen. Alle drei Seiten neu laden. Nicht in jeder Seite eigene Header/Footer einfügen. **Zurücksetzen** verwirft bewusst eigene Anpassungen und lädt die versionierten nativen Defaults; normales Setup setzt nichts zurück. Ankerlinks im Header müssen auf die Startseite plus Anker zeigen, nicht nur auf einen lokalen Fragmentnamen der rechtlichen Seite.

 Die mobile Porträt-Umpositionierung und das dynamische Einpassen des Hörproben-Einleitungssatzes laufen im Frontend; die Editor-Listenansicht behält die gespeicherte Grundreihenfolge. Für die tatsächliche mobile Darstellung die Frontend-Vorschau prüfen. Die geräteabhängige Bogenform und die exakten Bildpositionen sind Präsentations-CSS; ein visueller Focal-Point-Regler ist nicht implementiert. Das ist kein Hindernis zum Austauschen der Bilddatei, muss aber bei einem neuen Motiv praktisch geprüft werden. Neue Bücher/Hörprobengruppen können als bestehende native Gruppe dupliziert und danach angepasst werden; alle vier Bilder und drei Audios sind bereits in der lokalen Mediathek.

## Tests und Nachweise

[Prüfbericht](TEST-REPORT.md), [maschinenlesbare Nachweise](evidence/shared-parts/results.json) und verlinkte Screenshots. Historische Phase 2: [Prüfbericht](TEST-REPORT-PHASE-2.md); die dortigen Tests beziehen sich auf den damaligen Seitenaufbau. Historische Phase 1: [Anleitung](PHASE-1.md), [Prüfbericht](TEST-REPORT-PHASE-1.md).

```sh
# Nur lesende native Block-/Medien-/Parent-Prüfung
docker compose -f wordpress/compose.yml exec -T wordpress php /prototype/verify.php
# Echte Editoränderungen und Wiederherstellung, nur lokal
node wordpress/tests/site-editor-shared.cjs
# Vollständiger Browser-/Referenztest bei acht Breiten
node wordpress/tests/shared-site.cjs
```

Browsertests benötigen Node.js, Playwright und Chromium. Bei Bedarf separat lokal `npm install --no-save --package-lock=false playwright`; `CHROMIUM_PATH` für einen anderen Chromium-Pfad setzen. Für eine Umgebung mit installiertem Playwright-WebKit: `BROWSER=webkit node wordpress/tests/shared-site.cjs`. Tests nacheinander ausführen: der Editor-Test verändert vorübergehend den lokalen Seiteninhalt. Bei einem Testabbruch die betroffenen lokalen Teständerungen im Editor zurücksetzen bzw. eine frische isolierte Umgebung verwenden. Rohdaten entstehen unter `work/issue-12/`, nicht im Deployment.

Die initialen Gutenberg-Dateien und die CSS-Referenzkopie können bei einer bewusst geplanten erneuten Referenzübernahme mit `python3 wordpress/tools/build-content.py` erzeugt werden (Python-Standardbibliothek). Das überschreibt nur versionierte Seed-/Präsentationsdateien, **keine WordPress-Editorinhalte**. Nicht als Aktualisierungsmechanismus für redaktionelle Änderungen verwenden.

## Bestehende lokale Installation sicher umstellen

Der Migrationshelfer ist absichtlich auf die isolierte URL `http://127.0.0.1:8890` beschränkt. **Nicht auf ALL-INKL ausführen.** Er verarbeitet genau die drei in `as_phase2_pages` erfassten Seiten. Andere Inhalte werden nicht automatisch bereinigt.

1. Während der kurzen Umstellung nicht gleichzeitig in WordPress editieren. Zuerst den rein lesenden Plan aufrufen:

```sh
docker compose -f wordpress/compose.yml run --rm -T cli wp eval-file /prototype/migrate-shared-parts.php plan
```

2. Der Plan enthält alle bisherigen Header-/Footer-Varianten, ihre Herkunft, Seiten-/Inhaltshashes und `review_sha256`. **Die aktuelle Startseite wird kanonisch übernommen, einschließlich dortiger Editoränderungen.** Die bisher verkürzten rechtlichen Varianten unterscheiden sich erwartungsgemäß. Dortige zusätzliche eigene Änderungen vorab in der Quelle zusammenführen und danach erneut planen, oder die Migration abbrechen. Es gibt keinen automatischen Textmerge. Vorhandene eigene Template-Teile, gespeicherte Template-Overrides oder abweichende Seiten-Template-Zuweisungen blockieren die Migration, statt sie zu überschreiben.

3. Nur den tatsächlich geprüften Plan anwenden; `PRUEFWERT_AUS_DEM_PLAN` durch dessen 64-stelligen Wert ersetzen:

```sh
docker compose -f wordpress/compose.yml run --rm -T cli wp eval-file /prototype/migrate-shared-parts.php apply PRUEFWERT_AUS_DEM_PLAN
```

Ein falscher oder nach weiteren Editoränderungen veralteter Hash wird abgewiesen. In einer InnoDB-Transaktion werden zwei native Teile angelegt, eingebettete Header/Footer aus den Seiten entfernt und die aktive Migrationsmarkierung gesetzt. Alle übrigen Blöcke bleiben erhalten. Die Sicherung enthält die **vollständigen ursprünglichen Seiten inklusive sämtlicher Varianten** und liegt unter der ausgegebenen `backup_option` in dieser lokalen Datenbank. Kein Backup wird ins Repository geschrieben. Das ersetzt kein vollständiges Datenbank-/Uploads-Backup vor einem späteren Hosting-Wechsel.

4. Auf allen drei Seiten genau einen Header und Footer, Navigation und rechtliche Links prüfen. Anschließend Header/Footer ausschließlich im Website-Editor bearbeiten. Setup erneut auszuführen erhält sowohl Seiten- als auch Template-Teil-Änderungen.

Status und Sicherungskennung lesen:

```sh
docker compose -f wordpress/compose.yml run --rm -T cli wp option get as_shared_parts_v1 --format=json
```

Die Sicherung bei Bedarf mit `wp option get SICHERUNGSOPTION --format=json` exportieren, lokal privat aufbewahren und nicht committen. Eine automatische Rücknahme ist nur möglich, solange weder Seiten noch Teile seit der Migration geändert wurden:

```sh
docker compose -f wordpress/compose.yml run --rm -T cli wp eval-file /prototype/migrate-shared-parts.php rollback
```

Bei späteren Änderungen wird der automatische Rückbau verweigert; dann aktuelle Inhalte mit der Sicherung manuell abgleichen. Sicherungen bleiben auch nach einem Rückbau erhalten. Fehlgeschlagene Transaktionen werden vollständig zurückgerollt. Custom-Templates und ungewöhnliche Seitenstrukturen erst prüfen, nicht per erzwungenem Setup übergehen.

**Beabsichtigter Unterschied zu den alten rechtlichen Seiten:** Sie zeigen jetzt dieselbe vollständige Navigation und denselben Footer samt Facebook und Rechtslinks wie die Startseite. Logo/Anker führen stets zur Startseite. Impressums-/Datenschutz-Hauptinhalt, Gestaltung und Abstände werden nicht umgeschrieben. Die alten kürzeren Bereiche sind in der Sicherung nachvollziehbar.

## Mindestvoraussetzungen vor einem späteren Deployment

Noch **keine** Freigabe zur Veröffentlichung. Separat erforderlich:

1. Aktuelle unterstützte WordPress-/PHP-/Datenbankversion und passendes Twenty Twenty-Five festlegen; auf diesem Stand alle Editor- und Frontendtests wiederholen. Testdaten/Benutzer und lokale Sperr-/Debugkonfiguration nicht ungeprüft übernehmen.
2. Erst nach eigener Erlaubnis bestehende ALL-INKL-Installation, Datenbank, Plugins, Zugriffsrechte und Backups prüfen. Ihr Zustand ist weiterhin unbekannt. Keine Annahme, dass der lokale Stand dort bereits funktioniert.
3. Getrennte Hosting-Testumgebung mit HTTPS und funktionierenden Medien-/Byte-Range-Antworten; Uploadlimits für Originalbilder/MP3s sowie Speicher-, PHP- und Datenbankrechte prüfen. Es gibt keine Hosting-Zugangsdaten oder Deployment-Automatik in diesem PR.
4. Standardmäßige WordPress-Migration von Datenbank, Uploads und Child-Theme planen; URLs/Seitenverweise fachgerecht an die genehmigte Test-URL anpassen. WordPress, Parent-Theme und Uploads dürfen nicht allein durch Kopieren dieses Child-Themes ersetzt werden.
5. Auf dem echten Hosting Texte, Bilder, MP3s, Cover, Status, Beschreibung, Links und rechtliche Seiten im Editor ändern/speichern und Frontend prüfen; eingeschränkte Redakteursrolle separat testen.
6. Echter Safari-/iPhone-/iPad-Test inklusive Seitenende, Navigation und Player. Cookie-/Datenschutz-/SEO-/Accessibility-Prüfung für die tatsächliche WordPress-Konfiguration; die unverändert migrierte statische Datenschutzerklärung ist keine neue fachliche Freigabe für WordPress.
7. Gesonderte Abnahme mit Backup-/Rückfallplan **vor** Veröffentlichung oder Domain-/DNS-/SSL-Änderungen. Die statische Live-Seite bleibt bis dahin vollständig bestehen.
