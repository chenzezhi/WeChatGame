/**
 * 所有「读状态 / 算派生值」的函数
 *
 * 派生值统一在这里算，业务层不要自己重复算。
 * 初始值在 state/state-definitions.js
 */
'use strict';

/* ---------------- 视口 ---------------- */
function getViewport(store) {
  return store.getState().viewport;
}

/* ---------------- 资源 ---------------- */
function getAtlasState(store) {
  return store.getState().assets.atlas;
}

function isAtlasReady(store) {
  return getAtlasState(store).status === 'ready';
}

function getBackgroundState(store) {
  return store.getState().assets.background;
}

/* ---------------- 地板 ---------------- */
function getFloor(store) {
  return store.getState().floor;
}

function isFloorReady(store) {
  return getFloor(store).status === 'ready';
}

/** 当前布局模式：'grid' | 'staggered' | 'iso' */
function getLayout(store) {
  return getFloor(store).layout || 'grid';
}

/** 交错比例 { x, y } */
function getStagger(store) {
  var floor = getFloor(store);
  return {
    x: typeof floor.staggerX === 'number' ? floor.staggerX : 0.5,
    y: typeof floor.staggerY === 'number' ? floor.staggerY : 0.5
  };
}

/** 地图整体形状：'rect' | 'diamond' */
function getMapShape(store) {
  return getFloor(store).mapShape || 'rect';
}

function getTileRenderSize(store) {
  var floor = getFloor(store);
  return {
    width: floor.tileWidth * floor.scale,
    height: floor.tileHeight * floor.scale
  };
}

function getFloorSize(store) {
  var floor = getFloor(store);
  return { width: floor.contentWidth, height: floor.contentHeight };
}

function getMap(store) {
  return getFloor(store).map;
}

function getMapSource(store) {
  return getFloor(store).mapSource;
}

function getOffset(store) {
  var floor = getFloor(store);
  return { x: floor.offsetX || 0, y: floor.offsetY || 0 };
}

function getScrollBounds(store) {
  var floor = getFloor(store);
  return { maxX: floor.maxScrollX || 0, maxY: floor.maxScrollY || 0 };
}

function canScroll(store) {
  var b = getScrollBounds(store);
  return b.maxX > 0 || b.maxY > 0;
}

module.exports = {
  getViewport: getViewport,

  getAtlasState: getAtlasState,
  isAtlasReady: isAtlasReady,
  getBackgroundState: getBackgroundState,

  getFloor: getFloor,
  isFloorReady: isFloorReady,
  getLayout: getLayout,
  getStagger: getStagger,
  getMapShape: getMapShape,
  getTileRenderSize: getTileRenderSize,
  getFloorSize: getFloorSize,
  getMap: getMap,
  getMapSource: getMapSource,
  getOffset: getOffset,
  getScrollBounds: getScrollBounds,
  canScroll: canScroll
};
