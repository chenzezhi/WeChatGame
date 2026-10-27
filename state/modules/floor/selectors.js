/**
 * 选择器：地板（state/modules/floor）
 * 派生值统一在这里算，业务层不重复计算。
 */
'use strict';

function getFloor(store) {
  return store.getState().floor;
}

function isReady(store) {
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

/** 这个方向能不能滚 */
function canScroll(store) {
  var b = getScrollBounds(store);
  return b.maxX > 0 || b.maxY > 0;
}

module.exports = {
  getFloor: getFloor,
  isReady: isReady,
  getTileRenderSize: getTileRenderSize,
  getFloorSize: getFloorSize,
  getMap: getMap,
  getOffset: getOffset,
  getScrollBounds: getScrollBounds,
  canScroll: canScroll
};
