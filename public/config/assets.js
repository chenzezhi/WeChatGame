'use strict';

// 美术资源清单：只有数据，没有逻辑。
// 换图、加动画、改规格，都只改这个文件。

module.exports = {

  image: 'src/assets/roll.png',

  // 切法：一套规格只写一次，多个 clip 共用
  layouts: {

    // 整张图按 4 列 4 行均分
    sheet: { cols: 8, rows: 10, spacing: 2 }

    // 需要另一种规格时，加一套即可（同一个 clip 只能用一套）：
    // 从大图 (0, 256) 开始，每格 64x64，格子之间留 2px
    // head: { frameWidth: 64, frameHeight: 64, origin: [0, 256], spacing: 2 }
  },

  // 动画段：从某个 layout 里取格子
  //   from + count  取连续几格
  //   frames: [...] 想按什么顺序播就写什么
  //   framerate     每秒帧数，不写默认 12
  clips: {

    // 第 0~3 格：角色向前走
    nf1: { layout: 'sheet', from: 0, count: 8, framerate: 8 },
    nf2: { layout: 'sheet', from: 8, count: 8, framerate: 4 },
    // // 第 4~7 格：头像抖动
    // head: { layout: 'sheet', from: 4, count: 4, framerate: 10 }
  }
};
