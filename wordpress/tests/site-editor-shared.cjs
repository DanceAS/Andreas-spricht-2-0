// Genuine visual Site Editor proof, never a REST/SQL substitute for editing.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  origin = "http://127.0.0.1:8890";
const out = path.resolve(root, process.env.AS_TEST_OUTPUT || "work/issue-12");
const option = (name) =>
  JSON.parse(
    cp.execFileSync(
      "docker",
      [
        "compose",
        ...(process.env.AS_TEST_ENV_FILE
          ? ["--env-file", process.env.AS_TEST_ENV_FILE]
          : []),
        "-f",
        process.env.AS_TEST_COMPOSE || "wordpress/compose.yml",
        "run",
        "--rm",
        "-T",
        process.env.AS_TEST_SERVICE || "cli",
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
  const ids = option("as_phase2_pages");
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
  const f = p.frameLocator('iframe[name="editor-canvas"]');
  const results = {};
  try {
    await p.goto(origin + "/wp-login.php");
    await p.locator("#user_login").fill(env.WP_ADMIN_USER);
    await p.locator("#user_pass").fill(env.WP_ADMIN_PASSWORD);
    await p.locator("#wp-submit").click();
    async function open(name) {
      await p.goto(
        origin +
          "/wp-admin/site-editor.php?postId=" +
          encodeURIComponent("andreas-spricht-bordeaux//" + name) +
          "&postType=wp_template_part&canvas=edit",
      );
      await p.waitForFunction(
        () =>
          window.wp?.data?.select("core/block-editor")?.getBlocks()?.length > 0,
      );
      const start = p.getByRole("button", { name: "Get started", exact: true });
      if (await start.count()) await start.click();
      const close = p
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true });
      if (await close.count()) await close.click();
    }
    async function save(name) {
      await p.getByRole("button", { name: "Save", exact: true }).click();
      // The Site Editor may show a multi-entity save confirmation.
      await p.waitForTimeout(300);
      const confirmation = p.getByRole("button", { name: "Save", exact: true });
      if ((await confirmation.count()) > 1) await confirmation.last().click();
      await p.waitForFunction(
        (name) =>
          !wp.data
            .select("core")
            .isSavingEntityRecord(
              "postType",
              "wp_template_part",
              "andreas-spricht-bordeaux//" + name,
            ) &&
          !wp.data
            .select("core")
            .hasEditsForEntityRecord(
              "postType",
              "wp_template_part",
              "andreas-spricht-bordeaux//" + name,
            ),
        name,
        { timeout: 20000 },
      );
    }
    async function validate() {
      return p.evaluate(() => {
        const walk = (bs) =>
          bs.flatMap((x) => [
            { name: x.name, valid: x.isValid },
            ...walk(x.innerBlocks),
          ]);
        const all = walk(wp.data.select("core/block-editor").getBlocks());
        if (!all.every((x) => x.valid && x.name.startsWith("core/")))
          throw Error("Invalid block");
        return all.length;
      });
    }
    async function checkAll(selector, text) {
      const checked = [];
      for (const [slug, id] of Object.entries(ids)) {
        await front.goto(origin + (slug === "home" ? "/" : "/?page_id=" + id));
        assert.equal(await front.locator("header").count(), 1);
        assert.equal(await front.locator("footer").count(), 1);
        assert.equal(await front.locator(selector).innerText(), text);
        checked.push(slug);
      }
      return checked;
    }
    async function headerLabel(text) {
      await f.locator('.header a[href$="#hoerproben"]').click();
      await p.getByRole("button", { name: "Edit link", exact: true }).click();
      await p.getByLabel("Text", { exact: true }).fill(text);
      await p
        .locator(".block-editor-link-control")
        .getByRole("button", {
          name: process.env.AS_TEST_LINK_CONFIRM || "Save",
          exact: true,
        })
        .click();
      await p.keyboard.press("Escape");
    }
    await open("header");
    const originalHeader = await f
      .locator('.header a[href$="#hoerproben"]')
      .innerText();
    await headerLabel("Hörproben ZENTRALTEST");
    await save("header");
    results.header = {
      frontendPages: await checkAll(
        'header a[href$="#hoerproben"]',
        "Hörproben ZENTRALTEST",
      ),
    };
    await open("header");
    assert.equal(
      await f.locator('.header a[href$="#hoerproben"]').innerText(),
      "Hörproben ZENTRALTEST",
    );
    results.header.validBlocksAfterReload = await validate();
    await p.screenshot({
      path: path.join(out, "site-editor-header-saved.png"),
    });
    await headerLabel(originalHeader);
    await save("header");
    results.header.restoredOnAllPages = await checkAll(
      'header a[href$="#hoerproben"]',
      originalHeader,
    );
    await open("footer");
    const selector = ".footer > p:not(.brand)",
      originalFooter = await f.locator(selector).innerText();
    await f.locator(selector).fill("© 2026 Andreas spricht · ZENTRALTEST");
    await save("footer");
    results.footer = {
      frontendPages: await checkAll(
        "footer > p:not(.brand)",
        "© 2026 Andreas spricht · ZENTRALTEST",
      ),
    };
    await open("footer");
    assert.equal(
      await f.locator(selector).innerText(),
      "© 2026 Andreas spricht · ZENTRALTEST",
    );
    results.footer.validBlocksAfterReload = await validate();
    await p.screenshot({
      path: path.join(out, "site-editor-footer-saved.png"),
    });
    await f.locator(selector).fill(originalFooter);
    await save("footer");
    results.footer.restoredOnAllPages = await checkAll(
      "footer > p:not(.brand)",
      originalFooter,
    );
    console.log(JSON.stringify(results));
  } catch (e) {
    await p.screenshot({ path: path.join(out, "site-editor-failure.png") });
    throw e;
  } finally {
    fs.writeFileSync(
      path.join(out, "site-editor-results.json"),
      JSON.stringify(results, null, 2),
    );
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
