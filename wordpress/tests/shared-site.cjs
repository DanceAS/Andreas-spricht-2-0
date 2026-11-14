// Local full-site behavior and reference comparison; never visits a live domain.
const { chromium, webkit } = require("playwright"),
  fs = require("node:fs/promises"),
  http = require("node:http"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  out = path.resolve(root, process.env.AS_TEST_OUTPUT || "work/issue-12");
const server = http.createServer(async (req, res) => {
  try {
    const relative =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    const base = ["app.js", "content.js"].includes(relative)
      ? root
      : path.join(root, "bordeaux");
    const file = path.resolve(
      base,
      relative.endsWith("/") ? relative + "index.html" : relative,
    );
    if (!file.startsWith(base + path.sep)) throw Error();
    res.setHeader(
      "Content-Type",
      {
        ".css": "text/css",
        ".js": "text/javascript",
        ".jpg": "image/jpeg",
        ".html": "text/html; charset=utf-8",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(await fs.readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
const selectors = [
  ".header",
  ".header .brand",
  ".header nav",
  "#start",
  "#start h1",
  "#start .intro",
  ".hero-visual",
  ".hero-visual img",
  ".hero-visual__caption",
  ".hero-bottom",
  "#hoerproben",
  "#hoerproben .section-top",
  "#hoerproben .placeholder-note",
  ".sample",
  ".sample-number",
  ".sample h3",
  ".sample-copy p",
  ".play",
  ".progress-group",
  "#ueber-mich",
  ".about-portrait",
  ".about-portrait img",
  ".about-copy h2",
  ".about-lead",
  ".signature",
  "#hoerbuecher",
  ".book-columns",
  ".column-description",
  ".studio-book",
  ".studio-cover img",
  ".studio-book h4",
  ".studio-book .book-link",
  "#kontakt",
  ".contact-subtitle",
  ".contact-button",
  ".footer",
  ".footer .brand",
];
async function data(p, wp) {
  return p.evaluate(
    ({ selectors, wp }) => {
      const m = (s) => {
        let e = document.querySelector(
          wp && s === ".studio-book .book-link"
            ? ".studio-book .book-link-wrap > a"
            : wp && s === ".contact-button"
              ? ".contact-button-wrap > a"
              : s,
        );
        if (s === ".sample-copy p" && !wp)
          e = document.querySelector(".sample h3").nextElementSibling;
        const r = e.getBoundingClientRect(),
          c = getComputedStyle(e);
        return {
          x: r.x,
          y: r.y + scrollY,
          width: r.width,
          height: r.height,
          fontSize: c.fontSize,
          fontWeight: c.fontWeight,
          lineHeight: c.lineHeight,
          color: c.color,
          fontFamily: c.fontFamily,
          letterSpacing: c.letterSpacing,
          objectFit: c.objectFit,
          objectPosition: c.objectPosition,
        };
      };
      const footer = document.querySelector("footer").getBoundingClientRect();
      return {
        items: Object.fromEntries(selectors.map((s) => [s, m(s)])),
        overflow: document.documentElement.scrollWidth - innerWidth,
        extraBelowFooter:
          document.documentElement.scrollHeight - footer.bottom - scrollY,
      };
    },
    { selectors, wp },
  );
}
(async () => {
  let b;
  const results = [];
  const engine = process.env.BROWSER || "chromium";
  try {
    await fs.mkdir(out, { recursive: true });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const reference = `http://127.0.0.1:${server.address().port}`;
    b = await (engine === "webkit" ? webkit : chromium).launch(
      engine === "webkit"
        ? {}
        : {
            executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
            args: ["--no-sandbox"],
          },
    );
    for (const width of [320, 375, 390, 430, 820, 1024, 1366, 1440]) {
      const c = await b.newContext({ viewport: { width, height: 1000 } });
      await c.route("**/*", (r) =>
        r
          .request()
          .url()
          .startsWith(reference + "/") ||
        r.request().url().startsWith("http://127.0.0.1:8890/")
          ? r.continue()
          : r.abort(),
      );
      const a = await c.newPage(),
        p = await c.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await a.goto(reference);
      await p.goto("http://127.0.0.1:8890");
      for (const page of [a, p]) {
        await page.locator("img").evaluateAll((xs) =>
          Promise.all(
            xs.map((i) => {
              i.loading = "eager";
              return i.decode();
            }),
          ),
        );
        await page.waitForTimeout(150);
      }
      const ref = await data(a, false),
        wp = await data(p, true);
      for (const selector of [
        ".hero-copy",
        ".hero-bottom",
        "#hoerproben .section-top",
        "#hoerproben .placeholder-note",
        "#ueber-mich",
        "#hoerbuecher",
        "#kontakt",
      ]) {
        const normalize = (t) => t.replace(/[\s\uFEFF]+/g, "");
        assert.equal(
          normalize(await p.locator(selector).innerText()),
          normalize(await a.locator(selector).innerText()),
          selector + " wording",
        );
      }
      const differences = [];
      for (const s of selectors) {
        for (const k of ["x", "y", "width", "height"]) {
          const delta = wp.items[s][k] - ref.items[s][k];
          if (Math.abs(delta) > 1.1)
            differences.push({
              selector: s,
              property: k,
              reference: ref.items[s][k],
              wordpress: wp.items[s][k],
              delta,
            });
        }
        for (const k of [
          "fontSize",
          "fontWeight",
          "lineHeight",
          "color",
          "fontFamily",
          "letterSpacing",
        ])
          if (wp.items[s][k] !== ref.items[s][k])
            differences.push({
              selector: s,
              property: k,
              reference: ref.items[s][k],
              wordpress: wp.items[s][k],
            });
      }
      assert.deepEqual(differences, [], width + " reference comparison");
      assert(wp.overflow <= 1);
      assert(Math.abs(wp.extraBelowFooter) <= 1);
      assert.equal(await p.locator("audio").count(), 3);
      assert(
        await p
          .locator("audio")
          .evaluateAll((xs) => xs.every((a) => a.paused && !a.autoplay)),
      );
      for (const id of ["hoerproben", "ueber-mich", "hoerbuecher", "kontakt"]) {
        await p.locator(`header a[href$="#${id}"]`).click();
        await p.waitForFunction(
          (id) =>
            Math.abs(
              document.querySelector("#" + id).getBoundingClientRect().top,
            ) < innerHeight,
          id,
          { timeout: 5000 },
        );
      }
      const rows = p.locator(".sample");
      for (let i = 0; i < 3; i++) {
        const row = rows.nth(i);
        await row.locator("button").click();
        await p.waitForFunction(
          (i) => document.querySelectorAll("audio")[i].currentTime > 0.2,
          i,
        );
        await row.locator("button").click();
        await row.locator("input").evaluate((e) => {
          e.value = "50";
          e.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await p.waitForFunction((i) => {
          const a = document.querySelectorAll("audio")[i];
          return (
            a.paused &&
            !a.seeking &&
            Math.abs(a.currentTime - a.duration / 2) < 0.5
          );
        }, i);
      }
      await p.screenshot({
        path: path.join(out, `${engine}-home-${width}.png`),
        fullPage: true,
      });
      await a.screenshot({
        path: path.join(out, `reference-${width}.png`),
        fullPage: true,
      });
      const sharedParts = await p.evaluate(() => ({
        header: document.querySelector("header").outerHTML,
        footer: document.querySelector("footer").outerHTML,
      }));
      assert.equal(await p.locator("header").count(), 1);
      assert.equal(await p.locator("footer").count(), 1);
      const legal = [];
      for (const label of ["Impressum", "Datenschutz"]) {
        await p
          .locator("footer a")
          .filter({ hasText: new RegExp("^" + label + "$") })
          .click();
        await p.waitForLoadState("load");
        assert.equal(await p.locator("main h1").count(), 1);
        assert(await p.locator("main").innerText());
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await a.goto(
          reference +
            "/" +
            (label === "Impressum" ? "impressum" : "datenschutz") +
            "/",
        );
        const normalize = (t) => t.replace(/\s+/g, "");
        assert(
          normalize(await p.locator("main").textContent()) ===
            normalize(await a.locator("main").textContent()),
          label + " wording",
        );
        assert.equal(await p.locator("header").count(), 1);
        assert.equal(await p.locator("footer").count(), 1);
        assert.equal(
          await p.locator("header").evaluate((e) => e.outerHTML),
          sharedParts.header,
        );
        assert.equal(
          await p.locator("footer").evaluate((e) => e.outerHTML),
          sharedParts.footer,
        );
        const sharedHeader = await p.locator("header").evaluate((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height };
        });
        for (const key of ["x", "y", "width", "height"])
          assert(Math.abs(sharedHeader[key] - ref.items[".header"][key]) < 1.1);
        await p.screenshot({
          path: path.join(out, `${engine}-${label}-${width}.png`),
          fullPage: label === "Impressum",
        });
        legal.push({
          label,
          url: p.url(),
          heading: await p.locator("h1").innerText(),
          wordingUnchanged: true,
          identicalSharedHeaderFooter: true,
          sharedHeaderStyleMatchesReference: true,
          mainHeight: await p
            .locator("main")
            .evaluate((e) => e.getBoundingClientRect().height),
          referenceHeight: await a
            .locator("main")
            .evaluate((e) => e.getBoundingClientRect().height),
        });
        await p.locator('header a[href$="#hoerproben"]').click();
        await p.waitForURL("**/#hoerproben");
        await p.waitForFunction(
          () =>
            Math.abs(
              document.querySelector("#hoerproben").getBoundingClientRect().top,
            ) < innerHeight,
        );
        await p.locator("header .brand a").click();
        await p.waitForURL("**/#start");
      }
      assert.equal(
        await p
          .locator("footer a")
          .filter({ hasText: /^Kontakt$/ })
          .getAttribute("href"),
        "mailto:kontakt@andreasspricht.de",
      );
      const facebook = p.locator('footer a[href*="facebook.com"]');
      assert.equal(await facebook.getAttribute("target"), "_blank");
      assert.equal(
        await p
          .getByRole("link", {
            name: "Andreas spricht auf Facebook",
            exact: true,
          })
          .count(),
        1,
      );
      assert.deepEqual(errors, []);
      results.push({
        width,
        ref,
        wp,
        differences,
        threeAudioPlayPauseSeek: true,
        navigation: true,
        oneHeaderFooterOnAllPages: true,
        legal,
        errors,
      });
      console.log(
        `${engine} ${width}px: ${differences.length} comparison differences; audio/navigation/legal OK`,
      );
      await c.close();
    }
  } finally {
    await fs.writeFile(
      path.join(out, `site-${engine}.json`),
      JSON.stringify(results, null, 2),
    );
    await b?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
