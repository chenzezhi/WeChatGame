/**
 * 状态模块注册表（state/modules）
 * 新增业务状态时，在这里挂一个子模块即可。
 */
'use strict';

var viewport = require('./viewport/state.js');
var assets = require('./assets/state.js');
var floor = require('./floor/state.js');

function createInitialState(viewportSize) {
  return {
    viewport: viewport.create(viewportSize),
    assets: assets.create(),
    floor: floor.create()
  };
}

module.exports = {
  createInitialState: createInitialState,
  viewport: viewport,
  assets: assets,
  floor: floor
};
