/**
 * 动作：资源（state/modules/assets）
 */
'use strict';

function setAtlasLoading(store, key) {
  store.update('assets', {
    atlas: { status: 'loading', key: key, width: 0, height: 0, tileCount: 0, error: null }
  });
}

function setAtlasReady(store, key, width, height, tileCount) {
  store.update('assets', {
    atlas: {
      status: 'ready',
      key: key,
      width: width,
      height: height,
      tileCount: tileCount,
      error: null
    }
  });
}

function setAtlasError(store, message) {
  store.update('assets', {
    atlas: { status: 'error', key: null, width: 0, height: 0, tileCount: 0, error: message || '未知错误' }
  });
}

module.exports = {
  setAtlasLoading: setAtlasLoading,
  setAtlasReady: setAtlasReady,
  setAtlasError: setAtlasError
};
