// Drawing only: the world's state and the current screen in, pixels out. The
// 960x540 playfield is scaled to fit the window and centred, the margin filled
// with deep water. All art is procedural canvas work — coral, turtle, fish,
// bubbles, god rays and glow — no image files anywhere.
import { FIELD, FONT, HEARTS, PALETTE, REEF_MAX } from './config.js';
import {
  KIND_JELLY, KIND_LIONFISH, KIND_MAGNET, KIND_PEARL, KIND_PLANKTON,
  KIND_SHARK, KIND_SHIELD, KIND_STARFISH, KIND_TRASH,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const CORAL_HEX = {
  pink: '#ff6fa5', orange: '#ff9a4d', purple: '#b388ff', green: '#3ddc97',
};

function starPath(ctx, x, y, r, points, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * inner;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.1, y + s * 0.1, x - s * 0.7, y - s * 0.9, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.1, y + s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };
  const fonts = new Map();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    view.dpr = dpr;
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.x = (w - FIELD.width * view.scale) / 2;
    view.y = (h - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawWater(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.waterTop);
    g.addColorStop(0.45, PALETTE.waterMid);
    g.addColorStop(1, PALETTE.waterDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // God rays: slow translucent beams from the surface.
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#eafcff';
    for (let i = 0; i < 5; i += 1) {
      const base = 90 + i * 190 + Math.sin(state.time * 0.11 + i * 1.7) * 26;
      ctx.beginPath();
      ctx.moveTo(base, 0);
      ctx.lineTo(base + 46, 0);
      ctx.lineTo(base + 130, FIELD.height);
      ctx.lineTo(base + 40, FIELD.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Distant reef silhouettes for depth.
    ctx.fillStyle = 'rgba(4, 52, 96, 0.35)';
    for (let i = 0; i < 4; i += 1) {
      const bx = 60 + i * 260;
      ctx.beginPath();
      ctx.ellipse(bx, FIELD.floorY + 6, 150, 42, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawFloor(state) {
    ctx.fillStyle = PALETTE.sand;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.floorY);
    for (let x = 0; x <= FIELD.width; x += 60) {
      ctx.lineTo(x, FIELD.floorY + Math.sin(x * 0.02 + 1.3) * 4);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.sandDark;
    for (let i = 0; i < 26; i += 1) {
      const sx = ((i * 137.5) % FIELD.width);
      const sy = FIELD.floorY + 14 + ((i * 53) % 34);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 7 + (i % 3) * 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Swaying seaweed between the corals.
    for (const w of state.seaweed) {
      const sway = Math.sin(state.time * 1.4 + w.phase) * 9;
      ctx.strokeStyle = '#2fae6e';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w.x, FIELD.floorY + 20);
      ctx.quadraticCurveTo(w.x + sway * 0.5, FIELD.floorY + 20 - w.height * 0.6, w.x + sway, FIELD.floorY + 20 - w.height);
      ctx.stroke();
    }
  }

  function drawCorals(state) {
    const health = state.reef / REEF_MAX;
    for (const c of state.corals) {
      const sway = Math.sin(state.time * 0.9 + c.sway) * 4;
      const colour = CORAL_HEX[c.colour] || PALETTE.coralPink;
      // Grey skeleton first, then the living colour over it: a pale reef blooms
      // back to colour as the turtle restores it.
      for (const pass of [PALETTE.coralGrey, colour]) {
        if (pass !== PALETTE.coralGrey) ctx.globalAlpha = 0.3 + 0.7 * health;
        ctx.strokeStyle = pass;
        ctx.lineCap = 'round';
        for (let b = 0; b < c.branches; b += 1) {
          const spread = (b - (c.branches - 1) / 2) * 13;
          ctx.lineWidth = 7 - b * 0.6;
          ctx.beginPath();
          ctx.moveTo(c.x, c.baseY);
          ctx.quadraticCurveTo(
            c.x + spread * 0.5 + sway, c.baseY - c.height * 0.55,
            c.x + spread + sway, c.baseY - c.height * (0.75 + ((b * 37) % 20) / 100),
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(c.x + spread + sway, c.baseY - c.height * (0.75 + ((b * 37) % 20) / 100), 5.5, 0, Math.PI * 2);
          ctx.fillStyle = pass;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawBubbles(state) {
    for (const b of state.bubbles) {
      if (!b.active) continue;
      ctx.strokeStyle = 'rgba(230, 250, 255, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPickups(state) {
    for (const p of state.pickups) {
      if (!p.active) continue;
      const pulse = 1 + Math.sin(p.phase) * 0.12;
      if (p.kind === KIND_PEARL) {
        ctx.save();
        ctx.shadowColor = PALETTE.pearlGlow;
        ctx.shadowBlur = 16;
        ctx.fillStyle = PALETTE.pearl;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#cfeeff';
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === KIND_PLANKTON) {
        ctx.fillStyle = PALETTE.plankton;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(p.x - 2, p.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === KIND_SHIELD) {
        ctx.save();
        ctx.shadowColor = PALETTE.shield;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = PALETTE.shield;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(127, 231, 255, 0.35)';
        ctx.fill();
        ctx.restore();
        text('✦', p.x, p.y + 5, 14, '#eafcff', 'center');
      } else if (p.kind === KIND_MAGNET) {
        ctx.save();
        ctx.strokeStyle = PALETTE.coralOrange;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.8, Math.PI * 0.15, Math.PI * 0.85, false);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - p.r * 0.8 - 2, p.y - 6, 6, 8);
        ctx.fillRect(p.x + p.r * 0.8 - 4, p.y - 6, 6, 8);
        ctx.restore();
      } else if (p.kind === KIND_STARFISH) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.phase * 0.5) * 0.3);
        ctx.fillStyle = '#ff8fb0';
        starPath(ctx, 0, 0, p.r * pulse, 5, 0.45);
        ctx.fill();
        ctx.fillStyle = '#ffd3e0';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawEnemies(state) {
    for (const e of state.enemies) {
      if (!e.active) continue;
      const wob = Math.sin(e.phase) * 0.12;
      if (e.kind === KIND_LIONFISH) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(wob);
        ctx.fillStyle = PALETTE.lionfish;
        for (let s = 0; s < 7; s += 1) {
          const a = -Math.PI * 0.85 + (s * Math.PI * 1.7) / 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * e.r * 1.5, Math.sin(a) * e.r * 1.5);
          ctx.lineTo(Math.cos(a + 0.18) * e.r * 0.5, Math.sin(a + 0.18) * e.r * 0.5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, e.r * 0.95, e.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-e.r * 0.55, -3, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c2733';
        ctx.beginPath();
        ctx.arc(-e.r * 0.55, -3, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.kind === KIND_JELLY) {
        const squash = 1 + Math.sin(e.phase * 1.6) * 0.1;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(1, squash);
        ctx.fillStyle = 'rgba(230, 168, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, e.r, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(230, 168, 255, 0.9)';
        ctx.lineWidth = 2.4;
        for (let t = -2; t <= 2; t += 1) {
          ctx.beginPath();
          ctx.moveTo(t * e.r * 0.36, e.r * 0.7);
          ctx.quadraticCurveTo(t * e.r * 0.36 + Math.sin(e.phase + t) * 7, e.r * 1.3, t * e.r * 0.36 + Math.sin(e.phase * 1.3 + t * 2) * 9, e.r * 1.9);
          ctx.stroke();
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, -6, 2.6, 0, Math.PI * 2);
        ctx.arc(5, -6, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.kind === KIND_TRASH) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.sin(e.phase * 0.7) * 0.25);
        if (e.seed < 0.5) {
          ctx.fillStyle = 'rgba(216, 222, 230, 0.92)';
          ctx.beginPath();
          ctx.moveTo(-11, -12);
          ctx.quadraticCurveTo(0, -20, 11, -12);
          ctx.lineTo(13, 8);
          ctx.quadraticCurveTo(0, 16, -13, 8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#9aa7b5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-8, -12);
          ctx.quadraticCurveTo(-4, -20, 0, -12);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(120, 200, 220, 0.85)';
          roundRect(-7, -14, 14, 28, 5);
          ctx.fill();
          ctx.fillStyle = '#e2574c';
          ctx.fillRect(-4, -19, 8, 6);
        }
        ctx.restore();
      } else if (e.kind === KIND_SHARK) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const facing = e.vx >= 0 ? 1 : -1;
        ctx.scale(facing, 1);
        ctx.fillStyle = PALETTE.shark;
        ctx.beginPath();
        ctx.moveTo(-e.r * 1.6, 0);
        ctx.lineTo(-e.r * 0.9, -e.r * 0.5);
        ctx.lineTo(-e.r * 0.9, e.r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, e.r * 1.05, e.r * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, -e.r * 0.4);
        ctx.lineTo(6, -e.r * 1.05);
        ctx.lineTo(14, -e.r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(e.r * 0.55, -e.r * 0.16, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10202e';
        ctx.beginPath();
        ctx.arc(e.r * 0.55, -e.r * 0.16, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(e.r * 0.85, e.r * 0.18);
        ctx.lineTo(e.r * 0.62, e.r * 0.18);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawTurtle(state) {
    const p = state.player;
    const flap = Math.sin(p.swim * 6) * 0.5;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.rotate(p.tilt * (p.flip ? -1 : 1));
    if (p.flip) ctx.scale(-1, 1);
    if (playerShield(state)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(127, 231, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.shadowColor = PALETTE.shield;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Flippers.
    ctx.fillStyle = '#3aa876';
    for (const [fx, fy, fa] of [[-14, -12, -0.5], [-14, 12, 0.5], [16, -10, -0.35], [16, 10, 0.35]]) {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(fa + flap * (fy < 0 ? 1 : -1) * 0.7);
      ctx.beginPath();
      ctx.ellipse(-8, 0, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Head.
    ctx.fillStyle = '#57bd8a';
    ctx.beginPath();
    ctx.arc(p.r + 6, -1, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10202e';
    ctx.beginPath();
    ctx.arc(p.r + 9, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.r + 10, -5, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // Shell with a plate pattern.
    ctx.fillStyle = PALETTE.turtleShell;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r + 2, p.r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e6b43';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 0.62, p.r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-p.r * 0.62, 0);
    ctx.lineTo(p.r * 0.62, 0);
    ctx.moveTo(0, -p.r * 0.5);
    ctx.lineTo(0, p.r * 0.5);
    ctx.stroke();
    ctx.fillStyle = PALETTE.turtleBelly;
    ctx.beginPath();
    ctx.ellipse(0, p.r * 0.55, p.r * 0.55, p.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function playerShield(state) {
    return state.player.shield;
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - p.life / p.maxLife) * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best, muted) {
    ctx.fillStyle = PALETTE.hudBg;
    roundRect(12, 10, FIELD.width - 24, 44, 12);
    ctx.fill();
    ctx.textBaseline = 'alphabetic';
    text(`Score ${state.score}`, 26, 40, 22, PALETTE.text, 'left', 'bold');
    text(`Best ${Math.max(best, state.score)}`, 168, 40, 16, PALETTE.muted, 'left');
    // Reef meter in the middle.
    const mx = FIELD.width / 2 - 110;
    text('Reef', mx - 8, 40, 17, PALETTE.text, 'right', 'bold');
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(mx, 22, 150, 18, 9);
    ctx.fill();
    const reefW = (state.reef / REEF_MAX) * 150;
    const rg = ctx.createLinearGradient(mx, 0, mx + 150, 0);
    rg.addColorStop(0, '#3ddc97');
    rg.addColorStop(1, '#19c8d8');
    ctx.fillStyle = rg;
    if (reefW > 0) {
      roundRect(mx, 22, Math.max(18, reefW), 18, 9);
      ctx.fill();
    }
    text(`${Math.floor(state.reef)}%`, mx + 158, 40, 17, PALETTE.text, 'left', 'bold');
    // Wave, hearts, combo on the right: wave text ends before the hearts start.
    text(`Wave ${state.wave}/5`, FIELD.width - 100, 40, 17, PALETTE.text, 'right', 'bold');
    for (let i = 0; i < HEARTS; i += 1) {
      ctx.fillStyle = i < state.hearts ? PALETTE.heart : 'rgba(255,255,255,0.25)';
      heartPath(ctx, FIELD.width - 88 + i * 26, 26, 9);
      ctx.fill();
    }
    if (state.combo >= 2) {
      const mult = (1 + Math.min(state.combo, 8) * 0.25).toFixed(2).replace(/0$/, '');
      ctx.fillStyle = PALETTE.gold;
      roundRect(FIELD.width - 118, 62, 106, 24, 8);
      ctx.fill();
      text(`Combo x${mult}`, FIELD.width - 65, 79, 14, '#3a2b00', 'center', 'bold');
    }
    // Bottom hint sits on a dark pill so it stays readable over the sand.
    const hint = muted ? 'Muted (M)' : (state.elapsed < 6 ? 'WASD / arrows / mouse — collect pearls, dodge the spiky ones!  P pause · M mute' : null);
    if (hint) {
      ctx.fillStyle = 'rgba(4, 28, 44, 0.55)';
      roundRect(18, FIELD.height - 34, hint.length > 20 ? 580 : 130, 24, 12);
      ctx.fill();
      text(hint, 30, FIELD.height - 16, 14, '#eaf7fb', 'left');
    }
    if (state.bannerTime > 0) {
      ctx.globalAlpha = Math.min(1, state.bannerTime);
      text(state.banner, FIELD.width / 2, 96, 30, '#ffffff', 'center', 'bold');
      ctx.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = 620;
    const h = 150 + lines.length * 30;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = 'rgba(3, 32, 56, 0.88)';
    roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = accent || PALETTE.coralOrange;
    ctx.lineWidth = 3;
    roundRect(x, y, w, h, 18);
    ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 64, 44, PALETTE.text, 'center', 'bold');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 108 + i * 30, 19, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + h - 30, 20, PALETTE.gold, 'center', 'bold');
  }

  function drawField(state) {
    drawWater(state);
    drawCorals(state);
    drawFloor(state);
    drawBubbles(state);
    drawPickups(state);
    drawEnemies(state);
    drawTurtle(state);
    drawParticles(state);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen. */
  function draw(state, screen, best, muted) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('TERUMBU', [
        'Reef Guardian — guard the coral, gather the light.',
        'Steer with WASD / arrows or your mouse. Pearls restore the reef.',
        'Dodge lionfish, jellyfish, sharks and drifting trash. 3 hearts.',
        `Reef to 100% to win.  Best score: ${best}`,
      ], 'Press Space, Enter or click to dive in', PALETTE.coralOrange);
      return;
    }
    drawHud(state, best, muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The reef waits for you. Take a breath.'], 'Press P or Space to keep swimming', PALETTE.shield);
    } else if (screen === SCREEN_OVER) {
      drawPanel('The reef fades…', [
        `Score ${state.score}   ·   Best ${Math.max(best, state.score)}`,
        `Reef restored ${Math.floor(state.reef)}%   ·   Reached wave ${state.wave}`,
        'The turtle will try again — the reef still needs you.',
      ], 'Press R, Space or click to try again', PALETTE.heart);
    } else if (screen === SCREEN_WIN) {
      drawPanel('THE REEF BLOOMS!', [
        `Score ${state.score}   ·   Best ${Math.max(best, state.score)}`,
        `Reef restored 100%   ·   Wave ${state.wave}   ·   Hearts left ${state.hearts}`,
        'Every coral glows again, thanks to you, Guardian.',
      ], 'Press R, Space or click to play again', PALETTE.coralGreen);
    }
  }

  /** Convert CSS pixels on the canvas to field coordinates for pointer-follow. */
  function toField(cssX, cssY) {
    return {
      x: (cssX * view.dpr - view.x) / view.scale,
      y: (cssY * view.dpr - view.y) / view.scale,
    };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
