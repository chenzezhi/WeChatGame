# 接入 Cocos Creator 引擎

本项目已经内置了 Cocos Creator 的接入层（`engine/cocos.js` + `engine/adapter.js`），
你只需要把 Cocos Creator 导出的「微信小游戏」构建产物放进来即可，**不用改任何代码**。

## 一、导出构建产物

### Cocos Creator 3.x

1. 菜单 `项目` → `构建发布`。
2. 平台选择 **微信小游戏（wechatgame）**，填写 AppID：`wx03f8c7b1fb104183`（或你自己的）。
3. 选择「构建」（不需要在 Cocos 里点「运行/预览」）。
4. 构建完成后，产物位于 `build/wechatgame/`。

### Cocos Creator 2.x

同上，平台选《微信小游戏》，产物同样在 `build/wechatgame/`。

## 二、拷贝到本项目

在项目根目录下新建 `cocos/` 文件夹，把构建产物**除以下文件外**全部拷进去：

```
WeChatGame/
├── game.js                ← 本项目入口（不要覆盖！）
├── game.json              ← 本项目配置（不要覆盖，见第三节）
├── project.config.json    ← 本项目配置（不要覆盖）
├── engine/                ← 引擎调度层
├── cocos/                 ← 放 Cocos 构建产物
│   ├── game.js            ← 构建产物入口（存在即自动启用 Cocos）
│   ├── application.js
│   ├── settings.json
│   ├── assets/
│   ├── src/
│   ├── cocos-js/          ← 3.x 引擎
│   └── ...
└── docs/
```

> 不要覆盖根目录：`game.js`、`game.json`、`project.config.json`、`engine/`。
> 只需要 `cocos/game.js` 存在，启动时就会自动走 Cocos 引擎。

## 三、game.json 需要合并的字段

如果 Cocos 构建产物自带的 `game.json` 里有额外字段，请手动合并到本项目根目录的
`game.json` 中，常见的有：

```json
{
  "deviceOrientation": "portrait",
  "openDataContext": "openDataContext",
  "subpackages": []
}
```

## 四、切换 / 强制引擎

打开根目录 `game.js`：

```js
var ENGINE = 'auto';   // 'auto' 自动检测 | 'cocos' 只用 Cocos | 'builtin' 只用内置引擎
```

- `auto`：`cocos/game.js` 存在就用 Cocos，否则用内置引擎。
- 启动日志会打印当前引擎，例如：
  `[engine] 检测到 Cocos Creator 构建产物：cocos/game.js`

## 五、常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| 启动白屏 / 黑屏 | 不要在 `engine/cocos.js` 里提前调用 `wx.createCanvas()`，第一次调用必须由引擎自己完成 |
| 提示 `window is not defined` | 确认 `engine/adapter.js` 已被 `engine/cocos.js` 调用（默认已调用） |
| 一直走内置引擎 | `cocos/game.js` 不存在，或文件名不同（可改 `engine/cocos.js` 的 `ENTRIES`） |
| 真机报 `require 找不到模块` | 说明构建产物没拷全，请整份拷贝 `build/wechatgame/` 内容 |
| 包体超过 4MB | 使用 Cocos 的「资源分包」或微信小游戏分包，并在 `game.json` 中配置 `subpackages` |
