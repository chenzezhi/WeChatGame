// 微信小游戏入口：只负责装配模块与启动，不实现任何游戏逻辑。
//
// 结构约定：
//   public/<模块名>/index.js   ← 该模块的控制器，组合本模块内的其他文件，对外只暴露这一个入口
//   public/core/               ← 引擎核心（画布 / 输入 / 场景 / 主循环 / 存档）
//
// 新增模块时，只需要在这里 register 一次。

const app = require('./public/core/index.js');
const menu = require('./public/menu/index.js');

app.scenes.register('menu', menu);

app.start('menu');
