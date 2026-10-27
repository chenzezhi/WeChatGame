/**
 * 选择器：视口（state/modules/viewport）
 */
'use strict';

function getViewport(store) {
  return store.getState().viewport;
}

module.exports = { getViewport: getViewport };
