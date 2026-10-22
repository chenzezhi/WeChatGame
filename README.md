# 微信小游戏项目模板

最简单的微信小游戏结构，仅包含三个核心文件：

- `game.js`：游戏入口，小游戏运行时会自动执行该文件。
- `game.json`：小游戏全局配置（屏幕方向、状态栏等）。
- `project.config.json`：项目配置（编译类型必须为 `game`）。

## 使用方法

1. 打开「微信开发者工具」，选择「小游戏」项目类型。
2. 导入本 `WeChatGame` 目录。
3. AppID 可以先使用测试号，或填入自己的小游戏 AppID。
4. 点击编译即可在模拟器中看到运行效果。

## 说明

- `wx.createCanvas()` 创建画布，第一个画布默认铺满屏幕。
- `wx.onTouchStart` 监听触摸事件。
- `requestAnimationFrame` 用于驱动主循环。
