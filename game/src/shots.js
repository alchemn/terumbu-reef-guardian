// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (flee the nearest hazard, chase the nearest pearl), so the frame is
// what a short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
/** How close a hazard must be before the play autopilot swerves away from it. */
const FLEE_PLAY = 150;

/** A steering vector toward the nearest pearl, away from nearby hazards. */
function autopilot(state, fleeRadius) {
  const p = state.player;
  let tx = FIELD.width / 2;
  let ty = FIELD.height / 2;
  let bestD = Infinity;
  for (const item of state.pickups) {
    if (!item.active) continue;
    const d = (item.x - p.x) ** 2 + (item.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      tx = item.x;
      ty = item.y;
    }
  }
  let ax = tx - p.x;
  let ay = ty - p.y;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < fleeRadius && d > 1) {
      const push = (fleeRadius - d) / fleeRadius;
      ax += (dx / d) * 420 * push;
      ay += (dy / d) * 420 * push;
    }
  }
  const len = Math.hypot(ax, ay) || 1;
  return { x: ax / len, y: ay / len };
}

/** A reckless steering vector: straight at the nearest hazard, as a hurried
 * player who never looks where they are going. This is what ends the game. */
function recklessPilot(state) {
  const p = state.player;
  let tx = FIELD.width / 2;
  let ty = FIELD.height / 2;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      tx = e.x;
      ty = e.y;
    }
  }
  const ax = tx - p.x;
  const ay = ty - p.y;
  const len = Math.hypot(ax, ay) || 1;
  return { x: ax / len, y: ay / len };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let over = false;
  for (let i = 0; i < limit / STEP; i += 1) {
    const steer = name === 'end' ? recklessPilot(world.state) : autopilot(world.state, FLEE_PLAY);
    if (world.step(STEP, steer, false) & EVENT_OVER) {
      over = true;
      break;
    }
    if (world.state.won) break;
  }
  if (world.state.won) return { screen: SCREEN_PLAY, best: world.state.score };
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
