/**
 * 渲染器（core/render）
 *
 * 只提供「画」的原子能力，不含任何业务。
 * 贴图绘制统一走 drawImage 的九参重载（切片绘制），这是微信小游戏原生支持的能力。
 */
'use strict';

function createRenderer(canvas, viewport) {
  var ctx = canvas.getContext('2d');
  var width = 0;
  var height = 0;
  var dpr = 1;

  function resize(view) {
    width = view.width;
    height = view.height;
    dpr = view.dpr || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    // 设置尺寸会重置变换，必须重新缩放
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize(viewport || { width: 375, height: 667, dpr: 1 });

  return {
    canvas: canvas,
    ctx: ctx,

    resize: resize,

    getSize: function () {
      return { width: width, height: height, dpr: dpr };
    },

    /** 帧开始：重置变换 + 清屏 */
    beginFrame: function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    },

    fillBackground: function (color) {
      ctx.fillStyle = color || '#000000';
      ctx.fillRect(0, 0, width, height);
    },

    fillRect: function (x, y, w, h, color) {
      ctx.fillStyle = color || '#ffffff';
      ctx.fillRect(x, y, w, h);
    },

    /**
     * 从大图里切一块贴图绘制
     * @param {Image} image  大图
     * @param {Object} rect  { sx, sy, sw, sh } 源区域
     * @param {Number} dx, dy, dw, dh 目标区域
     */
    drawTile: function (image, rect, dx, dy, dw, dh) {
      if (!image || !rect || dw <= 0 || dh <= 0) return;
      ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, dw, dh);
    }
  };
}

module.exports = createRenderer;
