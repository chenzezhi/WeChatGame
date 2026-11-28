'use strict';

/* ==================== 功能 ====================
 * 商店配置 —— 只放数据和「插槽」
 *
 * 商店趴在屏幕最下方，由一副外壳 + N 个卡牌槽位组成。
 * 这里只写尺寸比例和素材，不写任何布局计算。
 * ==============================================*/

/* ==================== 用法 ====================
 * const SHOP = require('../config/shop.js');
 * const shop = new Shop(SHOP.template, { width: w, height: h, shellFrame, slotFrame });
 * ==============================================*/

module.exports = {
  // 模板：所有商店的默认值
  template: {
    /* ★ 插槽 1：外壳
     * shellAsset - 图集序号（数字）或图片路径（字符串带 / 或 .）
     * shellWidthRatio - 外壳宽度占画布宽度的比例，1 = 整屏宽
     * bottom - 外壳底边距屏幕底部的距离，单位 px
     * 外壳高度由图片自身比例决定，不拉伸
     */
    shellAsset: 30,
    shellWidthRatio: 1,
    bottom: 0,

    /* ★ 插槽 2：卡牌槽位
     * slotAsset - 槽位底图，写法同 shellAsset
     * slotCount - 一排几个槽位
     * slotRatio - 槽位边长占画布宽度的比例
     * gapRatio  - 槽位之间的间距，占画布宽度比例
     * slotBottomRatio - 槽位底边距外壳底边的比例（相对外壳高度）
     */
    slotAsset: 30,
    slotCount: 3,
    slotRatio: 0.28,
    gapRatio: 0.02,
    slotBottomRatio: 0.12,
  },
};
