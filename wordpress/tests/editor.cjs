// Real visual-editor proof, local Docker instance only. No REST/DB writes for edits.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'work/issue-8');
const origin = 'http://127.0.0.1:8890';
const originalText = 'ANDREAS SCHARRER · HÖRBUCHSPRECHER';
const editedText = originalText + ' – EDITORTEST';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const env = Object.fromEntries(fs.readFileSync(path.join(root, 'wordpress/.env'), 'utf8').trim().split('\n').map(line => line.split('=')));
  const id = execFileSync('docker', ['compose', '-f', 'wordpress/compose.yml', 'run', '--rm', '-T', 'cli', 'wp', 'option', 'get', 'as_phase1_page_id'], { cwd: root, encoding: 'utf8' }).trim();
  assert(/^\d+$/.test(id));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // Never follow external URLs from the editor, media modal or theme.
  await context.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:') ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const result = { pageId: Number(id), textEditedThroughUI: false, imageReplacedThroughUI: false, savedFrontendVerified: false, editorReloadVerified: false, restoredThroughUI: false };
  try {
    await page.goto(origin + '/wp-login.php');
    await page.locator('#user_login').fill(env.WP_ADMIN_USER);
    await page.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
    await page.goto(origin + `/wp-admin/post.php?post=${id}&action=edit`);
    await page.waitForFunction(() => window.wp?.data.select('core/block-editor').getBlocks().length > 0);
    const welcome = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true });
    if (await welcome.count()) await welcome.click();
    const frame = page.frameLocator('iframe[name="editor-canvas"]');
    const inspect = () => page.evaluate(() => {
      const walk = blocks => blocks.flatMap(b => [{ name: b.name, valid: b.isValid }, ...walk(b.innerBlocks)]);
      return walk(wp.data.select('core/block-editor').getBlocks());
    });
    result.blocks = await inspect();
    assert(result.blocks.every(b => b.valid && b.name.startsWith('core/') && b.name !== 'core/html'));
    async function replaceImage(label) {
      await frame.locator('[data-type="core/image"]').click({ position: { x: 100, y: 100 } });
      await page.getByRole('button', { name: 'Replace', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Open Media Library' }).click();
      await page.getByRole('tab', { name: 'Media Library', exact: true }).click();
      const choice = page.getByRole('dialog').getByRole('checkbox', { name: label, exact: true });
      if (await choice.getAttribute('aria-checked') !== 'true') await choice.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Select', exact: true }).click();
    }
    async function save() {
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.waitForFunction(() => !wp.data.select('core/editor').isSavingPost() && !wp.data.select('core/editor').isEditedPostDirty());
    }
    await frame.locator('p.as-eyebrow').fill(editedText);
    result.textEditedThroughUI = true;
    await replaceImage('andreas-scharrer-8');
    result.imageReplacedThroughUI = true;
    await save();
    const front = await context.newPage();
    await front.goto(origin);
    await front.locator('.as-prototype img').evaluateAll(xs => Promise.all(xs.map(i => i.decode())));
    assert.equal(await front.locator('.as-eyebrow').innerText(), editedText);
    assert.match(await front.locator('.as-hero-image img').getAttribute('src'), /andreas-scharrer-8/);
    result.savedFrontendVerified = true;
    await front.screenshot({ path: path.join(out, 'edited-frontend.png'), fullPage: true });
    await page.reload();
    await page.waitForFunction(() => window.wp?.data.select('core/block-editor').getBlocks().length > 0);
    assert.equal(await frame.locator('p.as-eyebrow').innerText(), editedText);
    assert.match(await frame.locator('.as-hero-image img').getAttribute('src'), /andreas-scharrer-8/);
    assert((await inspect()).every(b => b.valid));
    await frame.locator('.as-hero-image img').evaluate(i => i.decode());
    const editorImage = await frame.locator('.as-hero-image').evaluate(e => ({
      archHeight: e.parentElement.getBoundingClientRect().height,
      imageHeight: e.querySelector('img').getBoundingClientRect().height
    }));
    assert(Math.abs(editorImage.archHeight - editorImage.imageHeight) < 1);
    result.editorImageFillsArch = true;
    result.editorReloadVerified = true;
    await page.screenshot({ path: path.join(out, 'editor-persisted.png'), fullPage: true });
    await frame.locator('p.as-eyebrow').fill(originalText);
    await replaceImage('andreas-scharrer-original');
    await save();
    await front.reload();
    assert.equal(await front.locator('.as-eyebrow').innerText(), originalText);
    assert.match(await front.locator('.as-hero-image img').getAttribute('src'), /andreas-scharrer-original/);
    result.restoredThroughUI = true;
    assert((await inspect()).every(b => b.valid));
    console.log(JSON.stringify(result));
  } finally {
    await fs.promises.writeFile(path.join(out, 'editor-results.json'), JSON.stringify(result, null, 2) + '\n');
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
