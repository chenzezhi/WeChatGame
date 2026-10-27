/**
 * 选择器：资源（state/modules/assets）
 */
'use strict';

function getAtlasState(store) {
  return store.getState().assets.atlas;
}

function isAtlasReady(store) {
  return getAtlasState(store).status === 'ready';
}

module.exports = {
  getAtlasState: getAtlasState,
  isAtlasReady: isAtlasReady
};
