'use strict';

/* ==================== 功能 ====================
 * Speed —— 全局游戏速度
 *
 * 一个倍率，作用在每帧的 dt 上。所以人物、怪物、子弹、冷却、动画
 * 全部一起变快或变慢，等于整个环境的时间流速。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Speed = require('./speed.js');
 *
 * Speed.get();      // 当前倍率，1 / 2 / 4
 * Speed.cycle();    // 切到下一个倍率：1 → 2 → 4 → 1
 * Speed.label();    // '×2' 这种，给按钮显示
 * ==============================================*/

/* ==================== 注意 ====================
 * 只影响逻辑时间（dt），不影响音频和绘制本身。
 * ticker.js 每帧自动乘上这个倍率，所以业务代码不用关心它。
 * ==============================================*/

// 可选的几档速度
const STEPS = [1, 2, 4];

// 当前是第几档
let index = 0;

// 是否让倍率生效（只有战斗阶段才生效，备战保持 1 倍）
let active = false;

// 设置是否生效
// v - true 生效 / false 强制 1 倍
function setActive(v) {
  active = !!v;
}

// 实际生效的倍率：没启用时永远 1
function effective() {
  return active ? STEPS[index] : 1;
}

// 当前倍率
function get() {
  return STEPS[index];
}

// 切到下一档，返回新的倍率
function cycle() {
  index = (index + 1) % STEPS.length;
  return STEPS[index];
}

// 重新设回 1 倍
function reset() {
  index = 0;
  return STEPS[index];
}

// 给按钮显示的文字
function label() {
  return '×' + STEPS[index];
}

module.exports = { get: get, cycle: cycle, reset: reset, label: label, setActive: setActive, effective: effective };
