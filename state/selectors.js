/**
 * 所有「读状态 / 算派生值」的函数
 *
 * 派生值（比如「单块渲染尺寸」「能否滚动」）统一在这里算，
 * 业务层不要自己重复算，避免同一个公式散落多处、改一处漏一处。
 *
 * 初始值在 state/state-definitions.js
 */
'use strict';

/* ============================================================
 * 一、视口
 * ============================================================ */
function getViewport(store) {
  return store.getState().viewport;
}

/* ============================================================
 * 二、资源
 * ============================================================ */
function getAtlasState(store) {
  return store.getState().assets.atlas;
}

function isAtlasReady(store) {
  return getAtlasState(store).status === 'ready';
}

/* ============================================================
 * 三、地板
 * ============================================================ */
function getFloor(store) {
  return store.getState().floor;
}

function isFloorReady(store) {
  return getFloor(store).status === 'ready';
}

/** 单块地板在屏幕上的渲染尺寸 */
function getTileRenderSize(store) {
  var floor = getFloor(store);
  return {
    width: floor.tileWidth * floor.scale,
    height: floor.tileHeight * floor.scale
  };
}

/** 整块地板的屏幕尺寸 */
function getFloorSize(store) {
  var floor = getFloor(store);
  return {
    width: floor.contentWidth,
    height: floor.contentHeight
  };
}

function getMap(store) {
  return getFloor(store).map;
}

/** 地图来源：'file' 或 'generated' */
function getMapSource(store) {
  return getFloor(store).mapSource;
}

/** 当前滚动偏移 { x, y }（恒 <= 0） */
function getOffset(store) {
  var floor = getFloor(store);
  return { x: floor.offsetX || 0, y: floor.offsetY || 0 };
}

/** 可滚动上限 { maxX, maxY }（正数，0 表示该方向不能滚） */
function getScrollBounds(store) {
  var floor = getFloor(store);
  return {
    maxX: floor.maxScrollX || 0,
    maxY: floor.maxScrollY || 0
  };
}

/** 这个地板能不能滚（任一方向能滚就为 true） */
function canScroll(store) {
  var b = getScrollBounds(store);
  return b.maxX > 0 || b.maxY > 0;
}

module.exports = {
  // 视口
  getViewport: getViewport,

  // 资源
  getAtlasState: getAtlasState,
  isAtlasReady: isAtlasReady,

  // 地板
  getFloor: getFloor,
  isFloorReady: isFloorReady,
  getTileRenderSize: getTileRenderSize,
  getFloorSize: getFloorSize,
  getMap: getMap,
  getMapSource: getMapSource,
  getOffset: getOffset,
  getScrollBounds: getScrollBounds,
  canScroll: canScroll
};
