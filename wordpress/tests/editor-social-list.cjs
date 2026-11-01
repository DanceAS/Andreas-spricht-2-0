// Additional native Social Link and List Item editor proof; local-only.
const { chromium } = require("playwright"),
  fs = require("fs"),
  path = require("path"),
  cp = require("child_process"),
  assert = require("assert/strict");
const root = path.resolve(__dirname, "../.."),
  origin = "http://127.0.0.1:8890",
  out = path.join(root, "work/issue-10");
(async () => {
  const ids = JSON.parse(
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
        "as_phase2_pages",
        "--format=json",
      ],
      { cwd: root, encoding: "utf8" },
    ),
  );
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
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await c.route("**/*", (r) =>
    r
      .request()
      .url()
      .startsWith(origin + "/") || r.request().url().startsWith("blob:")
      ? r.continue()
      : r.abort(),
  );
  const p = await c.newPage(),
    front = await c.newPage(),
    f = p.frameLocator('iframe[name="editor-canvas"]');
  const result = {};
  try {
    await p.goto(origin + "/wp-login.php");
    await p.locator("#user_login").fill(env.WP_ADMIN_USER);
    await p.locator("#user_pass").fill(env.WP_ADMIN_PASSWORD);
    await p.locator("#wp-submit").click();
    async function open(id) {
      await p.goto(origin + `/wp-admin/post.php?post=${id}&action=edit`);
      await p.waitForFunction(
        () =>
          window.wp?.data?.select("core/block-editor").getBlocks().length > 0,
      );
      const close = p
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true });
      if (await close.count()) await close.click();
    }
    async function selectSocial() {
      const icon = f.locator('[data-type="core/social-link"]');
      await p.waitForTimeout(1000);
      await icon.click();
      try {
        await p
          .getByPlaceholder("Enter social link")
          .waitFor({ state: "attached", timeout: 2000 });
      } catch {
        await icon.click();
        await p
          .getByPlaceholder("Enter social link")
          .waitFor({ state: "attached", timeout: 5000 });
      }
    }
    async function save() {
      await p.getByRole("button", { name: "Save", exact: true }).click();
      await p.waitForFunction(
        () =>
          !wp.data.select("core/editor").isSavingPost() &&
          !wp.data.select("core/editor").isEditedPostDirty(),
        null,
        { timeout: 20000 },
      );
    }
    await open(ids.home);
    await selectSocial();
    const url = p.getByPlaceholder("Enter social link"),
      label = p.getByPlaceholder("Facebook", { exact: true });
    const originalURL = await url.inputValue(),
      originalLabel = await label.inputValue();
    await url.fill(originalURL + "&editor-test=1");
    await url.press("Enter");
    await label.fill("Facebook EDITORTEST");
    await save();
    await front.goto(origin);
    assert.equal(
      await front
        .getByRole("link", { name: "Facebook EDITORTEST", exact: true })
        .getAttribute("href"),
      originalURL + "&editor-test=1",
    );
    await p.reload();
    await p.waitForFunction(
      () => window.wp?.data?.select("core/block-editor").getBlocks().length > 0,
    );
    await selectSocial();
    assert.equal(
      await p.getByPlaceholder("Facebook", { exact: true }).inputValue(),
      "Facebook EDITORTEST",
    );
    await p.screenshot({
      path: path.join(out, "editor-facebook-persisted.png"),
    });
    await p.getByPlaceholder("Enter social link").fill(originalURL);
    await p.getByPlaceholder("Enter social link").press("Enter");
    await p.getByPlaceholder("Facebook", { exact: true }).fill(originalLabel);
    await save();
    await front.reload();
    assert.equal(
      await front
        .getByRole("link", { name: originalLabel, exact: true })
        .getAttribute("href"),
      originalURL,
    );
    result.socialLink = { urlLabelSaveFrontendReloadAndRestore: true };
    await open(ids.datenschutz);
    const item = f.locator('[data-type="core/list-item"]').first();
    const original = await item.innerText();
    await item
      .locator('[contenteditable="true"]')
      .first()
      .fill("Listeninhalt EDITORTEST");
    await save();
    await front.goto(origin + "/?page_id=" + ids.datenschutz);
    assert.equal(
      await front.locator("main li").first().innerText(),
      "Listeninhalt EDITORTEST",
    );
    await p.reload();
    await p.waitForFunction(
      () => window.wp?.data?.select("core/block-editor").getBlocks().length > 0,
    );
    assert.equal(
      await f.locator('[data-type="core/list-item"]').first().innerText(),
      "Listeninhalt EDITORTEST",
    );
    await p.screenshot({ path: path.join(out, "editor-list-persisted.png") });
    await f
      .locator('[data-type="core/list-item"]')
      .first()
      .locator('[contenteditable="true"]')
      .first()
      .fill(original);
    await save();
    await front.reload();
    assert.equal(await front.locator("main li").first().innerText(), original);
    result.listItem = { saveFrontendReloadAndRestore: true };
    console.log(JSON.stringify(result));
  } catch (e) {
    await p.screenshot({ path: path.join(out, "social-list-failure.png") });
    throw e;
  } finally {
    fs.writeFileSync(
      path.join(out, "editor-social-list.json"),
      JSON.stringify(result, null, 2),
    );
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
