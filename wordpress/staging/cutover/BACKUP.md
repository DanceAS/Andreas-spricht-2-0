# Sicherung vor dem Domainwechsel – ohne SSH

**Vorbedingung, kein schon erledigtes Hosting-Backup.** Die Umstellung verändert Domainzuordnungen und die WordPress-Datenbank. Der statische Ordner wird nicht verändert, muss aber für den schnellen Rückfall identifiziert sein.

## 1. Frische Datenbanksicherung direkt herunterladen

Im KAS **Datenbanken → richtige WordPress-Datenbank → phpMyAdmin**. Den Datenbanknamen anhand der privaten `wp-config.php`/Hosterbestätigung zuordnen, nicht raten. Links die Datenbank wählen, **Exportieren → Angepasst**, SQL, Struktur **und** Daten, sämtliche Tabellen dieser dedizierten Installation, Ausgabe als Datei (bei Bedarf gzip) direkt auf das eigene Gerät herunterladen. Tabelle `…options` und alle anderen WP-Tabellen müssen enthalten sein. Kein WordPress-„Werkzeuge → Daten exportieren“: dessen XML enthält keine vollständige Datenbank. [ALL-INKL beschreibt diesen direkten Export](https://all-inkl.com/wichtig/anleitungen/datensicherung/datenbank/phpmyadmin/datenbanksicherung-anlegen_283.html).

Liegt eine andere Anwendung in derselben DB, vorab eine fachkundige tabellengenaue Sicherung/Rücksicherung festlegen. Nicht später die gesamte gemeinsame Datenbank überschreiben. Bei Exportabbruch, HTML-Fehlerdatei, unklarer Größe oder Zeitlimit stoppen; kein vermeintliches Backup akzeptieren.

## 2. Vollständige Dateien: privaten Hoster-Sicherungsweg vorher klären

Für ein vollständiges Verzeichnis-Backup allein im Browser ist im **konkreten Tarif** kein aktueller manueller Download-/Restoreweg nachgewiesen. WebFTP-Zugriff beweist keinen rekursiven, vollständigen Download. Deshalb nicht behaupten, ein Klick sichere automatisch alles, und kein öffentliches Backup-Skript/Installer hochladen.

Praktikabler vorgesehener Weg: **vor dem Termin** über den bestehenden Kunden-Supportkanal eine frische private Sicherung/Kopie und eine Wiederherstellungsprobe vereinbaren; unten steht der genaue Auftrag. ALL-INKLs eigene, regelmäßig erzeugte Sicherungen können ergänzen, ersetzen aber nicht den frischen Stand. Der Hoster beschreibt ihre Verfügbarkeit als freiwillig; insbesondere kann ein Dateistand bereits älter sein. [ALL-INKL: Datensicherung](https://all-inkl.com/webhosting/datensicherung).

**Zum selbstständigen Versenden an ALL-INKL, nicht von Codex versandt:**

> Wir planen ausschließlich einen Domain-Zielwechsel auf unsere bestehende WordPress-Installation, keinen Datei- oder DB-Umzug. Unser Tarif hat kein SSH. Bitte bestätigen Sie einen browsergestützten oder von Ihnen begleiteten Weg für eine frische vollständige Sicherung von `/www/htdocs/w009877d/neu.andreasspricht.de` einschließlich versteckter Dateien, WordPress-Core, `wp-content` vollständig (Uploads, Themes, Plugins, MU-Plugins/Drop-ins), `.htaccess`, `wp-config.php` und ggf. außerhalb liegender zugehöriger Dateien/Symlink-Ziele. Bitte außerdem Domain-/SSL-/PHP-/Redirectzuordnungen sichern bzw. rücksetzbar dokumentieren.
>
> Kein Archiv und keine SQL-Datei darf unter irgendeiner öffentlich erreichbaren Dokumentwurzel/Domain/Alias liegen. Bitte privaten Speicherort und authentifizierten Download bzw. Wiederherstellungsweg, Zeitpunkt, Umfang, Dateiliste/Größen und Prüfsumme bestätigen. Keine Passwörter in eine normale Supportantwort kopieren.
>
> Vor Umschaltung bitte die Wiederherstellbarkeit der frischen Datei- und Datenbanksicherung in einer getrennten, nicht öffentlich erreichbaren Kopie mit eigener Datenbank prüfen: WordPress-Anmeldung, aktuelle Seiten/Template-Teile, vier Bilder, drei MP3s. Kein Restore über die bestehende Installation, keine Veröffentlichung. Falls diese Leistungen/der private Download im Tarif nicht möglich sind, bitte vorab ausdrücklich mitteilen. Bitte auch Wiederherstellungsdauer und Ansprechpartner für das vereinbarte Umstellungsfenster bestätigen.

Der Support darf daraus **keine Domainumstellung** ableiten; diese erfolgt erst nach gesondertem Auftrag. Wenn der Hoster diesen Weg nicht anbieten kann, ist die Sicherungsvoraussetzung offen: **nicht umstellen**, sondern einen konkreten anderen vollständigen Sicherungsweg vereinbaren. Ein ungetestetes zusätzliches Backup-Plugin ist hier kein stiller Ersatz.

## 3. Nachweis und Freigabepunkt

Privat auf dem eigenen Gerät bzw. in bestätigtem privatem Hoster-Speicher ablegen:

- Datum/Uhrzeit, zugehöriges WP-Verzeichnis und DB-Name; exakte KAS-Altwerte und Screenshots gemäß Prüfblatt.
- Vollständige Dateiliste, Größen, SHA256-Prüfsumme des Archivs, vollständiger SQL-Export; Bestätigung, dass alle Uploads/Originaldateien und Core/Child/Parent/Plugins sowie versteckte Konfiguration enthalten sind. Archiv öffnen/Dateiliste prüfen, SQL als SQL (keine Login-/Fehlerseite) erkennen. Ein Größenwert allein genügt nicht.
- Protokoll der isolierten Wiederherstellungsprobe, verwendeter Stand und Ergebnis der Anmeldung/aktuellen Inhalte/Medien/Template-Teile. Keine DB-Sicherung eines älteren Tages als angeblich aktuellen Stand behandeln.
- Konkrete Rückspielzuständigkeit und bestätigter Wiederherstellungsweg. Für eine dedizierte DB im Browser: KAS → Datenbanken → richtige DB → phpMyAdmin → **Importieren → exakt den bestätigten SQL-Export wählen → Ausführen**; ein Fachkundiger prüft vorher Tabellenersetzung/Importgrenzen und vollständigen Abschluss. Ein Import in eine nicht geleerte DB kann je nach Exportoption doppelte Tabellen/Datensätze verursachen; diese Frage **bei der Probe**, nicht während des Ausfalls lösen. Kein blindes Tabellenlöschen anleiten.

Erst wenn der identische Sicherungsstand erfolgreich wiederherstellbar ist, im privaten Blatt „Sicherung geprüft“ abhaken. Wird danach redaktionell etwas geändert, ist eine neue frische Sicherung nötig. Das Sicherungsfenster endet erst nach der Live-Abnahme; bis dahin keine weitere Redaktion.

Archive, SQL, `wp-config.php`, Schlüssel und Zugänge gehören **nie nach GitHub, in Chat-Nachrichten oder einen Webordner**. Ein zufälliger Dateiname oder deaktiviertes Directory Listing macht ein Web-Backup nicht privat. Etwaige private Server-Zwischenarchive nach erfolgreichem Download gemäß vereinbarter Aufbewahrung entfernen; nichts öffentlich zurücklassen.
