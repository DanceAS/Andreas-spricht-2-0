// Edit every content kind via the actual visual editor; no REST/DB writes for edits.
const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  out = path.join(root, "work/issue-10"),
  origin = "http://127.0.0.1:8890";
const option = (name) =>
  JSON.parse(
    cp.execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "wordpress/compose.yml",
        "run",
        "--rm",
        "-T",
        "cli",
        "wp",
        "option",
        "get",
        name,
        "--format=json",
      ],
      { cwd: root, encoding: "utf8" },
    ),
  );
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const pages = option("as_phase2_pages"),
    media = option("as_phase2_media");
  const env = Object.fromEntries(
    fs
      .readFileSync(path.join(root, "wordpress/.env"), "utf8")
      .trim()
      .split("\n")
      .map((l) => l.split("=")),
  );
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await b.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route("**/*", (r) =>
    r
      .request()
      .url()
      .startsWith(origin + "/") || r.request().url().startsWith("blob:")
      ? r.continue()
      : r.abort(),
  );
  const p = await context.newPage(),
    front = await context.newPage();
  const results = { pages: {}, homeChecks: [], restored: false };
  try {
    await p.goto(origin + "/wp-login.php");
    await p.locator("#user_login").fill(env.WP_ADMIN_USER);
    await p.locator("#user_pass").fill(env.WP_ADMIN_PASSWORD);
    await p.locator("#wp-submit").click();
    const f = p.frameLocator('iframe[name="editor-canvas"]');
    async function open(id) {
      await p.goto(origin + `/wp-admin/post.php?post=${id}&action=edit`);
      await p.waitForFunction(
        () =>
          window.wp?.data?.select("core/block-editor").getBlocks().length > 0,
      );
      const welcome = p
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true });
      if (await welcome.count()) await welcome.click();
    }
    async function valid() {
      const blocks = await p.evaluate(() => {
        const walk = (bs) =>
          bs.flatMap((x) => [
            { name: x.name, valid: x.isValid },
            ...walk(x.innerBlocks),
          ]);
        return walk(wp.data.select("core/block-editor").getBlocks());
      });
      assert(
        blocks.every(
          (x) =>
            x.valid && x.name.startsWith("core/") && x.name !== "core/html",
        ),
      );
      return blocks.length;
    }
    async function save() {
      await p.getByRole("button", { name: "Save", exact: true }).click();
      await p.waitForFunction(
        () =>
          !wp.data.select("core/editor").isSavingPost() &&
          !wp.data.select("core/editor").isEditedPostDirty(),
      );
    }
    async function replace(selector, id, audio = false) {
      await f
        .locator(selector)
        .first()
        .click({ position: audio ? { x: 20, y: 15 } : { x: 100, y: 100 } });
      await p.getByRole("button", { name: "Replace", exact: true }).click();
      await p.getByRole("menuitem", { name: "Open Media Library" }).click();
      await p.getByRole("tab", { name: "Media Library", exact: true }).click();
      const item = p
        .getByRole("dialog")
        .locator(`[data-id="${id}"][role="checkbox"]`);
      await item.waitFor();
      if ((await item.getAttribute("aria-checked")) !== "true")
        await item.click();
      await p
        .getByRole("dialog")
        .getByRole("button", { name: "Select", exact: true })
        .click();
    }
    async function link(selector, text, url) {
      await f.locator(selector).click();
      await p.getByRole("button", { name: "Edit link", exact: true }).click();
      await p.getByLabel("Text", { exact: true }).fill(text);
      await p.getByPlaceholder("Search or type URL").fill(url);
      await p
        .locator(".block-editor-link-control")
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await p.keyboard.press("Escape");
    }
    async function fill(selector, text) {
      await f.locator(selector).fill(text);
    }
    await open(pages.home);
    results.pages.home = { validBefore: await valid() };
    const fields = [
      [".hero .eyebrow", "Sprecherzeile EDITORTEST"],
      [".sample h3", "Hörprobentitel EDITORTEST"],
      [".sample-copy p", "Genre und Autor EDITORTEST"],
      [".about-lead", "Über mich EDITORTEST"],
      [".studio-book h4", "Buchtitel EDITORTEST"],
      [".studio-book h4 + p", "Buchautor EDITORTEST"],
      [".studio-book .book-status", "Buchstatus EDITORTEST"],
      [".studio-book .book-description", "Buchbeschreibung EDITORTEST"],
      [".contact-subtitle", "Kontakttext EDITORTEST"],
      [".footer > p:not(.brand)", "Copyright EDITORTEST"],
    ];
    console.log("Editor loaded, native blocks valid");
    const originals = [];
    for (const [selector, text] of fields) {
      const loc = f.locator(selector).first();
      originals.push([
        selector,
        (await loc.innerText()).replace(/\uFEFF/g, ""),
      ]);
      await loc.fill(text);
    }
    console.log("Replacing hero image");
    await replace(".hero-visual__image", media["andreas-scharrer-8.jpg"]);
    await replace(
      '.studio-cover [data-type="core/image"]',
      media["die-geschichte-von-den-watschlawanen-cover.jpg"],
    );
    await replace(
      '.sample [data-type="core/audio"]',
      media["hoerprobe-letzte-vorstellung.mp3"],
      true,
    );
    const links = [
      ['.header a[href="#hoerproben"]', "Hörproben EDITORTEST", "#ueber-mich"],
      [
        ".studio-book .book-link-wrap > a",
        "Buchlink EDITORTEST",
        "https://www.amazon.de/dp/B0HFYC4VNN?editor-test=1",
      ],
      [
        ".contact-button-wrap > a",
        "E-Mail EDITORTEST",
        "mailto:kontakt@andreasspricht.de?subject=Editortest",
      ],
    ];
    const linkOriginals = [];
    for (const [selector, text, url] of links) {
      linkOriginals.push([
        selector,
        await f.locator(selector).innerText(),
        await f.locator(selector).getAttribute("href"),
      ]);
      await link(selector, text, url);
    }
    console.log("Saving edited home");
    await save();
    await front.goto(origin);
    await front.locator(".hero-visual img").evaluate((i) => i.decode());
    for (const [selector, text] of fields)
      assert.equal(await front.locator(selector).first().innerText(), text);
    assert.match(
      await front.locator(".hero-visual img").getAttribute("src"),
      /andreas-scharrer-8/,
    );
    assert.match(
      await front.locator(".studio-cover img").getAttribute("src"),
      /watschlawanen/,
    );
    assert.match(
      await front.locator(".sample audio").first().getAttribute("src"),
      /letzte-vorstellung/,
    );
    for (const [, text, url] of links)
      assert.equal(
        await front
          .getByRole("link", { name: text, exact: true })
          .getAttribute("href"),
        url.replace(/&amp;/g, "&"),
      );
    await front.locator(".sample button").first().click();
    await front.waitForFunction(
      () => document.querySelector("audio").currentTime > 0.2,
    );
    await front.locator(".sample button").first().click();
    results.homeChecks.push(
      "text-heading-genre-about-author-status-description-contact-footer",
      "hero-and-book-cover-replaced-via-media",
      "mp3-replaced-via-core-audio-and-plays",
      "navigation-book-cta-link-text-and-url",
    );
    await front.screenshot({
      path: path.join(out, "edited-home.png"),
      fullPage: true,
    });
    await p.reload();
    await p.waitForFunction(
      () => window.wp?.data?.select("core/block-editor").getBlocks().length > 0,
    );
    results.pages.home.validAfterReload = await valid();
    for (const [selector, text] of fields)
      assert.equal(await f.locator(selector).first().innerText(), text);
    assert.match(
      await f.locator(".sample audio").first().getAttribute("src"),
      /letzte-vorstellung/,
    );
    await f.locator(".studio-book h4").scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(out, "editor-book-persisted.png") });
    for (const [selector, text] of originals)
      await f.locator(selector).first().fill(text);
    console.log("Replacing hero image");
    await replace(
      ".hero-visual__image",
      media["andreas-scharrer-original.jpg"],
    );
    await replace(
      '.studio-cover [data-type="core/image"]',
      media["beim-tanz-des-gefreiten-band-1-frontcover.jpg"],
    );
    await replace(
      '.sample [data-type="core/audio"]',
      media["hoerprobe-kap1-kurz.mp3"],
      true,
    );
    for (let i = 0; i < linkOriginals.length; i++) {
      const [, text, url] = linkOriginals[i];
      const selected = i === 0 ? '.header a[href="#ueber-mich"]' : links[i][0];
      await link(i === 0 ? selected + " >> nth=0" : selected, text, url);
    }
    await save();
    await front.reload();
    for (const [selector, text] of originals)
      assert.equal(await front.locator(selector).first().innerText(), text);
    assert.match(
      await front.locator(".sample audio").first().getAttribute("src"),
      /kap1-kurz/,
    );
    results.pages.home.restored = true;
    for (const slug of ["impressum", "datenschutz"]) {
      await open(pages[slug]);
      const selector =
        slug === "impressum" ? ".legal-address" : ".legal-content p";
      const target = f.locator(selector).first();
      const original = await target.innerText();
      results.pages[slug] = { validBefore: await valid() };
      await target.fill("Rechtlicher Text EDITORTEST");
      await save();
      await front.goto(origin + "/?page_id=" + pages[slug]);
      assert.equal(
        await front.locator(selector).first().innerText(),
        "Rechtlicher Text EDITORTEST",
      );
      await p.reload();
      await p.waitForFunction(
        () =>
          window.wp?.data?.select("core/block-editor").getBlocks().length > 0,
      );
      assert.equal(
        await f.locator(selector).first().innerText(),
        "Rechtlicher Text EDITORTEST",
      );
      results.pages[slug].validAfterReload = await valid();
      await p.screenshot({
        path: path.join(out, `editor-${slug}-persisted.png`),
      });
      const lines = original.split("\n");
      await f.locator(selector).first().fill(lines[0]);
      for (const line of lines.slice(1)) {
        await f.locator(selector).first().press("Shift+Enter");
        await p.keyboard.insertText(line);
      }
      await save();
      await front.reload();
      assert.equal(await front.locator(selector).first().innerText(), original);
      results.pages[slug].restored = true;
    }
    results.restored = true;
    console.log(JSON.stringify(results));
  } catch (error) {
    await p.screenshot({ path: path.join(out, "editor-failure.png") });
    throw error;
  } finally {
    await fs.promises.writeFile(
      path.join(out, "editor-phase2.json"),
      JSON.stringify(results, null, 2),
    );
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
