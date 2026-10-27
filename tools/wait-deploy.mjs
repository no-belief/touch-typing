const REPO = 'no-belief/touch-typing';
const SITE = 'https://no-belief.github.io/touch-typing/';
const UA = { 'user-agent': 'dsh-deploy-check' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path) {
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + path, { headers: UA });
    if (!r.ok) return { status: r.status, data: null };
    return { status: r.status, data: await r.json() };
  } catch (e) {
    return { status: 0, error: String(e.message) };
  }
}

async function probe(url, times, gapMs) {
  for (let i = 0; i < times; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow' });
      if (r.status === 200) return { ok: true, status: 200, text: await r.text(), tries: i + 1 };
      if (i === times - 1) return { ok: false, status: r.status, tries: i + 1 };
    } catch (e) {
      if (i === times - 1) return { ok: false, error: String(e.message), tries: i + 1 };
    }
    await sleep(gapMs);
  }
  return { ok: false, status: 0 };
}

const pages = await api('/pages');
console.log('pages api:', pages.status, pages.data ? JSON.stringify({ url: pages.data.html_url, status: pages.data.status, branch: pages.data.source && pages.data.source.branch }) : '');

const runs = await api('/actions/runs?per_page=3');
if (runs.data && runs.data.workflow_runs) {
  for (const w of runs.data.workflow_runs.slice(0, 3)) {
    console.log('run:', w.name, '| status=' + w.status, '| conclusion=' + (w.conclusion || '-'), '|', w.html_url);
  }
} else {
  console.log('runs api:', runs.status);
}

console.log('--- 轮询站点 ---');
const site = await probe(SITE, 26, 6000);
if (!site.ok) {
  console.log('SITE NOT READY:', JSON.stringify({ status: site.status, error: site.error, tries: site.tries }));
  process.exit(2);
}
const html = site.text;
console.log('index.html: 200, bytes=' + html.length + ', tries=' + site.tries);
console.log('title:', (html.match(/<title>([^<]*)<\/title>/) || [])[1]);
for (const asset of ['assets/styles.css', 'assets/js/app.js', 'assets/js/engine.js']) {
  const r = await fetch(SITE + asset, { headers: UA });
  console.log(asset + ' -> ' + r.status + ' (' + (await r.text()).length + 'b)');
}
console.log('含键盘图容器:', html.includes('id="keyboard-practice"'));
console.log('含输入缓冲区:', html.includes('id="typebuffer"'));
