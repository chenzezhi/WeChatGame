'use strict';

/* ============================================================================
 *  sheet-demo.js —— sheet.js 的调用示例（只做展示，不含游戏逻辑）
 * ============================================================================
 *
 *  用 src/assets/roll.png 演示完整链路：
 *      加载大图  →  按网格切片  →  把每一帧平铺到屏幕上
 *
 *  切得对不对一眼就能看出来：每一格应该是完整的一小块图，
 *  如果出现「画了一半」「错位」「重复」，说明 cols / rows 和素材对不上。
 *
 *  真实尺寸以 console 打印的这行为准：
 *      [sheet] src/assets/roll.png 512x512 → 16 帧
 *  按这个尺寸把下面 CONFIG 的 cols / rows 调成美术实际切图的规格即可。
 * ==========================================================================*/

var Sheet = require('./sheet.js');


/* ---------------------------------------------------------------------------
 * 一、唯一需要改的地方：素材怎么切
 * -------------------------------------------------------------------------*/

var CONFIG = {
  image: 'src/assets/roll.png',  // 大图路径，相对游戏根目录
  cols: 4,                       // 横向切几列
  rows: 4,                       // 纵向切几行
  margin: 0,                     // 大图四周留白
  spacing: 0                     // 格子之间的缝隙
};


/* ---------------------------------------------------------------------------
 * 二、对外入口
 * -------------------------------------------------------------------------*/

/**
 * 启动示例。
 *
 * game.js 里只用写一行：
 *      require('./public/core/sheet-demo.js').start({ cax: cax, stage: stage });
 *
 * @param {{cax: Object, stage: Object}} env
 */
function start(env) {
  var cax = env.cax;
  var stage = env.stage;

  // 设备像素比：画布是物理像素，字号按它放大才清晰
  var dpr = wx.getSystemInfoSync().pixelRatio || 1;

  // 画布尺寸，单位物理像素
  var width = stage.canvas.width;
  var height = stage.canvas.height;

  Sheet.load({
    image: CONFIG.image,
    cols: CONFIG.cols,
    rows: CONFIG.rows,
    margin: CONFIG.margin,
    spacing: CONFIG.spacing,
    onLoad: function (sheet) {
      tile(cax, stage, sheet, dpr, width, height);
    },
    onError: function (err) {
      showError(cax, stage, err, dpr);
    }
  });
}


/* ---------------------------------------------------------------------------
 * 三、把切好的帧平铺出来
 * -------------------------------------------------------------------------*/

/**
 * 每帧占一个格子，按行优先摆满屏幕，等比缩放到格子里居中。
 *
 * @param {Object} cax
 * @param {Object} stage
 * @param {Object} sheet Sheet 句柄
 * @param {number} dpr
 * @param {number} width  画布物理宽
 * @param {number} height 画布物理高
 */
function tile(cax, stage, sheet, dpr, width, height) {
  var names = sheet.names();

  // 顶部说明：文件名、原始尺寸、切出多少帧
  var info = new cax.Text(
    CONFIG.image + '  ' + sheet.width + 'x' + sheet.height + '  →  ' + names.length + ' 帧',
    { font: Math.round(13 * dpr) + 'px sans-serif', color: '#8b98a5' }
  );
  info.x = Math.round(12 * dpr);
  info.y = Math.round(32 * dpr);
  stage.add(info);

  // 平铺区域：顶部让出说明文字，四周留边
  var pad = Math.round(12 * dpr);
  var top = Math.round(60 * dpr);

  // 每行放几格：沿用切图的列数，排布和原图一致，方便对照
  var cols = CONFIG.cols;
  var rows = Math.ceil(names.length / cols);

  // 单格可用尺寸
  var cellW = (width - pad * 2) / cols;
  var cellH = (height - top - pad) / rows;

  // 先找出最大的帧，用它算统一缩放，保证每格都放得下
  var maxW = 1;
  var maxH = 1;
  var i;

  for (i = 0; i < names.length; i++) {
    var size = sheet.size(names[i]);
    if (size.w > maxW) maxW = size.w;
    if (size.h > maxH) maxH = size.h;
  }

  var scale = Math.min(cellW / maxW, cellH / maxH);

  // 逐帧摆上去
  for (i = 0; i < names.length; i++) {
    var cell = sheet.size(names[i]);
    var bmp = sheet.bitmap(names[i]);

    // 缩放从左上角算，所以位置要把缩放后的尺寸减掉一半来居中
    bmp.scaleX = scale;
    bmp.scaleY = scale;
    bmp.x = pad + (i % cols) * cellW + (cellW - cell.w * scale) / 2;
    bmp.y = top + Math.floor(i / cols) * cellH + (cellH - cell.h * scale) / 2;

    stage.add(bmp);
  }
}


/* ---------------------------------------------------------------------------
 * 四、加载失败时把原因画在屏幕上
 * -------------------------------------------------------------------------*/

/**
 * 真机上只看得到黑屏，所以错误必须显示出来。
 *
 * @param {Object} cax
 * @param {Object} stage
 * @param {Error} err
 * @param {number} dpr
 */
function showError(cax, stage, err, dpr) {
  var msg = (err && err.message) || String(err);

  console.error('[sheet-demo] ' + msg);

  var text = new cax.Text(msg.slice(0, 40), {
    font: Math.round(13 * dpr) + 'px sans-serif',
    color: '#ff6b6b'
  });

  text.x = Math.round(12 * dpr);
  text.y = Math.round(32 * dpr);

  stage.add(text);
}


/* ---------------------------------------------------------------------------
 * 五、导出
 * -------------------------------------------------------------------------*/

module.exports = {
  start: start
};
