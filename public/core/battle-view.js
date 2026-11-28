'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面（原生画布绘制）
 *
 * 每帧：Ticker 推进 Battle 逻辑 → Overlay 用 Canvas 2D 直接画。
 * 画的东西：篝火、格子上的武器、怪物、子弹、HUD、两个按钮、商店遮罩。
 *
 * 武器形状按种类画（剑 / 斧 / 矛 / 杖），颜色按等级取自武器表，
 * 所以同一把武器 1~4 级一眼能看出差别。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // 画布物理像素坐标
 * ==============================================*/

/* ==================== 注意 ====================
 * 逻辑和绘制分开：battle.update(dt) 挂在 Ticker，绘制挂在 Overlay。
 *
 * 人物是 cax 的精灵，永远在覆盖层下面；所以人物所在格子的武器不画，
 * 视觉上就等于「人物压在武器上面」。
 * ==============================================*/

const Overlay = require('./overlay.js');
const Ticker = require('./ticker.js');
const World = require('./world.js');
const Speed = require('./speed.js');
const Sound = require('./sound.js');
const Bgm = require('./bgm.js');
const Fire = require('./fire.js');
const FIRE = require('../config/fire.js');
const texture = require('./texture.js');

// 界面色
// 纯绘图函数都在 shapes.js 里（拆出去是为了控制单文件体积）
const {
  COLOR,
  roundRectPath,
  drawCoin,
  drawSwordShape,
  drawAxeShape,
  drawSpearShape,
  drawStaffShape,
  drawSpinShape,
  drawHeartShape,
  drawBoltShape,
  drawWeapon,
  drawWeaponAimed,
  drawMonster,
  drawCampfire,
  drawBadge,
  badgeTextOf,
} = require('./shapes.js');

// 创建战斗视图
// options - { stage, sm, board, shop, battle, config }
// 返回 { handleTap(x, y) }
function create(options) {
  const o = options || {};
  const board = o.board;
  const shop = o.shop;
  const battle = o.battle;
  const cfg = o.config || {};
  const tpl = cfg.template || {};

  if (!board || !battle) {
    console.warn('[battle-view] 缺少 board / battle，战斗画面没有创建');
    return null;
  }

  // 尺寸，单位 px
  const cardSize = board.cellW * 0.6;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.55;
  const bulletSize = board.cellW * (tpl.bulletScale == null ? 0.42 : tpl.bulletScale);
  const monsterSize = board.cellW * (tpl.monsterSizeRatio == null ? 0.5 : tpl.monsterSizeRatio);
  const campfireSize = board.cellW * (tpl.campfireSizeRatio == null ? 1 : tpl.campfireSizeRatio);
  const fontPx = Math.max(12, Math.round(board.cellW * 0.16));

  // 篝火精灵图：加载一次，之后每帧直接画
  Fire.load(FIRE);

  /* ---------- 左上角第二行：菜单按钮 ---------- */
  const coinSize = Math.round(fontPx * 1.7);
  const coinBoxH = Math.round(coinSize * 1.7);

  const menuBtn = {
    x: 12,
    y: 12 + coinBoxH + 8,
    w: Math.round(coinBoxH * 1.9),
    h: coinBoxH,
  };

  // 设置弹窗：屏幕居中
  const modal = {
    w: battle.width * 0.72,
    h: battle.height * 0.42,
    x: 0,
    y: 0,
  };
  modal.x = (battle.width - modal.w) / 2;
  modal.y = (battle.height - modal.h) / 2;

  const mPad = modal.w * 0.1;
  const rowW = modal.w - mPad * 2;

  // 两条滑条 + 关闭按钮
  const sfxRow = { x: modal.x + mPad, y: modal.y + modal.h * 0.26, w: rowW, h: modal.h * 0.1 };
  const bgmRow = { x: modal.x + mPad, y: modal.y + modal.h * 0.48, w: rowW, h: modal.h * 0.1 };
  const closeBtn = { x: modal.x + mPad, y: modal.y + modal.h * 0.74, w: rowW, h: modal.h * 0.16, label: '返回游戏' };

  // 菜单是否打开；正在拖哪条滑条
  let menuOpen = false;
  let sliderActive = null;

  /* ---------- 右上角 UI：波次徽章 + 速度按钮 ---------- */
  const uiSize = Math.round(fontPx * 1.5);
  const uiPadX = uiSize * 0.5;
  const uiPadY = uiSize * 0.35;
  const uiBoxH = uiSize + uiPadY * 2;

  // 速度按钮：贴在波次徽章下面
  const speedBtn = {
    x: battle.width - 12 - uiSize * 2.1,
    y: 12 + uiBoxH + 8,
    w: uiSize * 2.1,
    h: uiBoxH,
  };

  /* ---------- 抽奖按钮：商店外壳左上角 ---------- */
  const gachaBtn = (function () {
    const shell = shop && shop.shell ? shop.shell : null;
    const pad = board.cellW * 0.1;
    const size = board.cellW * 0.36;

    if (!shell) {
      return { x: pad, y: battle.height * 0.66, w: size * 1.5, h: size, label: '抽奖' };
    }

    return {
      x: Math.max(shell.x, 0) + pad,
      y: Math.max(shell.y, 0) + pad,
      w: size * 1.5,
      h: size,
      label: '抽奖',
    };
  })();

  /* ---------- 两个按钮：刷新（带价格）+ 开始战斗，大小一样 ---------- */
  const buttonH = board.cellH * 0.4;
  const buttonW = Math.min(board.cellW * 1.1, battle.width * 0.31);
  const buttonGap = board.cellW * 0.14;

  const slot0 = shop && shop.slots && shop.slots[0] ? shop.slots[0] : null;
  const slotY = slot0 ? slot0.y : battle.height * 0.82;
  const slotH = slot0 ? slot0.h : 0;

  let by = slotY + slotH + board.cellH * 0.12;
  by = Math.min(by, battle.height - buttonH - 8);

  const totalW = buttonW * 2 + buttonGap;
  const leftX = (battle.width - totalW) / 2;

  const refreshButton = {
    x: leftX,
    y: by,
    w: buttonW,
    h: buttonH,
    label: '刷新',
    cost: tpl.refreshCost || 0,
    onTap: function () {
      battle.refreshShop();
    },
  };

  const fightButton = {
    x: leftX + buttonW + buttonGap,
    y: by,
    w: buttonW,
    h: buttonH,
    label: '开始战斗',
    cost: null,
    onTap: function () {
      if (battle.state !== 'build') return;
      battle.startWave();
    },
  };

  // 重新开始按钮：结束时出现在屏幕中间
  const restartButton = {
    x: (battle.width - buttonW) / 2,
    y: (battle.height - buttonH) / 2,
    w: buttonW,
    h: buttonH,
    label: '重新开始',
    cost: null,
    onTap: function () {
      battle.restart();
      lastLine = '重新开始';
    },
  };

  // 上一次操作的结果，HUD 最后一段显示
  let lastLine = '';

  // 屏幕中间弹一下的提示
  let toastText = '';
  let toastUntil = 0;

  // 弹一句话，默认 2 秒后消失
  function showToast(text, ms) {
    toastText = text;
    toastUntil = battle._time + (ms || 2000);
  }

  // 拖拽中：手指位置（屏幕坐标）和要拖的武器定义
  let dragPoint = null;
  let dragDef = null;

  /* ---------- 外壳图片：可能是图片路径，异步读一次 ---------- */
  let shellImg = null;
  if (shop && shop.shell && /[\/.]/.test(String(shop.shell.asset))) {
    texture.load(
      shop.shell.asset,
      function (t) {
        shellImg = t;
        console.log('[battle-view] 外壳图 ' + t.width + 'x' + t.height +
          '，盒子 ' + Math.round(shop.shell.w) + 'x' + Math.round(shop.shell.h) +
          ' @ ' + Math.round(shop.shell.x) + ',' + Math.round(shop.shell.y));
      },
      function (err) { console.warn('[battle-view] 外壳图片加载失败：' + err.message); }
    );
  }

  /* ---------- 垃圾桶：商店外壳右上角 ---------- */
  const trashSize = board.cellW * 0.4;
  const trashRect = (function () {
    const shell = shop && shop.shell ? shop.shell : null;
    const pad = board.cellW * 0.12;

    if (!shell) {
      return { x: battle.width - trashSize - pad, y: battle.height * 0.7, w: trashSize, h: trashSize };
    }

    // 外壳可能超出屏幕，取个不越界的位置
    const right = Math.min(shell.x + shell.w, battle.width) - pad;
    const top = Math.max(shell.y, 0) + pad;

    return { x: right - trashSize, y: top, w: trashSize, h: trashSize };
  })();

  // 按下时命中的格子 / 槽位（还没确认是不是拖拽）
  let pendingCell = null;
  let pendingSlot = null;

  // 真正开始拖之后，源格子 / 槽位要先「空出来」
  let dragFromCell = null;
  let dragFromSlot = null;

  // 当前世界缩放，逐帧向目标靠拢
  let worldZoom = 1;

  // 把一组 cax 对象按世界缩放摆好（围绕篝火中心）
  // sprites - 带 _baseX / _baseY / _baseScale 的对象数组
  // z - 缩放倍数
  function scaleSprites(sprites, z) {
    if (!sprites) return;
    const c = battle.campfire;

    for (let i = 0; i < sprites.length; i++) {
      const n = sprites[i];
      n.x = c.x + (n._baseX - c.x) * z;
      n.y = c.y + (n._baseY - c.y) * z;
      n.scale = (n._baseScale || 1) * z;
    }
  }

  // 统一显隐
  // sprites - cax 对象数组
  // v - true 显示 / false 隐藏
  function setVisible(sprites, v) {
    if (!sprites) return;
    for (let i = 0; i < sprites.length; i++) sprites[i].visible = v;
  }

  /* ---------- 绘制 ---------- */
  // 把这一帧所有动态内容画出来
  // ctx - Canvas 2D 上下文，坐标是画布物理像素
  function paintAll(ctx) {
    // 0. 世界缩放：布阵 1，战斗时缩小（平滑过渡）
    const targetZoom = battle.state === 'build' ? 1 : (tpl.battleZoom || 0.62);
    worldZoom += (targetZoom - worldZoom) * 0.18;
    if (Math.abs(targetZoom - worldZoom) < 0.002) worldZoom = targetZoom;

    World.set(worldZoom, battle.campfire.x, battle.campfire.y);
    battle.viewZoom = worldZoom;   // 子弹回收按这个算屏幕边界

    // 棋盘与商店是 cax 对象，只能手改坐标和 scale 来跟着缩
    scaleSprites(board.sprites, worldZoom);
    scaleSprites(shop && shop.sprites, worldZoom);

    // 战斗时把商店整块藏起来（外壳 + 槽位），打完再露出来
    setVisible(shop && shop.sprites, battle.state === 'build');

    // 下面画的东西都在世界坐标里，统一套缩放
    ctx.save();
    World.apply(ctx);

    // 1. 篝火：优先用精灵图（15 帧动画 + 石圈 + 柴火 + 光晕）
    //    图还没加载好时退回代码画的那版，保证画面不空
    const fireOk = Fire.draw(ctx, battle.campfire.x, battle.campfire.y, campfireSize, battle._time);

    if (!fireOk) {
      const fireFrame = Math.floor(battle._time / 110) % 4;
      drawCampfire(ctx, battle.campfire.x, battle.campfire.y, campfireSize, fireFrame);
    }

    // 1.5 篝火右下角：爱心 + 当前耐久
    // 掉血时爱心会「蹦两下」：先放大再回弹，幅度不大但有反馈
    const st = battle.status();
    const heartBase = campfireSize * 0.26;

    let heartScale = 1;
    if (battle.hpPulseT > 0) {
      const t = 1 - battle.hpPulseT / 260;              // 0 → 1
      heartScale = 1 + Math.sin(t * Math.PI * 3) * (1 - t) * 0.45;
    }

    const heartSize = heartBase * heartScale;
    const hx = battle.campfire.x + campfireSize * 0.3;
    const hy = battle.campfire.y + campfireSize * 0.34;

    drawHeartShape(ctx, '#ff4d6d', hx, hy, heartSize);
    drawBadge(ctx, String(Math.round(st.hp)), hx + heartBase * 1.5, hy + heartBase * 0.55, campfireSize * 0.2);

    // 2. 格子上的卡牌：不旋转，永远朝上摆着
    // 正在被拖走的那一格先空出来，做出「拔出来」的效果
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!cell.card || !cell.card.def) continue;
      if (cell === dragFromCell) continue;

      drawWeapon(ctx, cell.card.def, cell.x + cell.w / 2, cell.y + cell.h / 2, cardSize);
      drawBadge(ctx, badgeTextOf(cell.card.def), cell.x + cell.w * 0.86, cell.y + cell.h * 0.9, board.cellW * 0.13);
    }

    // 5. 怪物
    for (let i = 0; i < battle.monsters.length; i++) {
      const m = battle.monsters[i];
      drawMonster(ctx, m.x, m.y, monsterSize, m.maxHp ? m.hp / m.maxHp : 1, m.rec.kind);
    }

    // 6. 子弹：旋刃自转放大，普通子弹朝目标
    for (let i = 0; i < battle.bullets.length; i++) {
      const b = battle.bullets[i];

      if (b.spin) {
        const size = bulletSize * (b.growScale || 1) * 2;
        drawWeaponAimed(ctx, b.def, b.x, b.y, size, b.spinAngle || 0);
        continue;
      }

      const angle = b.target && b.target.alive
        ? Math.atan2(b.target.y + (b.oy || 0) - b.y, b.target.x + (b.ox || 0) - b.x)
        : Math.atan2(b.vy || 0, b.vx || 1);
      drawWeaponAimed(ctx, b.def, b.x, b.y, bulletSize, angle);
    }

    // 12. 商店最后画：外壳 → 槽位 → 卡牌 → 垃圾桶（保证在最上层）
    // 商店：外壳 → 槽位底图 → 卡牌图标 → 价格 → 垃圾桶
    if (shop && shop.shell) {
      const build = battle.state === 'build';

      // 4.1 外壳（图片路径也能画）+ 顶部标题
      if (build) {
        drawShell(ctx);
        drawShopTitle(ctx);
      }

      // 4.2 槽位
      if (shop.slots) {
        for (let i = 0; i < shop.slots.length; i++) {
          const slot = shop.slots[i];

          // 槽位底板：一块圆角深色块，保证卡牌有底
          ctx.fillStyle = build ? 'rgba(18,22,30,0.72)' : 'rgba(18,22,30,0.0)';
          roundRectPath(ctx, slot.x, slot.y, slot.w, slot.h, slot.w * 0.12);
          ctx.fill();

          if (!build) continue;

          const phase = battle.gacha.phase;

          // 选宝箱：三个槽位显示宝箱 + 价格
          if (phase === 'chests') {
            const chests = tpl.chests || [];
            const chest = chests[i] || chests[0];
            if (chest) drawChest(ctx, slot, i, chest.price || 0);
            continue;
          }

          // 滚动中：显示随机预览卡，带一点上移
          if (phase === 'rolling') {
            const pv = battle.gacha.preview[i];
            if (pv) {
              const drift = ((battle.gacha.t % 120) / 120) * slot.h * 0.12;
              drawWeapon(ctx, pv, slot.x + slot.w / 2, slot.y + slot.h * 0.4 + drift, slotIconSize);
            }
            continue;
          }

          if (slot.sold || !slot.weapon) continue;
          if (slot === dragFromSlot) continue;   // 正在被拖走

          drawWeapon(ctx, slot.weapon, slot.x + slot.w / 2, slot.y + slot.h * 0.42, slotIconSize);
          drawBadge(ctx, badgeTextOf(slot.weapon), slot.x + slot.w * 0.84, slot.y + slot.h * 0.58, slot.w * 0.14);

          // 抽奖结果：价格位写「免费」
          if (phase === 'result') drawFreeLabel(ctx, slot);
          else drawSlotPrice(ctx, slot);
        }
      }

      // 4.3 抽奖 / 返回 按钮 + 垃圾桶
      if (build) {
        const ph = battle.gacha.phase;

        // 没抽奖时是「抽奖」；宝箱阶段和出结果阶段都显示「返回」
        if (ph === 'off' || ph === 'chests' || ph === 'result') {
          gachaBtn.label = ph === 'off' ? '抽奖' : '返回';
          drawButton(ctx, gachaBtn, ph === 'off' ? COLOR.refreshBtn : COLOR.fightBtn, null, true);
        }

        // 垃圾桶只在正常阶段和出结果阶段有用
        if (ph === 'off' || ph === 'result') drawTrash(ctx, isOverTrash());
      }
    }


    // 世界内容画完，恢复屏幕坐标，按钮和 HUD 不跟着缩
    ctx.restore();

    // 8. 两个按钮（刷新价格每次会涨，实时读）
    if (battle.state === 'build') {
      const rp = battle.refreshPrice();
      drawButton(ctx, refreshButton, COLOR.refreshBtn, rp, battle.coins >= rp);
      drawButton(ctx, fightButton, COLOR.fightBtn, null, true);
    } else if (battle.state === 'over') {
      // 全屏压暗，中间出一个重新开始
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, battle.width, battle.height);
      drawButton(ctx, restartButton, COLOR.fightBtn, null, true);
    }

    // 9. 拖拽中的武器跟着手指，并在上方显示核心属性
    if (dragPoint && dragDef) {
      drawWeaponAimed(ctx, dragDef, dragPoint.x, dragPoint.y, slotIconSize * 0.8, -Math.PI / 2);
      drawDragHint(ctx, dragDef);
    }

    // 9.5 抽奖的两种提示
    if (battle.gacha.phase === 'jackpot') {
      // 三个槽位压暗，中间写奖励多少银币
      if (shop && shop.slots && shop.slots.length) {
        const a = shop.slots[0];
        const b2 = shop.slots[shop.slots.length - 1];
        ctx.fillStyle = 'rgba(10,12,18,0.62)';
        roundRectPath(ctx, a.x, a.y, (b2.x + b2.w) - a.x, a.h, a.w * 0.1);
        ctx.fill();
      }

      const size = Math.round(fontPx * 2.2);
      ctx.font = 'bold ' + size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = '豹子！+' + battle.gacha.reward + ' 银币';
      const cx = battle.width / 2;
      const cy = shop && shop.slots && shop.slots[0] ? shop.slots[0].y + shop.slots[0].h / 2 : battle.height * 0.85;

      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(text, cx, cy);

      ctx.fillStyle = '#ffd94a';
      ctx.fillText(text, cx, cy);
    }

    // 弹一下的提示：2 秒后自动消失，最后 0.3 秒淡出
    if (toastUntil > battle._time && toastText) {
      const left = toastUntil - battle._time;
      const alpha = Math.min(1, left / 300);

      const size = Math.round(fontPx * 1.7);
      ctx.font = 'bold ' + size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = battle.width / 2;
      const cy = battle.height * 0.58;

      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(3, size * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(toastText, cx, cy);

      ctx.fillStyle = '#ffe9c9';
      ctx.fillText(toastText, cx, cy);
      ctx.globalAlpha = 1;
    }

    // 10. HUD：左上角银币
    drawHud(ctx);

    // 11. 右上角：第几波 + 速度按钮
    drawWave(ctx);
    drawSpeedBtn(ctx);

    // 12. 左上角菜单按钮
    drawMenuBtn(ctx);

    // 13. 设置弹窗：盖在最上面
    if (menuOpen) drawMenu(ctx);

    // 14. 调试：篝火切图预览（打开时盖住整个画面）
    if (FIRE.preview) drawFirePreview(ctx);
  }

  // 画槽位下方的价格：银币图标 + 数字，钱不够变红
  // slot - 商店槽位 { x, y, w, h, price }
  function drawSlotPrice(ctx, slot) {
    if (!slot.price) return;

    const afford = battle.coins >= slot.price;
    const fontSize = Math.max(10, Math.round(slot.h * 0.17));
    const iconR = fontSize * 0.45;
    const numText = String(slot.price);

    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    ctx.textBaseline = 'middle';
    const numW = ctx.measureText(numText).width;

    const gap = fontSize * 0.3;
    const totalW = iconR * 2 + gap + numW;
    const startX = slot.x + (slot.w - totalW) / 2;
    const y = slot.y + slot.h * 0.84;

    drawCoin(ctx, startX + iconR, y, iconR);

    ctx.textAlign = 'left';
    ctx.fillStyle = afford ? COLOR.btnText : COLOR.btnTextOff;
    ctx.fillText(numText, startX + iconR * 2 + gap, y);
  }

  // 拖拽时在顶部居中显示这张卡的属性；拖到垃圾桶上就改成显示能卖多少钱
  // def - 卡牌表里的一行
  function drawDragHint(ctx, def) {
    // 顶部留白：不贴边，也不和左上角的银币打架
    const y = fontPx * 4.2;
    const size = Math.round(fontPx * 1.2);

    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let text;

    // 拖到垃圾桶上：显示能卖多少
    if (isOverTrash() && dragFromCell && dragFromCell.card) {
      text = '卖出 +' + battle.sellPrice(dragFromCell.card.def) + ' 银币';
    } else if (def.type === 'heal' || def.kind === 'heal') {
      text = '耐久 +' + (def.heal || 0);
    } else if (def.type === 'speed' || def.kind === 'speed') {
      const sec = ((def.durationMs || 0) / 1000).toFixed(1).replace(/\.0$/, '');
      text = '移动速度 ×' + (def.speedMul || 0) + '    持续 ' + sec + ' 秒';
    } else {
      // 攻速换成「每秒几次」，比毫秒直观
      const perSec = def.cdMs ? (1000 / def.cdMs).toFixed(2).replace(/0$/, '') : '0';
      text = '伤害 ' + (def.damage || 0) +
        '    攻击速度 ' + perSec + ' 次/秒' +
        '    数量 ×' + (def.shots || 1);
    }

    // 文字颜色压暗，外面描一圈浅边保证背景变化也看得清
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeText(text, battle.width / 2, y);

    ctx.fillStyle = 'rgba(46,56,74,0.95)';
    ctx.fillText(text, battle.width / 2, y);
  }

  // 手指（拖拽中）是否在垃圾桶上
  function isOverTrash() {
    if (!dragPoint || !dragDef) return false;
    const p = World.toWorld(dragPoint.x, dragPoint.y);
    return inside(p.x, p.y, trashRect);
  }

  // 抽到的卡，价格位显示「免费」
  function drawFreeLabel(ctx, slot) {
    const size = Math.max(10, Math.round(slot.h * 0.17));
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8fe0a8';
    ctx.fillText('免费', slot.x + slot.w / 2, slot.y + slot.h * 0.86);
  }

  // 在外壳顶部居中画「商店」两个字
  function drawShopTitle(ctx) {
    const s = shop && shop.shell ? shop.shell : null;
    const sc = (shop && shop.cfg) || {};      // 标题配置在商店里，不在战斗配置里
    if (!s || !sc.title) return;

    const size = Math.max(12, Math.round(s.h * (sc.titleFontRatio == null ? 0.16 : sc.titleFontRatio)));
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h * (sc.titleTopRatio == null ? 0.05 : sc.titleTopRatio);

    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 深色描边，保证花纹背景上也看得清
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.strokeStyle = 'rgba(30,20,10,0.65)';
    ctx.strokeText(sc.title, cx, cy);

    ctx.fillStyle = sc.titleColor || '#ffe9c9';
    ctx.fillText(sc.title, cx, cy);
  }

  // 画一个宝箱
  // tier - 0 铜 / 1 银 / 2 金
  function drawChest(ctx, slot, tier, price) {
    const themes = [
      { body: '#8a5a2b', lid: '#a06a33', band: '#d9a441' },
      { body: '#8f97a3', lid: '#aab3c0', band: '#e6edf5' },
      { body: '#b8860b', lid: '#d9a520', band: '#ffe680' },
    ];
    const th = themes[tier] || themes[0];

    const w = slot.w * 0.62;
    const h = slot.h * 0.5;
    const x = slot.x + (slot.w - w) / 2;
    const y = slot.y + slot.h * 0.18;

    // 箱体
    ctx.fillStyle = th.body;
    roundRectPath(ctx, x, y + h * 0.34, w, h * 0.66, w * 0.06);
    ctx.fill();

    // 箱盖
    ctx.fillStyle = th.lid;
    roundRectPath(ctx, x - w * 0.03, y, w * 1.06, h * 0.42, w * 0.06);
    ctx.fill();

    // 锁扣
    ctx.fillStyle = th.band;
    roundRectPath(ctx, x + w * 0.42, y + h * 0.28, w * 0.16, h * 0.36, w * 0.04);
    ctx.fill();

    // 名字
    const size = Math.max(10, Math.round(slot.w * 0.13));
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240,244,250,0.95)';
    ctx.fillText(['初级', '中级', '高级'][tier] || '', slot.x + slot.w / 2, slot.y + slot.h * 0.1);

    // 价格
    const iconR = size * 0.42;
    const numText = String(price);
    const numW = ctx.measureText(numText).width;
    const gap = size * 0.28;
    const total = iconR * 2 + gap + numW;
    const px = slot.x + (slot.w - total) / 2;
    const py = slot.y + slot.h * 0.86;

    drawCoin(ctx, px + iconR, py, iconR);

    ctx.textAlign = 'left';
    ctx.fillStyle = battle.coins >= price ? 'rgba(240,244,250,0.95)' : '#ff6a6a';
    ctx.fillText(numText, px + iconR * 2 + gap, py);
  }

  // 画商店外壳：先垫一层不透明底，再把图片 cover 进去。
  // 垫底是为了防两种情况：图片带透明区（背景草地会透上来）、图片还没加载完
  function drawShell(ctx) {
    const s = shop && shop.shell ? shop.shell : null;
    if (!s) return;

    // 1. 不透明底板
    ctx.fillStyle = '#1b2230';
    roundRectPath(ctx, s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.04);
    ctx.fill();

    if (!shellImg || !shellImg.image) return;

    // 2. 图片铺进盒子：缩放方式和对齐方式都由配置决定
    //    cover  按「铺满」缩放（比例不符时四边裁）
    //    width  按宽度缩放（高度可能溢出，上下按 anchor 裁）
    //    height 按高度缩放（宽度可能溢出，左右裁）
    const fit = tpl.shellFit || 'width';
    const anchor = tpl.shellAnchor || 'top';

    let scale;
    if (fit === 'height') scale = s.h / shellImg.height;
    else if (fit === 'cover') scale = Math.max(s.w / shellImg.width, s.h / shellImg.height);
    else scale = s.w / shellImg.width;

    const w = shellImg.width * scale;
    const h = shellImg.height * scale;

    // 水平：默认居中（宽度不会裁时无所谓）
    const dx = s.x + (s.w - w) / 2;

    // 垂直：top 保住顶部装饰边，bottom 贴底，center 居中裁
    let dy;
    if (anchor === 'bottom') dy = s.y + s.h - h;
    else if (anchor === 'center') dy = s.y + (s.h - h) / 2;
    else dy = s.y;

    ctx.save();
    roundRectPath(ctx, s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.04);
    ctx.clip();
    ctx.drawImage(shellImg.image, dx, dy, w, h);
    ctx.restore();
  }

  // 画垃圾桶；hover 时变红并掀盖子
  function drawTrash(ctx, hover) {
    const r = trashRect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    // 底板
    ctx.fillStyle = hover ? 'rgba(220,70,70,0.3)' : 'rgba(0,0,0,0.35)';
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.w * 0.18);
    ctx.fill();

    const bodyW = r.w * 0.42;
    const bodyH = r.h * 0.4;
    const bx = cx - bodyW / 2;
    const by = cy - bodyH * 0.3;
    const color = hover ? '#ff9a9a' : '#d6dde8';

    // 桶身
    ctx.fillStyle = color;
    roundRectPath(ctx, bx, by, bodyW, bodyH, bodyW * 0.16);
    ctx.fill();

    // 桶身竖纹
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, r.w * 0.03);
    for (let i = -1; i <= 1; i++) {
      const x = cx + i * bodyW * 0.26;
      ctx.beginPath();
      ctx.moveTo(x, by + bodyH * 0.22);
      ctx.lineTo(x, by + bodyH * 0.78);
      ctx.stroke();
    }

    // 盖子：hover 时掀起一个角度
    const lidW = bodyW * 1.24;
    const lidH = r.h * 0.09;
    ctx.fillStyle = color;

    if (hover) {
      ctx.save();
      ctx.translate(cx - lidW / 2, by - r.h * 0.12);
      ctx.rotate(-0.5);
      roundRectPath(ctx, 0, 0, lidW, lidH, lidH * 0.5);
      ctx.fill();
      ctx.restore();
    } else {
      roundRectPath(ctx, cx - lidW / 2, by - r.h * 0.12, lidW, lidH, lidH * 0.5);
      ctx.fill();
    }
  }

  // 画一个按钮：左边文字，右边「银币图标 + 价格」
  // btn - { x, y, w, h, label }
  // bg - 底色
  // cost - 要显示的价格，null 表示不显示
  // affordable - 钱够不够，不够就把价格画成红色
  function drawButton(ctx, btn, bg, cost, affordable) {
    roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, btn.h * 0.25);
    ctx.fillStyle = bg;
    ctx.fill();

    const pad = btn.w * 0.08;
    const fontSize = Math.round(btn.h * 0.36);

    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    ctx.textBaseline = 'middle';

    // 没有价格的就居中写（开始战斗 / 重新开始）
    if (!cost) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOR.btnText;
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      return;
    }

    // 左边：按钮名字
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR.btnText;
    ctx.fillText(btn.label, btn.x + pad, btn.y + btn.h / 2);

    // 右边：银币图标 + 数字
    {
      const numText = String(cost);
      ctx.font = fontSize + 'px sans-serif';
      const numW = ctx.measureText(numText).width;

      const iconR = btn.h * 0.16;
      const rightX = btn.x + btn.w - pad;
      const iconX = rightX - numW - iconR * 1.4;

      drawCoin(ctx, iconX, btn.y + btn.h / 2, iconR);

      ctx.textAlign = 'right';
      ctx.fillStyle = affordable ? COLOR.btnText : COLOR.btnTextOff;
      ctx.fillText(numText, rightX, btn.y + btn.h / 2);
    }
  }

  // 右上角第二个：游戏速度按钮 ×1 / ×2 / ×4
  function drawSpeedBtn(ctx) {
    const b = speedBtn;
    ctx.fillStyle = COLOR.hudBg;
    roundRectPath(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
    ctx.fill();

    const text = Speed.label();
    ctx.font = 'bold ' + Math.round(uiSize * 0.9) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = Speed.get() > 1 ? '#ffd94a' : COLOR.hud;
    ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2);
  }

  // ============ 调试：篝火切图预览 ============
  // 把整张精灵图铺在屏幕上，把所有切割框画出来，检查有没有切歪
  function drawFirePreview(ctx) {
    const img = Fire.image();
    const sz = Fire.size();
    if (!img || !sz.w) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, battle.width, battle.height);
      ctx.fillStyle = '#f66';
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('精灵图还没加载好', battle.width / 2, battle.height / 2);
      return;
    }

    // 黑底
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, battle.width, battle.height);

    // 整张图按比例铺（留 4% 边距）
    const k = Math.min((battle.width * 0.96) / sz.w, (battle.height * 0.86) / sz.h);
    const dw = sz.w * k;
    const dh = sz.h * k;
    const dx = (battle.width - dw) / 2;
    const dy = (battle.height - dh) / 2 - battle.height * 0.02;

    ctx.drawImage(img, 0, 0, sz.w, sz.h, dx, dy, dw, dh);

    // 画一个比例框
    // p - { x, y, w, h } 比例；color - 描边色；label - 角上文字
    function box(p, color, label) {
      const bx = dx + p.x * dw;
      const by = dy + p.y * dh;
      const bw = p.w * dw;
      const bh = p.h * dh;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);

      if (label) {
        const size = Math.max(14, Math.round(battle.width * 0.022));
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = color;
        ctx.fillText(label, bx + 3, by + 2);
      }
    }

    // 15 个火焰帧
    const g = FIRE.grid;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        box({ x: g.x + c * g.cellW, y: g.y + r * g.cellH, w: g.cellW, h: g.cellH },
          '#ff4040', String(r * g.cols + c + 1));
      }
    }

    // 三个静态件
    box(FIRE.parts.stone, '#40c0ff', 'stone');
    box(FIRE.parts.log, '#40ff80', 'log');
    box(FIRE.parts.glow, '#ffd040', 'glow');

    // 顶部信息
    const info = Math.round(battle.width * 0.026);
    ctx.font = 'bold ' + info + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.fillText('图 ' + sz.w + 'x' + sz.h + '   显示倍率 ' + k.toFixed(2) +
      '   单帧 ' + Math.round(g.cellW * sz.w) + 'x' + Math.round(g.cellH * sz.h), battle.width / 2, 10);
  }

  // 左上角：菜单按钮
  function drawMenuBtn(ctx) {
    const b = menuBtn;
    ctx.fillStyle = COLOR.hudBg;
    roundRectPath(ctx, b.x, b.y, b.w, b.h, b.h * 0.3);
    ctx.fill();

    // 三条横线当菜单图标
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const half = b.w * 0.22;
    const lineH = Math.max(2, b.h * 0.08);

    ctx.fillStyle = COLOR.hud;
    for (let i = -1; i <= 1; i++) {
      roundRectPath(ctx, cx - half, cy + i * b.h * 0.18 - lineH / 2, half * 2, lineH, lineH * 0.5);
      ctx.fill();
    }
  }

  // 画一条音量滑条
  // row - 行的位置
  // label - 文字
  // value - 0~1
  function drawSlider(ctx, row, label, value) {
    const size = Math.round(fontPx * 1.2);

    // 文字 + 百分比
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6ecf5';
    ctx.fillText(label, row.x, row.y - size * 0.9);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#a8bcd4';
    ctx.fillText(Math.round(value * 100) + '%', row.x + row.w, row.y - size * 0.9);

    // 轨道
    const trackH = Math.max(6, row.h * 0.32);
    const ty = row.y + row.h * 0.4;

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(ctx, row.x, ty - trackH / 2, row.w, trackH, trackH / 2);
    ctx.fill();

    // 已填充部分
    ctx.fillStyle = '#6fb0ff';
    roundRectPath(ctx, row.x, ty - trackH / 2, Math.max(trackH, row.w * value), trackH, trackH / 2);
    ctx.fill();

    // 滑块
    const knobR = trackH * 0.9;
    const kx = row.x + row.w * value;
    ctx.beginPath();
    ctx.arc(kx, ty, knobR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // 画设置弹窗（盖在一切上面）
  function drawMenu(ctx) {
    // 全屏压暗
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, battle.width, battle.height);

    // 面板
    ctx.fillStyle = '#1b2433';
    roundRectPath(ctx, modal.x, modal.y, modal.w, modal.h, modal.w * 0.04);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 标题
    const titleSize = Math.round(fontPx * 1.6);
    ctx.font = 'bold ' + titleSize + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText('设置', modal.x + modal.w / 2, modal.y + modal.h * 0.12);

    // 两条滑条
    drawSlider(ctx, sfxRow, '游戏音效', Sound.getMaster());
    drawSlider(ctx, bgmRow, '游戏音乐', Bgm.getVolume());

    // 返回游戏
    roundRectPath(ctx, closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, closeBtn.h * 0.25);
    ctx.fillStyle = COLOR.fightBtn;
    ctx.fill();

    ctx.fillStyle = COLOR.btnText;
    ctx.font = 'bold ' + Math.round(closeBtn.h * 0.45) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(closeBtn.label, closeBtn.x + closeBtn.w / 2, closeBtn.y + closeBtn.h / 2);
  }

  // 右上角：第几波
  function drawWave(ctx) {
    const wave = battle.wave;
    const text = wave > 0 ? '第 ' + wave + ' 波' : '待战';
    const size = Math.round(fontPx * 1.5);

    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const padX = size * 0.5;
    const padY = size * 0.35;
    const tw = ctx.measureText(text).width;
    const boxW = tw + padX * 2;
    const boxH = size + padY * 2;

    const x = battle.width - 12 - boxW;
    const y = 12;

    ctx.fillStyle = COLOR.hudBg;
    roundRectPath(ctx, x, y, boxW, boxH, boxH * 0.3);
    ctx.fill();

    ctx.fillStyle = COLOR.hud;
    ctx.fillText(text, x + boxW - padX, y + boxH / 2);
  }

  // 画 HUD：只剩银币图标 + 数量，左上角，字号放大
  function drawHud(ctxRef) {
    const coins = battle.coins;
    const size = Math.round(fontPx * 1.7);
    const iconR = size * 0.5;
    const numText = String(coins);

    ctxRef.font = 'bold ' + size + 'px sans-serif';
    ctxRef.textAlign = 'left';
    ctxRef.textBaseline = 'middle';

    const padX = size * 0.5;
    const padY = size * 0.35;
    const numW = ctxRef.measureText(numText).width;
    const gap = size * 0.3;
    const boxW = padX * 2 + iconR * 2 + gap + numW;
    const boxH = size + padY * 2;

    // 半透明底板，保证任何背景上都看得清
    ctxRef.fillStyle = COLOR.hudBg;
    roundRectPath(ctxRef, 12, 12, boxW, boxH, boxH * 0.3);
    ctxRef.fill();

    // 银币图标
    const iconCx = 12 + padX + iconR;
    const iconCy = 12 + boxH / 2;
    drawCoin(ctxRef, iconCx, iconCy, iconR);

    // 数量
    ctxRef.fillStyle = COLOR.hud;
    ctxRef.fillText(numText, iconCx + iconR + gap, iconCy);
  }

  // HUD 的文字在 drawHud 里画，不需要额外的上下文变量

  /* ---------- 点击 ---------- */
  // 点是否落在矩形里
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 屏幕坐标是否落在某个格子上
  // x, y - 世界坐标
  // 返回 Cell 或 null
  function cellAtPoint(x, y) {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (inside(x, y, cell)) return cell;
    }
    return null;
  }

  // 世界坐标是否落在某个商店槽位上
  // x, y - 世界坐标
  // 返回 Slot 或 null
  function slotAtPoint(x, y) {
    if (!shop || !shop.slots) return null;
    for (let i = 0; i < shop.slots.length; i++) {
      if (inside(x, y, shop.slots[i])) return shop.slots[i];
    }
    return null;
  }

  // 按下时只记录「按住的是什么」，不执行任何动作
  // 拖动要靠这些信息（dragDef 决定跟手的图标，pending* 决定从哪拖出来的）
  function handlePress(x, y) {
    pendingCell = null;
    pendingSlot = null;
    dragDef = null;

    // 宝箱阶段和滚动中不能拖
    if (battle.gacha.phase === 'chests' || battle.gacha.phase === 'rolling') return;

    const pt = World.toWorld(x, y);

    const slot = slotAtPoint(pt.x, pt.y);
    if (slot && !slot.sold && slot.weapon) {
      pendingSlot = slot;
      dragDef = slot.weapon;
      return;
    }

    const cell = cellAtPoint(pt.x, pt.y);
    if (cell && cell.card) {
      pendingCell = cell;
      dragDef = cell.card.def;
    }
  }

  // 拖拽中：记下手指位置；第一次移动时把源格子/槽位「拔出来」
  function handleDrag(x, y) {
    if (battle.state !== 'build' || !dragDef) return;

    // 还没标记源：现在确认是在拖，把源空出来
    if (!dragFromCell && !dragFromSlot) {
      dragFromCell = pendingCell;
      dragFromSlot = pendingSlot;
    }

    dragPoint = { x: x, y: y };
  }

  // 拖拽落地：从商店拖是买，从棋盘拖是移动 / 合成
  // sx, sy - 按下的位置；ex, ey - 抬手的位置；moved - 是否真的拖动了
  // 返回 true 表示成功了
  function handleDrop(sx, sy, ex, ey, moved) {
    // 先取回源，再清状态
    const fromCell = dragFromCell;
    const fromSlot = dragFromSlot;

    dragPoint = null;
    dragDef = null;
    pendingCell = null;
    pendingSlot = null;
    dragFromCell = null;
    dragFromSlot = null;

    if (!moved || battle.state !== 'build') return false;
    if (battle.gacha.phase === 'chests' || battle.gacha.phase === 'rolling') return false;

    const to = World.toWorld(ex, ey);
    const toCell = cellAtPoint(to.x, to.y);

    // 0. 丢到垃圾桶上：卖掉（只对棋盘上的卡有效）
    if (fromCell && fromCell.card && inside(to.x, to.y, trashRect)) {
      const gain = battle.sellCard(fromCell);
      lastLine = '卖出 +' + gain;
      return gain > 0;
    }

    // 1. 从商店槽位拖出来：买
    if (fromSlot && !fromSlot.sold && fromSlot.weapon) {
      battle.selectSlot(fromSlot);
      if (!toCell) {
        lastLine = '没放到格子上';
        return false;
      }
      const ok = battle.placeWeapon(toCell, battle.selected);
      lastLine = ok ? '买到第 ' + toCell.index + ' 格' : '放不了（不同类/满级/没钱）';
      return ok;
    }

    // 2. 从棋盘格子拖出来：移动 或 合成
    if (fromCell && fromCell.card) {
      if (!toCell) {
        lastLine = '没放到格子上';
        return false;
      }
      const ok = battle.moveWeapon(fromCell, toCell);
      lastLine = ok ? (toCell.card.level > 1 ? '合到 ' + toCell.card.level + ' 级' : '挪过去了') : '挪不了（不同类/满级）';
      return ok;
    }

    lastLine = '没拖动东西';
    return false;
  }

  // 把一次点击派给按钮 / 槽位 / 格子
  function handleTap(x, y) {
    lastLine = '';

    // 结束了只认重新开始
    if (battle.state === 'over') {
      if (inside(x, y, restartButton)) {
        restartButton.onTap();
        return true;
      }
      return false;
    }

    // 速度按钮：任何时候都能点
    if (inside(x, y, speedBtn)) {
      Speed.cycle();
      lastLine = '速度 ' + Speed.label();
      return true;
    }

    // 按钮是屏幕坐标，不缩放
    if (battle.state === 'build') {
      // 抽奖：没开就进选宝箱，开着就取消恢复
      if (inside(x, y, gachaBtn)) {
        if (battle.gacha.phase === 'off') {
          battle.enterChestSelect();
          lastLine = '选宝箱';
          return true;
        }
        if (battle.gacha.phase === 'chests') {
          battle.exitGacha();     // 返回：恢复抽奖前的卡槽
          lastLine = '返回';
          return true;
        }

        if (battle.gacha.phase === 'result') {
          // 还有免费卡没拿：弹提示，不让返回
          showToast('还有免费的卡牌  未使用', 2000);
          lastLine = '先拿走免费卡';
          return false;
        }

        return false;
      }

      if (battle.gacha.phase === 'off' && inside(x, y, refreshButton)) {
        refreshButton.onTap();
        return true;
      }
      if (inside(x, y, fightButton)) {
        fightButton.onTap();
        return true;
      }
    }

    // 槽位和格子在世界上，先把点击位置换算回世界坐标
    const pt = World.toWorld(x, y);
    const x0 = pt.x;
    const y0 = pt.y;

    // 按下时先记下可能拖的东西，等真移动了才「拔出来」
    pendingCell = null;
    pendingSlot = null;

    // 商店槽位：选中这把武器（拖拽时用来显示跟随图标）
    if (shop && shop.slots) {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (!inside(x0, y0, slot)) continue;

        // 宝箱阶段：槽位里没有武器，先判抽奖，不能走下面的「槽位空了」
        if (battle.gacha.phase === 'chests') {
          const ok = battle.buyChest(i);
          lastLine = ok ? '开宝箱' : '银币不够';
          return ok;
        }

        // 滚动中不能点
        if (battle.gacha.phase === 'rolling') return false;

        // 正常阶段：卖掉了或没卡就是空的
        if (slot.sold || !slot.weapon) {
          lastLine = '槽位空了';
          return false;
        }

        battle.selectSlot(slot);
        dragDef = slot.weapon;
        pendingSlot = slot;
        lastLine = '选中 ' + slot.weapon.name + ' ' + slot.level + ' 级（' + slot.price + '）';
        return true;
      }
    }

    // 棋盘格子：放武器 / 合成；同时记下拖的什么，供拖拽显示
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!inside(x0, y0, cell)) continue;

      if (cell.card) {
        dragDef = cell.card.def;
        pendingCell = cell;
      } else if (battle.selected) {
        dragDef = battle.weaponDef(battle.selected.name, 1);
      }

      const before = cell.card ? cell.card.level : 0;
      const ok = battle.placeWeapon(cell, battle.selected);

      if (!ok) lastLine = cell.card ? '合不了（不同类/满级/没钱）' : '放不了（没钱）';
      else if (before) lastLine = '合成到 ' + cell.card.level + ' 级';
      else lastLine = '放到第 ' + cell.index + ' 格';

      return ok;
    }

    lastLine = '没点中东西';
    return false;
  }

  /* ---------- 挂到两条流水线上 ---------- */
  Ticker.onFrame(function (dt) {
    // 只有战斗阶段才吃速度倍率；备战永远是 1 倍
    Speed.setActive(battle.state === 'battle');
    battle.update(dt);
  });

  // 绘制里任何错误都要打出来，否则会静默变成「半屏不显示」
  let paintErrLogged = false;
  Overlay.onDraw(function (ctx) {
    try {
      paintAll(ctx);
    } catch (e) {
      if (!paintErrLogged) {
        paintErrLogged = true;
        console.error('[battle-view] 绘制出错：' + ((e && e.stack) || e));
      }
    }
  });

  // 波次日志
  battle.onWaveStart = function (n, count) {
    console.log('[battle] 第 ' + n + ' 波开始，怪物 ' + count + ' 只');
  };
  battle.onWaveEnd = function (n, bonus) {
    console.log('[battle] 第 ' + n + ' 波结束，回到布阵，奖励 +' + (bonus || 0) + ' 银币');
  };
  battle.onOver = function () {
    console.log('[battle] 篝火灭了，本局结束');
  };

  console.log('[battle-view] 按钮 ' + Math.round(leftX) + ',' + Math.round(by) +
    ' 尺寸 ' + Math.round(buttonW) + 'x' + Math.round(buttonH) +
    '；篝火 ' + Math.round(battle.campfire.x) + ',' + Math.round(battle.campfire.y));

  return {
    handleTap: handleTap,
    handlePress: handlePress,
    handleDrag: handleDrag,
    handleDrop: handleDrop,
  };
}

module.exports = { create: create };
