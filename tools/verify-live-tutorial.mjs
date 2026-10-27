import vm from 'node:vm';

const SITE = 'https://no-belief.github.io/touch-typing/';
const FILES = ['assets/js/courses.js', 'assets/js/pinyin.js', 'assets/js/tutorial.js', 'assets/js/keyboard.js', 'assets/js/engine.js'];

const store = new Map();
const windowStub = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  }
};
const ctx = vm.createContext({ window: windowStub, console, Math, Date, JSON });
for (const f of FILES) {
  const r = await fetch(SITE + f, { headers: { 'user-agent': 'dsh-live-check' } });
  if (!r.ok) { console.log('FETCH FAIL ' + f + ' -> ' + r.status); process.exit(2); }
  vm.runInContext(await r.text(), ctx, { filename: f });
}

const TT = windowStub.TT;
const { Tutorial, Pinyin, Keyboard, Engine } = TT;
let pass = 0;
const fails = [];
const ok = (n, c, e) => { if (c) pass += 1; else fails.push(n + (e ? ' :: ' + e : '')); };

ok('线上教程模块存在', !!(Tutorial && Tutorial.EN && Tutorial.PY));
ok('英文 30 天', Tutorial.EN.length === 30, String(Tutorial.EN.length));
ok('拼音 30 天', Tutorial.PY.length === 30, String(Tutorial.PY.length));
ok('60 个唯一 id', new Set(Tutorial.EN.concat(Tutorial.PY).map((d) => d.id)).size === 60);

const badEn = [];
for (const d of Tutorial.EN) {
  for (let i = 0; i < 4; i += 1) {
    const t = d.build();
    if (!t || t.length < 20) badEn.push(d.id + ' 太短');
    for (const ch of String(t)) if (!Keyboard.resolve(ch)) badEn.push(d.id + ' 无法解析 ' + JSON.stringify(ch));
  }
}
ok('英文 30 天文本可逐键敲出', badEn.length === 0, [...new Set(badEn)].slice(0, 3).join(' | '));

const badPy = [];
for (const d of Tutorial.PY) {
  const b = Pinyin.build(d.pool, d.mode, d.py);
  if (!b.target || !b.words.length) badPy.push(d.id + ' 空');
  for (const w of b.words) {
    const slice = b.target.slice(w.start, w.end);
    const want = b.mode === 'pinyin' ? w.pinyin : w.hanzi;
    if (slice !== want) badPy.push(d.id + ' 边界');
  }
  const e = new Engine(b.target);
  for (const ch of b.target) e.push(ch);
  if (!e.finished || e.result().acc !== 100) badPy.push(d.id + ' 无法敲完');
}
ok('拼音 30 天文本与判定自洽', badPy.length === 0, [...new Set(badPy)].slice(0, 3).join(' | '));
ok('打汉字的日子 >= 4 天', Tutorial.PY.filter((d) => d.mode === 'hanzi').length >= 4);

const html = await (await fetch(SITE, { headers: { 'user-agent': 'dsh-live-check' } })).text();
ok('线上含教程 Tab', html.indexOf('data-view="tutorial"') !== -1);
ok('线上含教程容器', html.indexOf('id="tut-weeks"') !== -1);
ok('线上引入 tutorial.js', html.indexOf('assets/js/tutorial.js') !== -1);

console.log('线上教程断言通过: ' + pass + '   失败: ' + fails.length);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
