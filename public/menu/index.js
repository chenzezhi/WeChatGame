// 主界面模块控制器：组合按钮布局、绘制、交互，对外只暴露场景接口。
//
// 交互：按下 → 在同一按钮上松手才触发（这样才能区分「点击」和「拖动滚动」）。
// 滚动：按下后纵向拖动超过 TAP_SLOP 即滚动按钮列表。

const scenes = require('../core/scenes.js');
const storage = require('../core/storage.js');
const profile = require('../core/profile.js');
const audio = require('../core/audio.js');
const buttons = require('./buttons.js');
const view = require('./view.js');

const TAP_SLOP = 12;

const state = {
  built: null,
  items: [],
  best: 0,
  hasSave: false,
  coins: 0,

  scroll: 0,
  downScroll: 0,

  downId: -1,
  downX: 0,
  downY: 0,
  downBtn: null,
  moved: false,
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

function refresh() {
  state.hasSave = storage.has();

  const data = storage.read();
  state.best = (data && typeof data.best === 'number') ? data.best : 0;

  const prof = profile.read();
  state.coins = prof.coins;

  state.built = buttons.build(state.scroll);
  state.scroll = state.built.scroll;
  state.items = state.built.items;
}

function setScroll(v) {
  const max = state.built ? state.built.scrollMax : 0;

  let n = v;
  if (!isFinite(n)) n = 0;
  if (n < 0) n = 0;
  if (n > max) n = max;

  if (n === state.scroll) return;

  state.scroll = n;
  state.built = buttons.build(n);
  state.items = state.built.items;
}

function resetDown() {
  state.downId = -1;
  state.downBtn = null;
  state.moved = false;
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
  resetDown();
  state.scroll = 0;
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

  state.downId = p.id;
  state.downX = p.x;
  state.downY = p.y;
  state.downScroll = state.scroll;
  state.moved = false;
  state.downBtn = buttons.hit(state.built, p.x, p.y);
}

function touchMove(e) {
  if (state.downId < 0) return;

  const list = e.touches || [];
  let p = null;

  for (let i = 0; i < list.length; i++) {
    if (list[i].id === state.downId) { p = list[i]; break; }
  }

  if (!p) return;

  const dx = p.x - state.downX;
  const dy = p.y - state.downY;

  if (!state.moved && dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) state.moved = true;
  if (!state.moved) return;

  const max = state.built ? state.built.scrollMax : 0;
  if (max > 0) setScroll(state.downScroll - dy);
}

function touchEnd(e) {
  if (state.downId < 0) return;

  const changed = e.changed || [];
  let p = null;

  for (let i = 0; i < changed.length; i++) {
    if (changed[i].id === state.downId) { p = changed[i]; break; }
  }

  const x = p ? p.x : state.downX;
  const y = p ? p.y : state.downY;

  const down = state.downBtn;
  const moved = state.moved;

  resetDown();

  if (!down || moved) return;

  const up = buttons.hit(state.built, x, y);
  if (!up || up.id !== down.id) return;

  if (isDisabled(up)) {
    toast('没有找到存档');
    return;
  }

  // 主界面所有按钮共用同一个点击音（不做逐个按钮区分）
  audio.play('ui');

  const fn = actions[up.id];
  if (fn) fn();
}

module.exports = {
  enter: enter,
  update: update,
  render: render,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
};
