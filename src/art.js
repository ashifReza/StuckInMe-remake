// Character art drawn with canvas paths: shared by gameplay and the storyboard.
import { glow } from './util.js';

const INK = '#0b0d17';

// The boy. Origin = feet center. In the dream he wears a sleek dream-suit
// (helmet, glowing core, energy scarf); in bed (suit: false) he's in pajamas.
const SUIT = '#22305a';
const SUIT_PLATE = '#33497a';
const CYAN = '#7ff3ff';

export function drawBoy(ctx, o) {
  const { x, y, dir = 1, scale = 1, t = 0, pose = 'idle', p = 0, alpha = 1, ember = false, suit = true } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);

  const run = pose === 'run';
  const bob = run ? -Math.abs(Math.sin(t * 13)) * 3 : Math.sin(t * 2.2) * 1.1;
  const lean = pose === 'dash' ? 0.38 : run ? 0.1 : pose === 'hurt' ? -0.25 : 0;
  const ext = Math.sin(Math.min(1, p) * Math.PI); // attack extension 0..1..0
  const limb = suit ? '#111729' : INK;

  // ---- legs ----
  let la = 0;
  let lb = 0;
  if (run) {
    la = Math.sin(t * 13) * 0.75;
    lb = -la;
  } else if (pose === 'jump') {
    la = -0.6;
    lb = 0.35;
  } else if (pose === 'fall') {
    la = 0.25;
    lb = -0.35;
  } else if (pose === 'dash') {
    la = 0.9;
    lb = 0.6;
  }
  let frontLen = 14;
  if (pose === 'kick') {
    la = -1.5 * ext;
    frontLen = 14 + 6 * ext;
  } else if (pose === 'downKick') {
    la = 0.3;
    frontLen = 14 + 6 * ext;
  }
  ctx.lineCap = 'round';
  const leg = (hx, a, len) => {
    const fx = hx - Math.sin(a) * len;
    const fy = -15 + Math.cos(a) * len;
    ctx.strokeStyle = limb;
    ctx.lineWidth = suit ? 6 : 5;
    ctx.beginPath();
    ctx.moveTo(hx, -15);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    if (suit) {
      // boot with a glowing sole
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(-a);
      ctx.fillStyle = SUIT_PLATE;
      ctx.fillRect(-3.5, -3, 9, 5);
      ctx.fillStyle = CYAN;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillRect(-3.5, 1.5, 9, 1.6);
      ctx.restore();
    }
  };
  leg(-4, lb, 14);
  leg(4, la, frontLen);

  ctx.save();
  ctx.rotate(lean);

  // ---- energy scarf (suit) streaming behind ----
  const hy = -51 + bob;
  if (suit) {
    const sw = Math.sin(t * 6) * 3 + (run ? 6 : 0) + (pose === 'dash' ? 12 : 0);
    const lift = pose === 'fall' ? -10 : pose === 'jump' ? 6 : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = k ? 'rgba(200,255,255,0.35)' : 'rgba(110,235,255,0.42)';
      ctx.beginPath();
      ctx.moveTo(-4, -37);
      ctx.bezierCurveTo(-16, -40 + lift * 0.4, -24 - sw, -34 + lift + Math.sin(t * 7) * 3, -34 - sw * 1.4, -30 + lift + Math.sin(t * 7 + 1) * 5);
      ctx.lineTo(-30 - sw * 1.2, -25 + lift + Math.sin(t * 7 + 2) * 4);
      ctx.bezierCurveTo(-20 - sw * 0.6, -30 + lift * 0.6, -12, -32, -2, -32);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- body ----
  ctx.fillStyle = suit ? SUIT : '#1b2036';
  ctx.beginPath();
  ctx.moveTo(-11, -13);
  ctx.quadraticCurveTo(-13, -30, -8, -39);
  ctx.lineTo(8, -39);
  ctx.quadraticCurveTo(13, -30, 12, -13);
  if (suit) {
    ctx.lineTo(-11, -13);
  } else {
    ctx.lineTo(7, -10);
    ctx.lineTo(2, -14);
    ctx.lineTo(-3, -10);
    ctx.lineTo(-8, -14);
  }
  ctx.closePath();
  ctx.fill();
  if (suit) {
    // chest plate, belt and glowing seams
    ctx.fillStyle = SUIT_PLATE;
    ctx.beginPath();
    ctx.moveTo(-7, -37);
    ctx.lineTo(9, -37);
    ctx.lineTo(10, -24);
    ctx.quadraticCurveTo(1, -19, -8, -24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0d1222';
    ctx.fillRect(-11, -17, 23, 4);
    ctx.strokeStyle = 'rgba(127,243,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(11, -15);
    ctx.moveTo(10, -24);
    ctx.lineTo(11.5, -15);
    ctx.stroke();
    // reactor core
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(2, -29, 3, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, 2, -29, 12, 'rgba(127,243,255,0.9)', 0.7 + Math.sin(t * 4) * 0.2);
  } else {
    ctx.strokeStyle = 'rgba(160,210,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, -38);
    ctx.quadraticCurveTo(13, -30, 12, -14);
    ctx.stroke();
  }

  // ---- arms ----
  ctx.strokeStyle = limb;
  ctx.lineWidth = suit ? 4.5 : 4;
  ctx.beginPath();
  ctx.moveTo(-5, -33);
  ctx.lineTo(-10, -23 + (run ? Math.sin(t * 13) * 3 : 0));
  ctx.stroke();
  let fx = 8;
  let fy = -23 + (run ? -Math.sin(t * 13) * 3 : 0);
  if (pose === 'punch' || pose === 'beam') {
    fx = 9 + 17 * (pose === 'beam' ? 1 : ext);
    fy = -31;
  } else if (pose === 'upPunch') {
    fx = 5;
    fy = -36 - 17 * ext;
  } else if (pose === 'focus') {
    fx = 6;
    fy = -30;
  }
  ctx.beginPath();
  ctx.moveTo(4, -33);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  const hot = ember && (pose === 'punch' || pose === 'upPunch');
  if (suit) {
    // armored gauntlet
    ctx.fillStyle = hot ? '#ff9a4a' : SUIT_PLATE;
    ctx.beginPath();
    ctx.arc(fx, fy, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hot ? '#ffd2a0' : CYAN;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(fx, fy, 4.8, -1.2, 1.2);
    ctx.stroke();
    if (hot) glow(ctx, fx, fy, 16, 'rgba(255,150,70,0.9)');
  } else {
    ctx.fillStyle = '#e9eef5';
    ctx.beginPath();
    ctx.arc(fx, fy, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- head ----
  ctx.fillStyle = '#e9eef5';
  ctx.beginPath();
  ctx.ellipse(1, hy, 12.5, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  const blink = pose === 'sleep' || (t % 4.3 > 4.15 && pose !== 'hurt');
  ctx.fillStyle = '#05060a';
  if (blink) {
    ctx.fillRect(1, hy + 1, 5, 1.6);
    ctx.fillRect(7.5, hy + 1, 4, 1.6);
  } else if (pose === 'hurt') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#05060a';
    for (const ex of [3, 9]) {
      ctx.beginPath();
      ctx.moveTo(ex - 2.5, hy - 3);
      ctx.lineTo(ex + 2.5, hy + 3);
      ctx.moveTo(ex + 2.5, hy - 3);
      ctx.lineTo(ex - 2.5, hy + 3);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(3.2, hy + 0.5, 2.7, 4.8, 0, 0, Math.PI * 2);
    ctx.ellipse(9.3, hy + 0.5, 2.4, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = suit ? 'rgba(170,250,255,0.95)' : 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(3.8, hy - 1.6, 0.9, 0, Math.PI * 2);
    ctx.arc(9.8, hy - 1.6, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (suit) {
    // helmet shell over the top and back of the head
    ctx.fillStyle = SUIT;
    ctx.beginPath();
    ctx.moveTo(-12, hy + 9);
    ctx.quadraticCurveTo(-15, hy - 10, -4, hy - 15.5);
    ctx.quadraticCurveTo(8, hy - 19, 14, hy - 7);
    ctx.quadraticCurveTo(4, hy - 10, -2, hy - 6);
    ctx.quadraticCurveTo(-5, hy + 2, -6, hy + 10);
    ctx.closePath();
    ctx.fill();
    // lit rim where the helmet frames the face
    ctx.strokeStyle = 'rgba(127,243,255,0.8)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(14, hy - 7);
    ctx.quadraticCurveTo(4, hy - 10, -2, hy - 6);
    ctx.quadraticCurveTo(-5, hy + 2, -6, hy + 10);
    ctx.stroke();
    // swept-back crest fin with a lit edge
    ctx.fillStyle = SUIT_PLATE;
    ctx.beginPath();
    ctx.moveTo(-2, hy - 16);
    ctx.quadraticCurveTo(-10, hy - 26, -19, hy - 25);
    ctx.quadraticCurveTo(-12, hy - 19, -9, hy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-2, hy - 16);
    ctx.quadraticCurveTo(-10, hy - 26, -19, hy - 25);
    ctx.stroke();
    // ear module
    ctx.fillStyle = SUIT_PLATE;
    ctx.beginPath();
    ctx.arc(-6, hy + 2, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(-6, hy + 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, -6, hy + 2, 10, 'rgba(127,243,255,0.8)', 0.6);
  } else {
    // nightcap, its tail swinging behind
    const sw = Math.sin(t * 3) * 2 + (run ? 4 : 0);
    const dr = pose === 'jump' ? 8 : pose === 'fall' ? -8 : 0;
    const tipX = -26 - sw;
    const tipY = hy + 2 + dr;
    ctx.fillStyle = '#2a3a78';
    ctx.beginPath();
    ctx.moveTo(-12, hy - 4);
    ctx.bezierCurveTo(-8, hy - 19, 9, hy - 21, 13.5, hy - 7);
    ctx.quadraticCurveTo(-2, hy - 27, tipX, tipY);
    ctx.quadraticCurveTo(-15, hy - 12, -12, hy - 4);
    ctx.fill();
    ctx.strokeStyle = '#c9d6ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, hy - 4);
    ctx.quadraticCurveTo(1, hy - 12, 13.5, hy - 7);
    ctx.stroke();
    ctx.fillStyle = '#e4ecff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

// Morwen, the wicked witch. Origin = body center; about 160px tall plus hat.
export function drawWitch(ctx, o) {
  const { x, y, dir = 1, scale = 1, t = 0, pose = 'float', flash = 0, alpha = 1, aura = true } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);

  if (aura) glow(ctx, 0, 0, 150, 'rgba(150,60,230,0.45)', 0.8 + Math.sin(t * 3) * 0.2);

  // Hair streaming behind
  ctx.strokeStyle = '#1a0f26';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 2, -62);
    const w = Math.sin(t * 4 + i) * 8;
    ctx.bezierCurveTo(-30 - i * 4, -50 + w, -36 - i * 3, -20 - w, -46 - i * 5, -5 + i * 6 + w);
    ctx.stroke();
  }

  // Tattered robe
  const robe = ctx.createLinearGradient(0, -40, 0, 80);
  robe.addColorStop(0, '#2a1640');
  robe.addColorStop(1, '#0c0614');
  ctx.fillStyle = flash > 0 ? '#ffffff' : robe;
  ctx.beginPath();
  ctx.moveTo(-15, -42);
  ctx.quadraticCurveTo(-42, 10, -48, 70);
  for (let i = 0; i <= 8; i++) {
    const rx = -48 + i * 12;
    const ry = 70 + (i % 2 ? 16 + Math.sin(t * 6 + i) * 7 : Math.sin(t * 5 + i) * 3);
    ctx.lineTo(rx, ry);
  }
  ctx.quadraticCurveTo(42, 10, 15, -42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,120,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arms
  const cast = pose === 'cast';
  const raise = cast ? -1 : pose === 'swoop' ? 0.6 : Math.sin(t * 2) * 0.15;
  ctx.strokeStyle = '#0a0610';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const arm = (sx, s) => {
    const ex = sx + s * 34;
    const ey = -20 + raise * 40;
    ctx.beginPath();
    ctx.moveTo(sx, -36);
    ctx.quadraticCurveTo(sx + s * 26, -30, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#cfd6c4';
    ctx.lineWidth = 2;
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + s * 10, ey + f * 5 - 3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 5;
    if (cast) glow(ctx, ex + s * 8, ey, 34, 'rgba(200,110,255,0.9)', 0.8);
  };
  arm(-12, -1);
  arm(12, 1);

  // Face mask with hooked nose
  const hy = -58;
  ctx.fillStyle = flash > 0 ? '#ffffff' : '#d9d3e8';
  ctx.beginPath();
  ctx.ellipse(0, hy, 17, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, hy - 4);
  ctx.quadraticCurveTo(28, hy + 2, 30, hy + 12);
  ctx.quadraticCurveTo(20, hy + 6, 11, hy + 6);
  ctx.fill();
  // Glowing eyes
  const eyeC = pose === 'stunned' ? 'rgba(160,160,200,0.9)' : '#d48bff';
  ctx.fillStyle = eyeC;
  ctx.save();
  ctx.translate(-4, hy - 3);
  ctx.rotate(0.35);
  ctx.fillRect(-6, -1.6, 9, 3.4);
  ctx.restore();
  ctx.save();
  ctx.translate(8, hy - 3);
  ctx.rotate(-0.25);
  ctx.fillRect(-4, -1.6, 8, 3.4);
  ctx.restore();
  if (pose !== 'stunned') {
    glow(ctx, -4, hy - 3, 16, 'rgba(210,140,255,0.9)');
    glow(ctx, 8, hy - 3, 14, 'rgba(210,140,255,0.9)');
  }
  // Grin
  ctx.strokeStyle = '#2a1238';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(2, hy + 6, 9, 0.2, Math.PI - 0.5);
  ctx.stroke();

  // Crooked hat
  const bend = Math.sin(t * 1.5) * 4;
  ctx.fillStyle = '#0d0815';
  ctx.beginPath();
  ctx.ellipse(0, hy - 16, 38, 8, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-19, hy - 18);
  ctx.quadraticCurveTo(-10, hy - 70, 4 + bend, hy - 98);
  ctx.quadraticCurveTo(24 + bend, hy - 102, 30 + bend, hy - 84);
  ctx.quadraticCurveTo(16, hy - 82, 12, hy - 70);
  ctx.quadraticCurveTo(14, hy - 40, 20, hy - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7b3bc4';
  ctx.fillRect(-17, hy - 30, 36, 5);

  if (pose === 'stunned') {
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 26, hy - 34 + Math.sin(a) * 7, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Simple adult silhouettes for the storyboard (mom, dad)
export function drawParent(ctx, x, y, s, hair = '#3a2a22', dress = '#4b5b8a', dir = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.fillStyle = dress;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-11, -55);
  ctx.quadraticCurveTo(0, -62, 11, -55);
  ctx.lineTo(14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0d8c4';
  ctx.beginPath();
  ctx.ellipse(0, -72, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(-2, -78, 12, 9, 0, Math.PI, Math.PI * 2.1);
  ctx.fill();
  ctx.fillStyle = '#1a1a22';
  ctx.beginPath();
  ctx.arc(4, -72, 1.6, 0, Math.PI * 2);
  ctx.arc(-2, -72, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a0685a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(1, -67, 3.5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

// The Obsidian Knight: a modern, animated take on the original game's boss.
// Origin = feet center. Angles in radians: 0 points forward, + points down.
//   arm / sword   sword-arm and blade angles     shield  0 = at side, 1 = raised
//   walk          walk-cycle phase               crouch  0..1 knees bent
//   heat          lava-crack brightness 0..1     purple  0..1 the witch showing through
//   kneel         0..1 collapsing in defeat
export function drawKnight(ctx, o) {
  const { x, y, dir = 1, scale = 1, t = 0, arm = 1, sword = 0.9, shield = 0, walk = 0, moving = false,
    crouch = 0, heat = 0.6, purple = 0, flash = 0, alpha = 1, kneel = 0 } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);

  const lava = purple > 0.5 ? '#c27bff' : '#ff7a1a';
  const lavaCore = purple > 0.5 ? '#f1dcff' : '#ffd08a';
  const breathe = Math.sin(t * 2) * 2;
  const hipY = -78 + crouch * 16 + kneel * 34;
  const plate = (y0, y1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, flash > 0 ? '#ffffff' : '#433840');
    g.addColorStop(1, flash > 0 ? '#ffd9c0' : '#120e12');
    return g;
  };
  const crack = (pts, w = 2) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = lava;
    ctx.globalAlpha = alpha * (0.45 + heat * 0.55) * (0.8 + Math.sin(t * 5 + pts[0][0]) * 0.2);
    ctx.lineWidth = w + heat * 2;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.stroke();
    ctx.strokeStyle = lavaCore;
    ctx.lineWidth = w * 0.4;
    ctx.stroke();
    ctx.restore();
  };

  const rim = () => {
    ctx.strokeStyle = 'rgba(255,170,120,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // ---- cape, streaming behind ----
  ctx.fillStyle = '#120d12';
  ctx.beginPath();
  ctx.moveTo(-14, hipY - 70 + breathe);
  ctx.quadraticCurveTo(-48, hipY - 20, -58 - Math.sin(t * 2.5) * 6, -4);
  for (let i = 0; i <= 5; i++) ctx.lineTo(-58 + i * 10 - Math.sin(t * 3 + i) * 5, (i % 2 ? -14 : 0) - kneel * 6);
  ctx.quadraticCurveTo(-10, hipY + 10, -6, hipY - 60 + breathe);
  ctx.fill();

  // ---- legs ----
  const legA = moving ? Math.sin(walk) * 0.45 : 0;
  const leg = (hx, a, front) => {
    const kneeX = hx + Math.sin(a) * 34 + crouch * 10 + kneel * (front ? 26 : -4);
    const kneeY = hipY + Math.cos(a) * 34 - kneel * 4;
    const footX = kneeX - Math.sin(a * 0.6) * 10 - crouch * 8 + kneel * (front ? 0 : -24);
    const footY = front || kneel < 0.5 ? 0 : -2;
    ctx.strokeStyle = flash > 0 ? '#ffffff' : '#1a151a';
    ctx.lineCap = 'round';
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY - 6);
    ctx.stroke();
    // sabaton
    ctx.fillStyle = plate(-14, 0);
    ctx.beginPath();
    ctx.moveTo(footX - 12, footY);
    ctx.lineTo(footX - 8, footY - 14);
    ctx.lineTo(footX + 10, footY - 10);
    ctx.lineTo(footX + 22, footY);
    ctx.closePath();
    ctx.fill();
    // glowing knee
    ctx.fillStyle = lava;
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, 4 + heat * 2, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, kneeX, kneeY, 18, purple > 0.5 ? 'rgba(190,120,255,0.8)' : 'rgba(255,120,30,0.8)', 0.5 + heat * 0.4);
  };
  leg(-10, -legA, false);

  // ---- shield at the side (behind the body) ----
  const drawShield = (sx, sy, rot, s) => {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.scale(s, 1);
    ctx.fillStyle = plate(-60, 60);
    ctx.beginPath();
    ctx.moveTo(0, -62);
    ctx.quadraticCurveTo(26, -56, 24, -10);
    ctx.quadraticCurveTo(20, 30, 0, 64);
    ctx.quadraticCurveTo(-20, 30, -24, -10);
    ctx.quadraticCurveTo(-26, -56, 0, -62);
    ctx.fill();
    ctx.strokeStyle = '#3d3238';
    ctx.lineWidth = 3;
    ctx.stroke();
    crack([[0, -50], [4, -20], [-6, 4], [2, 34], [0, 52]], 2.5);
    crack([[-16, -20], [-6, -12], [-10, 6]], 1.5);
    ctx.restore();
  };
  if (shield < 0.5) drawShield(-26, hipY - 30 + breathe, 0.12, 0.75);

  // ---- torso ----
  const ty = hipY + breathe;
  ctx.fillStyle = plate(ty - 76, ty);
  ctx.beginPath();
  ctx.moveTo(-24, ty - 2);
  ctx.lineTo(-30, ty - 48);
  ctx.lineTo(-22, ty - 76);
  ctx.lineTo(22, ty - 78);
  ctx.lineTo(32, ty - 48);
  ctx.lineTo(22, ty - 2);
  ctx.closePath();
  ctx.fill();
  rim();
  // fauld (armored skirt)
  ctx.beginPath();
  ctx.moveTo(-26, ty - 6);
  ctx.lineTo(26, ty - 6);
  ctx.lineTo(30, ty + 18);
  ctx.lineTo(10, ty + 12);
  ctx.lineTo(0, ty + 22);
  ctx.lineTo(-12, ty + 12);
  ctx.lineTo(-30, ty + 18);
  ctx.closePath();
  ctx.fill();
  crack([[-8, ty - 70], [2, ty - 54], [-4, ty - 40], [8, ty - 24], [4, ty - 8]], 2.5);
  crack([[18, ty - 64], [10, ty - 50], [20, ty - 36]], 1.6);
  crack([[-22, ty - 40], [-12, ty - 30], [-18, ty - 14]], 1.6);

  leg(10, legA, true);

  // ---- helm with horns and a burning visor ----
  const hx = 6;
  const hy = ty - 96;
  ctx.fillStyle = plate(hy - 26, hy + 24);
  ctx.beginPath();
  ctx.moveTo(hx - 18, hy + 22);
  ctx.lineTo(hx - 20, hy - 12);
  ctx.quadraticCurveTo(hx - 8, hy - 30, hx + 14, hy - 22);
  ctx.lineTo(hx + 24, hy - 4);
  ctx.lineTo(hx + 22, hy + 14);
  ctx.lineTo(hx + 8, hy + 24);
  ctx.closePath();
  ctx.fill();
  rim();
  ctx.fillStyle = flash > 0 ? '#ffffff' : '#2a2128';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx - 8 + s * 4, hy - 20);
    ctx.quadraticCurveTo(hx - 26 + s * 6, hy - 50, hx - 40 + s * 4, hy - 56 - (s > 0 ? 6 : 0));
    ctx.quadraticCurveTo(hx - 24 + s * 4, hy - 38, hx - 2 + s * 4, hy - 16);
    ctx.fill();
    rim();
  }
  // visor slit
  const eyeCol = purple > 0.5 || (purple > 0 && Math.sin(t * 23) > 0.6) ? '#d48bff' : '#ffb347';
  ctx.fillStyle = eyeCol;
  ctx.beginPath();
  ctx.moveTo(hx + 2, hy - 4);
  ctx.lineTo(hx + 23, hy - 6);
  ctx.lineTo(hx + 22, hy);
  ctx.lineTo(hx + 4, hy + 1);
  ctx.closePath();
  ctx.fill();
  glow(ctx, hx + 14, hy - 3, 34, eyeCol === '#d48bff' ? 'rgba(212,139,255,0.9)' : 'rgba(255,170,60,0.9)', 0.9);

  // pauldron over the sword shoulder
  ctx.fillStyle = plate(ty - 90, ty - 50);
  ctx.beginPath();
  ctx.ellipse(16, ty - 68, 22, 15, -0.25, 0, Math.PI * 2);
  ctx.fill();
  rim();
  ctx.beginPath();
  ctx.moveTo(8, ty - 80);
  ctx.lineTo(18, ty - 104);
  ctx.lineTo(26, ty - 78);
  ctx.fill();

  // ---- sword arm and blade ----
  const shX = 16;
  const shY = ty - 66;
  const handX = shX + Math.cos(arm) * 52;
  const handY = shY + Math.sin(arm) * 52;
  ctx.strokeStyle = flash > 0 ? '#ffffff' : '#1d171c';
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(sword);
  // crossguard + jagged blade with a molten core
  ctx.fillStyle = '#251c22';
  ctx.fillRect(-4, -14, 8, 28);
  ctx.fillStyle = plate(-14, 14);
  ctx.beginPath();
  ctx.moveTo(4, -13);
  const L = 160;
  for (let i = 1; i <= 6; i++) ctx.lineTo(4 + (L * i) / 7, -13 + (i % 2 ? -4 : 3) + i * 1.2);
  ctx.lineTo(4 + L, 0);
  for (let i = 6; i >= 1; i--) ctx.lineTo(4 + (L * i) / 7, 13 + (i % 2 ? 4 : -3) - i * 1.2);
  ctx.lineTo(4, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,160,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createLinearGradient(0, 0, L, 0);
  core.addColorStop(0, lavaCore);
  core.addColorStop(1, lava);
  ctx.strokeStyle = core;
  ctx.globalAlpha = alpha * (0.6 + heat * 0.4);
  ctx.lineWidth = 3 + heat * 2;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  for (let i = 1; i <= 6; i++) ctx.lineTo(10 + (L * i) / 7, (i % 2 ? 2 : -2) * Math.sin(t * 6 + i));
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  glow(ctx, handX + Math.cos(sword) * 80, handY + Math.sin(sword) * 80, 90, purple > 0.5 ? 'rgba(180,100,255,0.35)' : 'rgba(255,110,30,0.35)', 0.5 + heat * 0.5);
  // gauntlet
  ctx.fillStyle = plate(-8, 8);
  ctx.beginPath();
  ctx.arc(handX, handY, 9, 0, Math.PI * 2);
  ctx.fill();

  // ---- shield raised in front ----
  if (shield >= 0.5) drawShield(30 + shield * 6, ty - 46, 0, 1);

  ctx.restore();
}
