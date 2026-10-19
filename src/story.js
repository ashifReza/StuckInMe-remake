// Storyboard cutscenes: illustrated panels with caption boxes and speech bubbles.
import { W, H, roundRect, wrapText, glow, FONT_BODY, FONT_TITLE, seeded } from './util.js';
import { drawBoy, drawWitch, drawParent } from './art.js';
import { Background } from './background.js';
import { LEVELS } from './levels.js';
import { Input } from './input.js';
import { Audio } from './audio.js';

const PX = 140;
const PY = 64;
const PW = 1000;
const PH = 500;

// ---------- shared scenery pieces ----------
function sky(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
}

function pine(ctx, x, base, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  for (let i = 1; i <= 4; i++) {
    const y = base - h + (h * i) / 4;
    const w = (h / 4) * (0.35 + i * 0.12);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.35, y - 4);
  }
  ctx.lineTo(x + 4, base);
  ctx.lineTo(x - 4, base);
  for (let i = 4; i >= 1; i--) {
    const y = base - h + (h * i) / 4;
    const w = (h / 4) * (0.35 + i * 0.12);
    ctx.lineTo(x - w * 0.35, y - 4);
    ctx.lineTo(x - w, y);
  }
  ctx.closePath();
  ctx.fill();
}

function forest(ctx, seed, base, minH, maxH, color, from = 0, to = PW) {
  const r = seeded(seed);
  for (let x = from; x < to; x += 22 + r() * 30) pine(ctx, x, base, minH + r() * (maxH - minH), color);
}

function house(ctx, x, y, s, lit = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#0a0812';
  ctx.beginPath();
  ctx.moveTo(-90, 0);
  ctx.lineTo(-86, -110);
  ctx.lineTo(-110, -104);
  ctx.lineTo(-10, -190);
  ctx.lineTo(18, -176);
  ctx.lineTo(24, -222);
  ctx.lineTo(44, -220);
  ctx.lineTo(46, -160);
  ctx.lineTo(112, -100);
  ctx.lineTo(90, -102);
  ctx.lineTo(94, 0);
  ctx.closePath();
  ctx.fill();
  if (lit) {
    glow(ctx, -40, -120, 60, 'rgba(255,190,110,0.6)');
    ctx.fillStyle = '#ffc77a';
    ctx.fillRect(-52, -136, 24, 30);
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(-41, -136, 2, 30);
    ctx.fillRect(-52, -122, 24, 2);
  }
  ctx.fillStyle = 'rgba(255,190,110,0.25)';
  ctx.fillRect(30, -60, 22, 26);
  ctx.restore();
}

function bedroom(ctx, t, mood) {
  // mood 0 = calm moonlight, 1 = haunted, 2 = morning
  const wall = ['#16203a', '#1a0f29', '#c9a37a'][mood];
  const floor = ['#0c1222', '#0d0716', '#8a6243'][mood];
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, PW, PH);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 380, PW, 120);
  // wallpaper stripes
  ctx.fillStyle = mood === 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)';
  for (let x = 0; x < PW; x += 50) ctx.fillRect(x, 0, 18, 380);
  // window
  const wx = 600;
  const wy = 70;
  ctx.fillStyle = ['#203a66', '#2a0f3a', '#bfe6ff'][mood];
  ctx.fillRect(wx, wy, 220, 200);
  if (mood !== 2) {
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.arc(wx + 160, wy + 60, 26, 0, Math.PI * 2);
    ctx.fill();
    forest(ctx, 7, wy + 200, 50, 120, '#070a14', wx, wx + 220);
  } else {
    glow(ctx, wx + 170, wy + 40, 120, 'rgba(255,240,180,0.9)');
    forest(ctx, 7, wy + 200, 50, 120, '#4f7a4a', wx, wx + 220);
  }
  ctx.strokeStyle = ['#2b2033', '#1c1024', '#6b4a32'][mood];
  ctx.lineWidth = 10;
  ctx.strokeRect(wx, wy, 220, 200);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(wx + 110, wy);
  ctx.lineTo(wx + 110, wy + 200);
  ctx.moveTo(wx, wy + 100);
  ctx.lineTo(wx + 220, wy + 100);
  ctx.stroke();
  // light shaft from the window
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = ['rgba(150,190,255,0.1)', 'rgba(170,80,255,0.08)', 'rgba(255,230,160,0.18)'][mood];
  ctx.beginPath();
  ctx.moveTo(wx, wy + 200);
  ctx.lineTo(wx + 220, wy + 200);
  ctx.lineTo(wx - 60, PH);
  ctx.lineTo(wx - 380, PH);
  ctx.fill();
  ctx.restore();
}

function bed(ctx, x, y, mood, sitting, t) {
  // frame
  ctx.fillStyle = mood === 2 ? '#5b3b26' : '#0a0a14';
  ctx.fillRect(x - 10, y - 80, 18, 120);
  ctx.fillRect(x + 330, y - 40, 14, 80);
  ctx.fillRect(x - 10, y + 10, 354, 22);
  // pillow + boy
  ctx.fillStyle = mood === 2 ? '#f4efe6' : '#cfd6e8';
  roundRect(ctx, x + 10, y - 40, 90, 40, 16);
  ctx.fill();
  if (sitting) {
    drawBoy(ctx, { x: x + 80, y: y + 10, scale: 2.1, t, pose: 'idle', dir: 1, suit: false });
  } else {
    ctx.save();
    ctx.translate(x + 55, y - 26);
    ctx.rotate(-1.35);
    drawBoy(ctx, { x: 0, y: 0, scale: 1.8, t, pose: 'sleep', dir: 1, suit: false });
    ctx.restore();
  }
  // blanket
  ctx.fillStyle = mood === 2 ? '#4f6fb3' : '#22305e';
  ctx.beginPath();
  ctx.moveTo(x + (sitting ? 70 : 70), y - (sitting ? 4 : 30));
  ctx.quadraticCurveTo(x + 200, y - (sitting ? 20 : 48), x + 335, y - 20);
  ctx.lineTo(x + 345, y + 14);
  ctx.lineTo(x + 60, y + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 80 + i * 60, y - 30);
    ctx.lineTo(x + 70 + i * 60, y + 12);
    ctx.stroke();
  }
}

// ---------- panels ----------
const dreamBg = { bg: null };

export const INTRO = [
  {
    draw(ctx, t) {
      sky(ctx, '#3b2a5a', '#f19a6b');
      glow(ctx, 760, 330, 260, 'rgba(255,200,140,0.6)');
      // town skyline on the left with lit windows
      const r = seeded(3);
      for (let x = 0; x < 420; x += 50) {
        const h = 120 + r() * 150;
        ctx.fillStyle = '#2a2140';
        ctx.fillRect(x, 380 - h, 46, h);
        ctx.fillStyle = 'rgba(255,214,140,0.8)';
        for (let wy = 380 - h + 14; wy < 360; wy += 22) for (let wx = x + 8; wx < x + 40; wx += 14) if (r() < 0.45) ctx.fillRect(wx, wy, 6, 9);
      }
      forest(ctx, 11, 390, 70, 160, '#1a1430', 520, PW);
      ctx.fillStyle = '#1a1430';
      ctx.fillRect(0, 380, PW, 120);
      // road
      ctx.fillStyle = '#2d2540';
      ctx.beginPath();
      ctx.moveTo(0, 470);
      ctx.quadraticCurveTo(500, 400, PW, 430);
      ctx.lineTo(PW, 455);
      ctx.quadraticCurveTo(500, 430, 0, 500);
      ctx.fill();
      // the family car heading toward the woods
      const cx = 160 + ((t * 60) % 700);
      const cy = 430 - (cx / PW) * 20;
      ctx.fillStyle = '#0d0a16';
      roundRect(ctx, cx - 60, cy - 26, 120, 26, 8);
      ctx.fill();
      roundRect(ctx, cx - 36, cy - 48, 70, 26, 10);
      ctx.fill();
      ctx.fillStyle = '#ffd99a';
      ctx.fillRect(cx - 30, cy - 44, 28, 16);
      ctx.fillRect(cx + 2, cy - 44, 26, 16);
      ctx.fillStyle = '#0d0a16';
      for (const hx of [cx - 22, cx - 10, cx + 14]) {
        ctx.beginPath();
        ctx.arc(hx, cy - 34, hx === cx - 10 ? 4 : 6, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const wx of [cx - 38, cx + 38]) {
        ctx.beginPath();
        ctx.arc(wx, cy, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, cx + 64, cy - 12, 40, 'rgba(255,240,180,0.8)');
    },
    bubbles: [
      { kind: 'caption', text: 'Not long ago, a family of three left the bright, noisy town...', x: 24, y: 22, w: 400 },
      { kind: 'speech', who: 'Boy', text: 'Are we there yet?', x: 440, y: 230, w: 220, tail: [300, 380] },
    ],
  },
  {
    draw(ctx, t) {
      sky(ctx, '#050a1a', '#1d2b4f');
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath();
      ctx.arc(740, 120, 60, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, 740, 120, 260, 'rgba(160,190,255,0.5)');
      forest(ctx, 21, 430, 120, 260, '#0d1530');
      house(ctx, 500, 440, 1.3);
      forest(ctx, 22, 500, 140, 300, '#05070f', 0, 260);
      forest(ctx, 23, 500, 140, 300, '#05070f', 760, PW);
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 440, PW, 60);
      for (let i = 0; i < 3; i++) glow(ctx, ((t * 20 + i * 400) % 1400) - 200, 460, 260, 'rgba(140,170,220,0.12)');
    },
    bubbles: [
      { kind: 'caption', text: '...for an old house, deep in the quiet woods.', x: 24, y: 22, w: 360 },
      { kind: 'caption', text: 'No one told them who else lived there.', x: 600, y: 420, w: 360 },
    ],
  },
  {
    draw(ctx, t) {
      bedroom(ctx, t, 0);
      bed(ctx, 120, 360, 0, false, t);
      ctx.fillStyle = 'rgba(220,230,255,0.75)';
      ctx.font = `600 28px ${FONT_BODY}`;
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.5 + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.fillText('z', 170 + i * 16 + k * 40, 290 - k * 120);
      }
      ctx.globalAlpha = 1;
    },
    bubbles: [
      { kind: 'caption', text: 'That first night, the boy fell fast asleep.', x: 24, y: 22, w: 380 },
      { kind: 'thought', who: 'Boy', text: 'New room... new house... maybe new friends...', x: 260, y: 120, w: 280, tail: [180, 300] },
    ],
  },
  {
    draw(ctx, t) {
      bedroom(ctx, t, 1);
      bed(ctx, 120, 360, 1, false, t);
      // witch peering through the window
      ctx.save();
      ctx.beginPath();
      ctx.rect(600, 70, 220, 200);
      ctx.clip();
      drawWitch(ctx, { x: 700, y: 250, scale: 1.3, t, dir: -1, aura: true });
      ctx.restore();
      // her long shadow across the floor
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.moveTo(620, 400);
      ctx.quadraticCurveTo(400, 430, 180, 480);
      ctx.lineTo(260, 500);
      ctx.quadraticCurveTo(450, 470, 680, 410);
      ctx.fill();
    },
    bubbles: [
      { kind: 'caption', text: 'But the house in the woods was haunted by a wicked witch.', x: 24, y: 22, w: 400 },
      { kind: 'witch', who: 'Witch', text: 'Such a peaceful little dreamer... how delicious.', x: 470, y: 320, w: 300, tail: [660, 230] },
    ],
  },
  {
    draw(ctx, t) {
      bedroom(ctx, t, 1);
      bed(ctx, 120, 360, 1, false, t);
      drawWitch(ctx, { x: 560, y: 250, scale: 1.4, t, dir: -1, pose: 'cast' });
      // spiral of curse-magic pouring into the sleeping boy
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) {
        const k = (i / 40 + t * 0.35) % 1;
        const x = 520 + (190 - 520) * k + Math.sin(k * 14 + t * 4) * 30 * (1 - k);
        const y = 240 + (320 - 240) * k + Math.cos(k * 14 + t * 4) * 30 * (1 - k);
        ctx.fillStyle = `rgba(210,130,255,${0.8 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(x, y, 6 * (1 - k) + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      glow(ctx, 190, 320, 90, 'rgba(200,110,255,0.6)', 0.6 + Math.sin(t * 5) * 0.2);
    },
    bubbles: [
      { kind: 'witch', who: 'Witch', text: 'I curse you, child. Fight the creatures of your dreams, all alone.', x: 610, y: 24, w: 360, tail: [600, 170] },
      { kind: 'witch', who: 'Witch', text: 'Win, and you wake. Lose... and you stay here with me. FOREVER.', x: 610, y: 150, w: 360, tail: [600, 200] },
    ],
  },
  {
    draw(ctx, t) {
      if (!dreamBg.bg) dreamBg.bg = new Background(LEVELS[0], 101);
      ctx.save();
      ctx.scale(PW / W, PH / 640);
      dreamBg.bg.drawBack(ctx, 200 + t * 10, t);
      ctx.restore();
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 440, PW, 60);
      // eyes watching from the dark
      const r = seeded(9);
      for (let i = 0; i < 7; i++) {
        const ex = 40 + r() * 920;
        const ey = 300 + r() * 120;
        const blink = Math.sin(t * 1.3 + i * 2) > 0.92 ? 0.2 : 1;
        ctx.fillStyle = '#9fe0ff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 3, 3 * blink, 0, 0, Math.PI * 2);
        ctx.ellipse(ex + 10, ey, 3, 3 * blink, 0, 0, Math.PI * 2);
        ctx.fill();
        glow(ctx, ex + 5, ey, 20, 'rgba(150,220,255,0.6)');
      }
      glow(ctx, 500, 380, 200, 'rgba(170,210,255,0.25)');
      drawBoy(ctx, { x: 500, y: 444, scale: 2.4, t, pose: 'idle', dir: 1 });
    },
    bubbles: [
      { kind: 'caption', text: 'And so the boy opened his eyes... inside his own dream.', x: 24, y: 22, w: 400 },
      { kind: 'speech', who: 'Boy', text: 'Where am I...? I have to win. I have to WAKE UP!', x: 580, y: 170, w: 300, tail: [520, 300] },
    ],
  },
];

export const ENDING = [
  {
    draw(ctx, t) {
      sky(ctx, '#05020b', '#2c0a3a');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + t * 0.3;
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.1 * Math.sin(t * 3 + i)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(500, 250);
        ctx.lineTo(500 + Math.cos(a) * 600, 250 + Math.sin(a) * 600);
        ctx.stroke();
      }
      ctx.restore();
      glow(ctx, 500, 250, 300, 'rgba(255,255,255,0.4)');
      drawWitch(ctx, { x: 500, y: 260, scale: 1.6, t, pose: 'stunned', alpha: 0.5 + 0.5 * Math.abs(Math.sin(t * 6)) });
    },
    bubbles: [
      { kind: 'witch', who: 'Witch', text: 'No... NO! The child is... WAKING UP!', x: 610, y: 40, w: 330, tail: [560, 160] },
      { kind: 'caption', text: 'Her curse shattered like glass in the light.', x: 24, y: 420, w: 380 },
    ],
  },
  {
    draw(ctx, t) {
      bedroom(ctx, t, 2);
      bed(ctx, 120, 360, 2, true, t);
      // door with mom
      ctx.fillStyle = '#6b4a32';
      ctx.fillRect(860, 120, 120, 270);
      ctx.fillStyle = '#ffe6b8';
      ctx.fillRect(870, 130, 100, 260);
      drawParent(ctx, 920, 392, 2.2, '#4a2f22', '#c0587a', -1);
    },
    bubbles: [
      { kind: 'caption', text: 'Morning sunlight spilled across the floor.', x: 24, y: 22, w: 360 },
      { kind: 'speech', who: 'Mom', text: 'Good morning, sweetheart! Breakfast is ready!', x: 560, y: 300, w: 260, tail: [880, 240] },
    ],
  },
  {
    draw(ctx, t) {
      sky(ctx, '#8fc4e8', '#e8f2e0');
      forest(ctx, 41, 420, 120, 260, '#3d6b46');
      forest(ctx, 42, 470, 160, 300, '#24452c');
      ctx.fillStyle = '#24452c';
      ctx.fillRect(0, 460, PW, 40);
      // a pair of violet eyes still watching from the trees
      const blink = Math.sin(t * 1.5) > 0.9 ? 0.2 : 1;
      ctx.fillStyle = '#c070ff';
      ctx.beginPath();
      ctx.ellipse(820, 360, 4, 2.5 * blink, 0.3, 0, Math.PI * 2);
      ctx.ellipse(834, 360, 4, 2.5 * blink, -0.3, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, 827, 360, 22, 'rgba(200,120,255,0.7)');
      // window frame in the foreground
      ctx.strokeStyle = '#6b4a32';
      ctx.lineWidth = 40;
      ctx.strokeRect(0, 0, PW, PH);
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(PW / 2, 0);
      ctx.lineTo(PW / 2, PH);
      ctx.stroke();
      drawBoy(ctx, { x: 300, y: 520, scale: 3.2, t, pose: 'idle', dir: 1, suit: false });
    },
    bubbles: [
      { kind: 'thought', who: 'Boy', text: 'It was all just a dream... right?', x: 380, y: 90, w: 300, tail: [330, 300] },
      { kind: 'caption', text: 'THE END...?', x: 760, y: 30, w: 190 },
    ],
  },
];

// ---------- bubble rendering ----------
const BUBBLE_FONT = `600 23px ${FONT_BODY}`;

function layoutBubble(ctx, b) {
  ctx.font = b.kind === 'caption' ? `italic 600 22px ${FONT_BODY}` : BUBBLE_FONT;
  const pad = b.kind === 'caption' ? 14 : 18;
  b.lines = wrapText(ctx, b.text, b.w - pad * 2);
  b.pad = pad;
  b.h = b.lines.length * 27 + pad * 2 + (b.who && b.kind !== 'caption' ? 18 : 0);
}

function drawBubble(ctx, b, shown) {
  if (!b.lines) layoutBubble(ctx, b);
  const { x, y, w, h, kind } = b;
  ctx.save();
  if (kind === 'caption') {
    ctx.fillStyle = '#e9dfc4';
    ctx.strokeStyle = '#2a2232';
    ctx.lineWidth = 3;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  } else {
    const witch = kind === 'witch';
    ctx.fillStyle = witch ? '#1b0d27' : '#f4f1e8';
    ctx.strokeStyle = witch ? '#d48bff' : '#1a1622';
    ctx.lineWidth = 3;
    if (kind === 'thought') {
      roundRect(ctx, x, y, w, h, h / 2.2);
      ctx.fill();
      ctx.stroke();
      const [tx, ty] = b.tail;
      for (let i = 1; i <= 3; i++) {
        const k = i / 4;
        const bx = x + w * 0.3 + (tx - (x + w * 0.3)) * k;
        const by = y + h + (ty - (y + h)) * k;
        ctx.beginPath();
        ctx.arc(bx, by, 10 - i * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      roundRect(ctx, x, y, w, h, 18);
      ctx.fill();
      ctx.stroke();
      // tail pointing at the speaker
      const [tx, ty] = b.tail;
      const ax = Math.min(Math.max(tx, x + 30), x + w - 30);
      const ay = ty > y + h ? y + h : ty < y ? y : y + h / 2;
      const horiz = ty >= y && ty <= y + h;
      ctx.beginPath();
      if (horiz) {
        const ex = tx < x ? x : x + w;
        ctx.moveTo(ex, ay - 12);
        ctx.lineTo(tx, ty);
        ctx.lineTo(ex, ay + 12);
      } else {
        ctx.moveTo(ax - 14, ay);
        ctx.lineTo(tx, ty);
        ctx.lineTo(ax + 14, ay);
      }
      ctx.fill();
      ctx.stroke();
      // hide the outline seam under the tail
      ctx.beginPath();
      if (horiz) {
        const ex = tx < x ? x + 2 : x + w - 2;
        ctx.moveTo(ex, ay - 10);
        ctx.lineTo(ex, ay + 10);
      } else {
        ctx.moveTo(ax - 12, ay + (ty > y ? -2 : 2));
        ctx.lineTo(ax + 12, ay + (ty > y ? -2 : 2));
      }
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    if (witch) glow(ctx, x + w / 2, y + h / 2, w * 0.6, 'rgba(160,70,230,0.25)');
  }
  // text
  let ty = y + b.pad + 20;
  if (b.who && kind !== 'caption') {
    ctx.font = `700 14px ${FONT_TITLE}`;
    ctx.fillStyle = kind === 'witch' ? '#d48bff' : '#6a5a8a';
    ctx.fillText(b.who.toUpperCase(), x + b.pad, y + b.pad + 10);
    ty += 18;
  }
  ctx.font = kind === 'caption' ? `italic 600 22px ${FONT_BODY}` : BUBBLE_FONT;
  ctx.fillStyle = kind === 'witch' ? '#f3e3ff' : '#17131f';
  let left = shown;
  for (const line of b.lines) {
    if (left <= 0) break;
    ctx.fillText(line.slice(0, left), x + b.pad, ty);
    left -= line.length + 1;
    ty += 27;
  }
  ctx.restore();
}

// ---------- the storyboard player ----------
export class Storyboard {
  constructor(panels, title, onDone, finalLabel = 'Begin  ▸') {
    this.panels = panels;
    this.finalLabel = finalLabel;
    this.title = title;
    this.onDone = onDone;
    this.i = 0;
    this.t = 0;
    this.chars = 0;
    this.finished = false;
  }

  get total() {
    return this.panels[this.i].bubbles.reduce((s, b) => s + b.text.length + 6, 0);
  }

  advance() {
    if (this.chars < this.total) {
      this.chars = this.total;
      return;
    }
    if (this.i < this.panels.length - 1) {
      this.i++;
      this.t = 0;
      this.chars = 0;
      Audio.play('page');
    } else if (!this.finished) {
      this.finished = true;
      this.onDone();
    }
  }

  buttons() {
    const last = this.i === this.panels.length - 1;
    return {
      next: { x: PX + PW - 200, y: PY + PH + 22, w: 200, h: 48, label: last && this.chars >= this.total ? this.finalLabel : 'Continue  ▸' },
      skip: { x: W - 150, y: 16, w: 130, h: 36, label: 'Skip story' },
    };
  }

  update(dt) {
    this.t += dt;
    this.chars += dt * 48;
    const btn = this.buttons();
    const m = Input.mouse;
    const inside = (b) => m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h;
    this.hover = inside(btn.next) ? 'next' : inside(btn.skip) ? 'skip' : null;
    if (m.clicked) {
      if (inside(btn.skip)) {
        if (!this.finished) {
          this.finished = true;
          this.onDone();
        }
      } else this.advance();
    }
    if (Input.hit('confirm') || Input.hit('right') || Input.hit('punch')) this.advance();
    if (Input.hit('pause')) {
      if (!this.finished) {
        this.finished = true;
        this.onDone();
      }
    }
  }

  draw(ctx) {
    // page
    ctx.fillStyle = '#0b0a10';
    ctx.fillRect(0, 0, W, H);
    glow(ctx, W / 2, H / 2, 700, 'rgba(90,70,140,0.18)');
    ctx.font = `700 18px ${FONT_TITLE}`;
    ctx.fillStyle = 'rgba(220,210,240,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(this.title, PX, 44);

    // panel with a slow push-in
    const panel = this.panels[this.i];
    const fade = Math.min(1, this.t / 0.5);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(PX, PY);
    ctx.beginPath();
    ctx.rect(0, 0, PW, PH);
    ctx.clip();
    const z = 1 + Math.min(this.t, 12) * 0.006;
    ctx.translate(PW / 2, PH / 2);
    ctx.scale(z, z);
    ctx.translate(-PW / 2, -PH / 2);
    panel.draw(ctx, this.t);
    ctx.restore();

    // bubbles (unzoomed so text stays crisp)
    ctx.save();
    ctx.translate(PX, PY);
    let offset = 0;
    for (const b of panel.bubbles) {
      const shown = Math.floor(this.chars - offset);
      if (shown > 0) {
        ctx.globalAlpha = Math.min(1, shown / 6) * fade;
        drawBubble(ctx, b, shown);
      }
      offset += b.text.length + 6;
    }
    ctx.restore();

    // frame
    ctx.strokeStyle = '#e8e2f2';
    ctx.lineWidth = 6;
    ctx.strokeRect(PX, PY, PW, PH);

    // storyboard strip: one cell per panel
    const n = this.panels.length;
    for (let k = 0; k < n; k++) {
      const x = PX + k * 46;
      ctx.fillStyle = k === this.i ? '#e8e2f2' : k < this.i ? 'rgba(232,226,242,0.45)' : 'rgba(232,226,242,0.12)';
      ctx.fillRect(x, PY + PH + 30, 36, 24);
      ctx.fillStyle = k === this.i ? '#0b0a10' : 'rgba(11,10,16,0.8)';
      ctx.font = `700 13px ${FONT_TITLE}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(k + 1), x + 18, PY + PH + 47);
    }

    // buttons
    const btn = this.buttons();
    for (const [key, b] of Object.entries(btn)) {
      const hov = this.hover === key;
      ctx.fillStyle = key === 'next' ? (hov ? '#ffffff' : '#e8e2f2') : hov ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.fillStyle = key === 'next' ? '#120f1c' : 'rgba(230,225,245,0.8)';
      ctx.font = key === 'next' ? `700 18px ${FONT_TITLE}` : `600 14px ${FONT_TITLE}`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
    }
    ctx.textAlign = 'left';
    ctx.font = `italic 600 17px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(220,210,240,0.45)';
    ctx.fillText('Click or press Enter to continue', PX + n * 46 + 16, PY + PH + 47);
  }
}
