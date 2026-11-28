'use strict';

const Speed = require('./speed.js');

/* ==================== 功能 ====================
 * Ticker —— 每帧回调
 *
 * 主循环每帧调一次 tick(dt)，把 dt（毫秒）发给所有登记过的回调。
 * 有它之后，会动的东西（人物、以后的怪物、血条）都能挂上来，
 * 不用各自去开 requestAnimationFrame。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Ticker = require('./ticker.js');
 *
 * Ticker.onFrame((dt) => { p.update(dt); });   // dt 单位毫秒
 * // 主循环里由 game.js 负责 Ticker.tick()
 * ==============================================*/

/* ==================== 注意 ====================
 * dt 上限 100ms：切后台再回来时时间差会很大，不限就会一帧跳很远。
 * 某个回调抛错不影响其它回调，只打一行日志。
 * ==============================================*/

// 已登记的回调
const callbacks = [];

// 上一帧的时间戳，单位毫秒
let last = 0;

// 登记一个每帧回调
// fn - 接收 dt（毫秒）的函数
function onFrame(fn) {
  if (typeof fn === 'function') callbacks.push(fn);
}

// 推进一帧，由主循环调用
function tick() {
  const now = Date.now();

  // 第一帧没有上一帧可比，按 16ms 算
  const raw = last ? Math.min(now - last, 100) : 16;
  last = now;

  // 乘上全局游戏速度：整个人物/怪物/子弹/冷却都一起加速
  const dt = raw * Speed.effective();

  for (let i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i](dt);
    } catch (err) {
      console.error('[ticker] 回调出错：' + err.message);
    }
  }
}

module.exports = { onFrame: onFrame, tick: tick };
