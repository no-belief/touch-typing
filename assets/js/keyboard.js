(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});
  var BS = String.fromCharCode(92);
  var APOS = String.fromCharCode(39);

  var ROWS = [
    [
      { c: '`', s: '~' }, { c: '1', s: '!' }, { c: '2', s: '@' }, { c: '3', s: '#' },
      { c: '4', s: '$' }, { c: '5', s: '%' }, { c: '6', s: '^' }, { c: '7', s: '&' },
      { c: '8', s: '*' }, { c: '9', s: '(' }, { c: '0', s: ')' }, { c: '-', s: '_' },
      { c: '=', s: '+' }, { id: 'Backspace', label: 'Bksp', w: 2 }
    ],
    [
      { id: 'Tab', label: 'Tab', w: 1.5, finger: 'lp' },
      { c: 'q' }, { c: 'w' }, { c: 'e' }, { c: 'r' }, { c: 't' }, { c: 'y' },
      { c: 'u' }, { c: 'i' }, { c: 'o' }, { c: 'p' },
      { c: '[', s: '{' }, { c: ']', s: '}' }, { c: BS, s: '|', w: 1.5 }
    ],
    [
      { id: 'CapsLock', label: 'Caps', w: 1.75, finger: 'lp' },
      { c: 'a' }, { c: 's' }, { c: 'd' }, { c: 'f' }, { c: 'g' }, { c: 'h' },
      { c: 'j' }, { c: 'k' }, { c: 'l' }, { c: ';', s: ':' }, { c: APOS, s: '"' },
      { id: 'Enter', label: 'Enter', w: 2.25 }
    ],
    [
      { id: 'ShiftLeft', label: 'Shift', w: 2.25, finger: 'lp' },
      { c: 'z' }, { c: 'x' }, { c: 'c' }, { c: 'v' }, { c: 'b' }, { c: 'n' }, { c: 'm' },
      { c: ',', s: '<' }, { c: '.', s: '>' }, { c: '/', s: '?' },
      { id: 'ShiftRight', label: 'Shift', w: 2.75, finger: 'rp' }
    ],
    [
      { id: 'CtrlLeft', label: 'Ctrl', w: 1.5 },
      { id: 'AltLeft', label: 'Alt', w: 1.5 },
      { c: ' ', id: 'Space', label: 'Space', w: 6.5 },
      { id: 'AltRight', label: 'Alt', w: 1.5 },
      { id: 'CtrlRight', label: 'Ctrl', w: 1.5 }
    ]
  ];

  var FINGER_ORDER = ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp', 'th'];
  var FINGERS = {
    lp: '左小指', lr: '左无名指', lm: '左中指', li: '左食指',
    ri: '右食指', rm: '右中指', rr: '右无名指', rp: '右小指', th: '拇指'
  };
  var FINGER_GROUPS = [
    ['lp', '`1qaz'],
    ['lr', '2wsx'],
    ['lm', '3edc'],
    ['li', '45rtfgvb'],
    ['ri', '67yuhjnm'],
    ['rm', '8ik,'],
    ['rr', '9ol.'],
    ['rp', '0-=p[];' + APOS + '/' + BS],
    ['th', ' ']
  ];

  var FINGER_OF = {};
  FINGER_GROUPS.forEach(function (g) {
    var f = g[0];
    for (var i = 0; i < g[1].length; i++) FINGER_OF[g[1].charAt(i)] = f;
  });

  var CHAR_MAP = {};
  ROWS.forEach(function (row) {
    row.forEach(function (k) {
      if (k.c == null) return;
      var id = k.id || k.c;
      CHAR_MAP[k.c] = { key: id, base: k.c, shift: false };
      if (k.s) CHAR_MAP[k.s] = { key: id, base: k.c, shift: true };
      if (k.c >= 'a' && k.c <= 'z') {
        CHAR_MAP[k.c.toUpperCase()] = { key: id, base: k.c, shift: true };
      }
    });
  });

  var SPECIAL_FINGER = {
    Tab: 'lp', CapsLock: 'lp', ShiftLeft: 'lp', Enter: 'rp', ShiftRight: 'rp',
    Backspace: 'rp', Space: 'th'
  };

  function resolve(ch) {
    if (ch == null || ch === '') return null;
    var m = CHAR_MAP[ch];
    if (!m) return null;
    var shift = null;
    if (m.shift) {
      var f = FINGER_OF[m.base] || 'li';
      shift = f.charAt(0) === 'l' ? 'ShiftRight' : 'ShiftLeft';
    }
    return { key: m.key, shift: shift };
  }

  function render(container) {
    if (!container) return null;
    container.textContent = '';
    var index = {};
    var kb = document.createElement('div');
    kb.className = 'kb';

    ROWS.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(function (k) {
        var id = k.id || k.c;
        var el = document.createElement('div');
        el.className = 'key';
        el.style.width = 'calc(var(--u) * ' + (k.w || 1) + ')';
        el.setAttribute('data-key', id);
        var finger = k.c != null ? FINGER_OF[k.c] : SPECIAL_FINGER[id];
        if (finger) el.classList.add('f-' + finger);
        if (k.c === 'f' || k.c === 'j') el.classList.add('is-home');
        var label = k.label != null ? k.label : k.c;
        el.textContent = label;
        if (k.c != null && k.s) el.title = k.c + '  /  ' + k.s;
        index[id] = el;
        rowEl.appendChild(el);
      });
      kb.appendChild(rowEl);
    });

    container.appendChild(kb);
    container.__keyIndex = index;
    return index;
  }

  function highlight(container, ch) {
    if (!container || !container.__keyIndex) return;
    var index = container.__keyIndex;
    var k;
    for (k in index) {
      if (Object.prototype.hasOwnProperty.call(index, k)) index[k].classList.remove('is-next');
    }
    var target = resolve(ch);
    if (!target) return;
    if (index[target.key]) index[target.key].classList.add('is-next');
    if (target.shift && index[target.shift]) index[target.shift].classList.add('is-next');
  }

  function readLabel(c) {
    if (c === ' ') return '空格';
    if (c === BS) return '反斜杠';
    if (c === APOS) return '撇号';
    if (c === '"') return '双引号';
    return c;
  }

  TT.Keyboard = {
    render: render,
    highlight: highlight,
    resolve: resolve,
    FINGER_ORDER: FINGER_ORDER,
    FINGERS: FINGERS,
    FINGER_GROUPS: FINGER_GROUPS,
    readLabel: readLabel
  };
})();
