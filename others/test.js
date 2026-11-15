// ==============================================================================
// 微信小游戏 CI 自动化监控与全屏网格动作执行引擎（最终闭环版）
// ==============================================================================

// 1. 从外部导入模块，解构出动作调度器 ActionScheduler 与动作工厂 ActionFactory 类
const { ActionScheduler, ActionFactory } = includeLib("js/action.js");

// -------------------------------------------------------------
// 2. 动作基础模板对象：定义默认动作属性（含 delay 延迟与 duration 时长）
// -------------------------------------------------------------
let acm1 = {
  type: "点击", 
  delay: "0.5",       // 默认动作前置等待延迟时间（单位：秒）
  duration: "100",    // 按钮按下按住的时长（单位：毫秒）
  posData: {
    type: "location",
    x: "50%", 
    y: "50%", 
  }
};

// -------------------------------------------------------------
// 3. 参数映射模板路径（包含 delay 属性，以空格分隔）
// -------------------------------------------------------------
let actionMode1 = "type posData.x posData.y duration delay";

// ==============================================================================
// 4. 🚀 核心网格动作池初始化：用双重循环自动生成 1% ~ 99% 的全屏预设动作池
// 规则：直连拼法，绝不乱补零（例如 x=9, y=5 -> "95"；x=90, y=5 -> "905"）
// ==============================================================================
let actions1 = [];
let step = 1; 

for (let x = 1; x < 100; x += step) {
    for (let y = 1; y < 100; y += step) {
        let key = "" + x + y; 
        actions1.push(`${key} | 点击 ${x}% ${y}% 100 0.5`); // 默认每个网格点击时长100ms，延迟0.5秒
    }
}

// -------------------------------------------------------------
// 💡 后期定向覆盖特定动作（利用数组追加同名 Key 覆盖，支持 "n" 占位符）
// 例如：让 "9025" 的延时变成 3 秒，中间的 duration 用 "n" 保持模板默认值不变
// -------------------------------------------------------------
actions1.push("9090 | 点击 90% 90% n 3"); 
actions1.push("3020 | 点击 30% 20% n 1");


// ==============================================================================
// 5. 🎯 主监控逻辑：文件总数差分监听 ➔ 唤醒微信 ➔ 自动执行网格连招
// ==============================================================================
const fs = require('fs');
const targetDir = "/sdcard/DCIM/Screenshots";

console.log("=== 启动微信小游戏全自动 CI 监控与执行引擎 ===");

let initialFiles = [];
try {
    if (fs.existsSync(targetDir)) {
        initialFiles = fs.readdirSync(targetDir);
    }
} catch (e) {
    console.error("初始化读取失败: " + e);
}

let lastCount = initialFiles.length;
console.log("当前基准文件总数: " + lastCount);
zdjl.toast("自动化监控已启动，当前相册文件数: " + lastCount, 3000);

// 常驻轮询监控循环
while (true) {
    try {
        if (fs.existsSync(targetDir)) {
            const currentFiles = fs.readdirSync(targetDir);
            const currentCount = currentFiles.length;

            // 检测到文件总数增加（CI 成功产出新二维码）
            if (currentCount > lastCount) {
                console.log("检测到文件总数增加！旧数量: " + lastCount + " -> 新数量: " + currentCount);
                lastCount = currentCount;

                zdjl.toast("检测到新构建产物，正在唤起微信...", 2000);

                // ① 使用官方正确的 API 唤醒微信
                zdjl.runAction({
                  "type": "打开应用",
                  "delayUnit": 1,
                  "appPackageName": "com.tencent.mm",
                  "closeBeforeOpen": false,
                  "onlyClose": false
                });
                
                // ② 等待微信冷启动并加载界面（预留 3 秒缓冲）
                zdjl.sleep(3000);

                // ③ 配置你需要在微信里按顺序执行的网格动作指令字符串
                // 例如：先点 905（相册/扫一扫），再点 9025（选择最新二维码），再点 9090...
                let targetActionString = "905 - 9025 - 9090 - 3020";
                
                console.log("正在执行自动化动作流: " + targetActionString);

                // ④ 调用解析并驱动执行
                let pas = ProcessActionString(actions1, targetActionString);
                ActionRun(acm1, actionMode1, pas);

                zdjl.toast("自动化动作流执行完毕！", 2000);
            } 
            else if (currentCount < lastCount) {
                console.log("检测到文件被删减，更新基准数量: " + lastCount + " -> " + currentCount);
                lastCount = currentCount;
            }
        }
    } catch (err) {
        console.error("轮询监控异常: " + err);
    }

    // 每秒检测一次文件总数
    zdjl.sleep(1000);
}


// ==============================================================================
// 6. 📦 经典底层支撑函数区
// ==============================================================================

/**
 * 【处理动作字符串函数】
 */
function ProcessActionString(actions, actionString) {
  let af = new ActionFactory(actions);
  let nm = af.arrayToMap();
  let as = af.getMapValuesByString(actionString);
  return as;
}

/**
 * 【运行动作调度函数】
 */
function ActionRun(acm, actionMode, actions) {
  let am = new ActionScheduler(actionMode, acm);
  am.addSimplifiedActions(actions);
  let ob = am.generateFullActionList();
  am.run();
}

/**
 * 动态加载并执行外部 JS 文件模块的沙盒函数
 */
function includeLib(path) {
  const fs = require('fs');
  try {
    const fullPath = __dirname + '/' + path;
    const code = fs.readFileSync(fullPath, 'utf8');
    const module = { exports: {} };
    const factory = new Function('module', 'exports', 'require', '__dirname', 'zdjl', 'alert', code);
    factory(module, module.exports, require, __dirname, typeof zdjl !== 'undefined' ? zdjl : null, alert);
    return module.exports;
  } catch (err) {
    alert("模块加载失败：" + err.message);
  }
}
