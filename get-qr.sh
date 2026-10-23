#!/usr/bin/env bash
# ==============================================================================
# 微信小游戏 CI 预览二维码获取
#
# 关键改动：不再「抓全部产物里的第一个」，而是先定位**本次提交对应的那次成功
#          构建**，再下载它的产物。这样就不会再拿到上一次的旧二维码。
#
# 用法：
#   bash get-qr.sh                # 用当前 git commit；不在仓库内则取最新成功构建
#   bash get-qr.sh <commit-sha>   # 只取该 commit 对应的成功构建
#
# 环境变量：
#   GITHUB_TOKEN   有默认值，可用自己的覆盖
#   WX_QR_WAIT     最多等待秒数，默认 420
#   WX_QR_REPO     默认 chenzezhi/WeChatGame
#   WX_QR_DIR      二维码保存目录，默认 /storage/emulated/0/DCIM/Screenshots
# ==============================================================================
set -u

REPO="${WX_QR_REPO:-chenzezhi/WeChatGame}"
TOKEN="${GITHUB_TOKEN:-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}"
WAIT_SECONDS="${WX_QR_WAIT:-420}"
TARGET_DIR="${WX_QR_DIR:-/storage/emulated/0/DCIM/Screenshots}"
WORKFLOW="deploy.yml"

EXPECT_SHA="${1:-}"
if [ -z "$EXPECT_SHA" ] && command -v git >/dev/null 2>&1; then
  EXPECT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "你的GitHub_Token" ]; then
  echo "[错误] 请先配置 GITHUB_TOKEN" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 需要 node 来解析 GitHub API 返回的 JSON" >&2
  exit 1
fi

# ---------------------------------------------------------------- JSON 解析
# stdin: workflow runs JSON；$1: 期望的 commit sha（可为空）→ 输出 run id
json_pick_run() {
  node -e '
var buf = [];
process.stdin.on("data", function (d) { buf.push(d); });
process.stdin.on("end", function () {
  var want = String(process.argv[1] || "").trim();
  var data;
  try { data = JSON.parse(buf.join("")); } catch (e) { return; }
  var runs = (data && data.workflow_runs) || [];
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i] || {};
    if (want && String(r.head_sha || "") !== want) continue;
    if (r.status !== "completed") continue;
    if (r.conclusion !== "success") continue;
    console.log(r.id);
    return;
  }
});
' "$1"
}

# stdin: artifacts JSON → 输出下载链接（优先名字含 preview / qr 的产物）
json_pick_artifact() {
  node -e '
var buf = [];
process.stdin.on("data", function (d) { buf.push(d); });
process.stdin.on("end", function () {
  var data;
  try { data = JSON.parse(buf.join("")); } catch (e) { return; }
  var list = (data && data.artifacts) || [];
  var i, pick = null;
  for (i = 0; i < list.length; i++) {
    if (list[i] && !list[i].expired && /preview|qr/i.test(String(list[i].name))) {
      pick = list[i];
      break;
    }
  }
  if (!pick) {
    for (i = 0; i < list.length; i++) {
      if (list[i] && !list[i].expired) { pick = list[i]; break; }
    }
  }
  if (pick) console.log(pick.archive_download_url || "");
});
'
}

API="https://api.github.com/repos/$REPO"
AUTH="Authorization: token $TOKEN"

# ---------------------------------------------------------------- 1/4 等构建
echo "[1/4] 等待 GitHub Actions 构建完成..."
if [ -n "$EXPECT_SHA" ]; then
  echo "      目标 commit: $EXPECT_SHA"
else
  echo "      目标 commit: （未指定，取最新一次成功构建）"
fi

DEADLINE=$(( $(date +%s) + WAIT_SECONDS ))
RUN_ID=""
while : ; do
  RUNS_JSON="$(curl -s -H "$AUTH" \
    "$API/actions/workflows/$WORKFLOW/runs?branch=main&per_page=20" 2>/dev/null || true)"
  RUN_ID="$(printf '%s' "$RUNS_JSON" | json_pick_run "$EXPECT_SHA")"
  if [ -n "$RUN_ID" ]; then
    echo "      ✅ 构建成功，run id: $RUN_ID"
    break
  fi
  NOW=$(date +%s)
  if [ "$NOW" -ge "$DEADLINE" ]; then
    break
  fi
  echo "      ... 还没跑完，10 秒后重试（剩余 $((DEADLINE - NOW))s）"
  sleep 10
done

if [ -z "$RUN_ID" ]; then
  echo "[错误] 等待超时，或这次构建失败/尚未触发。" >&2
  echo "       请打开 https://github.com/$REPO/actions 查看：" >&2
  echo "       · run 是不是这次 commit 之后触发的" >&2
  echo "       · 状态是不是绿色 ✅（失败多半是私钥 secret 失效）" >&2
  exit 1
fi

# ---------------------------------------------------------------- 2/4 取产物
echo "[2/4] 正在获取该次构建的产物下载链接..."
ART_JSON="$(curl -s -H "$AUTH" "$API/actions/runs/$RUN_ID/artifacts" 2>/dev/null || true)"
DOWNLOAD_URL="$(printf '%s' "$ART_JSON" | json_pick_artifact)"

if [ -z "$DOWNLOAD_URL" ]; then
  echo "[错误] 该次构建没有可用产物（artifact 可能已过期）。" >&2
  exit 1
fi

# ---------------------------------------------------------------- 3/4 下载
echo "[3/4] 正在下载预览二维码..."
TMP_DIR="${TMPDIR:-$HOME}"
mkdir -p "$TMP_DIR" 2>/dev/null || true
TMP_ZIP="$TMP_DIR/qrcode-$RUN_ID.zip"
curl -s -L -H "$AUTH" "$DOWNLOAD_URL" -o "$TMP_ZIP" || {
  echo "[错误] 下载失败。" >&2
  exit 1
}

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="Screenshot_${TIMESTAMP}_Chrome.jpg"
TARGET_FILE="${TARGET_DIR}/${FILENAME}"
mkdir -p "$TARGET_DIR"

if ! unzip -p "$TMP_ZIP" qrcode.jpg > "$TARGET_FILE" 2>/dev/null; then
  echo "[错误] 解压失败，产物里没有 qrcode.jpg" >&2
  rm -f "$TMP_ZIP"
  exit 1
fi
rm -f "$TMP_ZIP"

touch "$TARGET_FILE"

SIZE=$(wc -c < "$TARGET_FILE" 2>/dev/null | tr -d ' \n')
SIZE=${SIZE:-0}
if [ "$SIZE" -lt 1000 ]; then
  echo "[错误] 得到的二维码文件异常（${SIZE} 字节）。" >&2
  exit 1
fi

# ---------------------------------------------------------------- 4/4 刷新相册
if command -v am >/dev/null 2>&1; then
  am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
    -d "file://$TARGET_FILE" >/dev/null 2>&1 || true
fi

echo "[4/4] 成功！已写入相册: ${FILENAME}（${SIZE} 字节，run $RUN_ID）"
echo ""
echo "⚠️ 扫码前务必先删掉旧的小游戏，否则微信会复用旧包："
echo "   微信 → 发现 → 小程序 → 长按『WeChatGame』→ 删除 → 再扫码。"
