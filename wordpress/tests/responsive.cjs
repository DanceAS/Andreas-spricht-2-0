const { chromium } = require('playwright');
const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), out = path.join(root, 'work/issue-8');
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const base = ['app.js', 'content.js'].includes(relative) ? root : path.join(root, 'bordeaux');
    const file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) throw Error();
    res.setHeader('Content-Type', { '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.html': 'text/html; charset=utf-8' }[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
async function metrics(page, wp) {
  return page.evaluate(wp => {
    const hero = document.querySelector(wp ? '.as-prototype' : '#start'), base = hero.getBoundingClientRect();
    const names = wp ? ['.as-title', '.as-intro', '.as-eyebrow', '.as-hero-visual', '.as-hero-image img', '.as-hero-caption'] : ['h1', '.intro', '.eyebrow', '.hero-visual', '.hero-visual__image', '.hero-visual__caption'];
    const rect = (selector) => {
      const e = hero.querySelector(selector), r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return { x: r.x - base.x, y: r.y - base.y, width: r.width, height: r.height, fontSize: s.fontSize,
        lineHeight: s.lineHeight, fontFamily: s.fontFamily, fontWeight: s.fontWeight, color: s.color,
        objectFit: s.objectFit, objectPosition: s.objectPosition, borderRadius: s.borderRadius };
    };
    return { width: base.width, overflow: document.documentElement.scrollWidth - innerWidth, items: names.map(rect),
      heading: hero.querySelector('h1').innerText, intro: hero.querySelector(wp ? '.as-intro' : '.intro').innerText };
  }, wp);
}
(async () => {
  let browser; const results = [];
  try {
    await fs.mkdir(out, { recursive: true });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const reference = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    for (const width of [320, 375, 390, 430, 820, 1024, 1366, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.route('**/*', r => r.request().url().startsWith(reference + '/') || r.request().url().startsWith('http://127.0.0.1:8890/') ? r.continue() : r.abort());
      const ref = await context.newPage(), wp = await context.newPage();
      await ref.goto(reference); await wp.goto('http://127.0.0.1:8890');
      await ref.locator('.hero-visual img').evaluate(i => i.decode());
      await wp.locator('.as-hero-image img').evaluate(i => i.decode());
      const a = await metrics(ref, false), b = await metrics(wp, true);
      assert.equal(a.heading, b.heading); assert.equal(a.intro, b.intro); assert(b.overflow <= 1);
      assert(Math.abs(a.width - b.width) <= 1);
      for (let i = 0; i < a.items.length; i++) {
        const keys = i < 3 ? ['fontSize', 'lineHeight', 'fontFamily', 'fontWeight', 'color'] : i === 3 ? ['borderRadius'] : i === 4 ? ['objectFit', 'objectPosition'] : ['fontSize', 'lineHeight', 'color'];
        for (const key of keys) assert.equal(a.items[i][key], b.items[i][key], `${width}px item ${i} ${key}`);
        for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(a.items[i][key] - b.items[i][key]) < 1.1, `${width}px item ${i} ${key}: ${a.items[i][key]} vs ${b.items[i][key]}`);
      }
      await ref.locator('#start').screenshot({ path: path.join(out, `reference-${width}.png`) });
      await wp.locator('.as-prototype').screenshot({ path: path.join(out, `wordpress-${width}.png`) });
      results.push({ width, reference: a, wordpress: b, passed: true });
      console.log(`${width}px: native hero matches reference geometry, typography, crop and colors`);
      await context.close();
    }
  } finally {
    await fs.writeFile(path.join(out, 'responsive-results.json'), JSON.stringify(results, null, 2));
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
