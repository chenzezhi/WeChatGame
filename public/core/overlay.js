'use strict';

/* ==================== 功能 ====================
 * Overlay —— 原生画布覆盖层
 *
 * cax 负责画静态的东西（背景、棋盘、商店）。会动、要画细节的东西
 * （怪物、子弹、武器、篝火、人物、HUD）交给这里，用 Canvas 2D 直接画。
 *
 * 原因：这个版本的 cax 里 Polygon 画不出来，复杂形状只能靠 ctx；
 * 而且 ctx 可以自由控制谁盖谁，人物要盖在武器上面就是靠这个。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Overlay = require('./overlay.js');
 *
 * Overlay.onDraw((ctx) => { ... });          // 默认层，0
 * Overlay.onDraw((ctx) => { ... }, 10);      // 层号越大越晚画，就越在上面
 *
 * // 主循环里：先让 cax 画完，再盖一层
 * stage.update();
 * Overlay.paint(stage);
 * ==============================================*/

/* ==================== 注意 ====================
 * paint() 必须在 stage.update() 之后调用，否则会被 cax 清掉。
 * 层号：棋盘上的武器/怪物/子弹用 0，人物用 10，HUD 用 20。
 * 每次绘制前把变换重置成单位矩阵，避免受 cax 残留的 dpr 缩放影响。
 * ==============================================*/

// 已登记的绘制回调，按层号升序
const painters = [];

// 登记一个每帧绘制回调
// fn - 接收 ctx 的函数，坐标是画布物理像素
// layer - 层号，越大越晚画（越在上面），默认 0
function onDraw(fn, layer) {
  if (typeof fn !== 'function') return;
  painters.push({ fn: fn, layer: layer || 0 });
  painters.sort(function (a, b) {
    return a.layer - b.layer;
  });
}

// 把这一帧的覆盖层画出来
// stage - cax Stage，用来取 canvas 和 ctx
function paint(stage) {
  const canvas = stage && stage.canvas ? stage.canvas : null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  for (let i = 0; i < painters.length; i++) {
    ctx.save();
    // 重置变换：cax 可能给 ctx 设过缩放，这里要按画布真实像素画
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    try {
      painters[i].fn(ctx);
    } catch (err) {
      console.error('[overlay] 绘制出错：' + err.message);
    }

    ctx.restore();
  }
}

module.exports = { onDraw: onDraw, paint: paint };
