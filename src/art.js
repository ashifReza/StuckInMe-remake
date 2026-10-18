// Character art drawn with canvas paths: shared by gameplay and the storyboard.
import { glow } from './util.js';

const INK = '#0b0d17';

// The boy: pale round face, big dark eyes, floppy nightcap. Origin = feet center.
export function drawBoy(ctx, o) {
  const { x, y, dir = 1, scale = 1, t = 0, pose = 'idle', p = 0, alpha = 1, ember = false } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);

  const run = pose === 'run';
  const bob = run ? -Math.abs(Math.sin(t * 13)) * 3 : Math.sin(t * 2.2) * 1.1;
  const lean = pose === 'dash' ? 0.38 : run ? 0.1 : pose === 'hurt' ? -0.25 : 0;
  const ext = Math.sin(Math.min(1, p) * Math.PI); // attack extension 0..1..0

  // Legs
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
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
  const leg = (hx, a, len) => {
    ctx.beginPath();
    ctx.moveTo(hx, -15);
    ctx.lineTo(hx - Math.sin(a) * len, -15 + Math.cos(a) * len);
    ctx.stroke();
  };
  leg(-4, lb, 14);
  leg(4, la, frontLen);

  ctx.save();
  ctx.rotate(lean);

  // Nightgown body
  ctx.fillStyle = '#1b2036';
  ctx.beginPath();
  ctx.moveTo(-11, -13);
  ctx.quadraticCurveTo(-13, -30, -8, -39);
  ctx.lineTo(8, -39);
  ctx.quadraticCurveTo(13, -30, 12, -13);
  ctx.lineTo(7, -10);
  ctx.lineTo(2, -14);
  ctx.lineTo(-3, -10);
  ctx.lineTo(-8, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,210,255,0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, -38);
  ctx.quadraticCurveTo(13, -30, 12, -14);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
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
  ctx.fillStyle = ember && (pose === 'punch' || pose === 'upPunch') ? '#ffb070' : '#e9eef5';
  ctx.beginPath();
  ctx.arc(fx, fy, 3.6, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const hy = -51 + bob;
  ctx.fillStyle = '#e9eef5';
  ctx.beginPath();
  ctx.ellipse(1, hy, 12.5, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (with an occasional blink)
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
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(3.8, hy - 1.6, 0.9, 0, Math.PI * 2);
    ctx.arc(9.8, hy - 1.6, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nightcap, its tail swinging behind
  const sw = Math.sin(t * 3) * 2 + (run ? 4 : 0) + (pose === 'dash' ? 8 : 0);
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
