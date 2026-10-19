import { W, H, roundRect, glow, FONT_TITLE, FONT_BODY, clamp } from './util.js';
import { POWERS, LEVELS } from './levels.js';
import { SOUL_COST, SOUL_MAX } from './player.js';
import { BOSS_NAME } from './boss.js';
import { drawBoy } from './art.js';

function mask(ctx, x, y, full, pulse = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(12, -16, 13, -4, 11, 6);
  ctx.quadraticCurveTo(8, 16, 0, 18);
  ctx.quadraticCurveTo(-8, 16, -11, 6);
  ctx.bezierCurveTo(-13, -4, -12, -16, 0, -16);
  if (full) {
    ctx.fillStyle = '#eef3f8';
    ctx.fill();
    ctx.fillStyle = '#0a0b12';
    ctx.beginPath();
    ctx.ellipse(-4.5, 0, 2.6, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(4.5, 0, 2.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(10,12,20,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,215,235,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  if (pulse > 0) glow(ctx, x, y, 30, 'rgba(255,255,255,0.8)', pulse);
}

export function drawHUD(ctx, g) {
  const p = g.player;
  // Soul vessel
  const sx = 62;
  const sy = 62;
  const R = 36;
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,18,0.75)';
  ctx.beginPath();
  ctx.arc(sx, sy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy, R - 4, 0, Math.PI * 2);
  ctx.clip();
  const lvl = sy + R - (p.soul / SOUL_MAX) * (R * 2);
  const grad = ctx.createLinearGradient(0, lvl, 0, sy + R);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#a9cfee');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(sx - R, sy + R);
  for (let x = -R; x <= R; x += 4) ctx.lineTo(sx + x, lvl + Math.sin(g.t * 4 + x * 0.15) * 2.5);
  ctx.lineTo(sx + R, sy + R);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#dfe6f2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, R, 0, Math.PI * 2);
  ctx.stroke();
  // little horns to frame the vessel
  ctx.fillStyle = '#dfe6f2';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + s * 20, sy - R + 6);
    ctx.quadraticCurveTo(sx + s * 34, sy - R - 14, sx + s * 26, sy - R - 22);
    ctx.quadraticCurveTo(sx + s * 26, sy - R - 6, sx + s * 12, sy - R + 2);
    ctx.fill();
  }
  if (p.soul >= SOUL_COST) glow(ctx, sx, sy, 60, 'rgba(200,230,255,0.4)', 0.5 + Math.sin(g.t * 4) * 0.2);

  // Masks
  for (let i = 0; i < p.maxHp; i++) mask(ctx, 120 + i * 30, 50, i < p.hp, i === p.hp - 1 && p.hp === 1 ? 0.4 + Math.sin(g.t * 8) * 0.3 : 0);

  // Power icons
  POWERS.forEach((pw, i) => {
    const x = 120 + i * 34;
    const y = 88;
    const on = g.powers.has(pw.id);
    ctx.fillStyle = on ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.35)';
    roundRect(ctx, x - 13, y - 13, 26, 26, 6);
    ctx.fill();
    ctx.strokeStyle = on ? '#e6d7a8' : 'rgba(200,200,220,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = on ? ['#ffb070', '#cfe0ff', '#ffffff', '#ff9ad5'][i] : 'rgba(200,200,220,0.25)';
    ctx.font = `700 13px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillText(['E', 'M', 'B', 'H'][i], x, y + 5);
  });

  // Score + next unlock
  ctx.textAlign = 'right';
  ctx.font = `700 13px ${FONT_TITLE}`;
  ctx.fillStyle = 'rgba(220,225,240,0.6)';
  ctx.fillText('DREAM ESSENCE', W - 32, 38);
  ctx.font = `700 32px ${FONT_TITLE}`;
  ctx.fillStyle = '#f2f4fa';
  ctx.fillText(String(Math.floor(g.shownScore)), W - 32, 72);
  const next = POWERS.find((pw) => !g.powers.has(pw.id));
  if (next) {
    ctx.font = `italic 600 17px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(220,225,240,0.6)';
    ctx.fillText(`Next power: ${next.name} at ${next.at}`, W - 32, 96);
  }
  if (g.combo >= 3) {
    ctx.font = `700 20px ${FONT_TITLE}`;
    ctx.fillStyle = `rgba(255,220,150,${clamp(g.comboT / 0.5, 0, 1)})`;
    ctx.fillText(`${g.combo} HIT COMBO`, W - 32, 126);
  }

  // Level progress / boss bar
  ctx.textAlign = 'center';
  if (g.boss) {
    const b = g.boss;
    const bw = 620;
    const bx = W / 2 - bw / 2;
    const by = H - 46;
    ctx.font = `700 18px ${FONT_TITLE}`;
    ctx.fillStyle = '#f0e2ff';
    ctx.fillText(BOSS_NAME.toUpperCase(), W / 2, by - 14);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 4, by - 4, bw + 8, 20);
    const k = clamp(b.shown / b.maxHp, 0, 1);
    const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    bg.addColorStop(0, '#7b2fd0');
    bg.addColorStop(1, '#ff6fd8');
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, bw * k, 12);
    ctx.strokeStyle = '#d9c4f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 4, by - 4, bw + 8, 20);
    for (const m of [0.33, 0.66]) {
      ctx.fillStyle = '#d9c4f0';
      ctx.fillRect(bx + bw * m - 1, by - 4, 2, 20);
    }
  } else {
    ctx.font = `700 15px ${FONT_TITLE}`;
    ctx.fillStyle = 'rgba(230,232,245,0.75)';
    ctx.fillText(g.level.name.toUpperCase(), W / 2, 36);
    const left = Math.max(0, g.level.quota - g.kills);
    ctx.font = `italic 600 18px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(220,225,240,0.6)';
    ctx.fillText(left > 0 ? `${left} creature${left === 1 ? '' : 's'} remain` : g.door ? 'Find the dream-door ▸' : 'Defeat the last of them', W / 2, 60);
  }
  ctx.textAlign = 'left';
}

export function drawLevelCard(ctx, g) {
  const t = g.introT;
  if (t <= 0) return;
  const a = Math.min(1, t / 0.6, (3.2 - t) / 0.4);
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 230, W, 170);
  ctx.textAlign = 'center';
  ctx.font = `700 16px ${FONT_TITLE}`;
  ctx.fillStyle = g.level.theme.accent;
  ctx.fillText(g.level.boss ? 'FINAL LEVEL' : `LEVEL ${g.li + 1} OF ${LEVELS.length}`, W / 2, 278);
  ctx.font = `700 52px ${FONT_TITLE}`;
  ctx.fillStyle = '#f4f2fb';
  ctx.fillText(g.level.name, W / 2, 336);
  ctx.font = `italic 600 22px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(230,230,245,0.75)';
  ctx.fillText(g.level.sub, W / 2, 372);
  ctx.restore();
}

export function drawBanner(ctx, g) {
  const b = g.banner;
  if (!b) return;
  const a = clamp(Math.min(b.t / 0.4, (b.life - b.t) / 0.5), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  glow(ctx, W / 2, 200, 360, 'rgba(255,230,170,0.35)');
  ctx.textAlign = 'center';
  ctx.font = `700 15px ${FONT_TITLE}`;
  ctx.fillStyle = '#ffe2a6';
  ctx.fillText('NEW POWER AWAKENED', W / 2, 170);
  ctx.font = `700 44px ${FONT_TITLE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(b.name, W / 2, 218);
  ctx.font = `italic 600 22px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(240,235,220,0.85)';
  ctx.fillText(b.desc, W / 2, 252);
  ctx.restore();
}

export function drawToasts(ctx, g) {
  ctx.textAlign = 'center';
  ctx.font = `italic 600 20px ${FONT_BODY}`;
  g.toasts.forEach((m, i) => {
    ctx.globalAlpha = clamp(m.life / 0.4, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const w = ctx.measureText(m.text).width + 40;
    roundRect(ctx, W / 2 - w / 2, H - 120 - i * 40, w, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#eef0f8';
    ctx.fillText(m.text, W / 2, H - 98 - i * 40);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ---------- menus ----------
export function drawTitle(ctx, t, size = 92, y = 210) {
  ctx.save();
  ctx.textAlign = 'center';
  glow(ctx, W / 2, y - 30, 420, 'rgba(150,200,255,0.18)');
  ctx.font = `700 ${size}px ${FONT_TITLE}`;
  ctx.shadowColor = 'rgba(160,210,255,0.8)';
  ctx.shadowBlur = 30 + Math.sin(t * 1.5) * 8;
  ctx.fillStyle = '#f2f5fb';
  ctx.fillText('STUCK IN ME', W / 2, y);
  ctx.shadowBlur = 0;
  // ornamental flourish
  ctx.strokeStyle = 'rgba(230,236,248,0.7)';
  ctx.lineWidth = 1.5;
  const fw = size * 3.2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - fw, y + 26);
  ctx.quadraticCurveTo(W / 2 - fw / 2, y + 14, W / 2 - 14, y + 30);
  ctx.moveTo(W / 2 + fw, y + 26);
  ctx.quadraticCurveTo(W / 2 + fw / 2, y + 14, W / 2 + 14, y + 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2, y + 22);
  ctx.lineTo(W / 2 + 8, y + 30);
  ctx.lineTo(W / 2, y + 38);
  ctx.lineTo(W / 2 - 8, y + 30);
  ctx.closePath();
  ctx.fillStyle = '#e8eef8';
  ctx.fill();
  ctx.restore();
}

export function menuItemRects(items, y0 = 340, gap = 56) {
  return items.map((label, i) => ({ label, x: W / 2 - 180, y: y0 + i * gap - 30, w: 360, h: 44 }));
}

export function drawMenu(ctx, items, sel, t, y0 = 340, gap = 56) {
  ctx.textAlign = 'center';
  menuItemRects(items, y0, gap).forEach((r, i) => {
    const on = i === sel;
    ctx.font = `700 ${on ? 26 : 22}px ${FONT_TITLE}`;
    ctx.fillStyle = on ? '#ffffff' : 'rgba(215,222,238,0.6)';
    ctx.fillText(r.label, W / 2, y0 + i * gap);
    if (on) {
      const w = ctx.measureText(r.label).width / 2 + 30;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(W / 2 + s * (w + Math.sin(t * 4) * 3), y0 + i * gap - 8);
        ctx.scale(s, 1);
        ctx.fillStyle = '#e8eef8';
        ctx.beginPath();
        ctx.moveTo(-10, -7);
        ctx.lineTo(0, 0);
        ctx.lineTo(-10, 7);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  });
  ctx.textAlign = 'left';
}

export function drawPanelBg(ctx, alpha = 0.7) {
  ctx.fillStyle = `rgba(4,6,12,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

export function drawControls(ctx) {
  drawPanelBg(ctx, 0.78);
  ctx.textAlign = 'center';
  ctx.font = `700 40px ${FONT_TITLE}`;
  ctx.fillStyle = '#f2f5fb';
  ctx.fillText('Controls', W / 2, 110);
  const rows = [
    ['Move', 'A / D  or  ← / →'],
    ['Jump (press again to double-jump)', 'Space / W / ↑'],
    ['Dash (dodge through attacks)', 'Shift'],
    ['Punch  ·  hold ↑ to uppercut', 'J  or  Z'],
    ['Kick  ·  hold ↓ in the air to dive-kick', 'K  or  X'],
    ['Dream Beam  ·  hold ↑ to fire upward', 'L  or  C'],
    ['Focus: hold to heal one mask', 'F  or  V'],
    ['Drop through a ledge', '↓ + Jump'],
    ['Pause  ·  Mute', 'Esc  ·  M'],
  ];
  rows.forEach(([a, b], i) => {
    const y = 170 + i * 44;
    ctx.textAlign = 'right';
    ctx.font = `600 22px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(225,230,242,0.85)';
    ctx.fillText(a, W / 2 - 30, y);
    ctx.textAlign = 'left';
    ctx.font = `700 18px ${FONT_TITLE}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b, W / 2 + 30, y);
  });
  ctx.textAlign = 'center';
  ctx.font = `italic 600 20px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(220,225,240,0.6)';
  ctx.fillText('Land hits to fill your Soul. Earn Dream Essence to awaken new powers.', W / 2, 590);
  ctx.fillText('Press Esc or click to go back', W / 2, 630);
  ctx.textAlign = 'left';
}

export function drawScores(ctx, scores, highlight = -1) {
  drawPanelBg(ctx, 0.78);
  ctx.textAlign = 'center';
  ctx.font = `700 40px ${FONT_TITLE}`;
  ctx.fillStyle = '#f2f5fb';
  ctx.fillText('Hall of Dreamers', W / 2, 130);
  if (!scores.length) {
    ctx.font = `italic 600 24px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(220,225,240,0.6)';
    ctx.fillText('No one has escaped the dream yet.', W / 2, 260);
  }
  scores.forEach((s, i) => {
    const y = 210 + i * 54;
    ctx.font = `700 26px ${FONT_TITLE}`;
    ctx.fillStyle = i === highlight ? '#ffe2a6' : '#eef1f8';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.  ${s.name}`, W / 2 - 230, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(s.score), W / 2 + 230, y);
    ctx.font = `italic 600 17px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(220,225,240,0.5)';
    ctx.fillText(s.won ? 'woke up' : `lost in level ${s.level}`, W / 2 + 230, y + 20);
  });
  ctx.textAlign = 'center';
  ctx.font = `italic 600 20px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(220,225,240,0.6)';
  ctx.fillText('Press Esc or click to go back', W / 2, 640);
  ctx.textAlign = 'left';
}

export function drawNameEntry(ctx, name, score, won, t) {
  drawPanelBg(ctx, 0.82);
  ctx.textAlign = 'center';
  ctx.font = `700 16px ${FONT_TITLE}`;
  ctx.fillStyle = won ? '#ffe2a6' : '#c8a8ff';
  ctx.fillText(won ? 'YOU WOKE UP' : 'THE DREAM HOLDS YOU', W / 2, 200);
  ctx.font = `700 44px ${FONT_TITLE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Dream Essence: ${score}`, W / 2, 260);
  ctx.font = `italic 600 24px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(225,230,242,0.8)';
  ctx.fillText('Write your name in the Hall of Dreamers', W / 2, 330);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, W / 2 - 200, 360, 400, 64, 10);
  ctx.fill();
  ctx.font = `700 34px ${FONT_TITLE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name + (Math.floor(t * 2) % 2 ? '_' : ' '), W / 2, 404);
  ctx.font = `italic 600 20px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(220,225,240,0.6)';
  ctx.fillText('Type a name, then press Enter', W / 2, 470);
  ctx.textAlign = 'left';
}

export function drawBootScreen(ctx, t) {
  ctx.fillStyle = '#04060c';
  ctx.fillRect(0, 0, W, H);
  drawTitle(ctx, t, 96, 300);
  drawBoy(ctx, { x: W / 2, y: 470, scale: 1.6, t, pose: 'idle' });
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.3;
  ctx.font = `italic 600 24px ${FONT_BODY}`;
  ctx.fillStyle = '#e8ecf6';
  ctx.fillText('Click or press any key to enter the dream', W / 2, 560);
  ctx.globalAlpha = 1;
  ctx.font = `600 15px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(220,225,240,0.4)';
  ctx.fillText('A remake of the original iGraphics game. Best with sound on.', W / 2, 680);
  ctx.textAlign = 'left';
}
