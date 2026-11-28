'use strict';

/* ==================== 功能 ====================
 * 背景音乐配置 —— 只放数据和插槽
 *
 * 歌单在 src/data/bgm.txt（可以很多首），这里只放全局开关和默认值。
 * ==============================================*/

/* ==================== 用法 ====================
 * const BGM = require('../config/bgm.js');
 * Bgm.start({ file: BGM.file, volume: BGM.template.volume, mode: BGM.template.mode });
 * ==============================================*/

module.exports = {
  // 歌单文件，路径相对包根
  file: 'src/data/bgm.txt',

  // 模板：全局默认值
  template: {
    enabled: true,    // 总开关，关掉就完全不播

    /* 默认播放模式（单曲可以单独覆盖，见 bgm.txt 的 mode 列）
     * loop   - 单曲循环
     * order  - 顺序播放，放到最后一首回到第一首
     * random - 每首放完随机挑下一首
     */
    mode: 'loop',

    volume: 0.45,     // 默认音量 0~1
  },
};
