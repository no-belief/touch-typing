(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});
  var U = TT.CourseUtils;
  var APOS = String.fromCharCode(39);
  var QUOT = String.fromCharCode(34);

  var ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  var DIGITS = '1234567890';
  var HOME = 'asdfjkl;';
  var HOME_GH = 'asdfghjkl;';
  var TOP = 'qwertyuiop';
  var BOTTOM = 'zxcvbnm,./';
  var PUNCT = ',.;:' + APOS + QUOT + '-_';
  var CASE_POOL = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';

  var SHORT = ['the', 'and', 'for', 'you', 'not', 'all', 'can', 'her', 'was', 'one',
    'our', 'out', 'day', 'get', 'him', 'his', 'how', 'man', 'new', 'now',
    'old', 'see', 'two', 'way', 'who', 'its', 'let', 'put', 'say', 'she',
    'too', 'use', 'job', 'key', 'run', 'try'];

  var MID = ['about', 'other', 'which', 'their', 'would', 'there', 'write', 'first',
    'after', 'thing', 'think', 'where', 'right', 'still', 'every', 'great',
    'might', 'sound', 'small', 'large', 'place', 'point', 'world', 'under',
    'never', 'house', 'water', 'again', 'study', 'learn'];

  var LONG = ['through', 'between', 'because', 'without', 'already', 'another',
    'thought', 'problem', 'different', 'important', 'together', 'question',
    'remember', 'business', 'consider', 'continue', 'describe', 'develop',
    'education', 'environment', 'understand', 'experience', 'management', 'production'];

  var BIGRAMS = ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd',
    'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar'];

  var TRIGRAMS = ['the', 'and', 'ing', 'her', 'tha', 'ere', 'ent', 'hat', 'his',
    'ith', 'tio', 'for', 'nde', 'has', 'men', 'thi', 'cti', 'ate', 'all', 'eth'];

  var SNIPPETS = ['a+b=1;', 'x<y && y>0', '{id: 42}', 'f(x) = x*2', '#tag @user',
    '$100 - 20%', 'list[0]: ok', 'if (a!=b)', 'n = n+1;', 'a_b|c'];

  var NUM_SENT = [
    'There are 24 hours in a day and 60 minutes in an hour.',
    'Please save the file as report_v2.txt before 5 pm.',
    'The order number is 4821 and it ships on 9 May.',
    'Add 15 items to the cart, then remove 3 of them.',
    'The price is 19 dollars and 99 cents per unit.',
    'Our office is on floor 12, room 1207.'
  ];

  var LONG_SENT = [
    'Typing well is not about moving your fingers faster, it is about moving them less.',
    'Keep your hands on the home row and let each finger own its own column of keys.',
    'A short practice session every day beats one long session at the end of the week.',
    'When you notice an error, slow down for a moment instead of trying to catch up.',
    'Look at the screen only, and let your fingers remember where the keys are.',
    'Accuracy comes first, and speed follows naturally once the movement is automatic.'
  ];

  function pickN(list, n, repeat) {
    if (repeat) {
      var out = [];
      for (var i = 0; i < n; i++) out.push(list[Math.floor(Math.random() * list.length)]);
      return out;
    }
    return U.shuffle ? U.shuffle(list).slice(0, n) : shuffleLocal(list).slice(0, n);
  }

  function shuffleLocal(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function joined(list, n, sep, repeat) { return pickN(list, n, repeat).join(sep); }
  function groups(list, n) { return pickN(list, n, false).join(' '); }

  function en(day, name, focus, target, minutes, hint, build) {
    var week = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 5;
    return {
      id: 't-en-' + (day < 10 ? '0' + day : day),
      track: 'en', day: day, week: week, name: name, focus: focus,
      target: target, minutes: minutes, hint: hint, build: build
    };
  }

  function py(day, name, focus, target, minutes, spec, hint) {
    var week = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 5;
    var d = {
      id: 't-py-' + (day < 10 ? '0' + day : day),
      track: 'py', day: day, week: week, name: name, focus: focus,
      target: target, minutes: minutes, hint: hint,
      kind: 'pinyin', mode: spec.mode || 'pinyin',
      pool: spec.pool || 'cy', py: {}
    };
    if (spec.count) d.py.count = spec.count;
    if (spec.idx) d.py.idx = spec.idx;
    if (spec.mix) d.py.mix = spec.mix;
    if (spec.repeat) d.py.repeat = true;
    return d;
  }

  var PY_HINT = '看上方汉字提示，敲出拼音字母；词与词之间按空格，不打声调';
  var PY_HANZI_HINT = '切到中文输入法，打出屏幕上的汉字；上屏后逐字判定';

  var EN = [
    en(1, '基准键位', 'a s d f · j k l ;', 12, 10, '两手的食指放在 F 与 J 的凸点上，其余手指自然落下',
      function () { return U.drill(HOME, 26, 4); }),
    en(2, '加入 G 和 H', 'g h', 14, 10, '食指横向伸展敲 G / H，敲完立刻回到基准位',
      function () { return U.drill(HOME_GH, 26, 4); }),
    en(3, '上排字母', 'q w e r t y u i o p', 13, 12, '各手指向上斜移，整只手不要平移',
      function () { return U.drill(TOP, 26, 4); }),
    en(4, '下排字母', 'z x c v b n m , . /', 13, 12, '各手指向下斜移，注意无名指与小指别塌下去',
      function () { return U.drill(BOTTOM, 26, 4); }),
    en(5, '三排贯通', '26 个字母', 15, 12, '上下排来回切换时，基准键始终是回家的路',
      function () { return U.drill(ALPHA, 24, 5); }),
    en(6, '最短高频词', 'the and for you', 18, 12, '先不追求快，让每个词都一次敲对',
      function () { return U.words(SHORT, 30); }),
    en(7, '第一周测评', '基准 + 全字母', 18, 15, '测一次真实水平：60 秒内尽量多敲，错了照敲不停',
      function () { return U.drill(ALPHA + HOME, 22, 6); }),
    en(8, '数字排', '1 2 3 4 5 6 7 8 9 0', 15, 12, '数字排按手指分区负责，眼睛不要看键盘',
      function () { return U.drill(DIGITS, 24, 4); }),
    en(9, '数字分组', '3-4 位一组', 16, 12, '像念电话号码那样分组敲，节奏更稳',
      function () { return groups(['123', '4567', '890', '2345', '6789', '0123', '456', '7890', '1357', '2468'], 12); }),
    en(10, '字母 + 数字', 'a1 b2 c3', 18, 12, '真实输入里数字和字母总是混在一起的',
      function () { return U.drill(ALPHA + DIGITS, 20, 6); }),
    en(11, '常用标点', ', . ; : 引号', 16, 12, '右小指负责大部分标点，别整只手去够',
      function () { return U.drill(PUNCT, 22, 5); }),
    en(12, '连字符与下划线', '- _', 17, 12, '按下 Shift 前先想好是哪只手，两手配合别打架',
      function () { return joined(SHORT, 10, '_') + ' ' + joined(MID, 8, '-'); }),
    en(13, 'Shift 与大小写', 'Aa Bb Cc', 18, 12, '左手敲字母时用右 Shift，右手敲字母时用左 Shift',
      function () { return U.drill(CASE_POOL, 12, 4); }),
    en(14, '第二周测评', '数字 + 标点混合', 20, 15, '本阶段目标是稳定在 20 WPM 且准确率 97% 以上',
      function () { return U.drill(ALPHA + DIGITS + PUNCT, 18, 7); }),
    en(15, '高频短词', '2-3 字母词', 22, 12, '短词连打时手指几乎不用离开基准位',
      function () { return U.words(SHORT, 34); }),
    en(16, '中频词', '4-6 字母词', 24, 12, '注意双字母组合，别把同一个手指连敲两次',
      function () { return U.words(MID, 30); }),
    en(17, '长单词', '7 个字母以上', 22, 15, '长词靠节奏不靠蛮力，一组一组地推进',
      function () { return U.words(LONG, 24); }),
    en(18, '短句含标点', '句子 + 句号', 26, 15, '句末标点也是要敲的字符，不要漏',
      function () { return U.sentences(U.SENTENCES, 2); }),
    en(19, '短句含数字', '句子 + 数字', 26, 15, '数字穿插在句子里时最容易乱节奏',
      function () { return U.sentences(NUM_SENT, 2); }),
    en(20, '两句连打', '段落感', 28, 15, '两句之间不要停顿，把它当一个整体',
      function () { return U.sentences(U.SENTENCES, 3); }),
    en(21, '第三周测评', '60 秒常用词', 30, 18, '本周目标是 30 WPM 且准确率 97% 以上',
      function () { return U.words(U.WORDS, 40); }),
    en(22, '双字母组合', 'th he in er', 30, 12, '这些是全键盘出现频率最高的组合',
      function () { return groups(BIGRAMS, 24); }),
    en(23, '三字母组合', 'the and ing', 32, 12, '组合越熟，单词就越像"一个动作"',
      function () { return groups(TRIGRAMS, 24); }),
    en(24, '大小写交替', 'aA bB', 30, 12, '交替时只动小指按 Shift，其他手指保持原位',
      function () { return U.drill(CASE_POOL + CASE_POOL, 10, 4); }),
    en(25, '代码风格符号', '= ; ( ) [ ] { }', 26, 15, '编程文本里符号比字母更费神',
      function () { return groups(SNIPPETS, 8); }),
    en(26, '长句', '30 词以上', 34, 18, '长句考验的是耐力与稳定的节奏',
      function () { return U.sentences(LONG_SENT, 2); }),
    en(27, '综合混打', '词 + 句 + 符号', 36, 18, '把前面所有东西混在一起，模拟真实写作',
      function () { return U.sentences(U.SENTENCES, 2) + ' ' + U.words(MID, 12) + ' ' + groups(SNIPPETS, 3); }),
    en(28, '第四周测评', '50 词', 38, 20, '本周目标是 38 WPM 且准确率 98% 以上',
      function () { return U.words(U.WORDS, 50); }),
    en(29, '冲刺：全字母', '纯字母 30 组', 40, 20, '纯字母是最纯粹的指法检验',
      function () { return U.drill(ALPHA, 30, 6); }),
    en(30, '毕业测评', '综合 4 句', 45, 25, '最后测一次：打开「成绩」页把你的曲线存下来',
      function () { return U.sentences(U.SENTENCES, 4); })
  ];

  var PY = [
    py(1, '单音节起步', 'wo ni ta de', 12, 10, { pool: 'dy', mode: 'pinyin', count: 20 }, PY_HINT),
    py(2, '单音节提速', '单字 20 个', 14, 10, { pool: 'dy', mode: 'pinyin', count: 20 }, PY_HINT),
    py(3, '常用双字词', '中国 学习 时间', 16, 12, { pool: 'cy', mode: 'pinyin', count: 12 }, PY_HINT),
    py(4, '平翘舌入门', 'z zh · s sh', 13, 12,
      { pool: 'pq', mode: 'pinyin', idx: [0, 1, 2, 3, 4, 5, 6, 7], count: 12, repeat: true }, PY_HINT),
    py(5, '平翘舌全池', '20 个最小对立词', 16, 12, { pool: 'pq', mode: 'pinyin', count: 16 }, PY_HINT),
    py(6, '前后鼻音入门', 'an ang · en eng', 13, 12,
      { pool: 'nq', mode: 'pinyin', idx: [0, 1, 2, 3, 4, 5, 6, 7], count: 12, repeat: true }, PY_HINT),
    py(7, '第一周测评', '单字 + 常用词', 18, 15, { pool: 'cy', mode: 'pinyin', count: 16 }, PY_HINT),
    py(8, 'z / zh 专项', '支持 资助 自主', 14, 12,
      { pool: 'pq', mode: 'pinyin', idx: [0, 1, 8, 9, 10, 11], count: 12, repeat: true }, PY_HINT),
    py(9, 'c / ch 专项', '陈旧 成就 擦洗', 14, 12,
      { pool: 'pq', mode: 'pinyin', idx: [4, 5, 12, 13], count: 12, repeat: true }, PY_HINT),
    py(10, 's / sh 专项', '四十 事实 诗人', 14, 12,
      { pool: 'pq', mode: 'pinyin', idx: [2, 3, 6, 7, 14, 15, 16, 17], count: 12, repeat: true }, PY_HINT),
    py(11, '平翘舌混合', '全池交替', 16, 12, { pool: 'pq', mode: 'pinyin', count: 16 }, PY_HINT),
    py(12, '平翘舌 · 打汉字', '真实输入法', 30, 15, { pool: 'pq', mode: 'hanzi', count: 16 }, PY_HANZI_HINT),
    py(13, '平翘舌速练', '20 词连打', 20, 15, { pool: 'pq', mode: 'pinyin', count: 20 }, PY_HINT),
    py(14, '第二周测评', '打汉字 16 词', 35, 18, { pool: 'pq', mode: 'hanzi', count: 16 }, PY_HANZI_HINT),
    py(15, '前鼻音专项', 'an en in', 15, 12,
      { pool: 'nq', mode: 'pinyin', idx: [0, 2, 4, 6, 10, 12, 14, 16, 17, 18], count: 12, repeat: true }, PY_HINT),
    py(16, '后鼻音专项', 'ang eng ing', 15, 12,
      { pool: 'nq', mode: 'pinyin', idx: [1, 3, 5, 7, 9, 11, 13, 15, 19], count: 12, repeat: true }, PY_HINT),
    py(17, '前后鼻音对照', '全池混合', 17, 12, { pool: 'nq', mode: 'pinyin', count: 16 }, PY_HINT),
    py(18, '前后鼻音 · 打汉字', '真实输入法', 32, 15, { pool: 'nq', mode: 'hanzi', count: 16 }, PY_HANZI_HINT),
    py(19, '前后鼻音速练', '20 词连打', 20, 15, { pool: 'nq', mode: 'pinyin', count: 20 }, PY_HINT),
    py(20, '平翘舌 + 鼻音', '两池混打', 18, 15,
      { pool: 'mix', mode: 'pinyin', mix: ['pq', 'nq'], count: 16 }, PY_HINT),
    py(21, '第三周测评', '打汉字 16 词', 36, 18, { pool: 'nq', mode: 'hanzi', count: 16 }, PY_HANZI_HINT),
    py(22, 'n 起头专项', '牛奶 脑力 农历', 15, 12,
      { pool: 'nb', mode: 'pinyin', idx: [2, 4, 6, 9, 10, 15, 16, 17, 19], count: 12, repeat: true }, PY_HINT),
    py(23, 'l 起头专项', '留念 冷暖 玲珑', 15, 12,
      { pool: 'nb', mode: 'pinyin', idx: [1, 5, 7, 8, 11, 12, 14, 18], count: 12, repeat: true }, PY_HINT),
    py(24, 'n / l 对照', '全池混合', 17, 12, { pool: 'nb', mode: 'pinyin', count: 16 }, PY_HINT),
    py(25, '鼻边音 · 打汉字', '真实输入法', 32, 15, { pool: 'nb', mode: 'hanzi', count: 16 }, PY_HANZI_HINT),
    py(26, '三难点混打', '平翘 + 鼻音 + 鼻边', 18, 15,
      { pool: 'mix', mode: 'pinyin', mix: ['pq', 'nq', 'nb'], count: 16 }, PY_HINT),
    py(27, '常用词实战', '单字 + 双字词', 20, 15,
      { pool: 'mix', mode: 'pinyin', mix: ['cy', 'dy'], count: 16 }, PY_HINT),
    py(28, '第四周测评', '三难点打汉字', 40, 18,
      { pool: 'mix', mode: 'hanzi', mix: ['pq', 'nq', 'nb'], count: 16 }, PY_HANZI_HINT),
    py(29, '冲刺：常用词', '20 词连打', 25, 20, { pool: 'cy', mode: 'pinyin', count: 20 }, PY_HINT),
    py(30, '毕业测评', '四池混合打汉字', 45, 25,
      { pool: 'mix', mode: 'hanzi', mix: ['pq', 'nq', 'nb', 'cy'], count: 20 }, PY_HANZI_HINT)
  ];

  var MAP = {};
  EN.concat(PY).forEach(function (d) { MAP[d.id] = d; });

  var WEEK_TITLES = {
    en: { 1: '第 1 周 · 建立基准', 2: '第 2 周 · 数字与标点', 3: '第 3 周 · 单词与句子', 4: '第 4 周 · 速度与稳定', 5: '第 5 周 · 冲刺与毕业测评' },
    py: { 1: '第 1 周 · 单字与拼读', 2: '第 2 周 · 平翘舌强化', 3: '第 3 周 · 前后鼻音', 4: '第 4 周 · 鼻边音与实战', 5: '第 5 周 · 冲刺与毕业测评' }
  };

  var LEADS = {
    en: '每天 10-20 分钟，先求准再求快。完成当天的目标速度就会打勾，进度自动记在本地。',
    py: '每天 10-20 分钟，按「平翘舌 → 前后鼻音 → 鼻边音」的难点顺序推进；带「打汉字」的日子需要用系统中文输入法。'
  };

  TT.Tutorial = {
    EN: EN,
    PY: PY,
    WEEK_TITLES: WEEK_TITLES,
    LEADS: LEADS,
    get: function (id) { return MAP[id] || null; },
    list: function (track) { return track === 'py' ? PY : EN; },
    unitOf: function (day) {
      return day.kind === 'pinyin' && day.mode === 'hanzi' ? '字/分' : 'WPM';
    }
  };
})();
