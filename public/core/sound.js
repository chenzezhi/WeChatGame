'use strict';

/* ==================== 功能 ====================
 * Sound —— 短音效播放
 *
 * 一个路径对应一个小播放池，轮流播放，避免「上一下还没播完就被打断」。
 * 走路这种高频音效就靠池子顶住。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Sound = require('./sound.js');
 *
 * Sound.play('src/assets/music/walk.mp3');        // 用默认音量
 * Sound.play('src/assets/music/walk.mp3', 0.5);   // 指定音量
 * ==============================================*/

/* ==================== 注意 ====================
 * 微信小游戏的音频要在用户交互之后才能播（第一次点击之前会被静音）。
 * 音频对象按路径缓存，同一个路径最多建 POOL_SIZE 个。
 * 路径写错只会打一行日志，不会影响游戏。
 * ==============================================*/

const cax = null;   // 占位：本模块不依赖渲染

// 总音量（菜单里的滑条控制它，所有音效乘这个数）
let master = 1;

// 设置总音量
// v - 0~1
function setMaster(v) {
  master = Math.max(0, Math.min(1, v));
}

// 当前总音量
function getMaster() {
  return master;
}

// 每个音效建几个播放器轮流用
const POOL_SIZE = 5;

// 路径 -> { list: [InnerAudioContext], index, lastAt }
const pools = {};

// 取（或创建）某个路径的播放池
// path - 音频路径
// volume - 音量 0~1
function poolOf(path, volume) {
  let pool = pools[path];

  if (!pool) {
    if (typeof wx === 'undefined' || !wx.createInnerAudioContext) {
      console.warn('[sound] 当前环境没有音频接口');
      return null;
    }

    pool = { list: [], index: 0 };

    for (let i = 0; i < POOL_SIZE; i++) {
      const ctx = wx.createInnerAudioContext();
      ctx.src = path;
      ctx.loop = false;
      ctx.autoplay = false;
      ctx.volume = volume == null ? 0.7 : volume;

      ctx.onError(function (err) {
        console.warn('[sound] 播放失败 ' + path + '：' + (err && err.errMsg));
      });

      pool.list.push(ctx);
    }

    pools[path] = pool;
  }

  return pool;
}

// 播一次
// path - 音频路径
// volume - 音量 0~1，不传用默认 0.7
// gapMs - 最小间隔毫秒，两次调用得太近就忽略（防止高频音效刷屏）
// 返回是否播出去了
function play(path, volume, gapMs) {
  if (!path) return false;

  const vol = (volume == null ? 0.7 : volume) * master;
  const pool = poolOf(path, vol);
  if (!pool) return false;

  // 音量跟着滑条实时变
  for (let i = 0; i < pool.list.length; i++) pool.list[i].volume = vol;

  // 间隔不足就不播，避免糊成一片噪音
  const now = Date.now();
  if (gapMs && pool.lastAt && now - pool.lastAt < gapMs) return false;
  pool.lastAt = now;

  const ctx = pool.list[pool.index % pool.list.length];
  pool.index += 1;

  try {
    ctx.stop();
    ctx.seek(0);
    ctx.play();
    return true;
  } catch (err) {
    console.warn('[sound] 播放出错：' + err.message);
    return false;
  }
}

module.exports = { play: play, setMaster: setMaster, getMaster: getMaster };
