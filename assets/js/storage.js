(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});
  var KEY = 'tt.runs.v1';
  var MAX = 300;
  var memory = [];

  var available = (function () {
    try {
      var probe = KEY + '.probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (e) { return false; }
  })();

  function readAll() {
    if (!available) return memory.slice();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  function writeAll(list) {
    memory = list.slice();
    if (!available) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* quota: 保留内存副本 */ }
  }

  function add(run) {
    var rec = {};
    for (var k in run) if (Object.prototype.hasOwnProperty.call(run, k)) rec[k] = run[k];
    rec.ts = rec.ts || Date.now();
    rec.id = String(rec.ts) + '-' + Math.random().toString(36).slice(2, 7);
    var all = readAll();
    all.unshift(rec);
    if (all.length > MAX) all.length = MAX;
    writeAll(all);
    return rec;
  }

  function clear() { writeAll([]); }

  function bestByCourse() {
    var map = {};
    readAll().forEach(function (r) {
      if (!map[r.courseId] || r.wpm > map[r.courseId].wpm) map[r.courseId] = r;
    });
    return map;
  }

  function summary() {
    var all = readAll();
    if (!all.length) return { count: 0, best: 0, avgAcc: 0, minutes: 0 };
    var best = 0, accSum = 0, secSum = 0;
    all.forEach(function (r) {
      if (r.wpm > best) best = r.wpm;
      accSum += r.acc || 0;
      secSum += r.sec || 0;
    });
    return {
      count: all.length,
      best: best,
      avgAcc: Math.round((accSum / all.length) * 10) / 10,
      minutes: Math.round(secSum / 60)
    };
  }

  TT.Storage = {
    available: available,
    all: readAll,
    add: add,
    clear: clear,
    bestByCourse: bestByCourse,
    summary: summary
  };
})();
