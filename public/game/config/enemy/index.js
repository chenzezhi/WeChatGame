// 敌人参数聚合：小怪（生成 / AI / 接触伤害） + Boss + Boss 技能

const minion = require('./minion.js');
const ai = require('./ai.js');
const contact = require('./contact.js');
const boss = require('./boss.js');
const dash = require('./dash.js');

const MODULES = [minion, ai, contact, boss, dash];

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
