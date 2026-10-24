// 游戏参数总入口（只做聚合，不写数值）。
// 数值按类别拆在 config/ 目录下：
//   config/screen.js        屏幕尺寸 / 人物尺寸 / 相机
//   config/physics.js       物理手感 / 跳跃 / 初始血量 / 眨眼
//   config/controls.js      摇杆 / 菜单按钮
//   config/player/*         玩家：子弹 / 射击 / 弹药 / 升级
//   config/clone.js         分身
//   config/enemy/*          敌人：小怪生成 / 小怪 AI / 接触伤害 / Boss
//   config/pickup/*         道具：生成 / 权重 / 效果
//   config/shop/*           商店：升级加成 / 价格规则
// 注意：其它文件统一 require('./config.js')，导出的名字不要改。

module.exports = require('./config/index.js');
