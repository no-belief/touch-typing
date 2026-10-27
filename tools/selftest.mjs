import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');

let pass = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass += 1; return; }
  fails.push(name + (extra ? ' :: ' + extra : ''));
}
function eq(name, actual, expected) {
  ok(name, actual === expected, 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}

// ---- 浏览器环境最小桩 ----
const store = new Map();
const windowStub = {};
windowStub.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); }
};
const ctx = vm.createContext({ window: windowStub, console, Math, Date, JSON });

const FILES = [
  'assets/js/courses.js',
  'assets/js/pinyin.js',
  'assets/js/tutorial.js',
  'assets/js/keyboard.js',
  'assets/js/engine.js',
  'assets/js/storage.js'
];
for (const f of FILES) vm.runInContext(read(f), ctx, { filename: f });

const TT = windowStub.TT;
const { Engine, COURSES, Keyboard, Storage } = TT;

// ---- 1. 引擎：全部敲对 ----
{
  const text = 'hello world';
  const e = new Engine(text);
  eq('初始 index 为 0', e.index, 0);
  e.startedAt = Date.now() - 6000; // 固定 6 秒，让 WPM 可断言
  for (const ch of text) e.push(ch);
  ok('全部敲对后 finished=true', e.finished === true);
  const r = e.result();
  eq('全部敲对 correct=字符数', r.correct, text.length);
  eq('全部敲对 wrong=0', r.wrong, 0);
  eq('全部敲对 misses=0', r.misses, 0);
  eq('全部敲对 准确率=100', r.acc, 100);
  ok('全部敲对 bestStreak=字符数', r.bestStreak === text.length, String(r.bestStreak));
  ok('全部敲对 wpm>0', r.wpm > 0, String(r.wpm));
  ok('结束后再敲无效', e.push('x') === null);
}

// ---- 2. 引擎：错误字符被标记，准确率下降 ----
{
  const e = new Engine('abc');
  const r1 = e.push('b');
  eq('错键返回 ok=false', r1.ok, false);
  eq('错键记录 typed 原字符', e.typed[0], 'b');
  eq('错键标记 marks=0', e.marks[0], 0);
  e.push('b');
  e.push('c');
  const r = e.result();
  eq('3 次击键 1 次错 -> 准确率 66.7', r.acc, 66.7);
  eq('错误计数 misses=1', r.misses, 1);
  eq('错误键统计定位到 a', r.errByChar.a, 1);
  eq('standing correct=2', r.correct, 2);
  eq('standing wrong=1', r.wrong, 1);
}

// ---- 3. 引擎：退格可回退并清除错误标记 ----
{
  const e = new Engine('abc');
  e.push('a');
  e.push('x');
  eq('退格后 index 回退', e.backspace(), 1);
  eq('退格清除标记', e.marks[1], null);
  eq('退格清除 typed', e.typed[1], null);
  e.push('b');
  e.push('c');
  const r = e.result();
  eq('退格后可正确完成', r.finished, true);
  eq('退格后 standing 全对', r.wrong, 0);
  eq('退格不改写已发生击键的准确率', r.acc, 75); // a x b c 共 4 次击键、1 次错
  eq('空文本退格返回 null', new Engine('ab').backspace(), null);
}

// ---- 4. 课程库 ----
ok('课程数量 >= 10', COURSES.length >= 10, String(COURSES.length));
{
  const ids = new Set();
  const stages = new Set();
  for (const c of COURSES) {
    ids.add(c.id);
    stages.add(c.stage);
    ok('课程 ' + c.id + ' 有 id/stage/name/target/build',
      !!(c.id && c.stage && c.name && typeof c.target === 'number' && typeof c.build === 'function'));
  }
  eq('课程 id 唯一', ids.size, COURSES.length);
  ok('覆盖基础/进阶/数字/符号/综合 阶段', stages.size >= 4, [...stages].join(','));
}

// ---- 5. 每课生成的文本都能被键盘指法图解析到具体按键 ----
{
  const unresolved = [];
  const minLen = {};
  for (const c of COURSES) {
    const isHanzi = c.kind === 'pinyin' && c.mode === 'hanzi';
    for (let round = 0; round < 25; round++) {
      const text = c.build();
      if (minLen[c.id] === undefined || text.length < minLen[c.id]) minLen[c.id] = text.length;
      if (isHanzi) continue;
      for (const ch of text) {
        if (!Keyboard.resolve(ch)) unresolved.push(c.id + ':' + JSON.stringify(ch));
      }
    }
  }
  eq('所有可打字课程的字符都能解析到按键', unresolved.length, 0, unresolved.slice(0, 5).join(' '));
  const short = COURSES.filter((c) => {
    const need = c.kind === 'pinyin' && c.mode === 'hanzi' ? 24 : 40;
    return minLen[c.id] < need;
  }).map((c) => c.id + '=' + minLen[c.id]);
  eq('每课文本长度达标（汉字课 >=24 字，其余 >=40 字符）', short.length, 0, short.join(','));
}

// ---- 6. Shift 对侧规则 ----
{
  eq('大写 A 用左键 a + 右 Shift', Keyboard.resolve('A').shift, 'ShiftRight');
  eq('@ 用数字 2 + 右 Shift', Keyboard.resolve('@').shift, 'ShiftRight');
  eq('冒号用分号键 + 左 Shift', Keyboard.resolve(':').shift, 'ShiftLeft');
  eq('问号用斜杠键 + 左 Shift', Keyboard.resolve('?').shift, 'ShiftLeft');
  eq('小写 a 不需要 Shift', Keyboard.resolve('a').shift, null);
  eq('空格映射到 Space 键', Keyboard.resolve(' ').key, 'Space');
  eq('反斜杠可解析', Keyboard.resolve(String.fromCharCode(92)).key, String.fromCharCode(92));
  eq('未知字符返回 null', Keyboard.resolve('中'), null);
}

// ---- 7. 存储：写入/读取/最佳成绩/清空 ----
{
  Storage.clear();
  eq('初始为空', Storage.all().length, 0);
  Storage.add({ wpm: 30, acc: 98, sec: 60, courseId: 'c01', courseName: '基准键位' });
  Storage.add({ wpm: 42, acc: 99, sec: 50, courseId: 'c01', courseName: '基准键位' });
  Storage.add({ wpm: 25, acc: 95, sec: 40, courseId: 'c02', courseName: '基准键位 + G H' });
  eq('写入 3 条', Storage.all().length, 3);
  eq('最新记录在最前', Storage.all()[0].wpm, 25);
  eq('每课最佳取最大值', Storage.bestByCourse().c01.wpm, 42);
  const sum = Storage.summary();
  eq('汇总次数', sum.count, 3);
  eq('汇总最高 WPM', sum.best, 42);
  ok('每条记录都有 id', Storage.all().every((r) => typeof r.id === 'string' && r.id.length > 0));
  Storage.clear();
  eq('清空后为 0', Storage.all().length, 0);
}

// ---- 8. 静态检查：产物完整、可直接 file:// 打开 ----
{
  const html = read('index.html');
  const order = ['courses', 'pinyin', 'tutorial', 'keyboard', 'engine', 'storage', 'chart', 'app'];
  let last = -1;
  for (const name of order) {
    const at = html.indexOf('assets/js/' + name + '.js');
    ok('index.html 引入 ' + name + '.js', at > -1);
    ok('脚本顺序正确: ' + name, at > last);
    last = at;
    ok('文件存在: assets/js/' + name + '.js', fs.existsSync(fileURLToPath(new URL('assets/js/' + name + '.js', root))));
  }
  ok('index.html 引用 styles.css', html.includes('assets/styles.css'));
  ok('未使用 ES module（保证 file:// 直开）', !html.includes('type="module"'));
  ok('声明 viewport（移动端适配）', html.includes('name="viewport"'));
  ok('有输入缓冲区元素', html.includes('id="typebuffer"'));
}

// ---- 9. DOM 契约：app.js 取用的元素 id 必须真实存在于 index.html ----
{
  const appSrc = read('assets/js/app.js');
  const html = read('index.html');

  const htmlIds = new Set();
  let from = 0;
  while (true) {
    const at = html.indexOf('id="', from);
    if (at < 0) break;
    const end = html.indexOf('"', at + 4);
    if (end < 0) break;
    htmlIds.add(html.slice(at + 4, end));
    from = end + 1;
  }

  const usedIds = new Set();
  from = 0;
  while (true) {
    const at = appSrc.indexOf("$('", from);
    if (at < 0) break;
    const end = appSrc.indexOf("')", at + 3);
    if (end < 0) break;
    usedIds.add(appSrc.slice(at + 3, end));
    from = end + 2;
  }

  const missing = [];
  usedIds.forEach((x) => { if (!htmlIds.has(x)) missing.push(x); });
  eq('app.js 取用的元素 id 全部存在于 index.html', missing.length, 0, missing.join(','));
  ok('app.js 至少取用 15 个元素', usedIds.size >= 15, String(usedIds.size));

  const css = read('assets/styles.css');
  const states = [
    '.ch.ok', '.ch.bad', '.ch.current', '.key.is-next', '.key.is-home',
    '.view.is-active', '.lesson-btn.is-active', '.lesson-btn.is-done',
    '.typing-zone.is-started', '.result-cell.is-good', '.result-cell.is-bad',
    '.modal[hidden]'
  ];
  for (const sel of states) ok('样式含状态选择器 ' + sel, css.includes(sel));
}

// ---- 10. 拼音练习：词池数据与词边界 ----
{
  const P = TT.Pinyin;
  ok('拼音模块已注册', !!(P && P.POOLS && typeof P.build === 'function'));

  const ids = Object.keys(P.POOLS);
  ok('四个基础词池齐备', ['pq', 'nq', 'nb', 'cy'].every((x) => !!P.POOLS[x]), ids.join(','));
  eq('课程池仍为 4 个', P.POOL_ORDER.length, 4, P.POOL_ORDER.join(','));

  const CJK = /^[\u4e00-\u9fa5]+$/;
  const PY = /^[a-z]+$/;
  const bad = [];
  for (const id of ids) {
    const items = P.POOLS[id].items;
    ok('词池 ' + id + ' 至少 16 词', items.length >= 16, String(items.length));
    for (const [hz, py] of items) {
      if (!CJK.test(hz)) bad.push(id + ' 汉字非法:' + hz);
      if (!PY.test(py)) bad.push(id + ' 拼音非法:' + py);
      const syl = py.match(/[aeiou]+/g) || [];
      if (hz.length !== syl.length) bad.push(id + ' 字数≠音节数:' + hz + '/' + py);
    }
  }
  eq('词池数据自洽（汉字/拼音/音节数）', bad.length, 0, bad.slice(0, 4).join(' | '));

  const pyCourses = COURSES.filter((c) => c.kind === 'pinyin');
  eq('注册 8 个拼音课程（4 池 x 2 模式）', pyCourses.length, 8, String(pyCourses.length));

  const cbad = new Set();
  for (const c of pyCourses) {
    for (let round = 0; round < 10; round++) {
      const built = P.build(c.pool, c.mode);
      for (const w of built.words) {
        const slice = built.target.slice(w.start, w.end);
        const want = built.mode === 'pinyin' ? w.pinyin : w.hanzi;
        if (slice !== want) cbad.add(c.id + ' 词边界错 ' + slice + '≠' + want);
      }
      if (built.mode === 'hanzi' && built.target.indexOf(' ') !== -1) cbad.add(c.id + ' 汉字串含空格');
      if (built.mode === 'pinyin' && !/^[a-z ]+$/.test(built.target)) cbad.add(c.id + ' 拼音串含非字母');
      if (built.words.length < 16) cbad.add(c.id + ' 词数不足');
    }
  }
  eq('拼音课程 build 与词边界自洽', cbad.size, 0, [...cbad].slice(0, 4).join(' | '));

  const built = P.build('pq', 'pinyin');
  ok('拼音模式词间有空格', built.target.indexOf(' ') > 0);
  ok('每个词都带汉字提示', built.words.every((w) => /^[\u4e00-\u9fa5]+$/.test(w.hanzi)));
}

// ---- 11. 拼音课程可被逐字符敲对（目标串自洽） ----
{
  const bad = [];
  for (const c of COURSES.filter((x) => x.kind === 'pinyin')) {
    const built = TT.Pinyin.build(c.pool, c.mode);
    const e = new Engine(built.target);
    for (const ch of built.target) e.push(ch);
    const r = e.result();
    if (!e.finished) bad.push(c.id + ' 未完成');
    if (r.acc !== 100) bad.push(c.id + ' 准确率≠100');
    if (r.correct !== built.target.length) bad.push(c.id + ' 正确数≠目标长度');
    if (r.wrong !== 0) bad.push(c.id + ' 存在错误');
  }
  eq('8 个拼音课程都能逐字符敲对', bad.length, 0, bad.slice(0, 4).join(' | '));

  // 拼音模式下每个词的起始字符就是该词拼音首字母
  const p = TT.Pinyin.build('cy', 'pinyin');
  ok('拼音词边界首字符正确', p.words.every((w) => p.target.charAt(w.start) === w.pinyin.charAt(0)));
  ok('拼音词边界末字符正确', p.words.every((w) => p.target.charAt(w.end - 1) === w.pinyin.charAt(w.pinyin.length - 1)));
}

// ---- 12. 30 天教程：数据、文本可打性、与课程体系隔离 ----
{
  const T = TT.Tutorial;
  ok('教程模块已注册', !!(T && Array.isArray(T.EN) && Array.isArray(T.PY)));

  for (const track of ['EN', 'PY']) {
    const days = T[track];
    eq(track + ' 模块 30 天', days.length, 30, String(days.length));
    const dayNums = days.map((d) => d.day).join(',');
    eq(track + ' 天数连续 1-30', dayNums, Array.from({ length: 30 }, (_, i) => i + 1).join(','));
    ok(track + ' 每周标题齐备', [1, 2, 3, 4, 5].every((w) => !!T.WEEK_TITLES[track === 'EN' ? 'en' : 'py'][w]));

    const bad = [];
    for (const d of days) {
      if (!d.id || !d.name || !d.focus) bad.push(d.id + ' 字段缺失');
      if (!(d.target > 0)) bad.push(d.id + ' 目标非法');
      if (!(d.minutes > 0)) bad.push(d.id + ' 时长非法');
      if (d.week !== (d.day <= 7 ? 1 : d.day <= 14 ? 2 : d.day <= 21 ? 3 : d.day <= 28 ? 4 : 5)) {
        bad.push(d.id + ' 周次错');
      }
    }
    eq(track + ' 每天字段完整', bad.length, 0, bad.slice(0, 4).join(' | '));
  }

  const allIds = T.EN.concat(T.PY).map((d) => d.id);
  eq('教程 id 唯一', new Set(allIds).size, 60, 'uniq=' + new Set(allIds).size);
  const courseIds = new Set(COURSES.map((c) => c.id));
  eq('教程 id 与课程 id 不冲突', allIds.filter((x) => courseIds.has(x)).length, 0);
  eq('教程不混入课程列表', COURSES.filter((c) => c.track).length, 0);

  const badText = [];
  for (const d of T.EN) {
    for (let k = 0; k < 6; k += 1) {
      const text = d.build();
      if (typeof text !== 'string' || text.length < 20) badText.push(d.id + ' 文本过短 ' + (text || '').length);
      for (const ch of String(text)) {
        if (!Keyboard.resolve(ch)) badText.push(d.id + ' 无法解析 ' + JSON.stringify(ch));
      }
    }
  }
  eq('英文教程 30 天的文本都能逐键敲出', badText.length, 0, [...new Set(badText)].slice(0, 4).join(' | '));

  const badPy = [];
  for (const d of T.PY) {
    for (let k = 0; k < 6; k += 1) {
      const built = TT.Pinyin.build(d.pool, d.mode, d.py);
      if (!built.target || built.words.length === 0) badPy.push(d.id + ' 空文本');
      for (const w of built.words) {
        const slice = built.target.slice(w.start, w.end);
        const want = built.mode === 'pinyin' ? w.pinyin : w.hanzi;
        if (slice !== want) badPy.push(d.id + ' 边界错');
      }
      if (built.mode === 'pinyin') {
        if (!/^[a-z ]+$/.test(built.target)) badPy.push(d.id + ' 非法字符');
        for (const ch of built.target) if (!Keyboard.resolve(ch)) badPy.push(d.id + ' 无法解析');
      }
      const e = new Engine(built.target);
      for (const ch of built.target) e.push(ch);
      if (!e.finished || e.result().acc !== 100) badPy.push(d.id + ' 无法敲完');
    }
  }
  eq('拼音教程 30 天的文本与判定自洽', badPy.length, 0, [...new Set(badPy)].slice(0, 4).join(' | '));

  eq('打汉字的日子用字/分计速', T.unitOf(T.PY.find((d) => d.mode === 'hanzi')), '字/分');
  eq('打拼音的日子用 WPM 计速', T.unitOf(T.PY.find((d) => d.mode === 'pinyin')), 'WPM');
  eq('英文模块按 WPM 计速', T.unitOf(T.EN[0]), 'WPM');
  ok('教程有按天取用的入口', typeof T.get('t-en-01') === 'object' && T.get('t-py-30') === T.PY[29]);
}

console.log('');
console.log('通过: ' + pass + '    失败: ' + fails.length);
if (fails.length) {
  for (const f of fails) console.log('  FAIL  ' + f);
  process.exit(1);
}
console.log('全部断言通过');
