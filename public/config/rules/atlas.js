'use strict';

/* ============================================================================
 * 协议规则 · 素材 / 图集数据管理
 *
 * 这里集中定义「合图」的默认约定，asset-manager 读这里。
 * 想改默认目录 / 默认格式 / 加新格式，只改这个文件。
 *
 * 当前约定：
 *   合图图片 = baseDir + 名称 + .png（或 jpg/jpeg/webp，按 imageExtensions 顺序探测）
 *   合图数据 = baseDir + 名称 + .json（固定，Cocos 导出的数组结构）
 *
 * 未来要支持别的数据格式（如纹理打包器导出的 .atlas 等），
 * 在这里加字段，并在 asset-manager 里对应扩展即可。
 * ==========================================================================*/

module.exports = {

  // 素材根目录（包内相对路径，末尾带 /）
  baseDir: 'src/assets/',

  // 支持的图片格式，按顺序探测（谁先存在用谁）
  imageExtensions: ['png', 'jpg', 'jpeg', 'webp'],

  // 默认图片格式：探测不到或没法探测时退回这个
  defaultImageExt: 'png',

  // 合图数据格式：固定 json（Cocos 导出的数组结构）
  dataExtension: 'json'
};
