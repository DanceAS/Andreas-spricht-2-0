# Issue #6: Diagnose des mobilen Seitenendes

## Ergebnis und Abgrenzung

Geprüfter `main`: `26979db128d6f791fe3666f0a342f3c4632764f0` (2026-11-01).
AGENTS.md wurde vor den Änderungen gelesen. Auftrag: statische Bordeaux-Zwischenlösung untersuchen, ausschließlich Branch und PR. WordPress mit Twenty Twenty-Five bleibt das Endziel.

**Der im Issue beschriebene große Leerraum unter dem Footer ist lokal in Chromium nicht reproduzierbar. Die Ursache auf dem betroffenen iPhone ist nicht bestätigt.** Entsprechend der ausdrücklichen Vorgabe in Issue #6 wurde keine spekulative CSS-Korrektur eingebaut. Dieser PR ergänzt ausschließlich Diagnose, Messwerte und einen lokal ausführbaren Browsertest. Keine Website-Datei, keine Variante, kein Design und kein Deployment-Workflow wird geändert.

Kein Zugriff auf Live-Website, ALL-INKL, DNS, Domains, Wix oder WordPress. Ein Vergleich der tatsächlich ausgelieferten Live-Dateien mit `main` wurde deshalb nicht durchgeführt. Der im Issue erwähnte Screenshot `IMG_5362.png` ist dort nicht angehängt und liegt für diese Prüfung nicht vor.

## Tatsächlich untersuchter Code

- `bordeaux/index.html`: Footer nach `main`, anschließend ein geschlossenes `dialog`. Keine weiteren sichtbaren Seitenabschnitte nach dem Footer. Ressourcen, dynamische Player und lokale Skripte berücksichtigt.
- `bordeaux/styles.css`: alle allgemeinen und mobilen Regeln einschließlich beider `@media(max-width:600px)`-Nachträge, Abschnittspaddings, Footer-Flexlayout und Facebook-Pseudoelement geprüft. `body` hat `margin:0`; keine erzwungene Dokumenthöhe oder `vh`/`dvh`-Mindesthöhe. Im gemessenen Browser hat der mobile Footer 30 px oberes/unteres Padding und eine Gesamthöhe von 160,906 px. Das ist Bestandteil des Footers, kein großer zusätzlicher Bereich danach.
- `bordeaux/hero-image-v2.css:3–39`: Hero mit fester Höhe, `position:relative`, `overflow:hidden`; Bild und Caption absolut darin positioniert. Mobile Hero-Höhe durch das später geladene Stylesheet effektiv 400 px; keine Änderung dieser Gestaltung im PR. Kein gemessener Überlauf unter den Footer.
- `bordeaux/mobile-about-portrait.js:7–15`: dasselbe Porträt wird bei maximal 600 px verschoben und bei größeren Viewports zurückgesetzt. Tests vor und nach Breakpoint-Wechsel finden genau ein Porträt, keinen übrig gebliebenen Layoutblock nach dem Footer.
- `bordeaux/fit-sample-intro.js:35–43`: ResizeObserver und Größenwechsel passen die Schriftgröße des Hörproben-Einleitungssatzes an; kein angehängter Hilfscontainer und keine Änderung der Dokumenthöhe per JS.
- `bordeaux/studio-content.js`, `bordeaux/sample-content.js`, gemeinsame `content.js` und `app.js`: Buchdaten und drei Player berücksichtigt. `app.js:16` erzeugt Audioobjekte ohne Einfügen in den DOM; Player werden in `#sample-list` angehängt. Die Audiowiedergabe und Positionswechsel erzeugen im geprüften Browser keinen Bereich nach dem Footer. Kein Scroll-/Viewport-Skript im gemeinsamen App-Code.
- `bordeaux/impressum.css` und `bordeaux/datenschutz.css` sind auf der Startseite nicht eingebunden; sie bestimmen deren Dokumenthöhe nicht.

Diese Befunde sind keine Aussage über ungeprüfte Safari-Versionen oder eine möglicherweise abweichende Hosting-Auslieferung.

## Praktisch geprüft

Linux Chromium **154.0.8037.57**, echte Browser-Layouts mit mobilen Viewports und Touch-Emulation bei 320/375/390/430 px, zusätzlich 820 px (Tablet) und 1440 px (Desktop). **Kein echter iOS-/Safari-Test.** Jeweils beide lokale URL-Strukturen geprüft: flacher ALL-INKL-Export `/` und Pages-Struktur `/bordeaux/`, einschließlich gemeinsamer JS-Dateien. Alle Anfragen bleiben lokal; externe Navigation wird nicht aufgerufen.

Jeder der zwölf Fälle misst vier Zustände: initial nach Schriftbereitschaft, Seitenende nach Bilddekodierung, nach Navigation/Audio sowie nach zwei Breitenwechseln über 600 px und veränderter Viewporthöhe. Erfasst werden `html`-/`body`-Höhe, `scrollHeight`, Footer-Unterkante und -Höhe, Visual-Viewporthöhe, horizontaler Überlauf und Elemente mit Unterkante unterhalb des Footers. Für deterministische Endmessung wird nur im Test `scroll-behavior:auto` gesetzt; die ausgelieferte CSS-Datei bleibt unverändert.

Messwerte am Seitenende nach Bilddekodierung; beide URL-Strukturen liefern dieselben Werte:

| Breite | html-/body-Höhe = Footer-Unterkante | scrollHeight | Differenz unter Footer |
| --- | ---: | ---: | ---: |
| 320 px | 4620,578 px | 4621 px | +0,422 px |
| 375 px | 4441,031 px | 4441 px | −0,031 px |
| 390 px | 4428,688 px | 4429 px | +0,312 px |
| 430 px | 4275,984 px | 4276 px | +0,016 px |
| 820 px | 3581,891 px | 3582 px | +0,109 px |
| 1440 px | 3577,609 px | 3578 px | +0,391 px |

Die Differenzen stammen aus dem Vergleich ganzzahliger `scrollHeight` mit gebrochenen Layoutkoordinaten. In allen 48 Messzuständen: maximal 1 px Differenz, kein Element unterhalb der Footer-Unterkante und kein horizontaler Dokumentüberlauf. Alle zwölf Fälle prüfen außerdem:

- vier Header-Anker erreichbar;
- drei Hörproben ohne Autoplay, jeweils Wiedergabe, Pause und Sprung auf 50 % erfolgreich;
- alle vier Bilder dekodierbar;
- genau ein Über-mich-Porträt auch nach Größenwechseln;
- keine JavaScript-Laufzeitfehler oder fehlenden lokalen Seitenressourcen.

Ausgewählte vollständige Höhenwerte und Zustände stehen in [issue-6-mobile-footer-results.json](issue-6-mobile-footer-results.json). Das Testskript erzeugt zusätzlich Footer-Screenshots und ausführliche Messdaten im ignorierten Verzeichnis `work/issue-6/`.

## Reproduktion des Tests

Node.js und Playwright werden nur für die lokale Entwicklungsprüfung benötigt, nicht für Website-Besucher. Playwright ist in dieser Arbeitsumgebung bereits verfügbar. In einer eigenen Entwicklungsumgebung gegebenenfalls `npm install --no-save --package-lock=false playwright` und den gewünschten Browser installieren. Dieser PR verändert die Projektabhängigkeiten nicht.

```sh
node tests/diagnose_mobile_footer.cjs
```

Standard: vorhandenes Chromium unter `/usr/bin/chromium`; anderer Pfad über `CHROMIUM_PATH`. Der Test startet und beendet seinen eigenen HTTP-Server auf einem freien lokalen Port.

Für eine Umgebung mit installiertem Playwright-WebKit:

```sh
BROWSER=webkit node tests/diagnose_mobile_footer.cjs
```

**WebKit konnte hier nicht ausgeführt werden:** Das Browserpaket ist nicht installiert. Der Installationsversuch mit der vorhandenen Playwright-CLI scheiterte an HTTP 403 `Domain forbidden` für die offiziellen Browser-Downloadhosts. Keine Netzwerkregel wurde umgangen oder geändert. Ein Linux-WebKit-Test würde zusätzlich helfen, ersetzt jedoch keinen Test auf dem betroffenen iPhone mit dessen Safari und Browserleisten.

## Benötigte Angaben für die bestätigte Safari-Ursache

1. iPhone-Modell, iOS-Version, Safari bzw. anderer Browser/In-App-Browser und Ausrichtung; gegebenenfalls Seitenzoom/Schriftvergrößerung.
2. Den erwähnten Screenshot oder eine kurze Bildschirmaufnahme: Footer sichtbar, dann weiter nach unten scrollen und loslassen. Bleibt der Leerraum stehen oder springt die Seite zurück? Damit lässt sich ein dauerhafter Layoutüberlauf von kurzzeitigem Safari-Overscroll unterscheiden, ohne einen davon bereits als Ursache zu behaupten.
3. Genaue betroffene URL, Zeitpunkt und ob direkt nach Neuladen oder erst nach Audio, Navigation, Zurück-Navigation bzw. Drehen des Geräts. Tritt es auch in einem privaten Tab auf?
4. Abgleich des hochgeladenen ZIP-/Quell-Commits und der dort ausgelieferten CSS-/JS-Dateien durch eine dazu autorisierte Prüfung. Der lokale `main`-Stand beweist nicht, welche Dateien das Hosting aktuell ausliefert.
5. Falls verfügbar: über Safari Web Inspector am betroffenen iPhone folgende rein lesende Messung am stehenbleibenden Seitenende ausführen und das Ergebnis übernehmen. Dafür keine Zugangsdaten oder persönlichen Browserdaten weitergeben:

```js
(() => {
  const bounds = e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { tag: e.tagName, id: e.id, class: String(e.className),
      top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height,
      scrollHeight: e.scrollHeight, position: s.position, overflow: s.overflow,
      minHeight: s.minHeight, paddingBottom: s.paddingBottom, marginBottom: s.marginBottom };
  };
  const footer = document.querySelector('footer');
  if (!footer) return { error: 'Kein Footer gefunden' };
  const f = bounds(footer);
  return { viewport: { width: innerWidth, height: innerHeight,
      visualHeight: visualViewport?.height, visualOffsetTop: visualViewport?.offsetTop },
    scrollY, html: bounds(document.documentElement), body: bounds(document.body), footer: f,
    extraBelowFooter: document.scrollingElement.scrollHeight - f.bottom,
    outliers: [...document.querySelectorAll('body *')].filter(e =>
      getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().bottom + scrollY > f.bottom + 1).map(bounds),
    resources: [...document.querySelectorAll('link[rel="stylesheet"], script[src]')].map(e => e.href || e.src) };
})();
```

Anschließend den tatsächlich reproduzierten Verursacher isolieren und eine minimale Änderung mit Vorher-/Nachher-Messungen auf denselben Geräten testen. **Keine pauschale Höhenbegrenzung, kein `overflow:hidden` für `html/body` und kein Abschneiden von Inhalten auf Verdacht.** Freigabe des PR ist keine Freigabe für ein Live-Deployment; Übernahme in ALL-INKL bleibt separat abzunehmen. Die Fehlerbehebung bleibt bis zur Reproduktion offen.
