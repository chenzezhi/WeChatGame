/**
 * 状态管理入口
 *
 * 目录结构（全部平铺，不再有 modules 子目录）：
 *   state/state-definitions.js  ← ★ 改默认值只看这个
 *   state/actions.js              所有改状态的函数
 *   state/selectors.js            所有派生值
 *   state/store/create-store.js   极简 store 实现
 *   state/index.js                本文件
 *
 * 用法：
 *   var createAppStore = require('./state/index.js').createAppStore;
 *   var store = createAppStore({ width: 375, height: 667, dpr: 2 });
 *
 *   var actions = require('./state/actions.js');
 *   actions.setOffset(store, -100, 0);
 *
 *   var selectors = require('./state/selectors.js');
 *   selectors.getFloor(store);
 */
'use strict';

var createStore = require('./store/create-store.js');
var definitions = require('./state-definitions.js');

/**
 * 创建应用状态仓库
 * @param {Object} viewportSize { width, height, dpr } 可选
 * @return {Object} store
 */
function createAppStore(viewportSize) {
  return createStore(definitions.createInitialState(viewportSize));
}

module.exports = {
  createAppStore: createAppStore,
  CONSTANTS: definitions.CONSTANTS,
  INITIAL_STATE: definitions.INITIAL_STATE
};
