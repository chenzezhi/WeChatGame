/**
 * 状态模块：视口（state/modules/viewport）
 * 屏幕逻辑尺寸与像素比，所有布局计算的唯一来源。
 */
'use strict';

function create(viewportSize) {
  var size = viewportSize || { width: 375, height: 667, dpr: 1 };
  return {
    width: size.width,
    height: size.height,
    dpr: size.dpr || 1
  };
}

module.exports = { create: create };
