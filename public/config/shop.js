'use strict';

/* ==================== 功能 ====================
 * 商店配置 —— 只放数据和「插槽」
 *
 * 商店趴在屏幕下方，由一副外壳 + N 个卡牌槽位组成。
 * 外壳和槽位各自按「占画布的比例」定位，互不牵连：
 * 外壳挪到哪、超出屏幕多少，都不影响槽位。
 * ==============================================*/

/* ==================== 用法 ====================
 * const SHOP = require('../config/shop.js');
 * const shop = new Shop(SHOP.template, { width: w, height: h, shellFrame, slotFrame });
 * ==============================================*/

module.exports = {
  // 模板：所有商店的默认值
  template: {
    /* ★ 插槽 1：外壳
     * shellAsset      - 图集序号（数字）或图片路径（字符串带 / 或 .）
     * shellWidthRatio - 外壳宽度占画布宽度的比例，1 = 整屏宽
     * x               - 外壳左上角 x，单位 px；null = 水平居中
     * y               - 外壳左上角 y，单位 px；null = 用下面的 topRatio
     * topRatio        - 仅当 y 为 null 时生效，占画布高度比例
     *                   0.8 = 外壳顶端在画布高度的 80% 处（只露下面 1/5）
     *
     * 高度由图片自身比例决定，只按宽度等比缩放，绝不拉伸。
     * 超出屏幕的部分交给画布裁掉，不做任何压缩。
     */
    shellAsset: "src/assets/shopBg.png",
    shellWidthRatio: 1.2,
    x: null,
    y: null,
    topRatio: 0.7,

    /* 图片怎么铺进外壳盒子（盒子 = 上面 shellWidthRatio / topRatio 定出的那块）
     * shellFit    - cover 铺满（四边都裁） / width 按宽度（只裁上下） / height 按高度（只裁左右）
     * shellAnchor - top 顶部对齐（保住顶部装饰边） / center 居中 / bottom 贴底
     *
     * 现在默认 width + top：按宽度铺满，顶边贴在盒子顶，下方溢出裁掉。
     * 这样图片的顶部装饰边不会因为“居中裁”而被切掉。
     */
    shellFit: 'width',
    shellAnchor: 'top',

    /* ★ 商店标题（画在外壳顶部居中）
     * title          - 标题文字，留空就不画
     * titleTopRatio  - 标题中心距外壳顶部的比例（相对外壳高度），0.05 = 往下 5%
     * titleFontRatio - 字号占外壳高度的比例
     * titleColor     - 文字颜色
     */
    title: '商店',
    titleTopRatio: 0.05,
    titleFontRatio: 0.16,
    titleColor: '#ffe9c9',

    /* ★ 插槽 2：卡牌槽位
     * slotAsset    - 槽位底图，写法同 shellAsset
     * slotCount    - 一排几个槽位
     * slotRatio    - 槽位边长占画布宽度的比例
     * gapRatio     - 槽位之间的间距，占画布宽度比例
     * slotTopRatio - 槽位顶端位置，占画布高度比例（和外壳独立，保证一定看得见）
     */
    slotAsset: 30,
    slotCount: 3,
    slotRatio: 0.24,
    gapRatio: 0.03,
    slotTopRatio: 0.81,
  },
};
