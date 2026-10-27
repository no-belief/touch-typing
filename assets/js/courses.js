(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});

  // fromCharCode 避免在源码里写反斜杠/引号导致的转义混乱
  var BACKSLASH = String.fromCharCode(92);
  var APOS = String.fromCharCode(39);
  var QUOT = String.fromCharCode(34);

  var HOME = 'asdfjkl;';
  var HOME_GH = 'asdfghjkl;';
  var TOP = 'qwertyuiop';
  var BOTTOM = 'zxcvbnm,./';
  var ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  var DIGITS = '1234567890';
  var PUNCT = ',.;:-_' + APOS + QUOT;
  var SYMBOLS = '()[]{}<>/|@#$%^&*' + BACKSLASH;

  var WORDS = [
    'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
    'his', 'from', 'they', 'say', 'her', 'she', 'will', 'one', 'all', 'would',
    'there', 'their', 'what', 'out', 'about', 'who', 'get', 'which', 'when', 'make',
    'can', 'like', 'time', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
    'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now',
    'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'work',
    'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
    'day', 'most', 'hand', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring',
    'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue',
    'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read',
    'level', 'sense', 'build', 'stay', 'fall', 'nation', 'plan', 'press', 'study', 'report'
  ];

  var SENTENCES = [
    'The quick brown fox jumps over the lazy dog.',
    'Keep your fingers on the home row and never look down.',
    'A steady rhythm beats a fast burst of speed.',
    'Type 40 words per minute, then aim for 60.',
    'Accuracy first: speed follows clean keystrokes.',
    'Practice a little every day; muscle memory takes time.',
    'Press the space bar with one thumb, gently.',
    'If you make a mistake, slow down and reset your hands.',
    'Short daily sessions work better than one long one.',
    'Sit up straight, relax your shoulders, and breathe.'
  ];

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function drill(pool, groups, size) {
    var out = [];
    for (var g = 0; g < groups; g++) {
      var s = '';
      for (var i = 0; i < size; i++) s += pool.charAt(Math.floor(Math.random() * pool.length));
      out.push(s);
    }
    return out.join(' ');
  }

  function words(list, count) {
    var out = [];
    for (var i = 0; i < count; i++) out.push(pickOne(list));
    return out.join(' ');
  }

  function sentences(list, count) {
    var pool = list.slice();
    var out = [];
    for (var i = 0; i < count && pool.length; i++) {
      var at = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(at, 1)[0]);
    }
    return out.join(' ');
  }

  var COURSES = [
    { id: 'c01', stage: '基础', name: '基准键位', target: 15,
      hint: 'asdf jkl; 双手食指放在 F 与 J 的凸点上，敲完立即归位',
      build: function () { return drill(HOME, 26, 4); } },
    { id: 'c02', stage: '基础', name: '基准键位 + G H', target: 18,
      hint: '食指横向伸展敲 G 与 H，其余手指保持基准位',
      build: function () { return drill(HOME_GH, 26, 4); } },
    { id: 'c03', stage: '基础', name: '上排字母', target: 15,
      hint: '各手指向上斜移敲上排，不要整只手移位',
      build: function () { return drill(TOP, 26, 4); } },
    { id: 'c04', stage: '基础', name: '下排字母与逗号句号', target: 15,
      hint: '各手指向下斜移，注意无名指与小指的独立性',
      build: function () { return drill(BOTTOM, 26, 4); } },
    { id: 'c05', stage: '进阶', name: '全字母混合', target: 22,
      hint: '26 个字母随机组合，检验整体指法是否到位',
      build: function () { return drill(ALPHA, 24, 5); } },
    { id: 'c06', stage: '进阶', name: '常用英文单词', target: 28,
      hint: '比随机字母更接近真实输入，注意连打节奏',
      build: function () { return words(WORDS, 30); } },
    { id: 'c07', stage: '数字', name: '数字排', target: 18,
      hint: '数字排按手指分区负责，眼睛不要看键盘',
      build: function () { return drill(DIGITS, 24, 4); } },
    { id: 'c08', stage: '数字', name: '数字 + 字母混合', target: 22,
      hint: '真实输入中最常见的组合，上下排之间来回切换',
      build: function () { return drill(ALPHA + DIGITS, 20, 6); } },
    { id: 'c09', stage: '符号', name: '常用标点', target: 18,
      hint: '逗号、句号、分号、冒号、撇号、引号、连字符与下划线',
      build: function () { return drill(PUNCT, 22, 5); } },
    { id: 'c10', stage: '符号', name: 'Shift 与大小写', target: 20,
      hint: '左手敲字母时用右 Shift，右手敲字母时用左 Shift',
      build: function () { return drill('AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTt', 12, 4); } },
    { id: 'c11', stage: '符号', name: '组合符号', target: 16,
      hint: '括号与 @ # $ % ^ & * 都需要 Shift，注意左右手交替',
      build: function () { return drill(SYMBOLS, 20, 5); } },
    { id: 'c12', stage: '综合', name: '短句综合', target: 30,
      hint: '含大小写、数字与标点，模拟真实打字场景',
      build: function () { return sentences(SENTENCES, 3); } }
  ];

  TT.COURSES = COURSES;
  TT.CourseUtils = { drill: drill, words: words, sentences: sentences, PUNCT: PUNCT, SYMBOLS: SYMBOLS };
})();
