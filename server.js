// hosq-map — static server, zero deps
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3511;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.otf': 'font/otf',
  '.map': 'application/json'
};

// Read-only. Photos are put in place by ingest-photos.js, never over HTTP —
// a write endpoint here would let any page open in the browser drop files
// into this folder while the dev server runs.
const CACHE = {
  '.otf': 'public, max-age=31536000, immutable',
  '.jpg': 'public, max-age=86400',
  '.png': 'public, max-age=86400'
};

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end('read-only'); return;
  }
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath);
    const head = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (CACHE[ext]) head['Cache-Control'] = CACHE[ext];
    res.writeHead(200, head);
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(PORT, () => console.log('hosq-map on :' + PORT));
