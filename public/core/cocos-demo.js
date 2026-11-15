'use strict';

/* ==================== 功能 ====================
 * cocos 图集引擎调用 demo
 * 链路：asset-manager 传名称加载 → Mapper 生成配置 → sprite-map 批量渲染。
 * 演示「默认模板 + 简化数据」去重复的写法。
 * ==============================================*/

/* ==================== 用法 ====================
 * 不再逐张手动 add + 设 x/y/scale，
 * 而是：一份默认模板 + 一份只写差异的数据列表 → 一个循环渲染。
 * scale 省略的图自动用模板默认值 1。
 * ==============================================*/

const Mapper = require('./mapper.js');
const SpriteMap = require('./sprite-map.js');
const assets = require('./asset-manager.js');

function start(env) {
  const stage = env.stage;
  // 传名称即可：自动加载 src/assets/gameMap.png + gameMap.json
  const sm = SpriteMap.of(assets.atlas('gameMap'));

  sm.ready(() => {
    const w = stage.canvas.width;   // 物理像素
    const h = stage.canvas.height;

    // 布局基准：先算出几个关键位置（居中 / 对齐）
    const bgScale = (h * 1.5) / 298;
    const barScale = 2;
    const barBgX = (w - 156 * barScale) / 2;
    const barBgY = h * 0.62;

    // 默认模板：没写到的字段用这里的默认值
    const template = { name: '', x: 0, y: 0, scale: 1 };

    // 简化数据：只写「最特殊」的差异（scale 省略的自动用 1）
    const items = [
      { name: 'dragonQuestBg2',    x: (w - 236 * bgScale) / 2, y: h * -0.1, scale: bgScale },
      { name: 'dragonQuestTitleDi', x: (w - 139) / 2,          y: h * 0.1 },
      { name: 'boss_icon',         x: (w - 56 * 2) / 2,        y: h * 0.36, scale: 2 },
      { name: 'blood_bg',          x: barBgX,                  y: barBgY,   scale: barScale },
      { name: 'blood',             x: barBgX + 3 * barScale,   y: barBgY + 7 * barScale, scale: barScale },
    ];

    // 模板 + 简化数据 → 完整配置
    const full = Mapper.fill(template, items);

    // 批量渲染：一个循环，替代原来的 5 段手动 add
    for (const cfg of full) {
      const bmp = sm.add(stage, cfg.name, cfg.x, cfg.y);
      bmp.scale = cfg.scale;
    }

    console.log('[cocos-demo] 已渲染 ' + full.length + ' 张图');
  });
}

module.exports = { start };
