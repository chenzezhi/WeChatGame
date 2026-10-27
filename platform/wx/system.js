/**
 * 平台能力：系统信息 / 屏幕尺寸 / 旋转
 */
'use strict';

var cachedInfo = null;

function getSystemInfo() {
  if (cachedInfo) return cachedInfo;
  try {
    cachedInfo = wx.getSystemInfoSync();
  } catch (e) {
    cachedInfo = { windowWidth: 375, windowHeight: 667, pixelRatio: 2 };
  }
  return cachedInfo;
}

/** 返回 { width, height, dpr }（逻辑像素 + 像素比） */
function getViewportSize() {
  var info = getSystemInfo();
  return {
    width: info.windowWidth || 375,
    height: info.windowHeight || 667,
    dpr: info.pixelRatio || 1
  };
}

function onResize(handler) {
  if (typeof wx.onWindowResize !== 'function') return function () {};
  wx.onWindowResize(function () {
    cachedInfo = null;
    handler(getViewportSize());
  });
  return function () {};
}

module.exports = {
  getSystemInfo: getSystemInfo,
  getViewportSize: getViewportSize,
  onResize: onResize
};
