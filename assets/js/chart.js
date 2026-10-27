(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});
  var ACC = '#f59e0b';
  var WPM = '#3b82f6';
  var GRID = 'rgba(128,140,160,.28)';
  var LABEL = '#8b95a5';

  function draw(canvas, runs) {
    if (!canvas) return;
    var box = canvas.parentElement;
    var cssW = Math.max(280, box ? box.clientWidth : 320);
    var cssH = 260;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var padL = 42, padR = 42, padT = 18, padB = 30;
    var w = cssW - padL - padR;
    var h = cssH - padT - padB;

    var data = Array.isArray(runs) ? runs : [];
    if (data.length === 0) {
      ctx.fillStyle = LABEL;
      ctx.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('完成一次练习后，这里会出现速度与准确率曲线', cssW / 2, cssH / 2);
      return;
    }

    var maxWpm = 20;
    data.forEach(function (r) { if (r.wpm > maxWpm) maxWpm = r.wpm; });
    maxWpm = Math.ceil((maxWpm * 1.25) / 20) * 20;

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.fillStyle = LABEL;
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'middle';
    var steps = 4;
    for (var i = 0; i <= steps; i++) {
      var y = padT + (h * i) / steps;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + w, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxWpm - (maxWpm * i) / steps)), padL - 8, y);
      ctx.textAlign = 'left';
      ctx.fillText(String(Math.round(100 - (100 * i) / steps)) + '%', padL + w + 8, y);
    }

    function xAt(idx) {
      if (data.length === 1) return padL + w / 2;
      return padL + (w * idx) / (data.length - 1);
    }
    function yWpm(v) { return padT + h - (Math.max(0, Math.min(v, maxWpm)) / maxWpm) * h; }
    function yAcc(v) { return padT + h - (Math.max(0, Math.min(v, 100)) / 100) * h; }

    function line(getY, color) {
      ctx.beginPath();
      data.forEach(function (r, idx) {
        var x = xAt(idx), y = getY(r);
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      data.forEach(function (r, idx) {
        ctx.beginPath();
        ctx.arc(xAt(idx), getY(r), 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }

    line(function (r) { return yAcc(r.acc || 0); }, ACC);
    line(function (r) { return yWpm(r.wpm || 0); }, WPM);

    ctx.textBaseline = 'top';
    ctx.font = '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = WPM;
    ctx.textAlign = 'left';
    ctx.fillText('速度', padL, 2);
    ctx.fillStyle = ACC;
    ctx.textAlign = 'right';
    ctx.fillText('准确率', padL + w, 2);
    ctx.fillStyle = LABEL;
    ctx.textAlign = 'center';
    ctx.fillText('最近 ' + data.length + ' 次（左→右为旧→新）', padL + w / 2, padT + h + 10);
  }

  TT.Chart = { draw: draw };
})();
