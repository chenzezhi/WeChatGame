'use strict';

/* ==================== 功能 ====================
 * 渲染配置模板 —— 每种渲染器一份「完整数据模板例子」+「字段顺序」
 *
 * 对应 others/action.js 的思路：
 *   ActionScheduler(字段顺序, 完整模板对象)
 * 这里就是把这个「字段顺序 + 完整模板」提前定义好、只写一次。
 *
 * 定义好之后，写数据的表格里：
 *   - 只写要改的值
 *   - 后面的字段可以直接不写（不写 = 用模板默认值）
 *   - 想跳过中间某列，写 n
 * ==============================================*/

/* ==================== 用法 ====================
 * const Render = require('../config/render.js');
 * const TableMapper = require('./table-mapper.js');
 *
 * const def = Render.image(stage);      // 拿默认值 + 字段顺序
 *
 * const rows = [
 *   'src/assets/mapBg/mb1.jpg n n 0.25',   // 只改 url 和 scale，后面全省
 * ];
 *
 * const list = TableMapper.fill(def.template, rows, def.fields);
 * ==============================================*/

/* ==================== 注意 ====================
 * 字段顺序原则：**最常变的放前面，不常变的放后面**。
 *   name/url → x/y → 尺寸 → gap/margin → right/bottom（区域，通常整屏固定）
 * 这样绝大多数行只写前几列就够了，不用写一堆 n 占位符，可读性最好。
 *
 * right/bottom 是「平铺区域」。不填（0）就是单张、不铺。
 * ==============================================*/

// 独立单图（image-map）
function image(stage) {
  const W = stage.canvas.width;
  const H = stage.canvas.height;

  return {
    // 完整模板：所有字段的默认值，这个对象可以直接拿去用
    template: {
      url: '',            // 图片路径
      x: 0,               // 左上角 x
      y: 0,               // 左上角 y
      scale: 1,           // 每个格子的倍数
      gap: 0,             // 格子间距
      margin: 0,          // 区域四周留白
      right: W,           // 平铺到右边界（默认整屏）
      bottom: H,          // 平铺到下边界（默认整屏）
      bottomLayer: true,  // 压到最底层（当背景）
    },
    fields: 'url x y scale gap margin right bottom',
  };
}

// 图集小图（sprite-map）
function sprite(stage) {
  const W = stage.canvas.width;
  const H = stage.canvas.height;

  return {
    template: {
      name: '',   // 小图名字，或序号（数字 / 纯数字字符串）
      x: 0,
      y: 0,
      scale: 1,
      gap: 0,
      margin: 0,
      right: 0,   // 0 = 不平铺，只放一张
      bottom: 0,
    },
    fields: 'name x y scale gap margin right bottom',
  };
}

// 精灵图动画（anim-map）
function anim(stage) {
  const W = stage.canvas.width;
  const H = stage.canvas.height;

  return {
    template: {
      name: '',   // 动画名（config/assets.js 的 clips）
      x: 0,
      y: 0,
      height: 0,  // 目标高度（动画用它表达大小，不是倍数）
      gap: 0,
      margin: 0,
      right: 0,   // 0 = 不平铺，只放一个
      bottom: 0,
    },
    fields: 'name x y height gap margin right bottom',
  };
}

module.exports = { image, sprite, anim };
