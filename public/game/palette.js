// 统一色板：所有绘制模块共用。

const C = {
  skyTop: '#7fd0f7',
  skyBottom: '#dff4ff',
  cloud: 'rgba(255,255,255,0.9)',
  hillFar: '#a8e0a4',
  hillMid: '#7fca78',
  treeTrunk: '#8a5a3b',
  treeLeaf: '#4fae52',
  treeLeafDark: '#3d9142',
  grass: '#5fd06a',
  grassDark: '#3fa84d',
  soilTop: '#8b6b4a',
  soilBottom: '#57422e',
  skin: '#ffd9b3',
  hair: '#5a3a22',
  shirt: '#3f7fd6',
  shirtDark: '#2f63aa',
  pants: '#33415c',
  shoe: '#2a3346',
  eye: '#22262e',
  gun: '#8e97a5',
  gunDark: '#4a525e',
  aimRing: 'rgba(255,86,86,0.85)',
  joyBase: 'rgba(255,255,255,0.22)',
  joyRing: 'rgba(255,255,255,0.55)',
  joyKnob: 'rgba(255,255,255,0.72)',
  enemyBody: '#8a5bd6',
  enemyBodyDark: '#5f3a9c',
  enemyHorn: '#e0d6f5',
  enemyEye: '#ff4d4d',
  enemyHurt: '#ffffff',
  enemyHp: '#5ad46a',
  hpPip: '#ff5a5a',
  hpPipOff: 'rgba(0,0,0,0.18)',
  shadow: 'rgba(0,0,0,0.16)',
  hudBg: 'rgba(255,255,255,0.82)',
  hudText: '#1d3a52',
};

const PLAYER_BULLET = { trail: 'rgba(255,200,80,0.35)', body: '#ffd75e', core: '#fffdf2' };
const ENEMY_BULLET = { trail: 'rgba(255,90,90,0.30)', body: '#ff6b6b', core: '#ffe3e3' };

module.exports = {
  C: C,
  PLAYER_BULLET: PLAYER_BULLET,
  ENEMY_BULLET: ENEMY_BULLET,
};
