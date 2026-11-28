'use strict';

/* ==================== 功能 ====================
 * Shop —— 商店
 *
 * 屏幕最下方的一层：一副外壳 + 一排卡牌槽位。
 * 只算位置和尺寸，生成表格行；不管购买、拖拽、银币。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Shop = require('./shop.js');
 * const SHOP = require('../config/shop.js');
 *
 * const shop = new Shop(SHOP.template, { width: w, height: h, shellFrame, slotFrame });
 *
 * shop.shell;              // { x, y, w, h, scale } 外壳
 * shop.slots;              // [{ index, x, y, w, h, scale, card, price }]
 * shop.slotAt(index);      // 按序号取槽位
 * shop.toTable();          // ['sprite 30 0 1800 1.2', ...] 拼进表格
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px；尺寸用「占画布宽度的比例」，换分辨率不会错位。
 * 外壳高度由图片比例决定，只按宽度缩放，不拉伸。
 * 槽位在画布上水平居中，底边按 slotBottomRatio 抬离外壳底边。
 * ==============================================*/

// 卡牌槽位：商店里的一格
// shop - 所属的 Shop，用来取素材和尺寸
// index - 第几个槽位，从 0 开始
class Slot {
  constructor(shop, index) {
    this.index = index;

    // 位置与尺寸，单位 px
    this.x = shop._slotX(index);
    this.y = shop._slotY();
    this.w = shop.slotSize;
    this.h = shop.slotSize;

    // 画自己用的素材：图集序号或图片路径 + 缩放倍数
    this.asset = shop.cfg.slotAsset;
    this.scale = shop.slotScale;

    // 槽位上的卡牌；没有就是 null（以后放 { id, price } 这种东西）
    this.card = null;
  }

  // 这个槽位要渲染的表格行
  // renderer - 强制指定渲染器；不传就按素材形态自动选
  // 返回字符串数组
  toRows(renderer) {
    const r = renderer || pickRenderer(this.asset);
    return [`${r} ${this.asset} ${this.x} ${this.y} ${this.scale}`];
  }
}

// 按素材形态选渲染器
// value - 纯数字或纯数字字符串走 sprite，含 / 或 . 的走 image
// 返回 'sprite' 或 'image'
function pickRenderer(value) {
  return /[\/.]/.test(String(value)) ? 'image' : 'sprite';
}

// 商店：外壳 + 一排槽位
// cfg - 见 public/config/shop.js 的 template
// env - { width, height, shellFrame, slotFrame }
//   width, height - 画布物理像素尺寸
//   shellFrame / slotFrame - 两种素材的原始尺寸 { w, h }
class Shop {
  constructor(cfg, env) {
    const c = cfg || {};
    const e = env || {};

    this.cfg = c;

    const width = e.width || 0;
    const height = e.height || 0;

    // 外壳：底边贴住 bottom，宽度按比例，高度由图片比例决定
    const shellW = width * (c.shellWidthRatio == null ? 1 : c.shellWidthRatio);
    const shellFrame = e.shellFrame || null;
    const shellScale = shellFrame && shellFrame.w ? shellW / shellFrame.w : 1;
    const shellH = shellFrame && shellFrame.h ? shellFrame.h * shellScale : 0;

    this.shell = {
      asset: c.shellAsset,
      x: (width - shellW) / 2,
      y: height - (c.bottom || 0) - shellH,
      w: shellW,
      h: shellH,
      scale: shellScale,
    };

    // 槽位：边长按画布宽比例，水平居中排成一排
    this.slotCount = c.slotCount || 0;
    this.slotSize = width * (c.slotRatio || 0);
    this.slotGap = width * (c.gapRatio || 0);

    const slotFrame = e.slotFrame || null;
    this.slotScale = slotFrame && slotFrame.w ? this.slotSize / slotFrame.w : 1;

    // 存下画布宽，算槽位横坐标时用
    this._width = width;

    this.slots = [];
    for (let i = 0; i < this.slotCount; i++) this.slots.push(new Slot(this, i));
  }

  // 外壳要渲染的行
  // 返回该外壳要画的表格行数组
  shellRows(renderer) {
    const r = renderer || pickRenderer(this.shell.asset);
    return [`${r} ${this.shell.asset} ${this.shell.x} ${this.shell.y} ${this.shell.scale}`];
  }

  // 按序号取槽位
  // index - 从 0 开始
  // 返回 Slot，越界返回 null
  slotAt(index) {
    return this.slots[index] || null;
  }

  // 整层要渲染的表格行：外壳在前，槽位在后
  // 返回字符串数组，可直接拼进表格
  toTable() {
    const out = this.shellRows();

    for (let i = 0; i < this.slots.length; i++) {
      const rows = this.slots[i].toRows();
      for (let j = 0; j < rows.length; j++) out.push(rows[j]);
    }
    return out;
  }

  // 第 index 个槽位的左上角 x，让整排槽位在画布上水平居中
  // index - 从 0 开始
  _slotX(index) {
    const total = this.slotCount * this.slotSize + (this.slotCount - 1) * this.slotGap;
    const left = (this._width - total) / 2;
    return left + index * (this.slotSize + this.slotGap);
  }

  // 槽位的左上角 y：底边抬离外壳底边一段
  _slotY() {
    const bottomGap = this.shell.h * (this.cfg.slotBottomRatio || 0);
    return this.shell.y + this.shell.h - bottomGap - this.slotSize;
  }
}

module.exports = Shop;
