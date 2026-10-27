/**
 * 图集遮罩（core/assets/atlas）
 *
 * 解决的问题：JPEG 没有透明通道，菱形贴图的四个角会变成实心色块。
 * 交错排布时这些实心角会盖住相邻的菱形。
 *
 * 做法：启动时一次性建两张离屏画布，把每块按菱形裁出来，
 * 合成一张「已遮罩的大图」缓存起来。之后渲染照常九参 drawImage，零额外开销。
 *
 * ⚠️ 必须在第一次 wx.createCanvas()（上屏画布）之后调用，
 *    这里拿到的才是离屏画布。
 */
'use strict';

var platformRender = require('../../../platform/wx/render.js');

function createCanvas(w, h) {
  var canvas = platformRender.createCanvas();
  canvas.width = Math.max(1, Math.floor(w));
  canvas.height = Math.max(1, Math.floor(h));
  return canvas;
}

/** 在一块 ctx 上画一个菱形（填满整个 tile 矩形） */
function fillDiamond(ctx, sx, sy, sw, sh) {
  ctx.beginPath();
  ctx.moveTo(sx + sw / 2, sy);            // 上顶点
  ctx.lineTo(sx + sw, sy + sh / 2);       // 右顶点
  ctx.lineTo(sx + sw / 2, sy + sh);       // 下顶点
  ctx.lineTo(sx, sy + sh / 2);            // 左顶点
  ctx.closePath();
  ctx.fill();
}

/**
 * 生成菱形遮罩后的大图
 *
 * @param {Object} atlas  图集对象（需要 getTileRect / count / image）
 * @return {Canvas|null}  遮罩后的画布（可直接当图片用于 drawImage）
 */
function createDiamondMask(atlas) {
  if (!atlas || !atlas.image) return null;

  var image = atlas.image;
  var w = image.width;
  var h = image.height;
  var count = atlas.count || 0;
  if (w <= 0 || h <= 0 || count <= 0) return null;

  try {
    // ---------- ① 先画一张「蒙版」：所有菱形填白 ----------
    var maskCanvas = createCanvas(w, h);
    var maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = '#ffffff';

    for (var i = 0; i < count; i++) {
      var r = atlas.getTileRect(i);
      fillDiamond(maskCtx, r.sx, r.sy, r.sw, r.sh);
    }

    // ---------- ② 把原图与蒙版做一次 destination-in ----------
    var outCanvas = createCanvas(w, h);
    var outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(image, 0, 0);

    outCtx.globalCompositeOperation = 'destination-in';
    outCtx.drawImage(maskCanvas, 0, 0);
    outCtx.globalCompositeOperation = 'source-over';

    console.log('[atlas] 已生成菱形遮罩，' + count + ' 块，' + w + 'x' + h);
    return outCanvas;
  } catch (e) {
    console.error('[atlas] 菱形遮罩失败（继续用原图）：' + ((e && e.message) || e));
    return null;
  }
}

module.exports = { createDiamondMask: createDiamondMask };
