/**
 * 平台能力：画布与图片
 *
 * 关键约定：小游戏里「第一次」调用 wx.createCanvas() 返回的是上屏画布，
 * 必须由引擎/最外层创建，不要在深层模块里随手调用。
 */
'use strict';

function createCanvas() {
  return wx.createCanvas();
}

/** 从包内路径 / 网络地址创建图片对象（加载交给 core/assets 处理） */
function createImage() {
  return wx.createImage();
}

module.exports = {
  createCanvas: createCanvas,
  createImage: createImage
};
