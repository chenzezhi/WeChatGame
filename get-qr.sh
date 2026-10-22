#!/usr/bin/env bash
# ==============================================================================
# 微信小游戏 CI 预览二维码自动获取与打开脚本
# ==============================================================================
set -e

# 配置你的仓库信息与 GitHub Personal Access Token (PAT)
REPO="chenzezhi/WeChatGame"
TOKEN="${GITHUB_TOKEN:-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}"

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

echo "[2/4] 正在下载预览压缩包 (preview-qr-code.zip)..."
curl -s -L -H "Authorization: token $TOKEN" "$DOWNLOAD_URL" -o artifact.zip

echo "[3/4] 正在解压 qrcode.jpg..."
unzip -o artifact.zip qrcode.jpg > /dev/null
rm -f artifact.zip

if [ -f "qrcode.jpg" ]; then
  echo "[4/4] 成功！正在唤起手机图片查看器打开二维码..."
  if command -v termux-open &> /dev/null; then
    termux-open qrcode.jpg
  else
    echo "提示：已保存在当前目录下的 qrcode.jpg，请直接查看。"
  fi
else
  echo "[错误] 解压失败，未找到 qrcode.jpg"
  exit 1
fi