'use strict';

/* ==================== 功能 ====================
 * 渲染引擎分工规则
 *
 * 项目里有两个「图集」引擎，职责不同，别混用：
 *
 * ── atlas.js：精灵图动画引擎（真动画）─────────────────────────
 *   输入：规整网格排布的精灵图（sprite sheet），如 roll.png
 *   切法：cols×rows 均分，或 frameWidth/frameHeight
 *   产出：会循环播放的动画 Sprite
 *   适用：角色走路 / 待机 / 攻击 等「连续帧动画」
 *   配置：public/config/assets.js（layouts + clips）
 *
 * ── cocos-atlas.js：静态图集引擎（非动画）─────────────────────
 *   输入：乱排的 Cocos 图集（png + json），如 gameMap.png + gameMap.json
 *   切法：靠 json 记录每块位置，自动烘焙旋转帧
 *   产出：按名称 / 序号取单张静态 Bitmap（不播动画）
 *   适用：UI 控件 / 图标 / 血条 / 方框 等「单张静态素材」
 *   配置：public/config/rules/atlas.js（图片 / 数据路径约定）
 *
 * ── 选择规则 ─────────────────────────────────────────────────
 *   要「动起来」（连续帧动画）→ atlas.js
 *   要「单张静态图」         → cocos-atlas.js
 * ==============================================*/

module.exports = {
  animation: 'atlas.js',       // 精灵图动画引擎（真动画）
  static: 'cocos-atlas.js'     // 静态图集引擎（非动画）
};
