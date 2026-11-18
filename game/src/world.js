// The game's rules and state, with no drawing and no browser in it: the turtle, the
// reef it restores, waves of hazards, pickups, power-ups, particles and scoring.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react — sounds, announcements — without the world knowing about
// screens or sound. Pools are allocated once, at boot; nothing allocates per step.
import {
  COMBO_MAX, COMBO_WINDOW, ENEMY, FIELD, HEARTS, PEARL, PLANKTON, POOL_BUBBLES,
  POOL_ENEMIES, POOL_PARTICLES, POOL_PICKUPS, POWERUP, REEF_MAX, TURTLE,
  WAVE_SECONDS, WAVES,
} from './config.js';
import { pick, range } from './random.js';

export const KIND_LIONFISH = 'lionfish';
export const KIND_JELLY = 'jelly';
export const KIND_TRASH = 'trash';
export const KIND_SHARK = 'shark';
export const KIND_PEARL = 'pearl';
export const KIND_PLANKTON = 'plankton';
export const KIND_SHIELD = 'shield';
export const KIND_MAGNET = 'magnet';
export const KIND_STARFISH = 'starfish';

export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_WAVE = 16;
export const EVENT_POWER = 32;
export const EVENT_HEAL = 64;

const CORAL_COLOURS = ['pink', 'orange', 'purple', 'green', 'pink', 'orange'];

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, r: TURTLE.radius,
    tilt: 0, flip: false, swim: 0, invulnerable: 0, shield: false,
    shieldTime: 0, magnetTime: 0,
  };
  const enemies = [];
  for (let i = 0; i < POOL_ENEMIES; i += 1) {
    enemies.push({ active: false, kind: KIND_LIONFISH, x: 0, y: 0, vx: 0, vy: 0, r: 20, phase: 0, seed: 0 });
  }
  const pickups = [];
  for (let i = 0; i < POOL_PICKUPS; i += 1) {
    pickups.push({ active: false, kind: KIND_PEARL, x: 0, y: 0, vx: 0, vy: 0, r: 11, phase: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL_PARTICLES; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff', ring: false });
  }
  const bubbles = [];
  for (let i = 0; i < POOL_BUBBLES; i += 1) {
    bubbles.push({ active: false, x: 0, y: 0, vy: 0, r: 3, wobble: 0 });
  }
  const corals = [];
  const seaweed = [];
  const state = {
    player, enemies, pickups, particles, bubbles, corals, seaweed,
    score: 0, hearts: HEARTS, reef: 0, wave: 1, elapsed: 0, time: 0,
    combo: 0, comboTimer: 0, banner: WAVES[0].banner, bannerTime: 3,
    pearlTimer: 0.4, planktonTimer: 0.2, powerTimer: POWERUP.interval,
    enemyTimer: 1.2, bubbleTimer: 0.1, over: false, won: false,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 0;
    player.shield = false;
    player.shieldTime = 0;
    player.magnetTime = 0;
    player.tilt = 0;
    for (const e of enemies) e.active = false;
    for (const p of pickups) p.active = false;
    for (const p of particles) p.active = false;
    for (const b of bubbles) b.active = false;
    corals.length = 0;
    seaweed.length = 0;
    for (let i = 0; i < 10; i += 1) {
      corals.push({
        x: 30 + (i * (FIELD.width - 60)) / 9 + range(random, -22, 22),
        baseY: FIELD.floorY + 22,
        height: range(random, 42, 108),
        colour: pick(random, CORAL_COLOURS),
        branches: 3 + Math.floor(random() * 3),
        sway: range(random, 0, Math.PI * 2),
      });
    }
    for (let i = 0; i < 16; i += 1) {
      seaweed.push({
        x: range(random, 16, FIELD.width - 16),
        height: range(random, 34, 86),
        phase: range(random, 0, Math.PI * 2),
      });
    }
    state.score = 0;
    state.hearts = HEARTS;
    state.reef = 0;
    state.wave = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.banner = WAVES[0].banner;
    state.bannerTime = 3;
    state.pearlTimer = 0.4;
    state.planktonTimer = 0.2;
    state.powerTimer = POWERUP.interval;
    state.enemyTimer = 1.2;
    state.bubbleTimer = 0.1;
    state.over = false;
    state.won = false;
  }

  function freeEnemy() {
    for (const e of enemies) if (!e.active) return e;
    return null;
  }
  function freePickup() {
    for (const p of pickups) if (!p.active) return p;
    return null;
  }
  function freeParticle() {
    for (const p of particles) if (!p.active) return p;
    return null;
  }
  function freeBubble() {
    for (const b of bubbles) if (!b.active) return b;
    return null;
  }

  function burst(x, y, color, count, speed, ring) {
    for (let i = 0; i < count; i += 1) {
      const p = freeParticle();
      if (!p) return;
      const a = random() * Math.PI * 2;
      const v = range(random, speed * 0.3, speed);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - 20;
      p.maxLife = range(random, 0.35, 0.8);
      p.life = p.maxLife;
      p.size = range(random, 2, 5.5);
      p.color = color;
      p.ring = !!ring && i === 0;
    }
  }

  function spawnPearl() {
    const p = freePickup();
    if (!p) return;
    p.active = true;
    p.kind = KIND_PEARL;
    p.x = range(random, 40, FIELD.width - 40);
    p.y = range(random, 70, FIELD.height * 0.55);
    p.vx = 0;
    p.vy = PEARL.drift;
    p.r = PEARL.radius;
    p.phase = range(random, 0, Math.PI * 2);
  }

  function spawnPlankton() {
    const p = freePickup();
    if (!p) return;
    p.active = true;
    p.kind = KIND_PLANKTON;
    p.x = range(random, 30, FIELD.width - 30);
    p.y = range(random, 60, FIELD.height * 0.6);
    p.vx = 0;
    p.vy = PLANKTON.drift;
    p.r = PLANKTON.radius;
    p.phase = range(random, 0, Math.PI * 2);
  }

  function spawnPowerup() {
    const p = freePickup();
    if (!p) return;
    const roll = random();
    p.active = true;
    p.kind = roll < 0.4 ? KIND_SHIELD : roll < 0.75 ? KIND_MAGNET : KIND_STARFISH;
    p.x = range(random, 50, FIELD.width - 50);
    p.y = range(random, 70, FIELD.height * 0.5);
    p.vx = 0;
    p.vy = 30;
    p.r = POWERUP.radius;
    p.phase = range(random, 0, Math.PI * 2);
  }

  function spawnEnemy() {
    const wave = WAVES[state.wave - 1];
    const e = freeEnemy();
    if (!e) return;
    const bag = [];
    for (let i = 0; i < wave.lionfish; i += 1) bag.push(KIND_LIONFISH);
    for (let i = 0; i < wave.jelly; i += 1) bag.push(KIND_JELLY);
    for (let i = 0; i < wave.trash; i += 1) bag.push(KIND_TRASH);
    for (let i = 0; i < wave.shark; i += 1) bag.push(KIND_SHARK);
    const kind = pick(random, bag);
    const speed = ENEMY[kind].speed * wave.speed * range(random, 0.9, 1.15);
    e.active = true;
    e.kind = kind;
    e.r = ENEMY[kind].radius;
    e.phase = range(random, 0, Math.PI * 2);
    e.seed = random();
    if (kind === KIND_SHARK) {
      const fromLeft = random() < 0.5;
      e.x = fromLeft ? -50 : FIELD.width + 50;
      e.y = range(random, 110, FIELD.floorY - 70);
      e.vx = (fromLeft ? 1 : -1) * speed;
      e.vy = 0;
    } else if (kind === KIND_JELLY || kind === KIND_TRASH) {
      e.x = range(random, 40, FIELD.width - 40);
      e.y = -30;
      e.vx = range(random, -18, 18);
      e.vy = speed;
    } else {
      e.x = FIELD.width + 40;
      e.y = range(random, 80, FIELD.floorY - 60);
      e.vx = -speed;
      e.vy = 0;
    }
  }

  function comboMult() {
    return 1 + Math.min(state.combo, COMBO_MAX) * 0.25;
  }

  function collectPickup(p) {
    let events = EVENT_PICKUP;
    if (p.kind === KIND_PEARL) {
      const gain = Math.round(PEARL.score * comboMult());
      state.score += gain;
      state.reef = Math.min(REEF_MAX, state.reef + PEARL.reef);
      state.combo += 1;
      state.comboTimer = COMBO_WINDOW;
      burst(p.x, p.y, '#b8f6ff', 10, 130);
    } else if (p.kind === KIND_PLANKTON) {
      const gain = Math.round(PLANKTON.score * comboMult());
      state.score += gain;
      state.reef = Math.min(REEF_MAX, state.reef + PLANKTON.reef);
      state.combo += 1;
      state.comboTimer = COMBO_WINDOW;
      burst(p.x, p.y, '#ffe066', 7, 100);
    } else if (p.kind === KIND_SHIELD) {
      player.shield = true;
      player.shieldTime = POWERUP.shieldTime;
      state.score += 60;
      events |= EVENT_POWER;
      burst(p.x, p.y, '#7fe7ff', 12, 140, true);
    } else if (p.kind === KIND_MAGNET) {
      player.magnetTime = POWERUP.magnetTime;
      state.score += 60;
      events |= EVENT_POWER;
      burst(p.x, p.y, '#ff9a4d', 12, 140, true);
    } else {
      if (state.hearts < HEARTS) {
        state.hearts += 1;
        events |= EVENT_HEAL;
      } else {
        state.score += 100;
      }
      burst(p.x, p.y, '#ff8fb0', 12, 140, true);
    }
    p.active = false;
    if (state.reef >= REEF_MAX && !state.won) {
      state.won = true;
      events |= EVENT_WIN;
    }
    return events;
  }

  /**
   * One fixed step. `steer` is {x, y} keys (-1..1) and an optional `target`
   * {x, y} in field coordinates for pointer-follow. With `harmless` set (the
   * title screen's backdrop) things drift but nothing touches the turtle and
   * nothing scores, so the reef stays alive behind the menu.
   */
  function step(dt, steer, harmless) {
    let events = 0;
    state.time += dt;
    if (!harmless) state.elapsed += dt;
    if (state.bannerTime > 0) state.bannerTime -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Wave clock: every WAVE_SECONDS the tide turns and the banner shows.
    const waveNow = Math.min(WAVES.length, 1 + Math.floor(state.elapsed / WAVE_SECONDS));
    if (!harmless && waveNow !== state.wave) {
      state.wave = waveNow;
      state.banner = WAVES[waveNow - 1].banner;
      state.bannerTime = 3;
      events |= EVENT_WAVE;
    }

    // --- Turtle steering: keyboard acceleration, or glide toward a pointer target.
    const px = player.x;
    const py = player.y;
    if (steer && steer.target) {
      const dx = steer.target.x - px;
      const dy = steer.target.y - py;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const want = Math.min(TURTLE.maxSpeed, d * 4.5);
        player.vx += ((dx / d) * want - player.vx) * Math.min(1, dt * 7);
        player.vy += ((dy / d) * want - player.vy) * Math.min(1, dt * 7);
      } else {
        player.vx *= Math.max(0, 1 - dt * 6);
        player.vy *= Math.max(0, 1 - dt * 6);
      }
    } else {
      const sx = steer ? steer.x : 0;
      const sy = steer ? steer.y : 0;
      const len = Math.hypot(sx, sy) || 1;
      player.vx += (sx / len) * TURTLE.accel * dt * (sx === 0 && sy === 0 ? 0 : 1);
      player.vy += (sy / len) * TURTLE.accel * dt * (sx === 0 && sy === 0 ? 0 : 1);
      const drag = Math.max(0, 1 - TURTLE.drag * dt);
      player.vx *= drag;
      player.vy *= drag;
      const sp = Math.hypot(player.vx, player.vy);
      if (sp > TURTLE.maxSpeed) {
        player.vx = (player.vx / sp) * TURTLE.maxSpeed;
        player.vy = (player.vy / sp) * TURTLE.maxSpeed;
      }
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.x < player.r) { player.x = player.r; player.vx = Math.abs(player.vx) * 0.4; }
    if (player.x > FIELD.width - player.r) { player.x = FIELD.width - player.r; player.vx = -Math.abs(player.vx) * 0.4; }
    if (player.y < FIELD.surfaceY + player.r * 0.5) { player.y = FIELD.surfaceY + player.r * 0.5; player.vy = Math.abs(player.vy) * 0.4; }
    if (player.y > FIELD.floorY - player.r * 0.4) { player.y = FIELD.floorY - player.r * 0.4; player.vy = -Math.abs(player.vy) * 0.4; }
    const speedNow = Math.hypot(player.vx, player.vy);
    player.swim += dt * (2 + speedNow / 55);
    player.tilt = Math.max(-0.45, Math.min(0.45, player.vy * 0.0016));
    if (player.vx < -12) player.flip = true;
    else if (player.vx > 12) player.flip = false;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.shieldTime > 0) {
      player.shieldTime -= dt;
      if (player.shieldTime <= 0) player.shield = false;
    }
    if (player.magnetTime > 0) player.magnetTime -= dt;

    // --- Spawning (paused in harmless mode for enemies only; pearls still drift).
    state.pearlTimer -= dt;
    if (state.pearlTimer <= 0) {
      spawnPearl();
      state.pearlTimer = PEARL.interval + random() * PEARL.intervalJitter;
    }
    state.planktonTimer -= dt;
    if (state.planktonTimer <= 0) {
      spawnPlankton();
      state.planktonTimer = PLANKTON.interval + random() * PLANKTON.intervalJitter;
    }
    state.powerTimer -= dt;
    if (state.powerTimer <= 0) {
      spawnPowerup();
      state.powerTimer = POWERUP.interval + random() * 4;
    }
    if (!harmless) {
      state.enemyTimer -= dt;
      if (state.enemyTimer <= 0) {
        spawnEnemy();
        state.enemyTimer = WAVES[state.wave - 1].spawn * (0.8 + random() * 0.4);
      }
    }

    // --- Ambient bubbles rising from the reef.
    state.bubbleTimer -= dt;
    if (state.bubbleTimer <= 0) {
      const b = freeBubble();
      if (b) {
        b.active = true;
        b.x = range(random, 20, FIELD.width - 20);
        b.y = FIELD.floorY + 10;
        b.vy = range(random, 26, 55);
        b.r = range(random, 2, 5.5);
        b.wobble = range(random, 0, Math.PI * 2);
      }
      state.bubbleTimer = 0.22 + random() * 0.3;
    }
    for (const b of bubbles) {
      if (!b.active) continue;
      b.y -= b.vy * dt;
      b.x += Math.sin(state.time * 2 + b.wobble) * 12 * dt;
      if (b.y < FIELD.surfaceY - 10) b.active = false;
    }

    // --- Pickups: drift, wobble, magnet pull, collection.
    for (const p of pickups) {
      if (!p.active) continue;
      p.phase += dt * 3;
      if (player.magnetTime > 0 && !harmless) {
        const d2 = dist2(p.x, p.y, player.x, player.y);
        if (d2 < TURTLE.magnetRadius * TURTLE.magnetRadius) {
          const d = Math.sqrt(d2) || 1;
          p.vx += ((player.x - p.x) / d) * 900 * dt;
          p.vy += ((player.y - p.y) / d) * 900 * dt;
        }
      }
      p.x += (p.vx + Math.sin(p.phase) * 14) * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 2);
      p.vy = p.kind === KIND_PEARL ? PEARL.drift : p.kind === KIND_PLANKTON ? PLANKTON.drift : 30;
      if (p.y > FIELD.floorY + 16) { p.active = false; continue; }
      if (harmless) continue;
      const rr = p.r + player.r - 4;
      if (dist2(p.x, p.y, player.x, player.y) < rr * rr) events |= collectPickup(p);
    }

    // --- Enemies: swim their pattern, leave the field, or hit the turtle.
    for (const e of enemies) {
      if (!e.active) continue;
      e.phase += dt * 2;
      if (e.kind === KIND_JELLY) {
        e.x += (e.vx + Math.sin(e.phase) * 26) * dt;
        e.y += (e.vy + Math.cos(e.phase * 0.7) * 18) * dt;
      } else if (e.kind === KIND_TRASH) {
        e.x += (e.vx + Math.sin(e.phase * 0.8) * 22) * dt;
        e.y += e.vy * dt;
      } else if (e.kind === KIND_SHARK) {
        e.x += e.vx * dt;
        e.y += Math.sin(e.phase * 0.6) * 24 * dt;
      } else {
        e.x += e.vx * dt;
        e.y += Math.sin(e.phase) * 30 * dt;
      }
      if (e.x < -90 || e.x > FIELD.width + 90 || e.y > FIELD.floorY + 80 || e.y < -90) {
        e.active = false;
        continue;
      }
      if (harmless) continue;
      const rr = e.r + player.r - 6;
      if (dist2(e.x, e.y, player.x, player.y) >= rr * rr) continue;
      if (player.invulnerable > 0) continue;
      e.active = false;
      if (player.shield) {
        player.shield = false;
        player.shieldTime = 0;
        player.invulnerable = 1.0;
        burst(e.x, e.y, '#7fe7ff', 14, 180, true);
        events |= EVENT_HIT;
        continue;
      }
      state.hearts -= 1;
      state.combo = 0;
      state.comboTimer = 0;
      player.invulnerable = TURTLE.invulnerable;
      burst(player.x, player.y, '#ff5d7a', 16, 200);
      events |= EVENT_HIT;
      if (state.hearts <= 0) {
        state.over = true;
        events |= EVENT_OVER;
        break;
      }
    }

    // --- Particles fade and fall.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 26 * dt;
      p.vx *= Math.max(0, 1 - dt * 1.5);
    }

    if (state.won) events |= EVENT_WIN;
    return events;
  }

  reset();
  return { state, reset, step, comboMult };
}
