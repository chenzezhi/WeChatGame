/**
 * 状态管理入口（state）
 * 对外只暴露 createAppStore，内部结构（store/modules）可自由演进。
 */
'use strict';

var createStore = require('./store/create-store.js');
var modules = require('./modules/index.js');

function createAppStore(viewportSize) {
  return createStore(modules.createInitialState(viewportSize));
}

module.exports = {
  createAppStore: createAppStore,
  modules: modules
};
