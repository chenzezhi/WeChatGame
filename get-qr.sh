#!/usr/bin/env bash
# get-qr.sh - 取微信小游戏 CI 预览二维码，并存入手机相册
#
# 用法：
#   bash get-qr.sh                # 取当前仓库 HEAD 对应的成功构建
#   bash get-qr.sh <commit-sha>   # 取指定 commit 对应的成功构建
#
# 环境变量：
#   GITHUB_TOKEN   GitHub 个人访问令牌，不设置则用脚本内置的默认值
#   WX_QR_WAIT     等待构建完成的最长时间，单位秒，默认 420
#   WX_QR_REPO     仓库全名，格式「用户名/仓库名」，默认 chenzezhi/WeChatGame
#   WX_QR_DIR      二维码保存目录，默认 /storage/emulated/0/DCIM/Screenshots
#
# 依赖：curl、node、unzip
set -u

# 仓库全名，用于拼接 API 地址
REPO="${WX_QR_REPO:-chenzezhi/WeChatGame}"
# GitHub 个人访问令牌，调用需要鉴权的 API 时使用
TOKEN="${GITHUB_TOKEN:-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}"
# 等待构建完成的最长时间，单位秒
WAIT_SECONDS="${WX_QR_WAIT:-420}"
# 二维码 jpg 的保存目录，默认是相册截图目录
TARGET_DIR="${WX_QR_DIR:-/storage/emulated/0/DCIM/Screenshots}"
# workflow 文件名，位于 .github/workflows/ 下
WORKFLOW="deploy.yml"

# 目标 commit：优先取命令行第 1 个参数；没有则取当前仓库的 HEAD
EXPECT_SHA="${1:-}"
if [ -z "$EXPECT_SHA" ] && command -v git >/dev/null 2>&1; then
  EXPECT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
fi

# 令牌未配置就退出，避免后面全是 401
if [ -z "$TOKEN" ] || [ "$TOKEN" = "你的GitHub_Token" ]; then
  echo "[错误] 请先配置 GITHUB_TOKEN" >&2
  exit 1
fi
# 解析 JSON 依赖 node，缺失就退出
if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 需要 node 来解析 GitHub API 返回的 JSON" >&2
  exit 1
fi

# ---------------------------------------------------------------- JSON 解析

# 从构建记录列表里挑出本次 commit 的成功构建
# 输入 - 通过 stdin 读入 GitHub API 返回的 workflow runs JSON
# $1 - 目标 commit sha，为空时不看 commit，直接取最新一次成功构建
# 输出 - 该次构建的 run id，找不到则不输出
json_pick_run() {
  node -e '
var buf = [];                                  // 收集 stdin 的数据块
process.stdin.on("data", function (d) { buf.push(d); });
process.stdin.on("end", function () {
  // 目标 commit，去空格后使用；空字符串表示不按 commit 过滤
  var want = String(process.argv[1] || "").trim();
  var data;
  // 解析失败直接返回，输出为空即表示没找到
  try { data = JSON.parse(buf.join("")); } catch (e) { return; }
  var runs = (data && data.workflow_runs) || [];   // 构建记录列表
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i] || {};
    if (want && String(r.head_sha || "") !== want) continue;  // commit 不是目标的跳过
    if (r.status !== "completed") continue;                  // 还没跑完的跳过
    if (r.conclusion !== "success") continue;                // 构建失败的跳过
    console.log(r.id);                                       // 输出 run id
    return;
  }
});
' "$1"
}

# 从产物列表里挑出一个可下载的产物，优先二维码相关的
# 输入 - 通过 stdin 读入 GitHub API 返回的 artifacts JSON
# 输出 - 该产物的 zip 下载链接，找不到则不输出
json_pick_artifact() {
  node -e '
var buf = [];                                  // 收集 stdin 的数据块
process.stdin.on("data", function (d) { buf.push(d); });
process.stdin.on("end", function () {
  var data;
  // 解析失败直接返回，输出为空即表示没找到
  try { data = JSON.parse(buf.join("")); } catch (e) { return; }
  var list = (data && data.artifacts) || [];       // 产物列表
  var i, pick = null;                              // pick 为最终选中的产物
  // 第一轮：找名字含 preview 或 qr 且未过期的产物
  for (i = 0; i < list.length; i++) {
    if (list[i] && !list[i].expired && /preview|qr/i.test(String(list[i].name))) {
      pick = list[i];
      break;
    }
  }
  // 第二轮：没有符合名字的，就取第一个未过期的产物
  if (!pick) {
    for (i = 0; i < list.length; i++) {
      if (list[i] && !list[i].expired) { pick = list[i]; break; }
    }
  }
  if (pick) console.log(pick.archive_download_url || "");  // 输出下载链接
});
'
}

# GitHub API 的基础地址，后接具体接口路径
API="https://api.github.com/repos/$REPO"
# 请求头里的鉴权字段
AUTH="Authorization: token $TOKEN"

# ---------------------------------------------------------------- 1/4 等构建
echo "[1/4] 等待 GitHub Actions 构建完成..."
# 打印本次要匹配的 commit，方便排查拿不到构建的原因
if [ -n "$EXPECT_SHA" ]; then
  echo "      目标 commit: $EXPECT_SHA"
else
  echo "      目标 commit: （未指定，取最新一次成功构建）"
fi

# 等待截止的时间戳，单位秒
DEADLINE=$(( $(date +%s) + WAIT_SECONDS ))
# 命中的 run id，为空表示还没找到
RUN_ID=""
while : ; do
  # 拉取 main 分支最近 20 条构建记录
  RUNS_JSON="$(curl -s -H "$AUTH" \
    "$API/actions/workflows/$WORKFLOW/runs?branch=main&per_page=20" 2>/dev/null || true)"
  # 从中挑出本次 commit 的成功构建 id
  RUN_ID="$(printf '%s' "$RUNS_JSON" | json_pick_run "$EXPECT_SHA")"
  # 拿到了就结束等待
  if [ -n "$RUN_ID" ]; then
    echo "      ✅ 构建成功，run id: $RUN_ID"
    break
  fi
  # 当前时间戳，单位秒
  NOW=$(date +%s)
  # 调试输出：API 原始返回和挑出的 run id
  echo "RUN_JSON：$RUNS_JSON"
  echo "RUN_ID：$RUN_ID"
  # 超过截止时间就跳出循环，交给后面的错误提示处理
  if [ "$NOW" -ge "$DEADLINE" ]; then
    break
  fi
  echo "      ... 还没跑完，10 秒后重试（剩余 $((DEADLINE - NOW))s）"
  sleep 10
done

# 循环结束时仍没有 run id，说明超时或这次构建没成功
if [ -z "$RUN_ID" ]; then
  echo "[错误] 等待超时，或这次构建失败/尚未触发。" >&2
  echo "       请打开 https://github.com/$REPO/actions 查看：" >&2
  echo "       · run 是不是这次 commit 之后触发的" >&2
  echo "       · 状态是不是绿色 ✅（失败多半是私钥 secret 失效）" >&2
  exit 1
fi

# ---------------------------------------------------------------- 2/4 取产物
echo "[2/4] 正在获取该次构建的产物下载链接..."
# 拉取该次构建的产物列表
ART_JSON="$(curl -s -H "$AUTH" "$API/actions/runs/$RUN_ID/artifacts" 2>/dev/null || true)"
# 从中挑出一个可下载的产物链接
DOWNLOAD_URL="$(printf '%s' "$ART_JSON" | json_pick_artifact)"

# 没有可用产物就退出
if [ -z "$DOWNLOAD_URL" ]; then
  echo "[错误] 该次构建没有可用产物（artifact 可能已过期）。" >&2
  exit 1
fi

# ---------------------------------------------------------------- 3/4 下载
echo "[3/4] 正在下载预览二维码..."
# 临时目录，用于存放下载的 zip
TMP_DIR="${TMPDIR:-$HOME}"
mkdir -p "$TMP_DIR" 2>/dev/null || true
# 临时 zip 路径，文件名带 run id 避免多次运行冲突
TMP_ZIP="$TMP_DIR/qrcode-$RUN_ID.zip"
# 下载产物 zip
curl -s -L -H "$AUTH" "$DOWNLOAD_URL" -o "$TMP_ZIP" || {
  echo "[错误] 下载失败。" >&2
  exit 1
}

# 当前时间戳，格式 年月日_时分秒
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
# 最终文件名，模仿系统截图的命名格式，便于在相册里识别
FILENAME="Screenshot_${TIMESTAMP}_Chrome.jpg"
# 最终文件的完整路径
TARGET_FILE="${TARGET_DIR}/${FILENAME}"
# 确保保存目录存在
mkdir -p "$TARGET_DIR"

# 从 zip 里取出 qrcode.jpg，直接写入目标文件
if ! unzip -p "$TMP_ZIP" qrcode.jpg > "$TARGET_FILE" 2>/dev/null; then
  echo "[错误] 解压失败，产物里没有 qrcode.jpg" >&2
  rm -f "$TMP_ZIP"
  exit 1
fi
# 删除临时 zip
rm -f "$TMP_ZIP"

# 刷新文件时间戳，让相册把它排在最前
touch "$TARGET_FILE"

# 文件大小，单位字节
SIZE=$(wc -c < "$TARGET_FILE" 2>/dev/null | tr -d ' \n')
SIZE=${SIZE:-0}
# 小于 1000 字节说明不是一张有效图片
if [ "$SIZE" -lt 1000 ]; then
  echo "[错误] 得到的二维码文件异常（${SIZE} 字节）。" >&2
  exit 1
fi

# ---------------------------------------------------------------- 4/4 刷新相册
# 通知系统媒体库扫描这个文件，让相册立刻能看到
if command -v am >/dev/null 2>&1; then
  am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
    -d "file://$TARGET_FILE" >/dev/null 2>&1 || true
fi

# 打印最终结果
echo "[4/4] 成功！已写入相册: ${FILENAME}（${SIZE} 字节，run $RUN_ID）"
echo ""
# 提示扫码前先删除旧小游戏，否则微信会复用旧包
echo "⚠️ 扫码前务必先删掉旧的小游戏，否则微信会复用旧包："
echo "   微信 → 发现 → 小程序 → 长按『WeChatGame』→ 删除 → 再扫码。"
