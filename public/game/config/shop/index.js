// 商店参数聚合：升级加成 / 价格规则 / 等级上限

const upgrade = require('./upgrade.js');
const price = require('./price.js');
const limit = require('./limit.js');

const MODULES = [upgrade, price, limit];

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
