# Statische Bordeaux-Version für ALL-INKL

Dieses Paket ist eine statische HTML/CSS/JavaScript-Website, keine WordPress-Implementierung. Twenty Twenty-Five und die spätere Bearbeitung im WordPress-Editor bleiben das gesonderte Projektziel. Der Packager veröffentlicht nichts, verbindet sich nicht mit ALL-INKL und verändert weder Domainzuweisungen noch die vorhandene Wix-Weiterleitung oder WordPress-Installation.

## 1. ZIP über GitHub Actions erhalten

Ein neuer manueller Workflow wird erst nach dem Merge des Packaging-PRs auf dem Standardbranch verfügbar. Dieser Merge ist nicht Bestandteil der Paketierung. Achtung: Der bereits vorhandene Pages-Workflow reagiert weiterhin auf Pushes nach `main`; dieser neue Packaging-Workflow selbst führt kein Deployment aus.

1. Nach Freigabe und Merge das Repository `DanceAS/Andreas-spricht-2-0` in GitHub öffnen.
2. **Actions → ALL-INKL ZIP der statischen Bordeaux-Version → Run workflow** wählen.
3. Branch `main` auswählen und **Run workflow** bestätigen. Der Workflow checkt ausdrücklich den aktuellen Stand von `main` aus; er verwendet keine veraltete PR-Kopie.
4. Den erfolgreich abgeschlossenen Lauf öffnen. In der Zusammenfassung steht der tatsächlich paketierte Quell-Commit und ein direkter Artefakt-Link.
5. Unter **Artifacts** das Artefakt **andreas-spricht-static-allinkl** herunterladen. GitHub liefert es als **andreas-spricht-static-allinkl.zip** aus. Zum Download ist ein berechtigtes GitHub-Konto nötig; das Artefakt wird 30 Tage aufbewahrt. Danach den Workflow erneut manuell starten.
6. Das ZIP darf beim Öffnen direkt `index.html`, `impressum/`, `datenschutz/` und `assets/` anzeigen. Es gibt weder einen vorgeschalteten `bordeaux/`-/`_site/`-/Repository-Ordner noch ein weiteres ZIP im ZIP.

Die Endung `.zip` wird bewusst nicht an den GitHub-Artefaktnamen angehängt: GitHub fügt sie dem Download bereits hinzu. Der Upload lädt die Website-Dateien direkt hoch, keine zweite Verpackungsebene. Datei: `.github/workflows/package-allinkl.yml`.

Workflow nach Merge: https://github.com/DanceAS/Andreas-spricht-2-0/actions/workflows/package-allinkl.yml

## 2. Dasselbe Paket lokal erzeugen

Voraussetzung: Git und Python ab 3.9. Keine zusätzlichen Python-Pakete, kein npm-Installationsschritt und kein WordPress erforderlich.

Im Repository ausführen:

```sh
git fetch origin main
python3 scripts/package_allinkl.py --ref FETCH_HEAD --output work/allinkl/andreas-spricht-static-allinkl.zip
```

`FETCH_HEAD` bezeichnet hier den unmittelbar zuvor von `main` geholten Stand. Für die Wiederholung eines bereits geprüften Pakets stattdessen den vollständigen Commit-SHA aus der Workflow-Zusammenfassung als `--ref` übergeben. Der Packager liest ausschließlich die versionierten Dateien dieses Commits, nicht ungespeicherte Änderungen im Arbeitsverzeichnis.

Optionaler Test der Paketierung:

```sh
python3 -m unittest discover -s tests -p test_package_allinkl.py -v
```

Neben dem ZIP entsteht `work/allinkl/andreas-spricht-static-allinkl.manifest.json` mit Quell-Commit, Dateiliste und SHA-256-Prüfsummen. Dieser technische Prüfbericht ist kein Bestandteil der Website. Das lokal erzeugte ZIP ist für denselben Quell-Commit bytegleich reproduzierbar; Datei-Zeitstempel stammen aus dessen Commit-Zeit in UTC. GitHub erstellt für den Artefakt-Download einen eigenen ZIP-Container; dessen Gesamtprüfsumme kann abweichen, die enthaltenen Dateien bleiben identisch.

## 3. Dateistruktur kontrollieren

Die ZIP-Wurzel enthält:

```text
index.html
styles.css
hero-image-v2.css
impressum.css
datenschutz.css
app.js
content.js
sample-content.js
studio-content.js
fit-sample-intro.js
mobile-about-portrait.js
impressum/index.html
datenschutz/index.html
assets/andreas-scharrer-original.jpg
assets/andreas-scharrer-8.jpg
assets/beim-tanz-des-gefreiten-band-1-frontcover.jpg
assets/die-geschichte-von-den-watschlawanen-cover.jpg
assets/hoerprobe-kap1-kurz.mp3
assets/hoerprobe-watschlawanen-kapitel-4.mp3
assets/hoerprobe-letzte-vorstellung.mp3
```

`app.js` und `content.js` kommen aus der Repository-Wurzel. Alle anderen Dateien stammen unverändert aus `bordeaux/`, dessen Ordnername im ZIP entfällt. Der Kontaktlink im Startseiten-Footer bleibt `mailto:kontakt@andreasspricht.de`. Interne Seiten und Ressourcen verwenden relative Pfade. Externe Amazon-, Facebook-, Fotografen- und Quellenlinks bleiben erhalten.

Es werden keine `.htaccess`, keine Domain-/DNS-Konfiguration, keine WordPress-Dateien und keine Zugangsdaten hinzugefügt. Der bestehende Vorschau-Status `noindex, nofollow` bleibt erhalten; Suchmaschinenfreigabe ist ein eigener späterer Schritt. Falls sich `main` später inhaltlich erweitert, zeigt das Manifest die dann aktuelle vollständige Dateiliste.

## 4. Upload und Entpacken mit ALL-INKL WebFTP

Diese Anleitung wird vom Auftraggeber ausgeführt. Das Skript nimmt selbst keinen Upload vor. Das Entpacken auf öffentlich zugeordnetem Webspace kann Dateien bereits erreichbar machen; deshalb zunächst prüfen, dass der Zielordner nicht der aktuellen Live-Domain zugeordnet ist.

1. Im ALL-INKL-Kundenbereich das **KAS** des richtigen Hosting-Pakets öffnen und das zugehörige **WebFTP** aufrufen. Je nach Oberfläche führt der Weg über den FTP-Benutzer und dessen WebFTP-Schaltfläche. Keine Zugangsdaten im Repository speichern.
2. Im Verzeichnisbaum den bereits angelegten Ordner **`andreas-spricht-static`** öffnen. Nicht das WordPress-Verzeichnis und nicht dessen `wp-content` oder `wp-admin` auswählen.
3. Den vorhandenen Inhalt dieses Zielordners zunächst als Sicherung herunterladen. Keine unbekannten Dateien löschen und keine Dateien außerhalb dieses Ordners ersetzen. Bestehende Domainzuweisungen und die Wix-Weiterleitung unverändert lassen.
4. Das fertige **`andreas-spricht-static-allinkl.zip`** über **Upload/Hochladen** in genau diesen Ordner übertragen.
5. Die hochgeladene ZIP-Datei markieren und die WebFTP-Funktion **Entpacken/Archiv entpacken** verwenden. Als Ziel den aktuellen Ordner **`andreas-spricht-static`** wählen. Eine Option „zusätzlichen Ordner aus Archivnamen anlegen“ darf nicht aktiviert sein.
6. Kontrollieren: Direkt unter `andreas-spricht-static` liegen `index.html`, `app.js`, `content.js` und die Stylesheets. Daneben liegen `assets/`, `impressum/` und `datenschutz/`. Unter `assets/` müssen vier JPGs und drei MP3s vorhanden sein. Es darf nicht `andreas-spricht-static/bordeaux/index.html` oder `andreas-spricht-static/andreas-spricht-static-allinkl/index.html` entstehen.
7. Nach erfolgreicher Entpack-Kontrolle die hochgeladene ZIP-Datei im Webspace entfernen; das lokale ZIP und die Sicherung behalten. So liegt kein unnötiges Download-Archiv im Webverzeichnis.
8. Wenn eine bereits vorhandene, separat freigegebene Testadresse auf diesen Ordner zeigt, dort Startseite, Impressum, Datenschutz, Bilder, mobile Ansicht und alle drei Hörproben testen. Ohne solche Testadresse noch keine Domain umstellen und keine Testadresse erfinden. Ein lokaler Test ist mit einem statischen Server möglich; der Server muss für das Springen in MP3s HTTP-Byte-Ranges unterstützen.

Sollte WebFTP bei „Entpacken“ einen Zielordner erzeugen, nur innerhalb des freigegebenen Staging-Ordners korrigieren. Keine WordPress-Dateien oder übergeordnete `.htaccess` bearbeiten. Eine WordPress-Umschreibung oder alte Weiterleitung muss bei Konflikten zunächst separat geprüft werden.

## 5. Spätere Domainzuweisung – erst nach eigener Freigabe

Die folgenden Schritte gehören **nicht** zur jetzigen Umsetzung. Die bestehende Live-Website und die Wix-Weiterleitung bleiben bis zu einer ausdrücklichen Freigabe bestehen.

1. Vorher aktuelle KAS-Domaineinstellungen, eventuelle DNS-/Wix-Einträge und die bisherige WordPress-Zuordnung dokumentieren, damit eine Rückkehr möglich bleibt. Den tatsächlichen Ist-Zustand prüfen: Eine KAS-Weiterleitung und eine DNS-Zuweisung zu Wix sind unterschiedliche Fälle.
2. Nach freigegebenem Test im **KAS → Domain → betreffende Domain → Bearbeiten** den Zielpfad auf den vorhandenen Ordner **`/andreas-spricht-static/`** setzen, sofern das Hosting-Paket die Domain bereits dort verwaltet. Im Zweifel den Ordner über die Verzeichnisauswahl auswählen und den tatsächlich angezeigten Pfad prüfen.
3. Falls dort eine Wix-Weiterleitung eingetragen ist, erst mit der gesonderten Freigabe auf Webspace-/Verzeichniszuordnung umstellen. Liegt die Wix-Zuweisung stattdessen im DNS, keine pauschalen DNS-Änderungen vornehmen; die passende Umschaltung muss gesondert geplant werden.
4. HTTPS-Zertifikat und die gewünschte `www`-/Nicht-`www`-Variante prüfen. Keine neue Weiterleitungsregel aus diesem ZIP übernehmen: Es enthält keine.
5. Anschließend über die echte Domain alle Seiten, Links und MP3s erneut testen. Das Vorhandensein von ALL-INKL-Server-Logs, Antwort-Headern und Cookies wird erst dann providerseitig geprüft; lokale Tests ersetzen diese Prüfung nicht.
6. Bei Fehlern die zuvor gesicherte Domainzuordnung/Weiterleitung zurücksetzen. Die alte WordPress-Installation bleibt erhalten und wird nicht gelöscht.

## Grenzen des Pakets

Das ZIP ist die aktuelle statische Bordeaux-Version. Es stellt weder eine WordPress-Migration noch einen Nachweis der späteren WordPress-Editor-Bearbeitbarkeit dar. Der Datenschutztext wird unverändert mitgenommen; es werden keine rechtlichen Ergänzungen erfunden. Keine Veröffentlichung, kein WebFTP-Upload und keine Domain-/Wix-Änderung werden durch diesen Workflow ausgelöst.
