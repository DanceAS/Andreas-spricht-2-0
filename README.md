# Andreas spricht 2.0

Erster lokaler Designentwurf für Andreas Scharrer. Keine Veröffentlichung und keine Verbindung zu WordPress. Schlanke statische Website ohne Framework, externe Schriften, Tracker oder installierbare Abhängigkeiten.

## Vorschau starten

Node.js 20 oder neuer installieren, das Repository herunterladen und im Projektordner ausführen:

```sh
npm run dev
```

Dann http://localhost:3000 im Browser öffnen. Beenden mit Strg+C. Alternativ kann `index.html` direkt im Browser geöffnet werden; für die Audiowiedergabe wird die Server-Vorschau empfohlen. In einer entfernten Entwicklungsumgebung Port 3000 über deren Vorschau/Portfreigabe öffnen.

## Inhalte ändern

- `content.js`: Hörproben und Bücher ergänzen oder austauschen. Ein weiteres Objekt im jeweiligen Array erzeugt einen weiteren Eintrag.
- Audios in `assets/` ablegen, z. B. `assets/hoerprobe-01.mp3`, und im Feld `src` eintragen. Leere Quellen bleiben als nicht abspielbare Platzhalter sichtbar. Echte Dateien aktivieren Play/Pause, Zeitanzeige und Fortschrittsregler. Es spielt jeweils nur eine Hörprobe.
- Bücher: `title`, `author`, `description`, `status`, `cover` (Dateipfad) und optional `url` (https-Link) eintragen.
- Kontakt: bestätigte E-Mail-Adresse in `email` eintragen. Dann erscheint ein echter E-Mail-Link. Es gibt keinen Formularversand.
- Porträts: die beiden `.portrait`-Platzhalter in `index.html` durch echte Bilder mit passendem Alternativtext ersetzen; Maße/Positionen in `styles.css` anpassen. Kein Foto einer anderen Person wurde verwendet.
- Impressum/Datenschutz: Dialogtexte am Ende von `app.js` durch vollständige, fachlich geprüfte Texte ersetzen. Die jetzigen Hinweise sind ausschließlich Platzhalter.
- Gestaltung: Farben und Typografie in `styles.css`, feste Inhalte in `index.html`.

## Prüfung

```sh
npm run check
```

Vor einer Veröffentlichung echte Inhalte, Kontaktdaten und rechtliche Texte ergänzen und auf realen Mobilgeräten sowie mit Tastatur prüfen. Kein Deployment eingerichtet. Der kleine Node-Server dient ausschließlich der lokalen Vorschau.
