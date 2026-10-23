// 微信小游戏入口：只负责装配模块与启动，不实现任何游戏逻辑。
//
// 结构约定：
//   public/<模块名>/index.js   ← 该模块的控制器，组合本模块内的其他文件，对外只暴露这一个入口
//   public/core/               ← 引擎核心（画布 / 输入 / 场景 / 主循环 / 存档 / 玩家资产）

const app = require('./public/core/index.js');
const menu = require('./public/menu/index.js');
const shop = require('./public/shop/index.js');
const game = require('./public/game/index.js');

app.scenes.register('menu', menu);
app.scenes.register('shop', shop);
app.scenes.register('game', game);

app.start('menu');
