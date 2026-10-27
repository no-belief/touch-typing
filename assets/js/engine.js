(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});

  function Engine(text) {
    this.text = String(text == null ? '' : text);
    this.length = this.text.length;
    this.marks = new Array(this.length);
    this.typed = new Array(this.length);
    for (var i = 0; i < this.length; i++) { this.marks[i] = null; this.typed[i] = null; }
    this.index = 0;
    this.startedAt = 0;
    this.finishedAt = 0;
    this.keystrokes = 0;
    this.misses = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.errByChar = {};
    this.finished = false;
  }

  Engine.prototype.push = function (ch) {
    if (this.finished || this.index >= this.length) return null;
    if (!this.startedAt) this.startedAt = Date.now();
    var expected = this.text.charAt(this.index);
    var ok = ch === expected;
    this.marks[this.index] = ok ? 1 : 0;
    this.typed[this.index] = ch;
    this.keystrokes += 1;
    if (ok) {
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.misses += 1;
      this.streak = 0;
      this.errByChar[expected] = (this.errByChar[expected] || 0) + 1;
    }
    var at = this.index;
    this.index += 1;
    if (this.index >= this.length) this.finish();
    return { index: at, ok: ok, expected: expected, got: ch };
  };

  Engine.prototype.backspace = function () {
    if (this.finished || this.index === 0) return null;
    this.index -= 1;
    this.marks[this.index] = null;
    this.typed[this.index] = null;
    this.streak = 0;
    return this.index;
  };

  Engine.prototype.finish = function () {
    if (!this.finishedAt) this.finishedAt = Date.now();
    this.finished = true;
  };

  Engine.prototype.counts = function () {
    var ok = 0, bad = 0;
    for (var i = 0; i < this.length; i++) {
      if (this.marks[i] === 1) ok += 1;
      else if (this.marks[i] === 0) bad += 1;
    }
    return { correct: ok, wrong: bad, done: ok + bad };
  };

  Engine.prototype.elapsed = function (now) {
    if (!this.startedAt) return 0;
    var end = this.finishedAt || now || Date.now();
    return Math.max(0, end - this.startedAt);
  };

  Engine.prototype.metrics = function (now) {
    var c = this.counts();
    var ms = this.elapsed(now);
    var min = ms / 60000;
    var wpm = min > 0 ? (c.correct / 5) / min : 0;
    var rawWpm = min > 0 ? (c.done / 5) / min : 0;
    var acc = this.keystrokes > 0 ? ((this.keystrokes - this.misses) / this.keystrokes) * 100 : 100;
    return {
      wpm: wpm,
      rawWpm: rawWpm,
      acc: acc,
      sec: ms / 1000,
      progress: this.length ? this.index / this.length : 0,
      correct: c.correct,
      wrong: c.wrong,
      keystrokes: this.keystrokes,
      misses: this.misses
    };
  };

  Engine.prototype.result = function () {
    var m = this.metrics(this.finishedAt || Date.now());
    return {
      wpm: Math.round(m.wpm),
      rawWpm: Math.round(m.rawWpm),
      acc: Math.round(m.acc * 10) / 10,
      sec: Math.round(m.sec * 10) / 10,
      chars: this.length,
      correct: m.correct,
      wrong: m.wrong,
      keystrokes: m.keystrokes,
      misses: m.misses,
      bestStreak: this.bestStreak,
      errByChar: this.errByChar,
      finished: this.finished
    };
  };

  TT.Engine = Engine;
})();
