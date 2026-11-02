# Phase 3 – ALL-INKL-Staging vorbereiten

Stand: 2. November 2026. Auftrag: [Issue #14](https://github.com/DanceAS/Andreas-spricht-2-0/issues/14), Ausgangspunkt main `b4fa624` mit gemergtem PR #13. AGENTS.md bleibt verbindlich. Dieses Verzeichnis bereitet die Installation vor; **es installiert nichts bei ALL-INKL**. Keine Freigabe zum Merge, Deployment oder Domainwechsel.

## Für Andreas: wenige Schritte, erst nach Freigabe

1. **Jetzt prüfen:** Diesen Plan und den [Prüfbericht](TEST-REPORT.md) lesen. Die statische Seite bleibt unverändert online. Das Paket ist noch keine neue öffentliche Vorschau.
2. **Fehlende Angaben klären:** Die untenstehende Checkliste mit den sichtbaren Angaben aus KAS/WordPress abgleichen. Keine Passwörter, Schlüssel, Cookies, Datenbankexporte oder Zugangsdaten an GitHub/ChatGPT schicken. Ein Techniker kann die genehmigte Prüfung in deiner Sitzung durchführen.
3. **Staging separat freigeben:** Erst nach dieser Freigabe installiert der Ausführende das Paket ausschließlich unter `neu.andreasspricht.de`. Die technische [Schrittfolge](OPERATOR.md) ist vorbereitet. Dein alter redaktioneller Versuch muss laut deiner Entscheidung nicht gesichert werden; trotzdem wird nichts automatisch gelöscht. Neue Seiten werden zunächst als Entwurf angelegt. Die Live-Domain wird nicht angefasst.
4. **Gemeinsam abnehmen:** `https://neu.andreasspricht.de/` in Safari auf iPhone/iPad und am Desktop öffnen; drei Hörproben und die Bearbeitung in WordPress testen. Erst dann entscheiden, ob der Entwurf übernommen wird. Der Suchmaschinenschutz bleibt aktiv; für vertraulichen Zugriff gegebenenfalls zusätzlich einen Hosting-Verzeichnisschutz einrichten (gesonderte Freigabe).
5. **Live-Wechsel separat freigeben:** Der [Umstellungs-/Rückfallplan](CUTOVER.md) ist ein eigener späterer Auftrag. Staging-Freigabe bedeutet keine Freigabe zur Domainumstellung.

Du brauchst auf dem iPad weder Node.js noch Docker. Technische Paketvorbereitung und Import übernimmt der Ausführende. Auch auf dem Shared Hosting werden Docker, Node.js und Python nicht benötigt; Python läuft nur offline beim Ausführenden. SSH/WP-CLI-Verfügbarkeit muss noch bestätigt werden. Ohne WP-CLI wird nicht improvisiert: siehe manuelle Alternative im Operatorplan.

## Bekannt, gemeldet und noch zu bestätigen

Die folgenden Hosting-Angaben stammen aus Issue #14 / dem Website-Zustandsbericht, **nicht aus einem eigenen Hosting-Zugriff**:

| Angabe | Gemeldeter Stand |
| --- | --- |
| Testdomain und Dokumentwurzel | `neu.andreasspricht.de`, `/www/htdocs/w009877d/neu.andreasspricht.de` |
| Live | statische Seite; separates Verzeichnis `/andreas-spricht-static`, `andreasspricht.de` diesem zugeordnet; `www` zuvor per DNS angepasst |
| WordPress | 7.1.4, de_DE, HTTPS, `blog_public=0`, keine Multisite, ein Benutzer, eine veröffentlichte alte Startseite |
| Theme / Plugins | Twenty Twenty-Five 1.5 aktiv, kein Child; Antispam Bee aktiv, Akismet inaktiv |
| Server | PHP 8.4.27, Apache, MariaDB 10.6.23, Uploadlimit 384 MB |

**Noch benötigte sachliche Informationen, keine Zugangsdaten:**

- KAS-Zuordnung **jeder** Domain `neu`, Apex und `www`: tatsächlicher vollständiger Dokumentpfad, Weiterleitungen, aktive Zertifikate und Gültigkeit. Den absoluten Live-Pfad bestätigen; `/andreas-spricht-static` ist bisher nur die gemeldete Verzeichnisangabe.
- Sind Apex/`www` direkt auf ALL-INKL gerichtet oder gibt es externe DNS-/Weiterleitungs-/Proxy-Dienste? Aktuelle A/AAAA/CNAME-Ziele und TTLs notieren; keine DNS-Änderung nur zur Bestandsaufnahme.
- Tatsächliche Werte `home`, `siteurl`, Permalinkstruktur, Startseiten-/Datenschutzzuordnung, ggf. `WP_HOME`/`WP_SITEURL` in wp-config. Zusätzliche Upload-URL-/Pfadkonstanten, Multisite, Objektcache, MU-Plugins, Rewrite-/HTTPS-Regeln und Weiterleitungen prüfen.
- Existieren gespeicherte `wp_template`, `wp_template_part`, `wp_global_styles`, Seiten-Templatezuweisungen oder weitere Inhalte? Der alte Versuch darf später ersetzt werden; das ist keine pauschale Freigabe zum Löschen unbekannter Daten. Bei abweichender Bestandsaufnahme stoppen und Entscheidung einholen.
- PHP-Version **für die Webdomain und CLI**, Speicherlimit, Laufzeitlimit, freie Platte/Inodes, Schreibrechte im Uploadverzeichnis; MariaDB-Engine/Zeichensatz/Collation; GD/Imagick, MP3-MIME-Upload und tatsächliche maximale Datei-/Requestgröße.
- SSH/WP-CLI nutzbar? Wer kann die später genehmigten Befehle ausführen? Wenn nicht verfügbar: Installation über Admin/SFTP und separat geprüfter nativer Importweg vereinbaren. Kein Rootzugriff erforderlich.
- Ist ein technischer Datei-/DB-Wiederherstellungspunkt für den späteren Live-Wechsel verfügbar? Aufbewahrung/Restorezeit prüfen. Dies ist unabhängig vom ausdrücklich nicht gewünschten Archiv des alten redaktionellen Versuchs. Keine Kopie einer gesamten Hosting-Datenbank ungeprüft durch die lokale Entwicklungsdatenbank ersetzen.
- Soll `www` dauerhaft auf Apex weiterleiten (hier empfohlen)? Bestehende URL-Pfade der statischen Seite und externe Links für die Redirectliste liefern. Zuständigkeit und Testfenster bestätigen.

## Paket und Werkzeuge

Der Builder erzeugt ein **Quellpaket**, keinen Webinstaller und keinen Datenbankklon:

- `andreas-spricht-bordeaux.zip`: ausschließlich das unveränderte Child-Theme aus PR #13. Parent/Core, Plugins, `.env`, lokale wp-config, Testbenutzer und Docker-Dateien fehlen bewusst.
- `media/`: vier JPG-/drei MP3-Originale, bytegleich zur Referenz. WordPress erstellt im Ziel neue Attachment-IDs und Bildvarianten.
- `pages/{home,impressum,datenschutz}.html` und `parts/{header,footer}.html`: aus der geprüften lokalen Datenbank **gelesene** native Blöcke, inklusive aktueller Editorinhalte; keine eingebetteten Header/Footer in den Seiten.
- `manifest.json`: Inhalts-/Medienprüfwerte und Quellversionen. Ziel-IDs/URLs sind durch explizite Platzhalter ersetzt; lokale IDs werden nicht übertragen.
- Offline-Renderer und lesendes WP-CLI-Inventar samt Anleitungen.

`export-local.php` verweigert andere Installationen als die lokale Referenz. `preflight.php` liest nur den später genehmigten Zielbestand und schreibt nichts; es ist kein öffentlich aufrufbares PHP-Uploadtool. Schon dessen Ausführung auf dem Hosting gehört erst zum gesondert freigegebenen Staging-Auftrag. WordPress-/Plugin-Bootstrap kann eigene normale Hooks auslösen; kein Versprechen eines vollkommen schreibfreien Gesamtsystems. Private Inventarausgaben nicht committen.

Paket lokal bauen (Repository-Wurzel; laufende lokale Referenz aus PR #13 erforderlich):

```sh
mkdir -p work/issue-14
docker compose -f wordpress/compose.yml run --rm -T \
  -v "$PWD/wordpress/staging:/staging:ro" cli wp eval-file /staging/export-local.php \
  > work/issue-14/export.json
python3 wordpress/staging/build-package.py work/issue-14/export.json work/issue-14/package
```

Das Ausgabeziel muss neu sein; erneuter Aufruf überschreibt kein Paket. `work/` ist ignoriert. Paket vor späterer Verwendung mit den geprüften Manifestwerten vergleichen und nach neuen Editoränderungen neu erzeugen. Paket und Mapping nicht ins öffentliche Webroot entpacken. Im Git-PR liegen die reproduzierbaren Werkzeuge und Prüfnachweise; die ca. 9 MB Originalmedien werden nicht nochmals versioniert.

Ein normaler WordPress-WXR-Import allein reicht hier nicht: zentrale Template-Teil-Taxonomien, Theme-Optionen und Gutenberg-Attachment-IDs brauchen korrekte Zielzuordnung. Ein ungeprüfter Komplettdatenbankimport würde Benutzer, Plugin-/Siteoptionen und bestehende Inhalte ersetzen. Beides ist nicht der gewählte Weg.

## Wichtige Abhängigkeiten aus dem tatsächlichen Code

- `setup.sh`, `seed.php`, `seed-phase2.php` und `migrate-shared-parts.php` sind **lokale** Hilfen. Ihre URL-Sperren werden nicht entfernt; sie dürfen nicht am Hosting ausgeführt werden. Dockerpfade `/prototype` und `/reference-assets` sind dort nicht vorhanden.
- Das Theme nutzt `as_phase2_pages` für installationsgerechte Default-Rechtslinks. `as_shared_parts_v1` aktiviert die Dateivorlagen mit zentralen Teilen. Ohne diesen Marker bleibt der Übergangsfallback `post-content` aktiv; nur Theme hochladen wäre daher unvollständig.
- Die Ziel-Teile müssen `wp_template_part`, Theme-Taxonomie `andreas-spricht-bordeaux` und Bereich `header` bzw. `footer` besitzen. Gespeicherte Templates/Global Styles können die Dateivorlagen übersteuern. Nicht pauschal löschen.
- Inhalte enthalten URLs sowohl in Blockattributen als auch im gespeicherten Markup und Bild-ID-Klassen. Renderer ersetzt alle vorgesehenen Tokens; die über WordPress ermittelten tatsächlichen Ziel-Medien-URLs verwenden (ggf. `-scaled.jpg`). Nicht blind Dateipfade zusammensetzen.
- Kein `blog_public=0`-Versprechen auf Unsichtbarkeit: Das verhindert keine öffentlichen Aufrufe. Suchmaschinen-/HTTP- und ggf. Zugriffsschutz sind beim Staging gesondert zu prüfen.
