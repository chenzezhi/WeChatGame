// 主循环：每帧回调 onFrame(dt, now)，dt 单位毫秒并做上限保护。

let running = false;

function raf(cb) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(cb);
  } else {
    setTimeout(cb, 1000 / 60);
  }
}

function start(onFrame) {
  if (running || typeof onFrame !== 'function') return;
  running = true;

  let last = Date.now();

  function frame() {
    const now = Date.now();
    let dt = now - last;
    last = now;

    if (dt < 0) dt = 0;
    if (dt > 100) dt = 100; // 切后台回来不要一次跳太远

    try {
      onFrame(dt, now);
    } catch (e) {
      try { console.error('[loop] frame error: ' + e); } catch (e2) {}
    }

    raf(frame);
  }

  raf(frame);
}

module.exports = { start: start };
