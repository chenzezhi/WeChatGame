'use strict';

/* ==================== 功能 ====================
 * Bgm —— 背景音乐播放器
 *
 * 读一份歌单（src/data/bgm.txt），按播放模式连续播：
 *   loop   单曲循环
 *   order  顺序播放，放完接下一首，到末尾回到第一首
 *   random 每首放完随机挑下一首
 * 单曲可以在歌单里单独指定 mode / volume。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Bgm = require('./bgm.js');
 * const BGM = require('../config/bgm.js');
 *
 * Bgm.start({ file: BGM.file, volume: BGM.template.volume, mode: BGM.template.mode });
 * Bgm.unlock();      // 首次用户点击后调一次
 * Bgm.next();        // 手动切下一首
 * Bgm.stop();        // 停止
 * Bgm.setVolume(0.6); // 改音量
 * ==============================================*/

/* ==================== 注意 ====================
 * 微信小游戏要用户交互之后才能播声音。所以 start() 可能没声音，
 * 需要玩家点一下屏幕后调 unlock() 补上（重复调用无害）。
 * ==============================================*/

const Records = require('./records.js');

// 播放器，全局只建一个
let audio = null;

// 歌单，[{ name, file, mode, volume }]
let tracks = [];

// 当前第几首，-1 表示还没开始
let cur = -1;

// 全局默认值
let defaultVolume = 0.45;
let defaultMode = 'loop';

// 是否已经真正开始播过
let started = false;

// 取（或创建）播放器
function ensureAudio() {
  if (audio) return audio;
  if (typeof wx === 'undefined' || !wx.createInnerAudioContext) {
    console.warn('[bgm] 当前环境没有音频接口');
    return null;
  }

  audio = wx.createInnerAudioContext();

  // 一首放完：按模式接下一首
  audio.onEnded(function () {
    advance();
  });

  audio.onError(function (err) {
    console.warn('[bgm] 播放失败：' + (err && err.errMsg));
  });

  return audio;
}

// 读歌单
// path - 歌单文件路径
// 返回曲目数组
function loadTracks(path) {
  try {
    tracks = Records.load(path);
  } catch (err) {
    console.error('[bgm] 歌单读取失败：' + err.message);
    tracks = [];
  }
  return tracks;
}

// 播放第 index 首
// index - 序号，超出范围会自动取模
// 返回是否播出去了
function playIndex(index) {
  const a = ensureAudio();
  if (!a || !tracks.length) return false;

  const len = tracks.length;
  cur = ((index % len) + len) % len;

  const t = tracks[cur];

  try {
    a.stop();
    a.src = t.file;
    a.volume = t.volume == null ? defaultVolume : Number(t.volume);
    a.loop = (t.mode || defaultMode) === 'loop';
    a.play();
    return true;
  } catch (err) {
    console.warn('[bgm] 播放出错：' + err.message);
    return false;
  }
}

// 一首放完后的下一首
function advance() {
  if (!tracks.length) return;

  const t = tracks[cur] || {};
  const mode = t.mode || defaultMode;

  if (mode === 'random') {
    playIndex(Math.floor(Math.random() * tracks.length));
    return;
  }

  if (mode === 'order') {
    playIndex(cur + 1);
    return;
  }

  // loop：同一首重放（loop=true 时其实不会走到这里，保险起见）
  playIndex(cur);
}

// 开始播放
// options - { file, volume, mode }
//   file   歌单路径
//   volume 默认音量
//   mode   默认播放模式
// 返回是否播出去了
function start(options) {
  const o = options || {};

  if (o.volume != null) defaultVolume = o.volume;
  if (o.mode) defaultMode = o.mode;
  if (o.file) loadTracks(o.file);

  if (!tracks.length) {
    console.warn('[bgm] 歌单是空的');
    return false;
  }

  started = true;
  return playIndex(cur < 0 ? 0 : cur);
}

// 用户第一次点屏幕后调一次：之前 if 被系统拦了，这里补播
// 返回是否真的补播了
function unlock() {
  if (!tracks.length) return false;

  // 已经在放就不用管
  if (started && cur >= 0) {
    try {
      if (audio && !audio.paused) return false;
    } catch (e) {
      /* 拿不到状态就当没在播，继续往下补 */
    }
  }

  started = true;
  return playIndex(cur < 0 ? 0 : cur);
}

// 手动切下一首
function next() {
  if (!tracks.length) return false;
  return playIndex(cur + 1);
}

// 停止
function stop() {
  if (!audio) return;
  try {
    audio.stop();
  } catch (err) {
    /* 停不了就算了 */
  }
  started = false;
}

// 改音量
// v - 0~1
function setVolume(v) {
  defaultVolume = v;
  if (audio) {
    try {
      audio.volume = v;
    } catch (err) {
      /* 改不了就算了 */
    }
  }
}

// 当前曲目信息
function current() {
  return tracks[cur] || null;
}

module.exports = {
  start: start,
  unlock: unlock,
  next: next,
  stop: stop,
  setVolume: setVolume,
  current: current,
  loadTracks: loadTracks,
};
