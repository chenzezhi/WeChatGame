/**
 * 主循环（core/loop）
 * 用 requestAnimationFrame 驱动 update / render，dt 做上限保护防止卡顿跳帧。
 */
'use strict';

var MAX_DT = 0.05; // 秒

function createGameLoop(handlers) {
  handlers = handlers || {};
  var running = false;
  var rafId = 0;
  var lastTime = 0;

  function frame() {
    if (!running) return;

    var now = Date.now();
    var dt = Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;

    try {
      if (handlers.update) handlers.update(dt);
      if (handlers.render) handlers.render(dt);
    } catch (e) {
      console.error('[loop] 帧内异常：' + (e && (e.stack || e.message)));
    }

    rafId = requestAnimationFrame(frame);
  }

  return {
    start: function () {
      if (running) return;
      running = true;
      lastTime = Date.now();
      rafId = requestAnimationFrame(frame);
    },
    stop: function () {
      running = false;
      if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
      rafId = 0;
    },
    isRunning: function () { return running; }
  };
}

module.exports = createGameLoop;
