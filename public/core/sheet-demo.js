'use strict';

/* ==================== 功能 ====================
 * 精灵图动画 demo
 * 读一张精灵图，取出动画段，原地循环播放。
 * 调用全部走 AnimMap，这里只写「哪个动画、放哪、多高」。
 * ==============================================*/

/* ==================== 用法 ====================
 * AnimMap.load(配置, (am) => {
 *   am.add(stage, 'walk', x, y, 目标高度);
 * });
 * ==============================================*/

const AnimMap = require('./anim-map.js');
const SHEET = require('../config/assets.js');

function start(env) {
  const cax = env.cax;
  const stage = env.stage;
  const dpr = wx.getSystemInfoSync().pixelRatio || 1;

  AnimMap.load(
    SHEET,
    (am) => {
      const w = stage.canvas.width;
      const h = stage.canvas.height;

      // 走路动画：放在左侧，高度占屏幕 5%
      am.add(stage, 'nf1', w * 0.1, h * 0.4, h * 0.05);
      am.add(stage, 'nf2', w * 0.23, h * 0.4, h * 0.05);
    },
    (err) => {
      console.error('[demo] ' + err.message);
      stage.add(info(cax, err.message, '#ff6b6b', dpr));
    }
  );
}

function info(cax, text, color, dpr, y) {
  const t = new cax.Text(text, { font: Math.round(13 * dpr) + 'px sans-serif', color: color });
  t.x = 12 * dpr;
  t.y = (y || 32) * dpr;
  return t;
}

module.exports = { start };
