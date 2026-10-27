(function () {
  'use strict';
  var TT = window.TT;
  var COURSES = TT.COURSES;
  var byId = {};
  for (var i = 0; i < COURSES.length; i++) byId[COURSES[i].id] = COURSES[i];

  var S = {
    courseId: COURSES[0].id,
    engine: null,
    spans: [],
    hintSpans: [],
    current: null,
    timer: null,
    view: 'practice',
    built: null,
    mode: 'letter',
    composing: false,
    suppressInputUntil: 0
  };
  var el = {};

  function $(id) { return document.getElementById(id); }

  function boot() {
    el.courseGroups = $('course-groups');
    el.lessonName = $('lesson-name');
    el.lessonHint = $('lesson-hint');
    el.targetText = $('target-text');
    el.display = $('text-display');
    el.pyHint = $('py-hint');
    el.speedLabel = $('hud-speed-label');
    el.zone = $('typing-zone');
    el.buffer = $('typebuffer');
    el.wpm = $('hud-wpm');
    el.acc = $('hud-acc');
    el.time = $('hud-time');
    el.progress = $('hud-progress');
    el.barFill = $('bar-fill');
    el.kbPractice = $('keyboard-practice');
    el.kbGuide = $('keyboard-guide');
    el.legend = $('finger-legend');
    el.fingerBody = $('finger-tbody');
    el.modal = $('result-modal');
    el.modalSub = $('modal-sub');
    el.resultGrid = $('result-grid');
    el.statCards = $('stat-cards');
    el.canvas = $('history-chart');
    el.chartFilter = $('chart-filter');
    el.chartNote = $('chart-note');
    el.runsBody = $('runs-tbody');

    TT.Keyboard.render(el.kbPractice);
    TT.Keyboard.render(el.kbGuide);
    renderLegend();
    renderFingerTable();
    renderCourses();
    renderFilter();
    bind();
    switchView('practice');
    startLesson(S.courseId, true);
    renderStats();
  }

  /* ---------------- courses ---------------- */
  function renderCourses() {
    var best = TT.Storage.bestByCourse();
    var frag = document.createDocumentFragment();
    var groups = [];
    var index = {};
    COURSES.forEach(function (c) {
      if (!index[c.stage]) { index[c.stage] = { name: c.stage, items: [] }; groups.push(index[c.stage]); }
      index[c.stage].items.push(c);
    });
    groups.forEach(function (g) {
      var wrap = document.createElement('div');
      wrap.className = 'course-group';
      var title = document.createElement('div');
      title.className = 'group-name';
      title.textContent = g.name;
      wrap.appendChild(title);
      g.items.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lesson-btn';
        b.setAttribute('data-course', c.id);
        var dot = document.createElement('i');
        dot.className = 'dot';
        var name = document.createElement('span');
        name.className = 'lname';
        name.textContent = c.name;
        b.appendChild(dot);
        b.appendChild(name);
        if (best[c.id]) {
          var bb = document.createElement('span');
          bb.className = 'lbest';
          bb.textContent = best[c.id].wpm + ' wpm';
          if (best[c.id].wpm >= c.target) b.classList.add('is-done');
          b.appendChild(bb);
        }
        if (c.id === S.courseId) b.classList.add('is-active');
        wrap.appendChild(b);
      });
      frag.appendChild(wrap);
    });
    el.courseGroups.textContent = '';
    el.courseGroups.appendChild(frag);
  }

  function markActiveCourse() {
    var btns = el.courseGroups.querySelectorAll('.lesson-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-active', btns[i].getAttribute('data-course') === S.courseId);
    }
  }

  /* ---------------- lesson lifecycle ---------------- */
  function startLesson(id, silent) {
    var c = byId[id] || COURSES[0];
    S.courseId = c.id;
    stopTimer();
    S.built = c.kind === 'pinyin' ? TT.Pinyin.build(c.pool, c.mode) : null;
    S.mode = S.built ? S.built.mode : 'letter';
    S.engine = new TT.Engine(S.built ? S.built.target : c.build());
    S.current = null;
    el.lessonName.textContent = c.name;
    el.lessonHint.textContent = c.hint;
    var unitWord = S.mode === 'hanzi' ? '字/分' : 'WPM';
    el.speedLabel.textContent = '速度 ' + unitWord;
    el.targetText.textContent = '目标 ' + c.target + ' ' + unitWord;
    el.zone.classList.remove('is-started');
    hideModal();
    renderText();
    updateHUD();
    TT.Keyboard.highlight(el.kbPractice, S.engine.text.charAt(0));
    markActiveCourse();
    if (!silent) focusBuffer();
  }

  function renderText() {
    var text = S.engine.text;
    var frag = document.createDocumentFragment();
    S.spans = new Array(text.length);
    S.current = null;
    for (var i = 0; i < text.length; i++) {
      var sp = document.createElement('span');
      sp.className = 'ch';
      sp.textContent = text.charAt(i);
      S.spans[i] = sp;
      frag.appendChild(sp);
    }
    el.display.textContent = '';
    el.display.appendChild(frag);
    renderHint();
    setCurrent(0);
  }

  function renderHint() {
    S.hintSpans = [];
    el.pyHint.textContent = '';
    if (!S.built || S.built.mode !== 'pinyin') {
      el.pyHint.hidden = true;
      return;
    }
    S.built.words.forEach(function (w) {
      var sp = document.createElement('span');
      sp.className = 'py-word';
      sp.textContent = w.hanzi;
      S.hintSpans.push({ node: sp, word: w });
      el.pyHint.appendChild(sp);
    });
    el.pyHint.hidden = false;
  }

  function markHint(index) {
    if (!S.hintSpans.length) return;
    for (var i = 0; i < S.hintSpans.length; i++) {
      var item = S.hintSpans[i];
      var on = index >= item.word.start && index < item.word.end;
      item.node.classList.toggle('is-on', on);
      item.node.classList.toggle('is-done', index >= item.word.end && !on);
    }
  }

  function paintAt(i) {
    var sp = S.spans[i];
    if (!sp) return;
    var m = S.engine.marks[i];
    sp.classList.toggle('ok', m === 1);
    sp.classList.toggle('bad', m === 0);
    var ch = S.engine.text.charAt(i);
    if (m === 0 && S.engine.typed[i] != null) ch = S.engine.typed[i];
    if (sp.textContent !== ch) sp.textContent = ch;
  }

  function setCurrent(i) {
    if (S.current) S.current.classList.remove('current');
    S.current = null;
    markHint(i == null && S.engine ? S.engine.index : i);
    if (i == null) return;
    var sp = S.spans[i];
    if (!sp) return;
    sp.classList.add('current');
    S.current = sp;
    scrollIntoView(sp);
  }

  function scrollIntoView(sp) {
    var box = el.display;
    var top = sp.offsetTop;
    var bottom = top + sp.offsetHeight;
    if (top < box.scrollTop + 6) box.scrollTop = Math.max(0, top - 6);
    else if (bottom > box.scrollTop + box.clientHeight - 6) box.scrollTop = bottom - box.clientHeight + 6;
  }

  function updateHUD() {
    var m = S.engine.metrics(Date.now());
    var cpm = m.sec > 0 ? m.correct / (m.sec / 60) : 0;
    el.wpm.textContent = String(Math.round(S.mode === 'hanzi' ? cpm : m.wpm));
    el.acc.textContent = m.acc.toFixed(0) + '%';
    el.time.textContent = m.sec.toFixed(1) + 's';
    el.progress.textContent = Math.round(m.progress * 100) + '%';
    el.barFill.style.width = (m.progress * 100).toFixed(2) + '%';
  }

  function startTimer() {
    if (S.timer) return;
    S.timer = window.setInterval(function () {
      if (!S.engine || S.engine.finished) { stopTimer(); return; }
      updateHUD();
    }, 100);
  }
  function stopTimer() {
    if (S.timer) { window.clearInterval(S.timer); S.timer = null; }
  }

  /* ---------------- input ---------------- */
  function handleChar(ch) {
    if (!S.engine || S.engine.finished) return;
    var res = S.engine.push(ch);
    if (!res) return;
    el.zone.classList.add('is-started');
    startTimer();
    paintAt(res.index);
    setCurrent(S.engine.index);
    updateHUD();
    TT.Keyboard.highlight(el.kbPractice, S.engine.text.charAt(S.engine.index));
    if (S.engine.finished) finishRun();
  }

  function handleBackspace() {
    if (!S.engine || S.engine.finished) return;
    var idx = S.engine.backspace();
    if (idx == null) return;
    paintAt(idx);
    setCurrent(S.engine.index);
    updateHUD();
    TT.Keyboard.highlight(el.kbPractice, S.engine.text.charAt(S.engine.index));
  }

  function nextCourseId() {
    var idx = 0;
    for (var i = 0; i < COURSES.length; i++) if (COURSES[i].id === S.courseId) idx = i;
    return COURSES[(idx + 1) % COURSES.length].id;
  }

  function onKeyDown(e) {
    if (S.composing || e.isComposing || e.keyCode === 229) return;
    if (S.view !== 'practice') return;
    if (!el.modal.hidden) {
      if (e.key === 'Enter') { e.preventDefault(); hideModal(); startLesson(nextCourseId()); }
      else if (e.key === 'Escape') { e.preventDefault(); hideModal(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
    if (e.key === 'Escape') { e.preventDefault(); startLesson(S.courseId); return; }
    if (e.key === 'Enter') { e.preventDefault(); startLesson(nextCourseId()); return; }
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (e.key === ' ') { e.preventDefault(); S.suppressInputUntil = Date.now() + 40; handleChar(' '); return; }
    if (e.key.length === 1) {
      e.preventDefault();
      S.suppressInputUntil = Date.now() + 40;
      handleChar(e.key);
    }
  }

  // 移动端软键盘：keydown 常拿不到真实字符，用 input 事件兜底
  function onBufferInput() {
    if (S.composing) return;
    var v = el.buffer.value;
    el.buffer.value = '';
    if (!v) { if (S.engine) updateHUD(); return; }
    if (Date.now() < S.suppressInputUntil) return;
    for (var i = 0; i < v.length; i++) {
      var ch = v.charAt(i);
      if (ch === '\n' || ch === '\r') continue;
      handleChar(ch);
    }
  }

  function onBufferKeyDown(e) {
    if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); }
  }

  function focusBuffer() {
    try { el.buffer.focus({ preventScroll: true }); } catch (err) { el.buffer.focus(); }
  }

  /* ---------------- result ---------------- */
  function finishRun() {
    stopTimer();
    updateHUD();
    var c = byId[S.courseId];
    var r = S.engine.result();
    r.courseId = c.id;
    r.courseName = c.name;
    r.target = c.target;
    r.unit = c.kind === 'pinyin' && c.mode === 'hanzi' ? 'cpm' : 'wpm';
    if (r.unit === 'cpm') {
      r.cpm = r.sec > 0 ? Math.round(r.correct / (r.sec / 60)) : 0;
      r.wpm = r.cpm;
    }
    TT.Storage.add(r);
    showResult(r, c);
    renderCourses();
    renderStats();
  }

  function cell(label, value, tone) {
    var d = document.createElement('div');
    d.className = 'result-cell' + (tone ? ' ' + tone : '');
    var s = document.createElement('span');
    s.textContent = label;
    var b = document.createElement('b');
    b.textContent = value;
    d.appendChild(s);
    d.appendChild(b);
    return d;
  }

  function topErrors(map, n) {
    var list = [];
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) list.push({ ch: k, n: map[k] });
    list.sort(function (a, b) { return b.n - a.n; });
    return list.slice(0, n);
  }

  function showResult(r, c) {
    el.resultGrid.textContent = '';
    var hit = r.wpm >= c.target;
    var unitWord = r.unit === 'cpm' ? '字/分' : 'WPM';
    el.modalSub.textContent = c.name + ' · 目标 ' + c.target + ' ' + unitWord + ' · ' + (hit ? '已达标' : '还差 ' + (c.target - r.wpm) + ' ' + unitWord);
    el.resultGrid.appendChild(cell('速度 ' + unitWord, String(r.wpm), hit ? 'is-good' : ''));
    el.resultGrid.appendChild(cell(r.unit === 'cpm' ? '原始速度(字母)' : '原始速度', String(r.rawWpm)));
    el.resultGrid.appendChild(cell('准确率', r.acc.toFixed(1) + '%', r.acc >= 97 ? 'is-good' : 'is-bad'));
    el.resultGrid.appendChild(cell('用时', r.sec.toFixed(1) + 's'));
    el.resultGrid.appendChild(cell('字符', r.correct + ' / ' + r.chars + ' 正确'));
    el.resultGrid.appendChild(cell('错误键次', String(r.misses)));
    el.resultGrid.appendChild(cell('最长连对', String(r.bestStreak)));
    var errs = topErrors(r.errByChar, 3);
    var errText = errs.length
      ? errs.map(function (e) { return (e.ch === ' ' ? '空格' : e.ch) + '×' + e.n; }).join('  ')
      : '无';
    el.resultGrid.appendChild(cell('最常打错', errText));
    el.modal.hidden = false;
  }

  function hideModal() { el.modal.hidden = true; }

  /* ---------------- stats view ---------------- */
  function renderFilter() {
    var prev = el.chartFilter.value;
    el.chartFilter.textContent = '';
    var optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = '全部课程';
    el.chartFilter.appendChild(optAll);
    COURSES.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name;
      el.chartFilter.appendChild(o);
    });
    el.chartFilter.value = prev || 'all';
  }

  function renderStats() {
    var sum = TT.Storage.summary();
    el.statCards.textContent = '';
    var cards = [
      ['练习次数', String(sum.count)],
      ['最高 WPM', String(sum.best)],
      ['平均准确率', sum.count ? sum.avgAcc.toFixed(1) + '%' : '-' ],
      ['累计时长', sum.count ? sum.minutes + ' 分钟' : '-' ]
    ];
    cards.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'stat-card';
      var s = document.createElement('span');
      s.textContent = c[0];
      var b = document.createElement('b');
      b.textContent = c[1];
      d.appendChild(s);
      d.appendChild(b);
      el.statCards.appendChild(d);
    });

    var all = TT.Storage.all().slice().reverse();
    var filter = el.chartFilter.value || 'all';
    var rows = all.filter(function (r) { return filter === 'all' || r.courseId === filter; });
    TT.Chart.draw(el.canvas, rows.slice(-20));

    var unitTip = '速度单位：拼音·打汉字为「字/分」，其余课程为 WPM（每 5 个字符计一词）。';
    el.chartNote.textContent = (TT.Storage.available
      ? '记录保存在本机浏览器（localStorage），不上传服务器。'
      : '当前浏览器禁用了本地存储，成绩只在本次打开期间有效。') + unitTip;

    el.runsBody.textContent = '';
    if (!rows.length) {
      var tr0 = document.createElement('tr');
      tr0.className = 'empty-row';
      var td0 = document.createElement('td');
      td0.colSpan = 5;
      td0.textContent = '还没有练习记录，先去练一课吧';
      tr0.appendChild(td0);
      el.runsBody.appendChild(tr0);
      return;
    }
    rows.slice(0, 20).forEach(function (r) {
      var tr = document.createElement('tr');
      var d = new Date(r.ts);
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      var cells = [
        (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
        r.courseName,
        String(r.wpm),
        (r.acc || 0).toFixed(1) + '%',
        (r.sec || 0).toFixed(1) + 's'
      ];
      cells.forEach(function (v, idx) {
        var td = document.createElement('td');
        if (idx === 2 || idx === 3 || idx === 4) td.className = 'num';
        td.textContent = v;
        tr.appendChild(td);
      });
      el.runsBody.appendChild(tr);
    });
  }

  /* ---------------- guide view ---------------- */
  function renderLegend() {
    el.legend.textContent = '';
    TT.Keyboard.FINGER_ORDER.forEach(function (f) {
      var d = document.createElement('div');
      d.className = 'legend-item';
      var i2 = document.createElement('i');
      i2.className = 'f-' + f;
      var s = document.createElement('span');
      s.textContent = TT.Keyboard.FINGERS[f];
      d.appendChild(i2);
      d.appendChild(s);
      el.legend.appendChild(d);
    });
  }

  function renderFingerTable() {
    el.fingerBody.textContent = '';
    TT.Keyboard.FINGER_GROUPS.forEach(function (g) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td');
      td1.textContent = TT.Keyboard.FINGERS[g[0]];
      var td2 = document.createElement('td');
      td2.className = 'keys';
      var parts = [];
      for (var i = 0; i < g[1].length; i++) parts.push(TT.Keyboard.readLabel(g[1].charAt(i)));
      td2.textContent = parts.join(' ');
      tr.appendChild(td1);
      tr.appendChild(td2);
      el.fingerBody.appendChild(tr);
    });
    var tr = document.createElement('tr');
    var td1 = document.createElement('td');
    td1.textContent = '对侧 Shift';
    var td2 = document.createElement('td');
    td2.textContent = '左手敲字母时按右 Shift，右手敲字母时按左 Shift';
    tr.appendChild(td1);
    tr.appendChild(td2);
    el.fingerBody.appendChild(tr);
  }

  /* ---------------- routing / events ---------------- */
  function switchView(name) {
    S.view = name;
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) views[i].classList.toggle('is-active', views[i].id === 'view-' + name);
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      var on = tabs[j].getAttribute('data-view') === name;
      tabs[j].classList.toggle('is-active', on);
      tabs[j].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (name === 'stats') renderStats();
    if (name === 'guide') window.setTimeout(function () { TT.Chart.draw(el.canvas, TT.Storage.all().slice(-20)); }, 0);
  }

  function bind() {
    document.querySelector('.tabs').addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.tab') : null;
      if (t) switchView(t.getAttribute('data-view'));
    });

    el.courseGroups.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.lesson-btn') : null;
      if (b) startLesson(b.getAttribute('data-course'));
    });

    $('btn-restart').addEventListener('click', function () { startLesson(S.courseId); });
    $('btn-next').addEventListener('click', function () { startLesson(nextCourseId()); });
    $('modal-retry').addEventListener('click', function () { hideModal(); startLesson(S.courseId); });
    $('modal-next').addEventListener('click', function () { hideModal(); startLesson(nextCourseId()); });
    $('modal-stats').addEventListener('click', function () { hideModal(); switchView('stats'); });
    el.modal.addEventListener('click', function (e) { if (e.target === el.modal) hideModal(); });

    el.chartFilter.addEventListener('change', renderStats);
    $('btn-clear').addEventListener('click', function () {
      if (window.confirm('确定清空全部历史成绩？此操作不可撤销。')) {
        TT.Storage.clear();
        renderCourses();
        renderStats();
      }
    });

    document.addEventListener('keydown', onKeyDown);
    el.buffer.addEventListener('input', onBufferInput);
    el.buffer.addEventListener('keydown', onBufferKeyDown);
    el.buffer.addEventListener('compositionstart', function () { S.composing = true; });
    el.buffer.addEventListener('compositionend', function () {
      S.composing = false;
      onBufferInput();
    });
    el.zone.addEventListener('click', focusBuffer);

    var rt = null;
    window.addEventListener('resize', function () {
      if (rt) window.clearTimeout(rt);
      rt = window.setTimeout(renderStats, 150);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
