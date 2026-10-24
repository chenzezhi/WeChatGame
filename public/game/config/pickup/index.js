// 道具参数聚合：生成规律 / 出现权重 / 效果数值

const spawn = require('./spawn.js');
const weight = require('./weight.js');
const effect = require('./effect.js');

const MODULES = [spawn, weight, effect];

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
