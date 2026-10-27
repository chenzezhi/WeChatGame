/**
 * 平台适配层（大模块：platform）
 *
 * 所有 wx.* 调用都集中在这里，上层模块只依赖本目录，
 * 以后要移植到别的平台（Cocos / Web）只改这一层。
 */
'use strict';

module.exports = {
  system: require('./wx/system.js'),
  render: require('./wx/render.js'),
  input: require('./wx/input.js')
};
