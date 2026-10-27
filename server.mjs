import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// 零依赖静态服务器：手机与电脑联调时用 http://<你的局域网IP>:5173 访问
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed');
  }
  let rel;
  try {
    rel = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    return send(res, 400, 'Bad Request');
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  const target = path.join(root, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!target.startsWith(root)) return send(res, 403, 'Forbidden');

  fs.readFile(target, (err, buf) => {
    if (err) return send(res, 404, 'Not Found: ' + rel);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(buf);
  });
});

server.listen(port, () => {
  const nets = os.networkInterfaces();
  const lan = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) lan.push(ni.address);
    }
  }
  console.log('盲打训练已启动');
  console.log('  本机:  http://127.0.0.1:' + port);
  for (const ip of lan) console.log('  局域网: http://' + ip + ':' + port + '  (手机与电脑同一 WiFi 可直接访问)');
  console.log('  Ctrl+C 退出');
});
