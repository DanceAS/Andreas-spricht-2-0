# Spätere Staging-Installation – Ausführungsplan, jetzt nicht ausführen

Nur nach gesonderter Nutzerfreigabe. Ziel ausschließlich `https://neu.andreasspricht.de`, vorhandene Installation `/www/htdocs/w009877d/neu.andreasspricht.de`. Keine automatische Zieländerung, kein DB-Reset, keine bestehende Live-Seite überschreiben. Die untenstehenden WP-CLI-Befehle sind **manuelle Einzelschritte**, kein getesteter unbeaufsichtigter Hostinginstaller. Platzhalter niemals wörtlich ausführen.

## 1. Ziel feststellen und Konflikte entscheiden

Ein Ausführender prüft zuerst KAS-Zuordnung/SSL und den Website-Zustand. SSH/WP-CLI ist noch unbestätigt. WP-CLI immer ausdrücklich mit `--path=/www/htdocs/w009877d/neu.andreasspricht.de` verwenden (im Folgenden kurz `wp`); keine Annahme zum aktuellen Verzeichnis. `wp core version`, `wp option get home` und `wp option get siteurl` müssen zum genehmigten Ziel passen. Über `wp config get` nur die erforderlichen nicht geheimen Konstanten prüfen, nie die ganze wp-config ausgeben.

Nach Freigabe Werkzeug außerhalb des Webroots ablegen und lesendes Inventar ausführen:

```sh
wp eval-file /PRIVATER_PAKETPFAD/preflight.php > /PRIVATER_PFAD/staging-inventar.json
```

Versionen, drei Optionsgruppen, Slugs, alle Templates/Teile/Global Styles und aktive Plugins abgleichen. Andere Inhalte als die gemeldete eine alte Startseite, vorhandenes Child-Theme, neue Editoränderungen, eigene Overrides oder abweichende Zielpfade: **stoppen und individuell entscheiden**. Nichts per `--force`, `post delete`, `db reset`, SQL-Suchen/Ersetzen oder Neuinstallation bereinigen. Ein Themewechsel bindet Parent-Overrides nicht automatisch an das Child; deren Designwirkung trotzdem prüfen. Ein vorhandener Child-Override kann die neuen Dateivorlagen direkt übersteuern.

Gemäß Nutzerentscheidung ist kein Archiv des alten redaktionellen Versuchs vorgesehen. Dies rechtfertigt keine unkontrollierte Löschung. Alte Seite zunächst bestehen lassen; erst bei ausdrücklicher Entscheidung auf Entwurf setzen bzw. entfernen. Vorherige Theme-/Startseiten-/Permalink-/Datenschutzoptionen und neu erzeugte IDs privat protokollieren, um die Einrichtung zurücknehmen zu können. Ein technischer Wiederherstellungspunkt für den späteren Domainwechsel wird gesondert geplant.

## 2. Child und sieben Medien vorbereiten

Paketmanifest offline verifizieren; ZIP unter **Design → Themes → Theme hinzufügen → Theme hochladen** installieren, **noch nicht aktivieren**. Twenty Twenty-Five 1.5 nicht überschreiben. Schon vorhandenes gleichnamiges Child nicht ersetzen, sondern Konflikt prüfen. Alternativ gezielt per SFTP nur den neuen Child-Ordner nach `wp-content/themes/` übertragen.

Vier JPGs/drei MP3s über **Medien → Datei hinzufügen** importieren; alternativ pro Datei `wp media import /PRIVATER_PAKETPFAD/media/DATEI --porcelain`. Jede neue ID notieren. Keine bestehenden Attachments ersetzen oder IDs aus der lokalen Datenbank übernehmen. Alttexte aus `manifest.json` übernehmen, vorhandene Originalnamen beibehalten. `wp post meta update NEUE_ID _wp_attachment_image_alt 'ALT_AUS_MANIFEST'` ist die CLI-Alternative. Originalgröße/Originalhash und dekodierbare WordPress-Bildvarianten prüfen; Vorschaubildgenerierung kann bei großen Originalabmessungen an Speicher-/Zeitlimits scheitern, auch wenn 384 MB Upload erlaubt sind.

## 3. Neue Seiten und Zielmapping

Drei neue **Entwürfe** erstellen, z. B. über **Seiten → Erstellen** oder pro Seite:

```sh
wp post create --post_type=page --post_status=draft --post_title='Andreas spricht' --post_name=home --porcelain
wp post create --post_type=page --post_status=draft --post_title='Impressum' --post_name=impressum --porcelain
wp post create --post_type=page --post_status=draft --post_title='Datenschutzerklärung' --post_name=datenschutz --porcelain
```

IDs **aus den Ergebnissen** übernehmen. Bei Slugkonflikten nichts überschreiben: WordPress kann `-2` anhängen; tatsächliche Slugs/Permalinks feststellen und die gewünschte spätere URL entscheiden. Für die Staging-Vorbereitung die vorhandene Permalinkstruktur zunächst beibehalten. Bei Entwürfen kann `get_permalink()` temporäre URLs liefern: finale veröffentlichte Ziel-URLs/`get_sample_permalink()` kontrollieren bzw. während eines genehmigten geschützten Wartungsfensters veröffentlichen und danach die endgültigen Permalinks aus WordPress ermitteln. Keine `preview=true`-/Nonce-Links im Inhalt speichern. Startseite erhält letztlich die Wurzel-URL.

Mapping lokal erstellen, **alle** sieben Medien aufführen (Ausschnitt):

```json
{
  "home": "https://neu.andreasspricht.de/",
  "impressum": "https://neu.andreasspricht.de/?page_id=NEUE_IMPRESSUM_ID",
  "datenschutz": "https://neu.andreasspricht.de/?page_id=NEUE_DATENSCHUTZ_ID",
  "media": {
    "andreas-scharrer-original.jpg": {"id": 101, "url": "https://neu.andreasspricht.de/wp-content/uploads/JAHR/MONAT/andreas-scharrer-original-scaled.jpg"}
  }
}
```

IDs/URLs sind **nur Schema-Beispiele**, keine gültige Importdatei. Alle Dateinamen stehen im Manifest. Für Bilder `wp_get_attachment_url(NEUE_ID)` verwenden, nicht die Beispiel-URL; MP3-URL ebenfalls von WordPress lesen. Beispiel für einzelne Auskunft: `wp eval 'echo wp_get_attachment_url(101);'` mit tatsächlicher ID. Mapping nie aus einer kompletten Datenbank-/Benutzerdatei gewinnen.

Offline beim Ausführenden:

```sh
python3 render-content.py /LOKALES_PAKET /LOKALES_MAPPING.json /NEUER_LOKALER_AUSGABEORDNER
```

Das Werkzeug prüft Paketdateihashes, sieben unterschiedliche positive Medien-IDs, HTTPS-Stagingziel und unaufgelöste Tokens. Es kontaktiert das Hosting nicht und beweist nicht, dass die angegebenen IDs dort existieren; dies separat im Ziel prüfen. Keine Live-URL wird vom Vorbereitungstool akzeptiert. Inhalt aus der Ausgabe in den **Code-Editor** der drei neuen Gutenberg-Seiten einfügen, danach zurück in den visuellen Editor: alle Blöcke müssen gültig sein. Das ist ein einmaliger Import; spätere Redaktion erfolgt visuell. Alternativ gezielt `wp post update NEUE_ID /PRIVATER_PFAD/rendered/pages/home.html` (entsprechend je Seite). Nur protokollierte neue IDs, keine automatische Suche nach Titel/Slug.

## 4. Zentrale Teile und Theme-Verknüpfungen

Zwei **neue** zentrale Teile mit den exakt freien Slugs `header`/`footer` unter dem Child anlegen. Beispiel Header (Footer analog mit `--post_name=footer` und seiner Datei):

```sh
wp post create /PRIVATER_PFAD/rendered/parts/header.html --post_type=wp_template_part --post_status=publish --post_name=header --post_title='Header – Andreas spricht' --porcelain
wp post term set NEUE_HEADER_ID wp_theme andreas-spricht-bordeaux
wp post term set NEUE_HEADER_ID wp_template_part_area header
```

Taxonomien werden von Core registriert. Tatsächlichen Slug prüfen; bei `header-2` abbrechen und Konflikt untersuchen. Die Dateien enthalten bereits die native `.as-site`-Gruppe, nicht nochmals einbetten. Keine Header/Footer in die Seiten kopieren.

Für Defaultlinks und Dateivorlagen sind diese zwei Optionen erforderlich. Nur hinzufügen, wenn sie laut aktuellem Inventar nicht existieren; IDs ersetzen. Separate lokale JSON-Dateien vermeiden Shell-Quoting-Fehler:

```json
{"home": 201, "impressum": 202, "datenschutz": 203}
```

Als `pages-map.json` privat speichern. Zweite Datei `parts-map.json`:

```json
{"parts": {"header": 204, "footer": 205}, "source": "reviewed-staging-import"}
```

```sh
wp option add as_phase2_pages --format=json < /PRIVATER_PFAD/pages-map.json
wp option add as_shared_parts_v1 --format=json < /PRIVATER_PFAD/parts-map.json
```

Das sind Zielkonfigurationen, **kein** vorgetäuschtes lokales Migrationsbackup. Der lokale Rollback-Helfer darf hier nicht verwendet werden. Ein existierender Marker wird nicht überschrieben. Die Datenstruktur `as_phase2_media` ist nur für lokale Verifikation nötig, nicht für das Laufzeit-Theme; Zielmedien-IDs privat im Übergabeprotokoll halten.

Erst nach Inhalts-/Konfliktprüfung im freigegebenen Stagingfenster:

- Drei neue Seiten veröffentlichen; Child aktivieren; **Einstellungen → Lesen → statische Startseite → neue Andreas-Seite** zuweisen. `blog_public=0` beibehalten. Alternativ gezielte WP-CLI-Einzelschritte mit protokollierten neuen IDs.
- **Einstellungen → Datenschutz:** neue Datenschutzseite zuweisen (`wp_page_for_privacy_policy`). Etwaige alte Zuordnung privat notieren.
- Final aufgelöste Rechts-/Medien-/Ankerlinks erneut prüfen, gegebenenfalls Mapping neu erzeugen und **nur die neu erstellten, noch nicht redaktionell geänderten** Inhalte aktualisieren. Keine gleichzeitige Redaktion während des Imports.
- Nicht pauschal Core/Parent/Plugins/Rewrite aktualisieren. Antispam Bee nicht ungeprüft entfernen oder aktivieren/deaktivieren; Verträglichkeit auf echter Installation prüfen. Es gibt kein Kontaktformular, nur Mailto.
- Alte Startseite erst nach vereinbarter Entscheidung auf Entwurf setzen, damit keine zweite öffentliche/indizierbare Fassung bleibt. Keine Altmedien löschen. Keine Live-Domain auswählen.

### Falls SSH/WP-CLI fehlt

Medien, Seiten und Child lassen sich über den Admin vorbereiten. **Die zwei Optionszuordnungen und die genaue Theme-Taxonomie der zentralen Teile sind mit den vorhandenen Werkzeugen noch kein vollständig getesteter reiner Klickimport.** Nicht in phpMyAdmin mit serialisierten Strings improvisieren und kein dauerhaftes Importplugin installieren. Vor Staging-Freigabe einen durch den Hoster ausgeführten WP-CLI-Schritt oder einen separat zu prüfenden, einmaligen Importweg vereinbaren. Das Paket ist absichtlich kein ungeschützter Browserinstaller. Die spätere Inhaltsbearbeitung bleibt vollständig im nativen Editor möglich; dieser einmalige Installationsschritt ist davon getrennt.

## 5. Abnahme auf dem echten Staging

Diese Tests lassen sich erst **nach genehmigter Installation unter neu.andreasspricht.de** abschließend durchführen:

- Frontend unangemeldet und angemeldet: drei Seiten, genau ein Header/Footer, Logo/Anker/Email/Facebook/Amazon/Rechtslinks; keine lokalen URLs, Mixed Content oder `preview`-Links. Beide Porträts und beide Cover unverzerrt; mobile Porträtreihenfolge und Heroausschnitt wie Referenz.
- Alle drei MP3s wirklich laden, abspielen, pausieren, an andere Stelle springen. Kein Autoplay. HTTP `Content-Type`, `Content-Length`, Byte-Range-Anfrage (`Range: bytes=0-1023`, erwartete 206/Content-Range) und Caching prüfen; **besonders Safari/iOS** kann bei falschen Antworten scheitern. Kein erfolgreicher lokaler Test ersetzt diese Hostingprüfung.
- Echte iPhone-/iPad-Safari-Tests (Hoch/Quer), Desktop und 320/375/390/430/820/1024/1366/1440 px. Keine doppelte Navigation, kein horizontaler Überlauf.
- Echter Seiteneditor: Text, Foto, beide Buchkarten und MP3-Zuordnung ändern, speichern, neu öffnen, Frontend prüfen, zurücksetzen. Echter Website-Editor: Header/Footer ändern, auf allen drei Seiten nachweisen, neu laden und Original wiederherstellen. Admin und spätere redaktionelle Rolle getrennt prüfen.
- TLS/Zertifikatskette, HTTPS-Redirects ohne Schleifen, Cache-/Security-/Pluginverhalten, Uploadverarbeitung, PHP-Logs sowie Web-PHP 8.4.27 prüfen. CLI-Version allein reicht nicht.
- `blog_public=0` und tatsächliche Robots-/HTTP-Ausgabe prüfen, private Stagingzugänge bei Bedarf separat abnehmen. WordPress-Telemetrie/Plugins/Datenschutzerklärung, lokale Fonts, Accessibility/SEO anhand tatsächlichen Betriebs fachlich freigeben.

Bei Abbruch nur neue, protokollierte Importobjekte und geänderte Zuordnungen gezielt zurücknehmen; bestehende IDs nicht pauschal löschen. Vorherigen Parent und vorherige Startseiten-/Datenschutzwerte wiederherstellen. Keine Live-Pfade berühren. Bei späterer Redaktion vor Rücknahme neue Inhalte sichern/abgleichen. Nach Abnahme Installationsdateien/Inventar außerhalb des Webroots entfernen oder privat archivieren.
