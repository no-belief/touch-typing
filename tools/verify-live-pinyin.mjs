import vm from 'node:vm';

const SITE = 'https://no-belief.github.io/touch-typing/';
const FILES = ['assets/js/courses.js', 'assets/js/pinyin.js', 'assets/js/keyboard.js', 'assets/js/engine.js'];

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
  if (!r.ok) {
    console.log('FETCH FAIL ' + f + ' -> ' + r.status);
    process.exit(2);
  }
  vm.runInContext(await r.text(), ctx, { filename: f });
}

const TT = windowStub.TT;
const { COURSES, Pinyin, Keyboard, Engine } = TT;

let pass = 0;
const fails = [];
const ok = (name, cond, extra) => { if (cond) pass += 1; else fails.push(name + (extra ? ' :: ' + extra : '')); };

ok('线上 courses.js 加载成功', Array.isArray(COURSES) && COURSES.length === 20, 'len=' + (COURSES && COURSES.length));
ok('线上 pinyin.js 加载成功', !!(Pinyin && Pinyin.POOLS));
ok('四个词池', Object.keys(Pinyin.POOLS).length === 4, Object.keys(Pinyin.POOLS).join(','));

const pyCourses = COURSES.filter((c) => c.kind === 'pinyin');
ok('8 个拼音课程', pyCourses.length === 8, 'n=' + pyCourses.length);

const bad = [];
for (const c of pyCourses) {
  for (let i = 0; i < 5; i += 1) {
    const b = Pinyin.build(c.pool, c.mode);
    for (const w of b.words) {
      const slice = b.target.slice(w.start, w.end);
      const want = b.mode === 'pinyin' ? w.pinyin : w.hanzi;
      if (slice !== want) bad.push(c.id + ' 边界 ' + slice + '≠' + want);
    }
    if (b.mode === 'pinyin') {
      for (const ch of b.target) if (!Keyboard.resolve(ch)) bad.push(c.id + ' 无法解析字符 ' + JSON.stringify(ch));
      if (!/^[a-z ]+$/.test(b.target)) bad.push(c.id + ' 非法字符');
    } else if (b.target.indexOf(' ') !== -1) {
      bad.push(c.id + ' 汉字串含空格');
    }
    const e = new Engine(b.target);
    for (const ch of b.target) e.push(ch);
    if (!e.finished || e.result().acc !== 100) bad.push(c.id + ' 无法 100% 敲完');
  }
}
ok('线上拼音课程数据与判定自洽', bad.length === 0, [...new Set(bad)].slice(0, 3).join(' | '));

const html = await (await fetch(SITE, { headers: { 'user-agent': 'dsh-live-check' } })).text();
ok('线上首页含拼音提示行', html.indexOf('id="py-hint"') !== -1);
ok('线上首页含速度标签', html.indexOf('id="hud-speed-label"') !== -1);
ok('线上首页引入 pinyin.js', html.indexOf('assets/js/pinyin.js') !== -1);

console.log('线上断言通过: ' + pass + '   失败: ' + fails.length);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
