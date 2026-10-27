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
  var tile = getTileRenderSize(store);
  return {
    width: floor.columns * tile.width,
    height: floor.rows * tile.height
  };
}

function getMap(store) {
  return getFloor(store).map;
}

module.exports = {
  getFloor: getFloor,
  isReady: isReady,
  getTileRenderSize: getTileRenderSize,
  getFloorSize: getFloorSize,
  getMap: getMap
};
