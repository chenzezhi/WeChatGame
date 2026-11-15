'use strict';

/* ============================================================================
 * cocos 图集引擎调用 demo
 *
 * 链路：数据层 gameMap（require 即加载）→ 渲染层 sprite-map（接 cax 舞台）。
 * 之后按名字取图即可，不用管 json、坐标、旋转帧。
 * ==========================================================================*/

var SpriteMap = require('./sprite-map.js');
var gameMap = require('../../src/assets/gameMap.js');

function start(env) {
  var stage = env.stage;
  var sm = SpriteMap.of(gameMap);

  sm.ready(function () {
    var w = stage.canvas.width;   // 物理像素
    var h = stage.canvas.height;

    // 1. 主体背景 dragonQuestBg2（236x298）：缩放到约 92% 高度，水平居中
    var bg = sm.add(stage, 'dragonQuestBg2', 0, 0);
    var bgScale = (h * 1.5) / 298;
    bg.scale = bgScale;
    bg.x = (w - 236 * bgScale) / 2;
    bg.y = h * 0.04;

    // 2. 标题 dragonQuestTitleDi（139x41）：顶部居中
    var title = sm.add(stage, 'dragonQuestTitleDi', 0, 0);
    title.x = (w - 139) / 2;
    title.y = h * 0.1;

    // 3. boss 头像 boss_icon（56x60，rotated）：验证旋转帧被自动转正
    var icon = sm.add(stage, 'boss_icon', 0, 0);
    icon.scale = 2;
    icon.x = (w - 56 * 2) / 2;
    icon.y = h * 0.36;

    // 4. 血条：blood_bg（156x30，rotated）做底，blood（150x15）做填充
    var barBg = sm.add(stage, 'blood_bg', 0, 0);
    var barScale = 2;
    barBg.scale = barScale;
    barBg.x = (w - 156 * barScale) / 2;
    barBg.y = h * 0.62;

    var bar = sm.add(stage, 'blood', 0, 0);
    bar.scale = barScale;
    bar.x = barBg.x + 3 * barScale;
    bar.y = barBg.y + 7 * barScale;

    console.log('[cocos-demo] 已从 ' + gameMap.names.length + ' 张小图里挑出 5 张渲染');
  });
}

module.exports = { start: start };
