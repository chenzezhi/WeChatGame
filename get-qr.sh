#!/usr/init/env bash
# ==============================================================================
# 微信小游戏 CI 预览二维码自动获取与相册完美置顶保存脚本
# ==============================================================================
set -e

REPO="chenzezhi/WeChatGame"
TOKEN="${GITHUB_TOKEN:-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}"

TARGET_DIR="/storage/emulated/0/DCIM/Screenshots"

# 完美复刻系统与 Chrome 协同的命名格式，例如：Screenshot_20261023_073800_Chrome.jpg
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="Screenshot_${TIMESTAMP}_Chrome.jpg"
TARGET_FILE="${TARGET_DIR}/${FILENAME}"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "你的GitHub_Token" ]; then
  echo "[错误] 请先配置您的 GitHub Token"
  exit 1
fi

echo "[1/4] 正在获取最新的构建产物(Artifacts)下载链接..."
DOWNLOAD_URL=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/artifacts" \
  | grep -o '"archive_download_url": *"[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "[错误] 未能获取到下载链接，请检查网络或 Token 权限是否正确！"
  exit 1
fi

echo "[2/4] 正在下载预览压缩包 (artifact.zip)..."
curl -s -L -H "Authorization: token $TOKEN" "$DOWNLOAD_URL" -o artifact.zip

echo "[3/4] 正在伪装为 Chrome 截屏格式保存到相册..."
mkdir -p "$TARGET_DIR"

# 解压并重命名写入目标路径
unzip -p artifact.zip qrcode.jpg > "$TARGET_FILE"
rm -f artifact.zip

# 刷新文件修改时间戳
touch "$TARGET_FILE"

# 🚀 核心大招：主动向安卓系统广播媒体扫描通知，让微信和系统相册秒级同步！
if command -v am &> /dev/null; then
  am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://$TARGET_FILE" > /dev/null 2>&1
fi

if [ -f "$TARGET_FILE" ]; then
  echo "[4/4] 成功！已写入相册并通知系统媒体库刷新: ${FILENAME}"
  # if command -v termux-open &> /dev/null; then
  #   termux-open "$TARGET_FILE"
  # else
  #   echo "提示：直接打开微信扫一扫 -> 从相册选择，秒级置顶！"
  # fi
else
  echo "[错误] 解压失败，未能生成 $TARGET_FILE"
  exit 1
fi