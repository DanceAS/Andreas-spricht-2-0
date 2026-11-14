/* Local-only diagnosis for issue #6. Requires Playwright; no live requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const playwright = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'work/issue-6');
const engine = process.env.BROWSER || 'chromium';
const widths = [320, 375, 390, 430, 820, 1440];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };

// Mirror both Pages paths and the flat ALL-INKL package, including shared JS.
const server = http.createServer(async (req, res) => {
  try {
    let pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/bordeaux/')) pathname = pathname.slice('/bordeaux'.length);
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const base = ['app.js', 'content.js'].includes(relative) ? root : path.join(root, 'bordeaux');
    const file = path.resolve(base, relative.endsWith('/') ? relative + 'index.html' : relative);
    if (!file.startsWith(base + path.sep)) throw Error('Invalid path');
    const data = await fs.readFile(file);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
    if (start > end) { res.writeHead(416); res.end(); return; }
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${data.length}`;
    headers['Content-Length'] = end - start + 1;
    res.writeHead(range ? 206 : 200, headers);
    res.end(data.subarray(start, end + 1));
  } catch { res.writeHead(404); res.end(); }
});

async function measure(page, phase) {
  return page.evaluate(phase => {
    const rect = e => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return { element: e.tagName, id: e.id, class: e.className?.baseVal ?? e.className,
        top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height,
        scrollHeight: e.scrollHeight, position: s.position, overflow: s.overflow,
        minHeight: s.minHeight, paddingBottom: s.paddingBottom, marginBottom: s.marginBottom };
    };
    const footer = rect(document.querySelector('footer'));
    const scrolling = document.scrollingElement;
    return { phase, viewport: { width: innerWidth, height: innerHeight, visualHeight: visualViewport?.height },
      html: rect(document.documentElement), body: rect(document.body), footer,
      scrollY, scrollHeight: scrolling.scrollHeight,
      extraBelowFooter: scrolling.scrollHeight - footer.bottom,
      horizontalOverflow: scrolling.scrollWidth - innerWidth,
      outliers: [...document.querySelectorAll('body *')].filter(e =>
        getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().bottom + scrollY > footer.bottom + 1).map(rect),
      portraits: document.querySelectorAll('.about-portrait').length,
      audioElementsInDOM: document.querySelectorAll('audio').length };
  }, phase);
}
async function bottom(page) {
  // Deterministic end measurement without changing the shipped stylesheet.
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 1e7); });
  await page.waitForTimeout(150);
}

(async () => {
  let browser;
  const results = [];
  try {
    await fs.mkdir(output, { recursive: true });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    assert(['chromium', 'webkit'].includes(engine));
    browser = await playwright[engine].launch(engine === 'chromium' ? {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']
    } : {});
    for (const prefix of ['/', '/bordeaux/']) for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 844 },
        isMobile: width <= 430, hasTouch: width <= 430 });
      // Block any unexpected external request: this test must stay local.
      await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      const page = await context.newPage(), errors = [], failed = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) failed.push(r.url()); });
      await page.goto(origin + prefix);
      await page.evaluate(() => document.fonts.ready);
      const measurements = [await measure(page, 'initial')];
      await bottom(page);
      await page.locator('img').evaluateAll(images => Promise.all(images.map(i => { i.loading = 'eager'; return i.decode(); })));
      await bottom(page);
      measurements.push(await measure(page, 'bottom-images-loaded'));
      for (const id of ['hoerproben', 'ueber-mich', 'hoerbuecher', 'kontakt']) {
        await page.locator(`header nav a[href="#${id}"]`).click();
        await page.waitForFunction(id => Math.abs(document.querySelector('#' + id).getBoundingClientRect().top) < innerHeight, id);
      }
      const rows = page.locator('#sample-list article');
      assert.equal(await rows.count(), 3);
      assert(await page.evaluate(() => audios.length === 3 && audios.every(a => a.paused && !a.autoplay)));
      for (let i = 0; i < 3; i++) {
        await rows.nth(i).locator('button').click();
        await page.waitForFunction(i => audios[i].currentTime > .2, i);
        await rows.nth(i).locator('button').click();
        await rows.nth(i).locator('input').evaluate(input => { input.value = '50'; input.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.waitForFunction(i => audios[i].paused && !audios[i].seeking && Math.abs(audios[i].currentTime - audios[i].duration / 2) < .5, i);
      }
      await bottom(page);
      measurements.push(await measure(page, 'after-navigation-audio'));
      await page.screenshot({ path: path.join(output, `${engine}-${width}-${prefix === '/' ? 'flat' : 'pages'}-footer.png`) });
      // Cross the portrait-move breakpoint twice; vary viewport height as browser chrome would.
      await page.setViewportSize({ width: width <= 430 ? 820 : 390, height: 700 });
      await page.waitForTimeout(200);
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(200);
      await bottom(page);
      measurements.push(await measure(page, 'after-resize'));
      const result = { prefix, width, measurements, audioPlayPauseSeek: true, navigation: true, errors, failed };
      results.push(result);
      for (const m of measurements) {
        assert(Math.abs(m.extraBelowFooter) <= 1, JSON.stringify(m));
        assert(m.horizontalOverflow <= 1, JSON.stringify(m));
        assert.equal(m.outliers.length, 0, JSON.stringify(m));
        assert.equal(m.portraits, 1);
      }
      assert.deepEqual(errors, []); assert.deepEqual(failed, []);
      console.log(`${engine} ${prefix} ${width}px: footer boundary, navigation, 3 audio players, resize OK`);
      await context.close();
    }
  } finally {
    await fs.writeFile(path.join(output, `${engine}-results.json`), JSON.stringify({
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      engine, browserVersion: browser?.version(), results
    }, null, 2));
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
