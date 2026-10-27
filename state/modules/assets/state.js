/**
 * 状态模块：资源（state/modules/assets）
 * 记录图集加载进度，UI / 调试面板可以直接读。
 */
'use strict';

function create() {
  return {
    atlas: {
      status: 'idle', // idle | loading | ready | error
      key: null,
      width: 0,
      height: 0,
      tileCount: 0,
      error: null
    }
  };
}

module.exports = { create: create };
