// 设置场景：音乐开关 / 音效开关 / 重置游戏数据。
// 交互只认「点击」：按下不动、在同一行松手才生效。
// 坐标系：设计单位（960×540），触摸点先经 core/ui.point() 转换。

const scenes = require('../core/scenes.js');
const profile = require('../core/profile.js');
const storage = require('../core/storage.js');
const audio = require('../core/audio.js');
const ui = require('../core/ui.js');
const view = require('./view.js');

const TAP_SLOP = 12;

const ROW_W = 520;
const ROW_H = 68;
const ROW_GAP = 20;
const ROW_TOP = 156;

const state = {
  musicOn: true,
  sfxOn: true,
  built: null,

  downId: -1,
  downX: 0,
  downY: 0,
  downBtn: null,
  moved: false,
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

function buildLayout() {
  const x = (ui.DESIGN_W - ROW_W) / 2;
  let y = ROW_TOP;

  const music = { id: 'music', kind: 'toggle', label: '游戏音乐', x: x, y: y, w: ROW_W, h: ROW_H };
  y += ROW_H + ROW_GAP;

  const sfx = { id: 'sfx', kind: 'toggle', label: '游戏音效', x: x, y: y, w: ROW_W, h: ROW_H };
  y += ROW_H + ROW_GAP * 2;

  const reset = { id: 'reset', kind: 'reset', label: '重置游戏数据', x: x, y: y, w: ROW_W, h: ROW_H };

  const back = { id: 'back', kind: 'back', x: 20, y: 18, w: 84, h: 38 };

  return { music: music, sfx: sfx, reset: reset, back: back, rows: [music, sfx, reset] };
}

function refresh() {
  state.musicOn = audio.isMusicOn();
  state.sfxOn = audio.isSfxOn();
  state.built = buildLayout();
}

function resetDown() {
  state.downId = -1;
  state.downBtn = null;
  state.moved = false;
}

function doReset() {
  try {
    wx.showModal({
      title: '重置游戏数据',
      content: '金币、商店升级、已购道具、永久分身以及当前进度都会清零，确定吗？',
      confirmText: '确定重置',
      cancelText: '取消',
      success: function (res) {
        if (!res || !res.confirm) return;

        profile.write(profile.defaults());
        storage.clear();

        toast('游戏数据已清空');
        refresh();
      },
    });
  } catch (e) {
    // 不支持弹窗的环境：直接清
    profile.write(profile.defaults());
    storage.clear();
    toast('游戏数据已清空');
    refresh();
  }
}

function hitRow(x, y) {
  const b = state.built;
  if (!b) return null;

  if (x >= b.back.x && x <= b.back.x + b.back.w && y >= b.back.y && y <= b.back.y + b.back.h) {
    return b.back;
  }

  const rows = b.rows || [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }

  return null;
}

function act(b) {
  if (!b) return;

  if (b.kind === 'back') {
    audio.play('ui');
    scenes.switchTo('menu');
    return;
  }

  if (b.id === 'music') {
    audio.play('ui');
    audio.setMusicOn(!audio.isMusicOn());
    refresh();
    return;
  }

  if (b.id === 'sfx') {
    audio.setSfxOn(!audio.isSfxOn());
    // 开的时候给个即时反馈（关的时候 play 会自动静默）
    audio.play('ui');
    refresh();
    return;
  }

  if (b.id === 'reset') {
    audio.play('ui');
    doReset();
  }
}

function enter() {
  resetDown();
  refresh();
  audio.playBgm();
}

function exit() {
  resetDown();
}

function update() {
  // 无动画
}

function render(ctx) {
  view.draw(ctx, state);
}

function touchStart(e) {
  const raw = e.touches && e.touches[0];
  if (!raw) return;

  const p = ui.point(raw);

  state.downId = p.id;
  state.downX = p.x;
  state.downY = p.y;
  state.moved = false;
  state.downBtn = hitRow(p.x, p.y);
}

function touchMove(e) {
  if (state.downId < 0) return;

  const list = e.touches || [];
  let raw = null;

  for (let i = 0; i < list.length; i++) {
    if (list[i].id === state.downId) { raw = list[i]; break; }
  }

  if (!raw) return;

  const p = ui.point(raw);
  const dx = p.x - state.downX;
  const dy = p.y - state.downY;

  if (dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) state.moved = true;
}

function touchEnd(e) {
  if (state.downId < 0) return;

  const changed = e.changed || [];
  let raw = null;

  for (let i = 0; i < changed.length; i++) {
    if (changed[i].id === state.downId) { raw = changed[i]; break; }
  }

  const p = raw ? ui.point(raw) : { x: state.downX, y: state.downY };

  const down = state.downBtn;
  const moved = state.moved;

  resetDown();

  if (!down || moved) return;

  const up = hitRow(p.x, p.y);
  if (!up || up.id !== down.id) return;

  act(up);
}

module.exports = {
  enter: enter,
  exit: exit,
  update: update,
  render: render,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
};
