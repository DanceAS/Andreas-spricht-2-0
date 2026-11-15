# Privates Prüfblatt – nur ausgefüllt lokal aufbewahren

Diese leere Vorlage enthält keine Hostinggeheimnisse. Ausgefüllte Kopie und Screenshots **nicht committen/hochladen**, keine Passwörter hier eintragen. „Noch offen“ bedeutet: vor Umschaltung prüfen, nicht als Tatsache übernehmen.

## Minimaler KAS-Befund (vorher)

| Wert | Ist / Nachweis privat ausfüllen |
| --- | --- |
| Hauptdomain: exakter KAS-Webspace-Zielwert + absoluter statischer Pfad | Noch offen |
| `www`: eigener Eintrag, Alias oder Weiterleitung? Exakter Zielwert/Status | Noch offen |
| `neu`: exakter Zielwert, absoluter WP-Pfad | Laut Issue `/www/htdocs/w009877d/neu.andreasspricht.de`; im KAS bestätigen |
| Vorhandener WP-Ordner direkt als Hauptdomain-Ziel möglich? KAS-Eingabeformat? | Noch offen; Hoster/KAS bestätigen |
| Trennung der statischen/WP-Ordner, auch keine verschachtelte Kopie/Symlinkverwechslung | Noch offen |
| A/AAAA der Hauptdomain, `www` A/AAAA/CNAME, bestehendes Ziel beim selben Hosting | Noch offen; alte Werte sichern. In diesem Plan **keine DNS-Änderung** |
| SSL-Zertifikat gilt für Hauptdomain **und** `www`, Kette/gültig/Erneuerung | Noch offen; `neu`-Zertifikat allein reicht nicht |
| HTTPS-Erzwingen / `www`-Regel / `.htaccess` / Verzeichnisschutz | Alte Regeln, Ort und Wirkung notieren; keine zweite widersprechende Regel |
| Web-PHP bei Hauptdomain/`www`/`neu`, Handler und relevante Limits | Laut Nutzer PHP 8.4.27; Zuordnung je Host bestätigen |
| Gewünschte Canonical-Domain ausdrücklich bestätigt | Vorschlag `https://andreasspricht.de`, `www` → Hauptdomain; noch offen |
| Alter statischer Rückfall: Hauptdomain- und `www`-Ziele plus SSL/Redirects | Exakte Werte + Screenshots nötig |
| Separater leerer Zielordner für `neu` nach Live-Abnahme, ohne Listing/WP/DB | Noch offen; schützt vor zweitem WordPress-Host nach Indexierungsfreigabe |

KAS **Domain → Bearbeiten** liefert Ziel/SSL/PHP. `neu`/`www` ggf. unter **Subdomain** bzw. Domain-Alias-Konfiguration prüfen. DNS-Werkzeuge nur lesen. Ist der DNS-/Aliasbefund anders als angenommen, erst den Plan anpassen. MX, Mailkonten und Mail-DNS werden hier nicht verändert.

## WordPress und Sicherung

- [ ] Single-Site bestätigt (Website-Zustand/Hoster; kein Netzwerk), WordPress 7.1.4, TT5 1.5, Child 0.3.1, PHP 8.4.27, MariaDB 10.6.23 laut Issue mit tatsächlich angezeigten Werten abgeglichen.
- [ ] `home` und `siteurl` beide `https://neu.andreasspricht.de`, bearbeitbar; `blog_public=0`. Keine erzwungenen URL-/Cookie-/Upload-/Multisite-Konstanten, MU-/Cache-/Redirectregeln ungeklärt. `wp-config.php` nur privat/mit Hoster prüfen; nicht posten.
- [ ] Richtige **dedizierte** DB und Tabellenpräfix bestätigt. Eigene WP-Core-Tabellen: `PREFIX_commentmeta`, `comments`, `links`, `options`, `postmeta`, `posts`, `term_relationships`, `term_taxonomy`, `termmeta`, `terms`, `usermeta`, `users` jeweils mit demselben echten Präfix. **Nicht `wp_` voraussetzen.** Zusätzliche Plugin-Tabellen einzeln zuordnen; fremde/Backup-Tabellen nicht auswählen. Zusätzliche ungeklärte URL-Speicher: Stopp, nicht weglassen.
- [ ] Staging-Import abgeschlossen, Importplugin entfernt; aktive Plugins und Permalinkstruktur privat notiert. Tatsächliche Rechtsseiten-URLs/IDs und alte öffentliche `.html`-/Unterverzeichnispfade samt gewünschtem Ziel dokumentiert; keine URLs erfinden.
- [ ] Frische vollständige Dateien/DB/KAS-Sicherung geprüft, Wiederherstellungsprobe bestanden, keine öffentliche Archivkopie. Siehe [Backup](BACKUP.md).
- [ ] Endgültige Tabellenliste und Better-Search-Replace-Version bestätigt; keine Entwicklungsversion, GUID-Ersetzung aus.
- [ ] Redaktion pausiert, Zeitfenster **von … bis …**, Rückfall bei nicht bestandener Abnahme bis **…**, Zuständiger **…** und bestätigter Rückspielkontakt **…** festgelegt. Nicht bloß eine vermutete Dauer eintragen.

## URL-Prüfung

Im Better-Search-Replace-Testlauf mit bestätigten Tabellen nacheinander prüfen; nur tatsächlich vorhandene Formen nach Prüfung schreiben:

| Suche (wörtlich) | Ersetzen durch (wörtlich) |
| --- | --- |
| `https://neu.andreasspricht.de` | `https://andreasspricht.de` |
| `http://neu.andreasspricht.de` | `https://andreasspricht.de` |
| `https:\/\/neu.andreasspricht.de` | `https:\/\/andreasspricht.de` |
| `http:\/\/neu.andreasspricht.de` | `https:\/\/andreasspricht.de` |
| `//neu.andreasspricht.de` (protokollrelative Restwerte) | `//andreasspricht.de` |

Keine abschließenden Slashes an die normalen Suchwerte anhängen; so werden sowohl die Basisadresse als auch Pfade erfasst. Die JSON-Zeilen enthalten **jeweils genau einen echten Backslash vor jedem Slash**. Kein Code-/SQL-Editor erforderlich; Werte in die Plugin-Suchfelder kopieren. Trefferzahl, betroffene Tabellen, Laufstatus und Zeitpunkt jeweils privat notieren. Erst trocken, dann dieselbe Zeile mit deaktiviertem Testlauf. Nach Abschluss trocken auf Resttreffer prüfen. URL-kodierte Formen (`https%3A%2F%2F…`) oder weitere Varianten bei tatsächlichen Funden fachkundig gesondert zuordnen; nicht nachträglich „alles irgendwie“ ersetzen.

Keine Suche nur nach `neu.andreasspricht.de`, kein globales `andreasspricht.de` → `neu…` als Rückfall. GUIDs, BSR-eigene Suchprotokolle und unveränderte private Sicherungen können alte URLs enthalten; diese sind keine aktuellen Medienlinks. Aktuelle Inhalte, Optionen, zentrale Template-Teile, Global Styles und Medienmetadaten müssen hingegen geklärt sein. Die freie Pluginversion bietet keine vollständige Einzeländerungsansicht: bei unklaren Treffern erst privat mit Fachkundigem prüfen.

## Freigabeprotokoll

- Vereinbart: Domainwechsel grundsätzlich laut Issue freigegeben; Canonical-Entscheidung hier: **…**.
- Umgesetzt auf Hosting: **noch nichts durch Codex**. Erst bei tatsächlicher Durchführung Schritt/Zeit/Resultat eintragen.
- Technisch überprüft lokal: [Bericht](TEST-REPORT.md). Hosting-Abnahme und echte Safari-Geräte: **offen bis Nutzerprüfung**.
- Sicherung geprüft am **…**, KAS-Befund bestätigt am **…**, Umstellung ausgeführt durch **…**, Abnahme bestanden am **…**, Indexierung freigegeben am **…**.
