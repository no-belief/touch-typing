import fs from 'node:fs';

const REPO = 'no-belief/touch-typing';
const SITE = 'https://no-belief.github.io/touch-typing/';

function readToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  if (fs.existsSync('.token')) return fs.readFileSync('.token', 'utf8').trim();
  return '';
}

const token = readToken();
if (!token) {
  console.log('NO_TOKEN');
  process.exit(3);
}

const H = {
  authorization: 'Bearer ' + token,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'dsh-enable-pages'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body) {
  const res = await fetch('https://api.github.com' + path, {
    method,
    headers: Object.assign({}, H, body ? { 'content-type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 300) }; }
  return { status: res.status, data };
}

const me = await call('GET', '/user');
console.log('token user:', me.status, me.data && me.data.login);

const before = await call('GET', '/repos/' + REPO + '/pages');
console.log('pages before:', before.status, before.data && before.data.html_url);

if (before.status === 404) {
  const created = await call('POST', '/repos/' + REPO + '/pages', { source: { branch: 'main', path: '/' } });
  console.log('create pages:', created.status, created.data && (created.data.html_url || created.data.message));
} else if (before.status === 200) {
  const patched = await call('PUT', '/repos/' + REPO + '/pages', { source: { branch: 'main', path: '/' } });
  console.log('update pages:', patched.status, patched.data && (patched.data.html_url || patched.data.message));
} else {
  console.log('pages probe unexpected:', before.status, JSON.stringify(before.data).slice(0, 200));
}

for (let i = 0; i < 10; i++) {
  const now = await call('GET', '/repos/' + REPO + '/pages');
  console.log('pages poll', i, now.status, now.data && now.data.status, now.data && now.data.html_url);
  if (now.status === 200 && now.data && now.data.status === 'built') break;
  await sleep(6000);
}

let ok = false;
for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(SITE, { headers: { 'user-agent': 'dsh-enable-pages' }, redirect: 'follow' });
    if (r.status === 200) {
      const html = await r.text();
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
      console.log('SITE 200, bytes=' + html.length + ', title=' + title);
      const assets = ['assets/styles.css', 'assets/js/app.js', 'assets/js/engine.js', 'assets/js/keyboard.js'];
      for (const a of assets) {
        const ar = await fetch(SITE + a, { headers: { 'user-agent': 'dsh-enable-pages' } });
        console.log('  ' + a + ' -> ' + ar.status);
      }
      console.log('  含 typebuffer:', html.includes('id="typebuffer"'));
      console.log('  含 keyboard-practice:', html.includes('id="keyboard-practice"'));
      ok = true;
      break;
    }
    if (i % 5 === 0) console.log('site poll', i, '->', r.status);
  } catch (e) {
    if (i % 5 === 0) console.log('site poll', i, '->', String(e.message).slice(0, 80));
  }
  await sleep(6000);
}

console.log(ok ? 'RESULT: LIVE' : 'RESULT: NOT_LIVE_YET');
process.exit(ok ? 0 : 4);
