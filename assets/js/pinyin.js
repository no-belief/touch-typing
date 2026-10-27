(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});

  // 词池：每项 [汉字, 无声调纯字母拼音]。声调不参与判定（与主流全拼输入法一致）。
  // 词条按最小对立成对编排，前一个/后一个形成难点对照。
  var POOLS = {
    pq: {
      name: '平翘舌',
      desc: 'z/c/s 与 zh/ch/sh 成组对打',
      items: [
        ['支持', 'zhichi'], ['资助', 'zizhu'],
        ['诗人', 'shiren'], ['私人', 'siren'],
        ['陈旧', 'chenjiu'], ['成就', 'chengjiu'],
        ['四十', 'sishi'], ['事实', 'shishi'],
        ['自主', 'zizhu'], ['支柱', 'zhizhu'],
        ['早稻', 'zaodao'], ['找到', 'zhaodao'],
        ['擦洗', 'caxi'], ['茶几', 'chaji'],
        ['私自', 'sizi'], ['石子', 'shizi'],
        ['三思', 'sansi'], ['山石', 'shanshi'],
        ['操作', 'caozuo'], ['超载', 'chaozai']
      ]
    },
    nq: {
      name: '前后鼻音',
      desc: 'an/en/in 与 ang/eng/ing 成组对打',
      items: [
        ['反问', 'fanwen'], ['访问', 'fangwen'],
        ['干燥', 'ganzao'], ['钢材', 'gangcai'],
        ['金银', 'jinyin'], ['经营', 'jingying'],
        ['新春', 'xinchun'], ['星辰', 'xingchen'],
        ['简陋', 'jianlou'], ['将来', 'jianglai'],
        ['干旱', 'ganhan'], ['刚好', 'ganghao'],
        ['懒散', 'lansan'], ['朗诵', 'langsong'],
        ['亲人', 'qinren'], ['情人', 'qingren'],
        ['山歌', 'shange'], ['三哥', 'sange'],
        ['建设', 'jianshe'], ['将是', 'jiangshi']
      ]
    },
    nb: {
      name: '鼻边音',
      desc: 'n/l 与 f/h 的分辨练习',
      items: [
        ['牛奶', 'niunai'], ['留念', 'liunian'],
        ['老农', 'laonong'], ['农林', 'nonglin'],
        ['脑力', 'naoli'], ['老李', 'laoli'],
        ['努力', 'nuli'], ['冷暖', 'lengnuan'],
        ['暖流', 'nuanliu'], ['农历', 'nongli'],
        ['泥泞', 'nining'], ['玲珑', 'linglong'],
        ['流浪', 'liulang'], ['能力', 'nengli'],
        ['冷落', 'lengluo'], ['年龄', 'nianling'],
        ['那里', 'nali'], ['拿来', 'nala'],
        ['留连', 'liulian'], ['泥鳅', 'niqiu']
      ]
    },
    dy: {
      name: '常用单字',
      desc: '单音节起步，先把手感建立起来',
      items: [
        ['我', 'wo'], ['你', 'ni'], ['他', 'ta'], ['的', 'de'],
        ['是', 'shi'], ['不', 'bu'], ['了', 'le'], ['人', 'ren'],
        ['在', 'zai'], ['有', 'you'], ['中', 'zhong'], ['大', 'da'],
        ['小', 'xiao'], ['上', 'shang'], ['下', 'xia'], ['好', 'hao'],
        ['来', 'lai'], ['去', 'qu'], ['说', 'shuo'], ['看', 'kan']
      ]
    },
    cy: {
      name: '常用词',
      desc: '高频常用词，练整体节奏',
      items: [
        ['中国', 'zhongguo'], ['学习', 'xuexi'],
        ['时间', 'shijian'], ['工作', 'gongzuo'],
        ['生活', 'shenghuo'], ['朋友', 'pengyou'],
        ['老师', 'laoshi'], ['学生', 'xuesheng'],
        ['手机', 'shouji'], ['电脑', 'diannao'],
        ['城市', 'chengshi'], ['天气', 'tianqi'],
        ['今天', 'jintian'], ['明天', 'mingtian'],
        ['谢谢', 'xiexie'], ['早上', 'zaoshang'],
        ['问题', 'wenti'], ['方法', 'fangfa'],
        ['坚持', 'jianchi'], ['希望', 'xiwang'],
        ['开始', 'kaishi'], ['结束', 'jieshu'],
        ['帮助', 'bangzhu'], ['认识', 'renshi']
      ]
    }
  };

  var POOL_ORDER = ['pq', 'nq', 'nb', 'cy'];
  var DEFAULT_COUNT = 16;

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // options: { count, idx:[索引], mix:[多个池], repeat:true }
  function resolveItems(poolId, o) {
    var pool = POOLS[poolId] || POOLS.cy;
    var items = pool.items;
    if (o.mix && o.mix.length) {
      items = [];
      for (var i = 0; i < o.mix.length; i++) {
        var p = POOLS[o.mix[i]];
        if (p) items = items.concat(p.items);
      }
    } else if (o.idx && o.idx.length) {
      items = [];
      for (var j = 0; j < o.idx.length; j++) {
        var it = pool.items[o.idx[j]];
        if (it) items.push(it);
      }
    }
    return { items: items, pool: pool };
  }

  // mode: 'pinyin' 打拼音字母（词间空格）| 'hanzi' 用中文输入法上屏汉字
  function build(poolId, mode, options) {
    var o = options || {};
    if (typeof o === 'number') o = { count: o };
    var resolved = resolveItems(poolId, o);
    var pool = resolved.pool;
    var items = resolved.items;
    var m = mode === 'hanzi' ? 'hanzi' : 'pinyin';
    var n = o.count || DEFAULT_COUNT;

    var picked = [];
    if (o.repeat || items.length <= n) {
      for (var q = 0; q < n; q++) picked.push(items[Math.floor(Math.random() * items.length)]);
    } else {
      picked = shuffle(items).slice(0, n);
    }

    var target = '';
    var words = [];
    for (var i = 0; i < picked.length; i++) {
      var hz = picked[i][0];
      var py = picked[i][1];
      var chunk = m === 'hanzi' ? hz : py;
      if (m === 'pinyin' && target) target += ' ';
      words.push({ hanzi: hz, pinyin: py, start: target.length, end: target.length + chunk.length });
      target += chunk;
    }
    return {
      target: target,
      words: words,
      mode: m,
      pool: poolId,
      poolName: pool.name,
      desc: pool.desc
    };
  }

  TT.Pinyin = {
    POOLS: POOLS,
    POOL_ORDER: POOL_ORDER,
    build: build,
    resolveItems: resolveItems,
    shuffle: shuffle
  };

  // 注册为课程（走现有课程列表 / 图表筛选 / 历史最佳）
  var extra = [];
  POOL_ORDER.forEach(function (pid) {
    ['pinyin', 'hanzi'].forEach(function (mode) {
      var pool = POOLS[pid];
      extra.push({
        id: 'py-' + pid + '-' + mode,
        stage: '拼音',
        kind: 'pinyin',
        pool: pid,
        mode: mode,
        name: pool.name + (mode === 'hanzi' ? ' · 打汉字' : ' · 打拼音'),
        hint: mode === 'hanzi'
          ? '切到中文输入法，打出屏幕上的汉字（逐字判定）'
          : '看上方汉字敲出拼音字母，词与词之间按空格（无声调）',
        target: mode === 'hanzi' ? 60 : 25,
        build: function () { return TT.Pinyin.build(pid, mode).target; }
      });
    });
  });
  TT.COURSES = TT.COURSES.concat(extra);
})();
