# Bordeaux per WordPress-Admin importieren – Issue #16

**Aktuelle Fehlerkorrektur: Version 1.0.1.** [Bisheriges Plugin austauschen / Prüfbericht Issue #18](FIX-18.md).

**Nur Vorbereitung zur Prüfung, noch keine Freigabe zur Installation bei ALL-INKL.** Die bestehende statische Website bleibt unverändert. Der Domainwechsel gehört nicht zu diesem Import.

Der fehlende SSH-Zugang ist laut Issue #16 bestätigt. Dieser Weg ersetzt deshalb die SSH-/WP-CLI-Schritte aus PR #15. Auf dem Hosting werden weder Terminal, Docker, Python, Node.js noch phpMyAdmin benötigt. Alle Inhalte bleiben anschließend in normalen WordPress-Seiten, der Mediathek und dem nativen Website-Editor bearbeitbar.

## Für Andreas – nach gesonderter Staging-Freigabe

Benötigt wird **genau eine Datei**: [andreas-staging-import-1.0.1.zip](dist/andreas-staging-import-1.0.1.zip). Auf GitHub die ZIP-Datei öffnen und **Download raw file / Rohdatei herunterladen** wählen. Die ursprüngliche ZIP-Datei auf dem iPad unter Dateien/Downloads behalten, nicht den entpackten Ordner auswählen. Keine andere Software installieren.

1. Ausschließlich unter **`https://neu.andreasspricht.de/wp-admin/`** als Administrator anmelden. **Plugins → Neues Plugin hinzufügen → Plugin hochladen** öffnen, `andreas-staging-import-1.0.1.zip` auswählen, **Jetzt installieren**, danach **Plugin aktivieren**. Das Paket enthält bereits Child-Theme, vier Originalbilder, drei MP3s und alle fünf Gutenberg-Dokumente. Kein weiterer Datei-Upload ist nötig.
2. **Werkzeuge → Bordeaux einmalig importieren** öffnen. Die Vorprüfung zeigt Zieladresse, vorhandene IDs/Inhalte/Plugins und alle geplanten Änderungen. Kontrollieren, dass dies die Staging-Seite ist. Kästchen **„Ich habe die Vorprüfung gelesen …“** aktivieren und **Staging-Import starten** drücken. Den Tab geöffnet lassen. Einzelschritte werden gespeichert; die Bildaufbereitung kann einige Minuten dauern. Währenddessen keine anderen WordPress-Inhalte bearbeiten.
3. Nach **„Import abgeschlossen“** über **Bordeaux-Vorschau öffnen** die Website prüfen. Anschließend unter **Plugins** das Plugin **„Andreas spricht – einmaliger Staging-Import“** **deaktivieren** und **löschen**. Gegebenenfalls **„Ja, diese Dateien löschen“** bestätigen. Die Website und sämtliche importierten Inhalte bleiben bestehen; das Plugin wird nicht mehr benötigt.

Es wird weder nach Hostingpasswörtern noch FTP-Daten gefragt. Falls WordPress beim Hochladen/Installieren selbst Verbindungsdaten verlangt: **abbrechen und die Meldung ohne Zugangsdaten weitergeben**. Der getestete Weg setzt direkte Schreibrechte in WordPress voraus.

## Was genau geändert wird

- Neues Child-Theme `andreas-spricht-bordeaux`; vorhandenes Twenty Twenty-Five bleibt unverändert. Das Child enthält exakt die bisherige Bordeaux-Darstellung.
- Sieben **neue** Mediathek-Einträge mit neuen Ziel-IDs, Alttexten und WordPress-Bildvarianten. Originalnamen/Originalbytes bleiben erhalten. Bereits vorhandene Bilder/MP3s werden nicht ersetzt.
- Drei neue Seiten: `as-bordeaux-start`, `as-bordeaux-impressum`, `as-bordeaux-datenschutz`. Zunächst Entwürfe, erst im letzten Schritt veröffentlicht. Die bisherige Startseite wird weder überschrieben noch gelöscht und bleibt über ihre bisherige URL erreichbar. Nach Abnahme kann sie bei Bedarf **manuell** unter Seiten auf Entwurf gesetzt werden; der Import erledigt dies nicht heimlich.
- Zwei zentrale native `wp_template_part`-Einträge `header` und `footer` mit Theme-/Bereichstaxonomien. Einmal im **Design → Editor / Website-Editor** ändern wirkt auf allen drei Seiten.
- Abschließend Child aktivieren, neue Startseite unter Lesen zuordnen, neue Datenschutzseite zuordnen. Drei neue Bordeaux-Zuordnungsoptionen und ein Fortschrittsprotokoll speichern. Suchmaschinenschutz (`blog_public=0`), Sprache, Permalinks, aktive andere Plugins und bestehende redaktionelle Inhalte bleiben erhalten.

Die neue Startseite ist danach unter `https://neu.andreasspricht.de/` sichtbar. Rechtliche Links verwenden stabile WordPress-Seiten-IDs; bei sprechenden Permalinks darf WordPress zur passenden Seitenadresse weiterleiten. MP3s und Bilder liegen unabhängig vom Plugin unter `wp-content/uploads/as-i16-…/`. Es gibt keinen externen Audiohost und keinen automatischen Wiedergabestart.

## Unterbrechung oder Fehlermeldung

Bei einer Unterbrechung den Tab neu laden und **Werkzeuge → Bordeaux einmalig importieren** öffnen. Nach erneuter Vorprüfung und Bestätigung **Import fortsetzen** drücken. Bereits gespeicherte Schritte und IDs werden weiterverwendet. **Nicht** Optionen löschen, Datenbank zurücksetzen, das Paket mit anderer Quelle neu bauen oder mehrfach in mehreren Tabs starten.

Das Child und einzelne neue Medien/Entwürfe können bei einem abgebrochenen Import bereits vorhanden sein. Bis zum abschließenden Schritt bleiben bisheriges Theme und Startseitenzuordnung aktiv. Eigene neue Dateien und Entwürfe werden nicht automatisch bereinigt. Nach einem Konflikt erst die Ursache klären; Löschen des Plugins ist kein Rollback. WordPress-/Plugin-Hooks können außerhalb der Importtransaktion eigene Aktionen ausführen, daher gibt es keine pauschale Garantie eines vollständigen System-Rollbacks.

Nach erfolgreichem Import zeigt ein erneuter Aufruf nur **„Import abgeschlossen“**. Er startet nichts neu und überschreibt keine späteren Editoränderungen. Auch eine erneute Aktivierung desselben Pakets setzt keine Inhalte zurück. Das kleine Fortschrittsprotokoll und die Laufzeit-Zuordnungen bleiben beim Löschen des Plugins absichtlich bestehen; darin stehen keine Passwörter oder vollständigen alten Seitenkopien. Ein Archiv des alten redaktionellen Versuchs wird nicht angelegt.

## Bewusste Grenzen / Sperren

- Produktions-ZIP ausschließlich für **`https://neu.andreasspricht.de`**, identische Home-/SiteURL, korrekt von WordPress erkanntes HTTPS und passender Request-Host. Kein Schalter für Live-Domain, beliebige URL oder einen Domainwechsel. Multisite wird abgewiesen.
- Geprüfter Stand: WordPress **7.1.4**, Twenty Twenty-Five **1.5**, PHP mindestens **8.1** (praktisch geprüft: 8.4.27); abweichende Core-/Parent-Versionen werden bis zur gesonderten Prüfung gesperrt. Keine automatischen Upgrades.
- Vorhandenes gleichnamiges Child, reservierte Slugs, Bordeaux-Zuordnungen sowie Child-/unklare Designobjekte werden gesperrt. Eindeutige Twenty-Twenty-Five-Parent-Objekte und erkennbare, nicht zugeordnete Core-Standardstyles bleiben erhalten und blockieren den Import nicht. Details und Nachweise siehe [Fehlerkorrektur 1.0.1](FIX-18.md). Alte Overrides werden nicht entfernt. In einem solchen Fall ist zuerst eine gezielte Entscheidung nötig; es gibt keinen „Trotzdem überschreiben“-Knopf.
- Standardpfade `wp-content/themes` und `wp-content/uploads`, keine Symlinks, kein individuelles Upload-CDN, direkt beschreibbare Verzeichnisse und InnoDB-Tabellen erforderlich; persistenter Objektcache wird bis zur gesonderten Prüfung gesperrt. Die normale WordPress-Admin-ZIP-Uploadgröße muss für das ca. 9-MB-Paket ausreichen (gemeldet: 384 MB). Genügend freier Speicher, PHP-Speicher für große Porträts und Zeit zur Bildaufbereitung sind zusätzlich nötig.
- Nur eingeloggte Administratoren mit den erforderlichen Theme-/Plugin-/Upload-/Editorrechten. CSRF-Nonce, ausdrückliche Bestätigung und unveränderter Prüfplan sind erforderlich. Ein Editor/Redakteur darf den Import nicht starten. Diese Installationsberechtigung ist von der späteren redaktionellen Rolle getrennt.
- Kein echter ALL-INKL-/Safari-/iPhone-/iPad-Test in dieser Aufgabe. SSL-/Byte-Range-/Cache-/Plugin-/Rechteverhalten und Bearbeitung auf dem echten Hosting erst **nach gesondert genehmigter Installation** abnehmen. `blog_public=0` verhindert keine öffentlichen Browseraufrufe.

## Für spätere Redaktion

**Seiten → Andreas spricht / Impressum / Datenschutzerklärung → Bearbeiten** für Texte, Bilder, Bücher und Audio-Blöcke; **Medien** für Dateien und Alttexte; **Design → Editor** für zentralen Header/Footer. Kein HTML-/PHP-/CSS-/JS-Dateieditor ist für Inhalte nötig. Die Bildausschnitt-/Layoutregeln bleiben die vorhandene Gestaltung; beim Austausch gegen ein anderes Motiv die Vorschau prüfen. Der Import ergänzt keinen Pagebuilder und keinen dauerhaften eigenen Blocktyp.

## Reproduktion für Entwickler – ausschließlich lokal

`source.json` ist ein tokenisierter, geprüfter Export der lokalen nativen Referenz aus main mit PR #15. Keine lokalen IDs/URLs oder Zugangsdaten. Die sieben Binärdateien stammen bytegleich aus `bordeaux/assets/`, das Child aus `wordpress/theme/andreas-spricht-bordeaux/`. Der Builder prüft Medienhashes und erzeugt ein ZIP mit festen Zeitstempeln. Keine Netzwerkverbindung im Builder.

```sh
python3 wordpress/staging/admin-import/build-plugin.py \
  wordpress/staging/admin-import/source.json /NEUER_LOKALER_PFAD/andreas-staging-import.zip
```

Der Ausgabeort muss neu sein. Bei bewusst geänderter Referenz zuerst die isolierte lokale Installation gemäß vorhandener Anleitung erstellen und `wordpress/staging/export-local.php` ausführen; den resultierenden tokenisierten Export nach Prüfung als `source.json` übernehmen. Das ist kein Hostingvorgang.

Ein **separates** Test-ZIP lässt sich mit `--local-test` erstellen. Sein fest einkompilierter Ursprung ist nur `http://127.0.0.1:8890`; es ist ausdrücklich als LOCAL TEST benannt. Es darf nicht an Andreas als Staging-Installer geliefert werden. Das Produktions-ZIP enthält keinen Laufzeitfilter, der seine Domainbegrenzung auf localhost oder die Live-Domain umstellen kann.

[Prüfbericht und Nachweise](TEST-REPORT.md) · [Technischer Sicherheitsaufbau](SECURITY.md). Der spätere [Domainwechsel-/Rückfallplan](../CUTOVER.md) bleibt ein eigenständiger, gesondert freizugebender Auftrag.
