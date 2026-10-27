/**
 * 极简状态仓库（state/store）
 *
 * - getState()        取完整状态
 * - select(fn)        取派生值
 * - update(模块名, 补丁)  只更新某个模块，并通知订阅者
 * - subscribe(fn)     订阅变更
 *
 * 不引入任何第三方库，避免小游戏包体与依赖问题。
 */
'use strict';

function createStore(initialState) {
  var state = initialState || {};
  var listeners = [];

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (e) { console.error('[state] 订阅回调异常：' + e.message); }
    }
  }

  function getState() { return state; }

  function setState(patch) {
    if (typeof patch === 'function') patch = patch(state);
    if (!patch) return;
    for (var key in patch) state[key] = patch[key];
    notify();
  }

  /** 更新单个模块（浅合并），保持其它模块引用不变 */
  function update(moduleName, patch) {
    var current = state[moduleName] || {};
    if (typeof patch === 'function') patch = patch(current);
    var next = {};
    var key;
    for (key in current) next[key] = current[key];
    if (patch) for (key in patch) next[key] = patch[key];
    state[moduleName] = next;
    notify();
  }

  function select(selector) { return selector(state); }

  function subscribe(listener) {
    listeners.push(listener);
    return function () {
      var i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  return {
    getState: getState,
    setState: setState,
    update: update,
    select: select,
    subscribe: subscribe
  };
}

module.exports = createStore;
