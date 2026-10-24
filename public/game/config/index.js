// 参数聚合：把各分类模块合并成一个扁平对象。
// 合并顺序在后者覆盖前者，同一个名字只应该在一个文件里定义。

const screen = require('./screen.js');
const physics = require('./physics.js');
const controls = require('./controls.js');
const player = require('./player/index.js');
const clone = require('./clone.js');
const active = require('./active.js');
const drop = require('./drop.js');
const enemy = require('./enemy/index.js');
const pickup = require('./pickup/index.js');
const shop = require('./shop/index.js');

const MODULES = [screen, physics, controls, player, clone, active, drop, enemy, pickup, shop];

function merge() {
  const out = {};

  for (let i = 0; i < MODULES.length; i++) {
    const src = MODULES[i] || {};
    const keys = Object.keys(src);

    for (let k = 0; k < keys.length; k++) out[keys[k]] = src[keys[k]];
  }

  return out;
}

module.exports = merge();
