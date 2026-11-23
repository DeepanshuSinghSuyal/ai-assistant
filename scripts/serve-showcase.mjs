/**
 * Lightweight local preview server for Roamies Desktop Stage & Panel.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOWCASE = path.join(ROOT, 'showcase');
const PORT = 8765;

const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/desktop.html';
  if (reqPath === '/onboarding' || reqPath === '/onboarding/') reqPath = '/onboarding/index.html';

  const filePath = path.join(SHOWCASE, reqPath);

  // Security: prevent path traversal outside SHOWCASE
  if (!filePath.startsWith(SHOWCASE)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIMES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const isOnboarding = process.argv.includes('--onboarding');
  const target = isOnboarding ? '/onboarding/index.html' : '/desktop.html';
  const url = `http://localhost:${PORT}${target}`;
  console.log(`\n======================================================`);
  console.log(`⚡ INVANSHU AI ASSISTANT RUNNING AT:`);
  console.log(`   Desktop Stage: http://localhost:${PORT}/desktop.html`);
  console.log(`   Setup & Benchmark: http://localhost:${PORT}/onboarding/index.html`);
  console.log(`======================================================\n`);

  // Auto open browser on Windows
  exec(`start ${url}`);
});
