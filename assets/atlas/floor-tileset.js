/**
 * 位图大图描述（assets/atlas/floor-tileset）
 *
 * ⚠️ 必须用 .js 导出，不能用 .json。
 * 微信小游戏的 require 只支持 .js 模块，require 一个 .json 会在启动时直接抛错，
 * 表现为一直卡在微信启动页（中间有头像那个界面）。
 *
 * 改这一块就能控制「大图怎么切」：
 *   tileWidth / tileHeight  一块位图的宽高（像素）
 *   margin                  大图四周留白
 *   spacing                 块与块之间的间隙
 *   columns / rows          填 0 = 按图片尺寸自动推算
 */
'use strict';

module.exports = {
  // 相对项目根目录的包内路径（注意你的实际文件是 .jpg）
  image: 'assets/atlas/floor-tileset.jpg',

  tileWidth: 56,
  tileHeight: 56,

  margin: 18,
  spacing: 18,

  columns: 0,
  rows: 0,

  // 给块起名字，可选；索引从 0 开始，左上角第一块是 0
  tiles: {
    floor_0: 0,
    floor_1: 1,
    floor_2: 2,
    floor_3: 3
  }
};
