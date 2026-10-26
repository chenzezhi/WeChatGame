// 统一色板（Q 版风）：高饱和糖果色 + 深色描边。
// 所有绘制模块共用；改名会被其它文件引用报错，只调数值即可。

// 描边色：几乎所有角色/道具轮廓都用它
const OUT = 'rgba(58,40,72,0.85)';

const C = {
  outline: OUT,

  // 背景
  skyTop: '#7cd4ff',
  skyBottom: '#eaf9ff',
  cloud: 'rgba(255,255,255,0.96)',
  hillFar: '#b9eeb4',
  hillMid: '#8dde8d',
  treeTrunk: '#a4714c',
  treeLeaf: '#5ecf6a',
  treeLeafDark: '#3fae55',
  grass: '#67dd78',
  grassDark: '#41b759',
  soilTop: '#c39264',
  soilBottom: '#8a6242',

  // 玩家
  skin: '#ffe3c4',
  hair: '#4b2f24',
  shirt: '#4aa8f5',
  shirtDark: '#2f7fd6',
  pants: '#3c4f74',
  shoe: '#2b3550',
  eye: '#2b2438',
  blush: 'rgba(255,128,150,0.55)',
  gun: '#a9c0d6',
  gunDark: '#5b6b80',

  // 摇杆
  aimRing: 'rgba(255,92,92,0.9)',
  joyBase: 'rgba(255,255,255,0.26)',
  joyRing: 'rgba(255,255,255,0.62)',
  joyKnob: 'rgba(255,255,255,0.82)',

  // 敌人
  enemyBody: '#b47bf0',
  enemyBodyDark: '#8a52cf',
  enemyHorn: '#efe6ff',
  enemyEye: '#ff5a5a',
  enemyHurt: '#ffffff',
  enemyHp: '#67e07a',

  // HUD
  hpPip: '#ff6b6b',
  hpPipOff: 'rgba(0,0,0,0.18)',
  shadow: 'rgba(58,40,72,0.20)',
  hudBg: 'rgba(255,255,255,0.86)',
  hudText: '#31425c',
};

const PLAYER_BULLET = {
  trail: 'rgba(255,205,90,0.40)',
  body: '#ffd75e',
  core: '#fffdf0',
  edge: 'rgba(200,134,42,0.85)',
};

const ENEMY_BULLET = {
  trail: 'rgba(255,110,110,0.36)',
  body: '#ff6b6b',
  core: '#ffe9e9',
  edge: 'rgba(180,50,60,0.85)',
};

module.exports = {
  C: C,
  OUT: OUT,
  PLAYER_BULLET: PLAYER_BULLET,
  ENEMY_BULLET: ENEMY_BULLET,
};
