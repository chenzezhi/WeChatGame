// 玩家参数聚合：血量 / 动画 / 子弹 / 射击 / 弹药 / 升级成长

const hp = require('./hp.js');
const animate = require('./animate.js');
const bullet = require('./bullet.js');
const fire = require('./fire.js');
const ammo = require('./ammo.js');
const level = require('./level.js');

const MODULES = [hp, animate, bullet, fire, ammo, level];

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
