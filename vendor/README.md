# 第三方引擎放这里

## 为什么需要你手动放

引擎产物是几百 KB 的压缩代码，代码助手不能凭空生成。
必须由你在 Termux 里下载，或者从网上下载文件拷进来。

## 当前推荐：cax（约 10KB，原生支持小游戏）

### 第 1 步：在项目根目录安装

```
npm install cax
```

### 第 2 步：看它的目录结构

```
ls node_modules/cax
ls node_modules/cax/dist
```

把这两个命令的输出发给我，我告诉你哪个文件是要拷的。
（不同版本目录不一样，不猜。）

### 第 3 步：拷到 libs/

确定文件名后：

```
mkdir -p libs
cp node_modules/cax/dist/xxx.js libs/cax.js
```

### 第 4 步：在 game.js 里用它

```js
var cax = require('./libs/cax.js');
```

## 为什么不选 Cocos Creator

Cocos Creator 是桌面 GUI 程序，必须在 Windows / Mac 上构建。
Android + Termux 上无法用它导出小游戏产物。
等有 PC 了再考虑。

## 为什么不选 Pixi.js

Pixi 假设运行环境里有 window / document / HTMLCanvasElement，
小游戏里全都没有，必须额外写一个 DOM 垫片（几百行），
而且垫片缺一块就报一个看不懂的错。
它是好引擎，但不适合「现在就要跑起来」这个阶段。

## 目录约定

```
libs/          实际要打进包的引擎文件（.js）
  cax.js
vendor/        说明文档，不打包
  README.md
```

注意：`libs/` **不要**加进 project.config.json 的 ignore，
它必须被打进包里。
