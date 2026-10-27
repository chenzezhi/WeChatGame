/**
 * 动作：地板（state/modules/floor）
 * 所有修改地板状态的地方都必须走这里，方便追踪与调试。
 */
'use strict';

function setStatus(store, status, message) {
  store.update('floor', {
    status: status,
    error: message || null
  });
}

function setError(store, message) {
  store.update('floor', {
    status: 'error',
    error: message || '未知错误'
  });
}

function setTileSize(store, tileWidth, tileHeight) {
  store.update('floor', {
    tileWidth: tileWidth,
    tileHeight: tileHeight
  });
}

function setGrid(store, columns, rows) {
  store.update('floor', { columns: columns, rows: rows });
}

function setMap(store, map, mapSource, mapName) {
  store.update('floor', {
    map: map,
    mapSource: mapSource || 'generated',
    mapName: mapName || null
  });
}

/** 设置滚动偏移（不做钳制，钳制由 scroll 模块负责） */
function setOffset(store, offsetX, offsetY) {
  store.update('floor', {
    offsetX: offsetX || 0,
    offsetY: offsetY || 0
  });
}

/** 设置惯性速度 */
function setVelocity(store, velocityX, velocityY) {
  store.update('floor', {
    velocityX: velocityX || 0,
    velocityY: velocityY || 0
  });
}

function setDragging(store, isDragging) {
  store.update('floor', { isDragging: !!isDragging });
}

function setScrollBounds(store, maxScrollX, maxScrollY) {
  store.update('floor', {
    maxScrollX: Math.max(0, maxScrollX || 0),
    maxScrollY: Math.max(0, maxScrollY || 0)
  });
}

/**
 * 一次性应用布局结果（地板系统算好后交给状态层）
 *
 * layout: { columns, rows, tileWidth, tileHeight, scale, map,
 *           mapSource, mapName,
 *           contentWidth, contentHeight,
 *           viewportWidth, viewportHeight }
 */
function applyLayout(store, layout) {
  layout = layout || {};

  var contentWidth = layout.contentWidth || 0;
  var contentHeight = layout.contentHeight || 0;
  var viewW = layout.viewportWidth || 0;
  var viewH = layout.viewportHeight || 0;

  var maxScrollX = Math.max(0, contentWidth - viewW);
  var maxScrollY = Math.max(0, contentHeight - viewH);

  var current = store.getState().floor;
  var offsetX = Math.min(0, Math.max(-maxScrollX, current.offsetX || 0));
  var offsetY = Math.min(0, Math.max(-maxScrollY, current.offsetY || 0));

  store.update('floor', {
    status: 'ready',
    error: null,
    columns: layout.columns || 0,
    rows: layout.rows || 0,
    tileWidth: layout.tileWidth || 0,
    tileHeight: layout.tileHeight || 0,
    scale: layout.scale || 1,
    map: layout.map || null,
    mapSource: layout.mapSource || 'generated',
    mapName: layout.mapName || null,
    contentWidth: contentWidth,
    contentHeight: contentHeight,
    maxScrollX: maxScrollX,
    maxScrollY: maxScrollY,
    offsetX: offsetX,
    offsetY: offsetY
  });
}

module.exports = {
  setStatus: setStatus,
  setError: setError,
  setTileSize: setTileSize,
  setGrid: setGrid,
  setMap: setMap,
  setOffset: setOffset,
  setVelocity: setVelocity,
  setDragging: setDragging,
  setScrollBounds: setScrollBounds,
  applyLayout: applyLayout
};
