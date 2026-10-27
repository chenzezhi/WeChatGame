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

function setMap(store, map) {
  store.update('floor', { map: map });
}

function setOrigin(store, originX, originY) {
  store.update('floor', { originX: originX, originY: originY });
}

/** 一次性应用布局结果（地板系统算好后交给状态层） */
function applyLayout(store, layout) {
  store.update('floor', {
    status: 'ready',
    error: null,
    columns: layout.columns,
    rows: layout.rows,
    tileWidth: layout.tileWidth,
    tileHeight: layout.tileHeight,
    originX: layout.originX || 0,
    originY: layout.originY || 0,
    scale: layout.scale || 1,
    map: layout.map || null
  });
}

module.exports = {
  setStatus: setStatus,
  setError: setError,
  setTileSize: setTileSize,
  setGrid: setGrid,
  setMap: setMap,
  setOrigin: setOrigin,
  applyLayout: applyLayout
};
