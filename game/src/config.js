// Terumbu — Reef Guardian: every tuning number, colour and wave in one place.
// The playfield is a fixed 960x540 logical area; the renderer scales it to fit the
// window, so no rule below ever depends on the screen size.
export const FIELD = { width: 960, height: 540, floorY: 478, surfaceY: 46 };

/** The simulation's fixed step, in seconds: 60 updates a second, any display rate. */
export const STEP = 1 / 60;

export const TURTLE = {
  radius: 21,
  accel: 2100,
  maxSpeed: 335,
  drag: 3.4,
  invulnerable: 1.6,
  magnetRadius: 170,
};

export const HEARTS = 3;
export const REEF_MAX = 100;

/** Pearls restore the reef; plankton is smaller food that also feeds the combo. */
export const PEARL = { radius: 11, reef: 3, score: 50, drift: 26, interval: 1.35, intervalJitter: 0.7 };
export const PLANKTON = { radius: 6, reef: 1, score: 20, drift: 34, interval: 1.0, intervalJitter: 0.6 };

/** Power-ups: shield blocks one hit, magnet pulls pearls in, starfish heals a heart. */
export const POWERUP = { radius: 14, interval: 11, shieldTime: 14, magnetTime: 9 };

/**
 * Five waves. Each wave lasts WAVE_SECONDS and raises enemy speed, spawn rate and
 * the mix: lionfish first, then jellyfish, then drifting trash, then sharks.
 * The last wave is the storm: everything at once, fastest.
 */
export const WAVE_SECONDS = 20;
export const WAVES = [
  { speed: 1.0, spawn: 1.35, lionfish: 1, jelly: 0, trash: 0, shark: 0, banner: 'Wave 1 — The reef wakes' },
  { speed: 1.12, spawn: 1.15, lionfish: 2, jelly: 1, trash: 0, shark: 0, banner: 'Wave 2 — Jellyfish drift in' },
  { speed: 1.25, spawn: 0.98, lionfish: 2, jelly: 1, trash: 1, shark: 0, banner: 'Wave 3 — Trash on the current' },
  { speed: 1.4, spawn: 0.84, lionfish: 2, jelly: 2, trash: 1, shark: 1, banner: 'Wave 4 — Sharks patrol' },
  { speed: 1.58, spawn: 0.7, lionfish: 3, jelly: 2, trash: 2, shark: 1, banner: 'Wave 5 — The storm tide' },
];

export const ENEMY = {
  lionfish: { radius: 20, speed: 62, score: 0 },
  jelly: { radius: 17, speed: 44, score: 0 },
  trash: { radius: 15, speed: 38, score: 0 },
  shark: { radius: 30, speed: 150, score: 0 },
};

/** How many creatures and motes can exist at once; pools are allocated once at boot. */
export const POOL_ENEMIES = 48;
export const POOL_PICKUPS = 40;
export const POOL_PARTICLES = 160;
export const POOL_BUBBLES = 70;

/** A pickup chain kept alive for COMBO_WINDOW seconds multiplies the next score. */
export const COMBO_WINDOW = 3.5;
export const COMBO_MAX = 8;

export const PALETTE = {
  waterTop: '#19c8d8',
  waterMid: '#0a7fb8',
  waterDeep: '#053a6e',
  sand: '#e8cf9a',
  sandDark: '#c9a86a',
  coralPink: '#ff6fa5',
  coralOrange: '#ff9a4d',
  coralPurple: '#b388ff',
  coralGreen: '#3ddc97',
  coralGrey: '#7d8a96',
  turtleShell: '#2e8b57',
  turtleBelly: '#ffe9a8',
  pearl: '#ffffff',
  pearlGlow: '#b8f6ff',
  plankton: '#ffe066',
  lionfish: '#ff5d3b',
  jelly: '#e6a8ff',
  shark: '#8fa8bf',
  trash: '#d8dee6',
  hudBg: 'rgba(3, 32, 56, 0.62)',
  text: '#f4feff',
  muted: '#bfe8f2',
  gold: '#ffd94d',
  heart: '#ff5d7a',
  shield: '#7fe7ff',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'terumbu-reef-guardian.best';
