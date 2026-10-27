/**
 * 动作：视口（state/modules/viewport）
 */
'use strict';

function setViewport(store, size) {
  if (!size) return;
  store.update('viewport', {
    width: size.width,
    height: size.height,
    dpr: size.dpr || 1
  });
}

module.exports = { setViewport: setViewport };
