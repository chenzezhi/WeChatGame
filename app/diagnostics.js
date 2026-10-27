/**
 * 启动自检（app/diagnostics）
 *
 * 目的：启动失败时不用截图，直接把「哪一步坏了」列在屏幕上。
 * 全部检查都做了 try/catch，自检本身绝不会再抛异常。
 */
'use strict';

function safe(fn, fallback) {
  try {
    var v = fn();
    return typeof v === 'undefined' ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

/** 检查包内文件是否存在，返回 { ok, size } */
function checkFile(path) {
  if (!path) return { ok: false, size: null, reason: '路径为空' };

  var fs = safe(function () { return wx.getFileSystemManager(); }, null);
  if (!fs || typeof fs.accessSync !== 'function') {
    return { ok: false, size: null, reason: '当前环境没有 accessSync' };
  }

  try {
    fs.accessSync(path);
  } catch (e) {
    return { ok: false, size: null, reason: '文件不在包里或路径写错' };
  }

  var size = safe(function () {
    var stat = fs.statSync(path);
    return stat && typeof stat.size === 'number' ? stat.size : null;
  }, null);

  return { ok: true, size: size, reason: '' };
}

/**
 * 采集诊断信息
 * @param {Object} options { tileset: 图集描述对象 }
 * @return {Array<{text, level}>}
 */
function collect(options) {
  options = options || {};
  var lines = [];

  function add(text, level) {
    lines.push({ text: text, level: level || 'info' });
  }

  /* ---------------- 环境 ---------------- */
  var info = safe(function () { return wx.getSystemInfoSync(); }, {});
  add('屏幕 ' + (info.windowWidth || '?') + 'x' + (info.windowHeight || '?') +
    ' dpr=' + (info.pixelRatio || '?') + ' SDK=' + (info.SDKVersion || '?'));

  var hasCreateImage = typeof wx.createImage === 'function';
  add('wx.createImage ' + (hasCreateImage ? '可用' : '不可用'), hasCreateImage ? 'info' : 'error');

  var hasCanvas = typeof wx.createCanvas === 'function';
  add('wx.createCanvas ' + (hasCanvas ? '可用' : '不可用'), hasCanvas ? 'info' : 'error');

  /* ---------------- 图集 ---------------- */
  var desc = options.tileset;
  if (!desc) {
    add('图集描述缺失（assets/atlas/floor-tileset.js）', 'error');
  } else {
    add('图集路径 ' + desc.image);
    add('单块尺寸 ' + desc.tileWidth + 'x' + desc.tileHeight +
      ' columns=' + desc.columns + ' rows=' + desc.rows);

    var file = checkFile(desc.image);
    if (file.ok) {
      var sizeText = typeof file.size === 'number' ? (Math.round(file.size / 1024) + ' KB') : '大小未知';
      add('图集文件已打到包里（' + sizeText + '）');
    } else {
      add('图集文件读不到：' + desc.image + ' —— ' + file.reason, 'error');
      add('请确认 assets/atlas/ 下文件名与扩展名完全一致', 'error');
    }
  }

  /* ---------------- 引擎产物 ---------------- */
  var cocosEntry = checkFile('cocos/game.js');
  if (cocosEntry.ok) {
    add('检测到 cocos/game.js（将使用 Cocos Creator）');
  } else {
    add('无 cocos/game.js，使用内置引擎（这是正常状态）');
  }

  /* ---------------- 渲染 ---------------- */
  if (options.canvas) {
    add('上屏画布 ' + options.canvas.width + 'x' + options.canvas.height);
  } else {
    add('上屏画布未创建', 'error');
  }

  return lines;
}

module.exports = {
  collect: collect,
  checkFile: checkFile
};
