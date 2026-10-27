/**
 * 状态模块：地板（state/modules/floor）
 *
 * 地板的所有「可变量」都在这里：尺寸、格子数、缩放、原点、贴图索引表。
 * 业务代码不允许自己藏一份地板变量，一切读状态、改状态。
 */
'use strict';

var DEFAULTS = {
  status: 'idle',        // idle | loading | ready | error
  error: null,

  // 单块位图的原始尺寸（来自图集）
  tileWidth: 32,
  tileHeight: 32,

  // 地板格数（状态：地板大小）
  columns: 0,
  rows: 0,

  // 渲染缩放与原点
  scale: 1,
  originX: 0,
  originY: 0,

  // 每格使用的图集索引，二维数组 map[row][col]
  map: null,

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
