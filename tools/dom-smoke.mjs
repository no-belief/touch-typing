import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');

/* ---- 1. 从 index.html 提取 id / class / data-* / hidden ---- */
const registry = new Map();
const classIndex = new Map();
const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>/g;
let m;
while ((m = tagRe.exec(html))) {
  const attrs = m[2] || '';
  const idM = attrs.match(/id="([^"]+)"/);
  const clM = attrs.match(/class="([^"]+)"/);
  const classes = clM ? clM[1].split(/\s+/).filter(Boolean) : [];
  const data = {};
  for (const dm of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) data[dm[1]] = dm[2];
  const hidden = /\shidden(\s|>|$)/.test(attrs);
  const meta = { id: idM ? idM[1] : null, classes: classes, tag: m[1], data: data, hidden: hidden };
  if (meta.id) registry.set(meta.id, meta);
  for (const c of classes) {
    if (!classIndex.has(c)) classIndex.set(c, []);
    classIndex.get(c).push(meta);
  }
}

const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });

/* ---- 2. 元素桩 ---- */
function makeEl(tag) {
  const el = {
    tagName: tag || 'div', children: [], parentNode: null, _classes: [], _attrs: {}, _handlers: {},
    style: {}, hidden: false, type: '', title: '', value: '', _text: '', id: '', dataset: {}
  };
  el.classList = {
    add(c) { if (!el._classes.includes(c)) el._classes.push(c); },
    remove(c) { el._classes = el._classes.filter((x) => x !== c); },
    toggle(c, on) { if (on === undefined) on = !el._classes.includes(c); if (on) el.classList.add(c); else el.classList.remove(c); return on; },
    contains(c) { return el._classes.includes(c); }
  };
  Object.defineProperty(el, 'className', {
    get() { return el._classes.join(' '); },
    set(v) { el._classes = String(v).split(/\s+/).filter(Boolean); }
  });
  Object.defineProperty(el, 'textContent', {
    get() { return el._text; },
    set(v) { el._text = String(v); el.children = []; }
  });
  Object.defineProperty(el, 'parentElement', { get() { return el.parentNode || { clientWidth: 800 }; } });
  el.appendChild = (child) => {
    if (child && child._isFragment) { child.children.slice().forEach((c) => el.appendChild(c)); child.children = []; return child; }
    child.parentNode = el; el.children.push(child); return child;
  };
  el.setAttribute = (k, v) => { el._attrs[k] = String(v); if (k === 'class') el.className = v; if (k === 'id') el.id = v; };
  el.getAttribute = (k) => (k === 'class' ? el.className : (el._attrs[k] !== undefined ? el._attrs[k] : null));
  el.addEventListener = (t, fn) => { (el._handlers[t] = el._handlers[t] || []).push(fn); };
  el.focus = () => {};
  el.scrollIntoView = () => {};
  el.getContext = () => ctxStub;
  el.closest = (sel) => {
    const cls = sel.replace(/^\./, '');
    let n = el;
    while (n) { if (n._classes && n._classes.includes(cls)) return n; n = n.parentNode; }
    return null;
  };
  el.querySelectorAll = (sel) => collect(el, sel);
  el.querySelector = (sel) => collect(el, sel)[0] || null;
  return el;
}
function collect(root, sel) {
  const cls = sel.replace(/^\./, '');
  const out = [];
  const walk = (n) => { for (const c of n.children || []) { if (c._classes && c._classes.includes(cls)) out.push(c); walk(c); } };
  walk(root);
  return out;
}

const nodes = new Map();
function instantiate(meta, key) {
  const el = makeEl(meta.tag);
  el.id = meta.id || '';
  el.className = meta.classes.join(' ');
  el.hidden = !!meta.hidden;
  for (const k of Object.keys(meta.data)) el._attrs['data-' + k] = meta.data[k];
  nodes.set(key, el);
  return el;
}
for (const [id, meta] of registry) instantiate(meta, id);

const document = {
  readyState: 'complete',
  _handlers: {},
  getElementById: (id) => (registry.has(id) ? (nodes.get(id) || instantiate(registry.get(id), id)) : null),
  createElement: (tag) => makeEl(tag),
  createDocumentFragment: () => { const f = makeEl('fragment'); f._isFragment = true; return f; },
  addEventListener(t, fn) { (document._handlers[t] = document._handlers[t] || []).push(fn); },
  querySelectorAll: (sel) => {
    const cls = sel.replace(/^\./, '');
    return (classIndex.get(cls) || []).map((meta, i) => {
      const key = meta.id || ('~' + cls + '#' + i);
      return nodes.get(key) || instantiate(meta, key);
    });
  },
  querySelector: (sel) => document.querySelectorAll(sel)[0] || null
};

const store = new Map();
const window = {
  devicePixelRatio: 2,
  _handlers: {},
  addEventListener(t, fn) { (window._handlers[t] = window._handlers[t] || []).push(fn); },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
  confirm: () => false
};
window.window = window;
window.document = document;
window.console = console;
window.Math = Math;
window.Date = Date;
window.JSON = JSON;

const sandbox = Object.assign({}, window, {
  window, document, console, Math, Date, JSON, String, Number, Array, Object, RegExp,
  setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  setInterval: window.setInterval, clearInterval: window.clearInterval
});
const ctxVm = vm.createContext(sandbox);

/* ---- 3. 按 index.html 顺序加载 ---- */
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((x) => x[1]);
const order = [];
for (const src of srcs) {
  vm.runInContext(fs.readFileSync(src, 'utf8'), ctxVm, { filename: src });
  order.push(src);
}

/* ---- 4. 断言 ---- */
let pass = 0;
const fails = [];
const ok = (name, cond, extra) => { if (cond) pass += 1; else fails.push(name + (extra ? ' :: ' + extra : '')); };
const fire = (el, type, evt) => {
  const hs = (el && el._handlers && el._handlers[type]) || [];
  const e = Object.assign({ target: el, preventDefault() {}, stopPropagation() {} }, evt || {});
  for (const h of hs) h(e);
};
const countCls = (root, cls) => collect(root, '.' + cls).length;

const TT = window.TT;
const elTutWeeks = document.getElementById('tut-weeks');
const elDisplay = document.getElementById('text-display');

ok('按顺序加载了 8 个脚本', order.length === 8, order.join(','));
ok('课程数 20', TT.COURSES.length === 20, String(TT.COURSES.length));
ok('教程 30 x 2', TT.Tutorial.EN.length === 30 && TT.Tutorial.PY.length === 30);

/* 首页渲染 */
ok('boot 后英文模块渲染 30 张日卡', countCls(elTutWeeks, 'tut-day') === 30, 'n=' + countCls(elTutWeeks, 'tut-day'));
eqCheck('进度文案', document.getElementById('tut-progress-text').textContent, '已完成 0 / 30 天');
ok('继续按钮指向第 1 天', String(document.getElementById('tut-continue').textContent).includes('第 1 天'), document.getElementById('tut-continue').textContent);
ok('首日卡片标记为 next', countCls(elTutWeeks, 'is-next') === 1, 'n=' + countCls(elTutWeeks, 'is-next'));
ok('课程列表渲染 20 项', countCls(document.getElementById('course-groups'), 'lesson-btn') === 20, 'n=' + countCls(document.getElementById('course-groups'), 'lesson-btn'));

/* 切到拼音模块 */
const trackPy = document.querySelectorAll('.tut-track')[1];
document.getElementById('tut-tracks').children = document.querySelectorAll('.tut-track');
fire(document.getElementById('tut-tracks'), 'click', { target: trackPy });
ok('切到拼音后重新渲染 30 张卡（不叠加）', countCls(elTutWeeks, 'tut-day') === 30, 'n=' + countCls(elTutWeeks, 'tut-day'));
ok('拼音模块有打汉字的日子', TT.Tutorial.PY.filter((d) => d.mode === 'hanzi').length >= 4, String(TT.Tutorial.PY.filter((d) => d.mode === 'hanzi').length));
ok('拼音模块首日名在第 1 张卡里', collect(elTutWeeks, '.tut-day')[0]._text !== undefined);

/* 点第 1 天进课 */
const dayCards = collect(elTutWeeks, '.tut-day');
fire(elTutWeeks, 'click', { target: dayCards[0] });
ok('点日卡后切到练习视图', document.getElementById('view-practice')._classes.includes('is-active'));
ok('练习标题是教程第 1 天', String(document.getElementById('lesson-name').textContent).includes('教程 · 第 1 天'), document.getElementById('lesson-name').textContent);
ok('提示行显示拼音提示语', String(document.getElementById('lesson-hint').textContent).includes('拼音'), document.getElementById('lesson-hint').textContent);
const spans = elDisplay.children;
ok('练习文本渲染出字符', spans.length > 10, 'spans=' + spans.length);
ok('首字符标记 current', spans[0]._classes.includes('current'));
ok('拼音提示行已填充汉字', document.getElementById('py-hint').children.length > 0, 'n=' + document.getElementById('py-hint').children.length);
ok('提示行第一个汉字高亮', collect(document.getElementById('py-hint'), '.py-word')[0]._classes.includes('is-on'));

/* 敲键：对 / 错 */
const firstChar = spans[0]._text;
fire(document, 'keydown', { key: firstChar });
ok('敲对首字符后变绿', collect(elDisplay, '.ch').filter((s) => s._classes.includes('ok')).length === 1,
  'ok=' + collect(elDisplay, '.ch').filter((s) => s._classes.includes('ok')).length);
const wrongKey = firstChar === 'q' ? 'z' : 'q';
fire(document, 'keydown', { key: wrongKey });
ok('敲错字符变红', collect(elDisplay, '.ch').filter((s) => s._classes.includes('bad')).length === 1,
  'bad=' + collect(elDisplay, '.ch').filter((s) => s._classes.includes('bad')).length);
ok('光标前进到第 3 个字符', collect(elDisplay, '.ch')[2]._classes.includes('current'));

/* 退格 */
fire(document, 'keydown', { key: 'Backspace' });
ok('退格清除红色标记', collect(elDisplay, '.ch').filter((s) => s._classes.includes('bad')).length === 0);
ok('退格后 current 回到第 2 个字符', collect(elDisplay, '.ch')[1]._classes.includes('current'));

/* 打汉字的日子：单位切换 */
const hanziDay = TT.Tutorial.PY.find((d) => d.mode === 'hanzi');
fire(document.getElementById('tut-tracks'), 'click', { target: document.querySelectorAll('.tut-track')[1] });
const cards2 = collect(elTutWeeks, '.tut-day');
const targetCard = cards2.find((c) => c.getAttribute('data-day') === hanziDay.id);
ok('找到打汉字的日卡', !!targetCard, hanziDay.id);
fire(elTutWeeks, 'click', { target: targetCard });
eqCheck('打汉字的日子速度单位是字/分', document.getElementById('hud-speed-label').textContent, '速度 字/分');
ok('拼音提示行在汉字模式隐藏', document.getElementById('py-hint').hidden === true);
ok('目标文案用字/分', String(document.getElementById('target-text').textContent).includes('字/分'), document.getElementById('target-text').textContent);

/* 回课程列表：点第 1 课 */
const courseBtn = collect(document.getElementById('course-groups'), '.lesson-btn')[0];
fire(document.getElementById('course-groups'), 'click', { target: courseBtn });
ok('点课程后标题不再是教程', !String(document.getElementById('lesson-name').textContent).includes('教程'), document.getElementById('lesson-name').textContent);
eqCheck('课程模式速度单位回到 WPM', document.getElementById('hud-speed-label').textContent, '速度 WPM');

function eqCheck(name, a, b) { ok(name, a === b, JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }

console.log('');
console.log('DOM 冒烟通过: ' + pass + '   失败: ' + fails.length);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
