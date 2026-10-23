// 主界面模块控制器：组合按钮布局、绘制、交互，对外只暴露场景接口。

const scenes = require('../core/scenes.js');
const storage = require('../core/storage.js');
const profile = require('../core/profile.js');
const audio = require('../core/audio.js');
const buttons = require('./buttons.js');
const view = require('./view.js');

const state = {
  items: [],
  best: 0,
  hasSave: false,
  coins: 0,
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

function refresh() {
  state.items = buttons.build();
  state.hasSave = storage.has();

  const data = storage.read();
  state.best = (data && typeof data.best === 'number') ? data.best : 0;

  const prof = profile.read();
  state.coins = prof.coins;
}

function isDisabled(item) {
  return item.id === 'load' && !state.hasSave;
}

function goGame(mode) {
  const ok = scenes.switchTo('game', { mode: mode });
  if (!ok) toast('游戏模块还没接入');
}

function goShop() {
  const ok = scenes.switchTo('shop');
  if (!ok) toast('商店模块还没接入');
}

function goSettings() {
  const ok = scenes.switchTo('settings');
  if (!ok) toast('设置模块还没接入');
}

function exitApp() {
  if (typeof wx.exitMiniProgram === 'function') {
    try { wx.exitMiniProgram({}); return; } catch (e) { /* 不支持 */ }
  }
  toast('当前环境不支持退出');
}

const actions = {
  start: function () { goGame('new'); },
  load: function () { goGame('load'); },
  shop: function () { goShop(); },
  settings: function () { goSettings(); },
  exit: function () { exitApp(); },
};

function enter() {
  refresh();
  audio.playBgm();
}

function update() {
  // 主界面目前没有动画，留空
}

function render(ctx) {
  view.draw(ctx, state);
}

function touchStart(e) {
  // 首次触摸时补一次 BGM（部分机型不允许自动播放）
  audio.playBgm();

  const p = e.touches && e.touches[0];
  if (!p) return;

  const item = buttons.hit(state.items, p.x, p.y);
  if (!item) return;

  if (isDisabled(item)) {
    toast('没有找到存档');
    return;
  }

  const fn = actions[item.id];
  if (fn) fn();
}

module.exports = {
  enter: enter,
  update: update,
  render: render,
  touchStart: touchStart,
};
