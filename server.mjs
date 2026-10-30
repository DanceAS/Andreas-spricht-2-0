import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = file.slice(root.length);
    if (!file.startsWith(root) || relative.split(sep).some(part => part.startsWith('.')) || !['index.html', 'styles.css', 'content.js', 'app.js'].includes(relative) && !relative.startsWith('assets/')) { res.writeHead(404); res.end('Nicht gefunden'); return; }
    const data = await readFile(file); const type = types[extname(file)] || 'application/octet-stream';
    if (type.startsWith('audio/')) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (match) { const start = Number(match[1]); const end = Math.min(match[2] ? Number(match[2]) : data.length - 1, data.length - 1); if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); res.end(); return; } res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 }); res.end(data.subarray(start, end + 1)); return; }
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' }); res.end(data);
  } catch { res.writeHead(404); res.end('Nicht gefunden'); }
}).listen(port, '0.0.0.0', () => console.log(`Vorschau: http://localhost:${port}`));
