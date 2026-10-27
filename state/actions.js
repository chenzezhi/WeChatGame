/**
 * 所有「改状态」的函数（唯一入口）
 *
 * 业务代码不允许直接改 state 对象，一律调这里的函数。
 * 初始值在 state/state-definitions.js
 */
'use strict';

/* ============================================================
 * 一、视口
 * ============================================================ */
function setViewport(store, size) {
  if (!size) return;
  store.update('viewport', {
    width: size.width,
    height: size.height,
    dpr: size.dpr || 1
  });
}

/* ============================================================
 * 二、资源
 * ============================================================ */
function setAtlasLoading(store, key) {
  store.update('assets', {
    atlas: { status: 'loading', key: key || null, width: 0, height: 0, tileCount: 0, masked: false, error: null }
  });
}

function setAtlasReady(store, key, width, height, tileCount, masked) {
  store.update('assets', {
    atlas: {
      status: 'ready',
      key: key || null,
      width: width || 0,
      height: height || 0,
      tileCount: tileCount || 0,
      masked: !!masked,
      error: null
    }
  });
}

function setAtlasError(store, message) {
  store.update('assets', {
    atlas: { status: 'error', key: null, width: 0, height: 0, tileCount: 0, masked: false, error: message || '未知错误' }
  });
}

/* ============================================================
 * 三、地板
 * ============================================================ */
function setFloorStatus(store, status, message) {
  store.update('floor', { status: status, error: message || null });
}

function setFloorError(store, message) {
  store.update('floor', { status: 'error', error: message || '未知错误' });
}

function setTileSize(store, tileWidth, tileHeight) {
  store.update('floor', { tileWidth: tileWidth, tileHeight: tileHeight });
}

/** 设置布局模式：'grid' | 'staggered' | 'iso' */
function setLayout(store, layout) {
  store.update('floor', { layout: layout || 'grid' });
}

/** 设置交错比例（仅 staggered 有效） */
function setStagger(store, staggerX, staggerY) {
  store.update('floor', {
    staggerX: typeof staggerX === 'number' ? staggerX : 0.5,
    staggerY: typeof staggerY === 'number' ? staggerY : 0.5
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

function setOffset(store, offsetX, offsetY) {
  store.update('floor', { offsetX: offsetX || 0, offsetY: offsetY || 0 });
}

function setVelocity(store, velocityX, velocityY) {
  store.update('floor', { velocityX: velocityX || 0, velocityY: velocityY || 0 });
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

/** 一次性应用布局结果 */
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
    layout: layout.layout || 'grid',
    staggerX: typeof layout.staggerX === 'number' ? layout.staggerX : 0.5,
    staggerY: typeof layout.staggerY === 'number' ? layout.staggerY : 0.5,
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
  setViewport: setViewport,

  setAtlasLoading: setAtlasLoading,
  setAtlasReady: setAtlasReady,
  setAtlasError: setAtlasError,

  setFloorStatus: setFloorStatus,
  setFloorError: setFloorError,
  setTileSize: setTileSize,
  setLayout: setLayout,
  setStagger: setStagger,
  setGrid: setGrid,
  setMap: setMap,
  setOffset: setOffset,
  setVelocity: setVelocity,
  setDragging: setDragging,
  setScrollBounds: setScrollBounds,
  applyLayout: applyLayout
};
