// 绘制小工具：圆角矩形 / 椭圆 / 圆角肢体 / 脚掌。

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function fillEllipse(ctx, cx, cy, rx, ry, style) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
  ctx.restore();
}

// 以关节为轴心画一段圆角肢体：肢体从轴心向下延伸 len
function drawLimb(ctx, jointX, jointY, len, thick, angle, color) {
  ctx.save();
  ctx.translate(jointX, jointY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  roundRectPath(ctx, -thick / 2, 0, thick, len, thick * 0.46);
  ctx.fill();
  ctx.restore();
}

// 脚掌（跟随腿一起旋转）
function drawFoot(ctx, jointX, jointY, len, thick, angle, color) {
  ctx.save();
  ctx.translate(jointX, jointY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  roundRectPath(ctx, -thick * 0.55, len - thick * 0.62, thick * 1.55, thick * 0.72, thick * 0.34);
  ctx.fill();
  ctx.restore();
}

module.exports = {
  roundRectPath: roundRectPath,
  fillEllipse: fillEllipse,
  drawLimb: drawLimb,
  drawFoot: drawFoot,
};
