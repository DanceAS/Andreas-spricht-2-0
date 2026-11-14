# Importfehler behoben – Version 1.0.1 / Issue #18

## Bisheriges Plugin austauschen

Nur auf `https://neu.andreasspricht.de` und nach Freigabe. **Kein weiterer WordPress-Reset nötig. Keine ID 6/10 identifizieren oder löschen.**

1. [andreas-staging-import-1.0.1.zip herunterladen](dist/andreas-staging-import-1.0.1.zip) (auf GitHub **Download raw file**). Die ZIP-Datei unverändert behalten.
2. In WordPress **Plugins → Neues Plugin hinzufügen → Plugin hochladen** öffnen, ZIP auswählen und **Jetzt installieren** drücken. Die Vergleichsseite muss **hochgeladene Version 1.0.1** zeigen. **„Aktuelles durch Hochgeladenes ersetzen“ / „Replace current with uploaded“** wählen und das Ende der Aktualisierung abwarten. Falls WordPress anschließend „Plugin aktivieren“ anbietet, aktivieren.
3. **Werkzeuge → Bordeaux einmalig importieren** neu öffnen. Falls unmittelbar nach dem Austausch noch die alte Meldung erscheint, nach wenigen Sekunden neu laden (PHP-Codecache). Vorprüfung lesen, Checkbox bestätigen und **Staging-Import starten** drücken. Anschließend gilt die bestehende Anleitung: Vorschau prüfen und Import-Plugin deaktivieren/löschen.

Diese Anleitung betrifft das bereits installierte, noch nicht gestartete Plugin. Ein vorhandener abgeschlossener Import wird nicht neu ausgeführt. Andere Konfliktmeldungen nicht durch Löschen von Daten oder einen weiteren Reset umgehen.

## Ursache und gezielte Korrektur

Version 1.0.0 blockierte pauschal jeden Post der Typen `wp_template`, `wp_template_part`, `wp_global_styles`. Die Zahl in der Meldung sagt nichts Verlässliches über Typ oder Theme aus.

Version 1.0.1 prüft weiterhin Typ, Slug und `wp_theme`-Zuordnung. Eindeutig dem Parent `twentytwentyfive` zugeordnete Objekte bleiben unverändert bestehen und dürfen den Import passieren. Zusätzlich werden erkennbare Core-Standardstyles ohne Theme-Zuordnung erhalten: ausschließlich `wp_global_styles`, Slug `wp-global-styles-twentytwentyfive` (ggf. nummerierter Suffix), gültiges Core-JSON mit Version 3 und `isGlobalStylesUserThemeJSON=true`. Ohne Theme-Term kann dieser Datensatz die stylesheetbezogene Core-Abfrage nicht erfüllen.

Child-Objekte, gemischte/abweichende Theme-Zuordnungen und sonstige ungeklärte Objekte bleiben gesperrt. Bestandsfingerprint, Zustimmung, Nonce, Domainbegrenzung und Transaktionsschutz bleiben bestehen. Es wird nichts gelöscht, umbenannt oder einem anderen Theme zugeordnet.

Für neue Child-Header/Footer wird die Theme-Taxonomie nun vor dem Veröffentlichen gesetzt. WordPress 7.1.4 prüft neue veröffentlichte Template-Teil-Slugs sonst gegen das noch aktive Parent-Theme und könnte dessen `header`/`footer` unnötig als Kollision behandeln. Das ist Teil derselben Importfehlerkorrektur.

Der Fingerprint vergleicht weiter die tatsächlichen Taxonomiezuordnungen. Lediglich deren globaler Mitgliedszähler wird ausgeklammert: Er steigt regulär, wenn Parent- und Child-Teile denselben Bereich `header`/`footer` verwenden, und ist keine Änderung am Altobjekt.

Design, Architektur, Quellinhalte, Bilder, Audios und Child-Theme-Dateien sind unverändert. Kein Resetmechanismus und keine neue Funktion.

## Praktisch geprüft

Isoliert mit **WordPress 7.1.4 / Twenty Twenty-Five 1.5 / Apache / PHP 8.4.27 / MariaDB 10.6.23**; keine Verbindung zum Hosting. Die dort gemeldeten Versionen wurden nachgebildet, kein Test auf dem realen ALL-INKL-Server behauptet.

- Regulären Default-Styles-Post über die Core-API erzeugt. Alte Version reproduziert die Sperre; Austausch auf 1.0.1 über den echten WordPress-Admin-Upload und die Ersetzen-Schaltfläche getestet.
- Parent-Global-Styles mit auffälligem grünem Hintergrund/blauer Schrift sowie gespeicherte Parent-Vorlagen `front-page`, `header` und `footer` eingesetzt. Vorher tatsächlich im Parent gerendert, nach Import nicht im Child. Alle Altobjekte einschließlich Inhalt, Metadaten und Taxonomiezuordnungen per SHA-256 unverändert erhalten. Keine Übernahme von Parent-Overrides/Benutzer-Styles in das Child festgestellt; daher kein Reset erforderlich.
- Echte Child-Kollisionen für alle drei Designtypen, ein unklarer Styles-Eintrag sowie gemischte Parent-/Child-Zuordnung bleiben gesperrt. Negativobjekte bleiben unverändert; kein Importzustand angelegt.
- Vollständiger Import über Checkbox/Start im Admin. Drei Seiten mit genau einem Header/Footer, eigene Child-Templates/-Teile, korrekte Creme-/Bordeauxfarben, Bilder und Layout bei 390/1024/1440 px geprüft. Alle drei MP3s real mit Play/Pause/Seek geprüft.
- Native Seitenbearbeitung gespeichert, neu geöffnet und wiederhergestellt. Zentralen Header/Footer im Website-Editor separat geprüft. Payload-/Medien-/Themehashes entsprechen 1.0.0; geändert wurde ausschließlich die Importlogik samt Versionsnummer.

Quellprüfung im tatsächlich eingesetzten Core: `get_block_templates()` filtert gespeicherte Vorlagen nach `wp_theme`/`get_stylesheet()`, `get_block_template()` nach dem angefragten Theme; `WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles()` nach dem Stylesheet-Namen. `switch_theme()` kopiert diese Posts nicht. `wp_filter_wp_template_unique_post_slug()` verwendet bei noch nicht zugeordneten neuen Posts hingegen das aktive Theme – deshalb die korrigierte Reihenfolge der Teilanlage.

Nachweise: [Ergebnisse und Prüfsummen](evidence/issue-18/results.json), [alte Sperre](evidence/issue-18/old-block.png), [korrigierte Vorprüfung](evidence/issue-18/preview.png), [mobile Darstellung](evidence/issue-18/mobile.png), [Desktop](evidence/issue-18/desktop.png).

Reproduktion lokal: vorhandene isolierte Testumgebung frisch unter Compose-Projekt `andreas-spricht-issue18` starten, Core und `tests/setup-fixture.php` einrichten. `tests/design-conflicts.cjs` benötigt die ZIPs `old-LOCAL-TEST.zip` (1.0.0 mit localhost-Konstante) und `fixed-LOCAL-TEST.zip` (Builder mit `--local-test`) in `work/issue-18/`. Testfixtures/CLI bleiben ausschließlich lokal; der reale Austausch benötigt kein Terminal.

**Nur Feature-Branch und PR. Kein Merge, keine Veröffentlichung, keine Hosting-/Domain-/Live-Änderung.** Echter ALL-INKL-/Safari-Test bleibt nach Freigabe offen.
