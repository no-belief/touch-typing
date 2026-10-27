import fs from 'node:fs';
import crypto from 'node:crypto';

const SITE = 'https://no-belief.github.io/touch-typing/';
const FILES = [
  'index.html',
  'assets/styles.css',
  'assets/js/courses.js',
  'assets/js/keyboard.js',
  'assets/js/engine.js',
  'assets/js/storage.js',
  'assets/js/chart.js',
  'assets/js/app.js'
];

const norm = (buf) => crypto.createHash('sha256').update(buf.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');

let match = 0;
let diff = 0;
for (const f of FILES) {
  const localHash = norm(fs.readFileSync(f));
  const res = await fetch(SITE + f, { headers: { 'user-agent': 'dsh-verify' } });
  const remoteBuf = Buffer.from(await res.arrayBuffer());
  const same = res.status === 200 && norm(remoteBuf) === localHash;
  if (same) match += 1; else diff += 1;
  console.log((same ? 'MATCH ' : 'DIFF  ') + f + '  http=' + res.status + '  ' + remoteBuf.length + 'b');
}
console.log('一致=' + match + '  不一致=' + diff);
process.exit(diff ? 1 : 0);
