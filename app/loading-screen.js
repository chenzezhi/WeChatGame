/**
 * 加载画面（app/loading-screen）
 *
 * 直接画在「上屏画布」上，所以每次调用都是立刻可见的，
 * 不需要等 requestAnimationFrame。
 *
 * 提供：
 *   setStatus(文字, 进度 0~1)  更新当前步骤
 *   push(文字[, 'error'])      追加一行日志
 *   showError(文字)            显示错误详情（红字）
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
  var MAX_LINES = 80;

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 背景
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    var titleY = Math.round(height * 0.28);

    // 标题
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('WeChatGame', width / 2, titleY);

    // 当前步骤
    ctx.font = '13px sans-serif';
    ctx.fillStyle = failed ? '#ff6b6b' : '#8b98a5';
    ctx.fillText(status, width / 2, titleY + 26);

    // 进度条
    var barW = Math.round(width * 0.6);
    var barX = Math.round((width - barW) / 2);
    var barY = titleY + 44;

    ctx.fillStyle = '#1f2933';
    ctx.fillRect(barX, barY, barW, 6);

    var ratio = Math.max(0, Math.min(1, progress));
    if (ratio > 0) {
      ctx.fillStyle = failed ? '#ff6b6b' : '#07c160';
      ctx.fillRect(barX, barY, Math.round(barW * ratio), 6);
    }

    // 日志区
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';

    var startY = Math.max(barY + 36, Math.round(height * 0.44));
    var bottomY = failed ? height - 40 : height - 16;
    var maxLines = Math.max(1, Math.floor((bottomY - startY) / 15));
    var from = Math.max(0, lines.length - maxLines);

    for (var i = from; i < lines.length; i++) {
      var line = lines[i];
      var text = String(line.text);
      if (text.length > 56) text = text.slice(0, 56) + '…';
      ctx.fillStyle = line.level === 'error' ? '#ff6b6b' : '#5d6b7a';
      ctx.fillText(text, 16, startY + (i - from) * 15);
    }

    // 失败时底部提示
    if (failed) {
      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('请把这一屏截图发我，或在开发者工具看 Console', width / 2, height - 18);
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
    if (lines.length > MAX_LINES) {
      lines = lines.slice(lines.length - MAX_LINES);
    }

    draw();
  }

  // 初始就画一帧
  draw();

  return {
    setStatus: setStatus,
    push: push,
    showError: showError,
    redraw: draw
  };
}

module.exports = { create: create };
