/**
 * 加载画面（app/loading-screen）
 *
 * 直接画在「上屏画布」上，所以每次调用都是立刻可见的。
 *
 *   setStatus(文字, 进度 0~1)
 *   push(文字[, 'error'])
 *   showError(文字)
 *   clear()            隐藏加载层（进入游戏后调用）
 */
'use strict';

function create(stage) {
  var ctx = stage.ctx;
  var width = stage.width;
  var height = stage.height;
  var dpr = stage.dpr || 1;

  var status = '正在启动…';
  var progress = 0;
  var lines = [];
  var failed = false;
  var MAX_LINES = 120;

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    var titleY = 48;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('WeChatGame', width / 2, titleY);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = failed ? '#ff6b6b' : '#8b98a5';
    ctx.fillText(status, width / 2, titleY + 22);

    // 进度条
    var barW = Math.round(width * 0.6);
    var barX = Math.round((width - barW) / 2);
    var barY = titleY + 36;

    ctx.fillStyle = '#1f2933';
    ctx.fillRect(barX, barY, barW, 5);

    var ratio = Math.max(0, Math.min(1, progress));
    if (ratio > 0) {
      ctx.fillStyle = failed ? '#ff6b6b' : '#07c160';
      ctx.fillRect(barX, barY, Math.round(barW * ratio), 5);
    }

    // 日志区（从上往下排，自动按高度裁剪）
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';

    var startY = barY + 24;
    var bottomY = height - (failed ? 30 : 12);
    var maxLines = Math.max(1, Math.floor((bottomY - startY) / 15));
    var from = Math.max(0, lines.length - maxLines);

    for (var i = from; i < lines.length; i++) {
      var line = lines[i];
      var text = String(line.text);
      if (text.length > 58) text = text.slice(0, 58) + '…';
      ctx.fillStyle = line.level === 'error' ? '#ff6b6b' : '#5d6b7a';
      ctx.fillText(text, 12, startY + (i - from) * 15);
    }

    if (failed) {
      ctx.textAlign = 'center';
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('把这一屏的文字发我即可（不用截图）', width / 2, height - 12);
    }
  }

  function setStatus(text, ratio) {
    if (text) status = text;
    if (typeof ratio === 'number') progress = ratio;
    draw();
  }

  function push(text, level) {
    lines.push({ text: text, level: level || 'info' });
    if (lines.length > MAX_LINES) lines.shift();
    draw();
  }

  function showError(message) {
    failed = true;
    status = '启动失败';
    progress = 1;

    var parts = String(message || '未知错误').split('\n');
    for (var i = 0; i < parts.length && i < 20; i++) {
      if (parts[i].trim()) lines.push({ text: parts[i], level: 'error' });
    }
    if (lines.length > MAX_LINES) lines = lines.slice(lines.length - MAX_LINES);

    draw();
  }

  draw();

  return {
    setStatus: setStatus,
    push: push,
    showError: showError,
    redraw: draw
  };
}

module.exports = { create: create };
