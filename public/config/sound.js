'use strict';

/* ==================== 功能 ====================
 * 音效配置 —— 只放数据和插槽
 *
 * 一个音效 = 一个名字 + 文件路径 + 音量 + 最小间隔。
 * 想换文件、调音量、防止同一音效刷屏，都只改这里。
 * ==============================================*/

/* ==================== 用法 ====================
 * const SFX = require('../config/sound.js');
 * Sound.play(SFX.shoot.file, SFX.shoot.volume, SFX.shoot.gapMs);
 * ==============================================*/

module.exports = {
  // 走路：人物每踏进一个格子
  step: {
    file: 'src/assets/music/走路音效.mp3',
    volume: 0.5,
    gapMs: 0,
  },

  // 发射：一次发射（多发算一次，不会连响 8 声）
  shoot: {
    file: 'src/assets/music/弓箭发射.mp3',
    volume: 0.5,
    gapMs: 60,
  },

  // 命中：子弹打到怪物
  hit: {
    file: 'src/assets/music/子弹击中.mp3',
    volume: 0.45,
    gapMs: 50,
  },

  // 阵亡：怪物被打死
  kill: {
    file: 'src/assets/music/怪物阵亡.mp3',
    volume: 0.6,
    gapMs: 40,
  },

  // 篝火被咬：怪物攻击篝火
  campHit: {
    file: 'src/assets/music/怪物攻击篝火.mp3',
    volume: 0.55,
    gapMs: 120,
  },

  // 银币增加：只在卖卡 / 豹子奖励时响（击杀不响，否则和阵亡声叠一起太吵）
  coin: {
    file: 'src/assets/music/银币增加.mp3',
    volume: 0.5,
    gapMs: 50,
  },

  // 游戏失败：篝火耐久归零
  lose: {
    file: 'src/assets/music/游戏失败.mp3',
    volume: 0.7,
    gapMs: 0,
  },

  // 放牌：卡牌放到格子上 / 合成成功
  place: {
    file: 'src/assets/music/卡牌放到格子.mp3',
    volume: 0.5,
    gapMs: 0,
  },
};
