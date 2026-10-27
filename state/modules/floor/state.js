/**
 * 状态模块：地板（state/modules/floor）
 *
 * 地板的所有「可变量」都在这里：尺寸、格子数、缩放、偏移、滚动范围、索引表、地图来源。
 * 业务代码不允许自己藏一份地板变量，一切读状态、改状态。
 */
'use strict';

var DEFAULTS = {
  status: 'idle',        // idle | loading | ready | error
  error: null,

  // 单块位图的原始尺寸（来自图集）
  tileWidth: 56,
  tileHeight: 56,

  // 渲染缩放（显示尺寸 = 原始尺寸 × scale）
  scale: 1,

  // 地板格数
  columns: 0,
  rows: 0,

  // 地板内容总尺寸（像素，已含 scale）
  contentWidth: 0,
  contentHeight: 0,

  // 滚动偏移。恒 <= 0：0 表示贴左上角，负数表示内容往左上移动
  offsetX: 0,
  offsetY: 0,

  // 可滚动上限（正数）。内容没超出屏幕时就是 0
  maxScrollX: 0,
  maxScrollY: 0,

  // 拖拽 / 惯性
  scrollEnabled: true,
  isDragging: false,
  velocityX: 0,
  velocityY: 0,

  // 每格使用的图集索引，二维数组 map[row][col]
  // -1 表示空格子（不绘制，露出背景）
  map: null,

  // 地图来源：'file' = 手写地图文件 | 'generated' = pattern 自动生成
  mapSource: 'generated',
  mapName: null,

  pattern: 'random',
  seed: 20240101,
  background: '#0d1117'
};

function create() {
  var state = {};
  for (var key in DEFAULTS) state[key] = DEFAULTS[key];
  return state;
}

module.exports = { create: create, DEFAULTS: DEFAULTS };
