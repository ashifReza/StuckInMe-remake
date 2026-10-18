// Layered, parallax dream scenery, generated once per level from a seed.
import { W, H, GROUND, seeded, glow } from './util.js';

const FAR_P = 0.22;
const MID_P = 0.5;
const FG_P = 1.3;

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---- silhouette painters: (ctx, rng, width, color, near) ----
const SHAPES = {
  trees(ctx, r, w, color, near) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    for (let x = -40; x < w + 40; x += (near ? 160 : 70) + r() * 90) {
      const tw = (near ? 18 : 8) + r() * (near ? 16 : 10);
      const top = (near ? 40 : 140) + r() * 160;
      ctx.beginPath();
      ctx.moveTo(x - tw, H);
      ctx.quadraticCurveTo(x - tw * 0.3, (top + H) / 2, x - 2, top);
      ctx.lineTo(x + 2, top);
      ctx.quadraticCurveTo(x + tw * 0.3, (top + H) / 2, x + tw, H);
      ctx.fill();
      // drooping branches
      ctx.lineCap = 'round';
      for (let b = 0; b < 5; b++) {
        const by = top + 30 + r() * (GROUND - top - 140);
        const dir = r() < 0.5 ? -1 : 1;
        const len = 40 + r() * (near ? 120 : 70);
        ctx.lineWidth = Math.max(1.5, tw * 0.25);
        ctx.beginPath();
        ctx.moveTo(x, by);
        ctx.quadraticCurveTo(x + dir * len * 0.6, by - 30, x + dir * len, by + 10 + r() * 25);
        ctx.stroke();
        // hanging moss
        ctx.lineWidth = 1;
        for (let m = 0; m < 3; m++) {
          const mx = x + dir * len * (0.4 + m * 0.2);
          ctx.beginPath();
          ctx.moveTo(mx, by - 8);
          ctx.lineTo(mx + 2, by + 20 + r() * 40);
          ctx.stroke();
        }
      }
    }
  },
  hollow(ctx, r, w, color, near) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    for (let x = 0; x < w + 100; x += (near ? 380 : 220) + r() * 160) {
      const tw = (near ? 110 : 60) + r() * 60;
      ctx.beginPath();
      ctx.moveTo(x - tw / 2 - 30, H);
      ctx.bezierCurveTo(x - tw / 2, 400, x - tw / 2 - 10, 120, x - tw / 2 + 10, -10);
      ctx.lineTo(x + tw / 2 - 10, -10);
      ctx.bezierCurveTo(x + tw / 2 + 10, 120, x + tw / 2, 400, x + tw / 2 + 30, H);
      ctx.fill();
      // knot-holes cut out of the trunk
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let h = 0; h < 2; h++) {
        ctx.beginPath();
        ctx.ellipse(x + (r() - 0.5) * tw * 0.3, 160 + r() * 300, tw * 0.18, tw * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // cocoons on silk threads
    ctx.lineWidth = 1;
    for (let x = 30; x < w; x += 90 + r() * 140) {
      const y = 80 + r() * 260;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + 18, 9 + r() * 6, 20 + r() * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  thorns(ctx, r, w, color, near) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    for (let x = -60; x < w + 60; x += (near ? 200 : 110) + r() * 120) {
      const lw = near ? 14 + r() * 10 : 6 + r() * 6;
      const p0 = [x, H];
      const p1 = [x + (r() - 0.5) * 300, 300 + r() * 200];
      const p2 = [x + (r() - 0.5) * 300, 100 + r() * 200];
      const p3 = [x + (r() - 0.5) * 200, (near ? 60 : 120) + r() * 150];
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(...p0);
      ctx.bezierCurveTo(...p1, ...p2, ...p3);
      ctx.stroke();
      // spikes along the vine
      for (let s = 0.1; s < 1; s += 0.08) {
        const u = 1 - s;
        const px = u ** 3 * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s ** 3 * p3[0];
        const py = u ** 3 * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s ** 3 * p3[1];
        const side = r() < 0.5 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 4);
        ctx.lineTo(px + side * (lw + 10), py - 8);
        ctx.lineTo(px + 3, py + 4);
        ctx.fill();
      }
      // a dark rose bloom at the tip
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.ellipse(p3[0] + Math.cos(a) * lw * 0.8, p3[1] + Math.sin(a) * lw * 0.8, lw, lw * 0.6, a, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  },
  vortex(ctx, r, w, color, near) {
    ctx.fillStyle = color;
    if (!near) {
      // the crooked house the boy is sleeping in, far away
      const hx = w / 2;
      ctx.beginPath();
      ctx.moveTo(hx - 120, H);
      ctx.lineTo(hx - 110, 380);
      ctx.lineTo(hx - 140, 390);
      ctx.lineTo(hx - 20, 250);
      ctx.lineTo(hx + 10, 270);
      ctx.lineTo(hx + 30, 200);
      ctx.lineTo(hx + 50, 205);
      ctx.lineTo(hx + 55, 280);
      ctx.lineTo(hx + 150, 380);
      ctx.lineTo(hx + 120, 385);
      ctx.lineTo(hx + 125, H);
      ctx.fill();
    }
    // floating rocks
    for (let i = 0; i < (near ? 6 : 10); i++) {
      const x = r() * w;
      const y = 80 + r() * 380;
      const s = (near ? 40 : 20) + r() * 40;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x - s * 0.6, y - s * 0.4);
      ctx.lineTo(x + s * 0.7, y - s * 0.3);
      ctx.lineTo(x + s, y + s * 0.1);
      ctx.lineTo(x + s * 0.1, y + s * 1.1);
      ctx.closePath();
      ctx.fill();
    }
    // jagged hills
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= w + 40; x += 40) ctx.lineTo(x, (near ? 560 : 520) + r() * 60);
    ctx.lineTo(w + 40, H);
    ctx.fill();
  },
};

let vig = null;
function vignette() {
  if (vig) return vig;
  vig = document.createElement('canvas');
  vig.width = W;
  vig.height = H;
  const g = vig.getContext('2d');
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return vig;
}

export class Background {
  constructor(level, seed) {
    this.level = level;
    this.theme = level.theme;
    this.width = level.width;
    const rng = seeded(seed);
    this.far = this.paint(FAR_P, this.theme.far, false, rng, true);
    this.mid = this.paint(MID_P, this.theme.mid, true, rng, false);

    // ground profile + foreground foliage
    this.bumps = [];
    for (let x = 0; x <= this.width + 40; x += 24) this.bumps.push(Math.sin(x * 0.013) * 3 + rng() * 4);
    this.fg = [];
    const fgW = (this.width - W) * FG_P + W;
    for (let x = 0; x < fgW; x += 60 + rng() * 160) {
      this.fg.push({ x, h: 30 + rng() * (rng() < 0.15 ? 160 : 60), n: 4 + Math.floor(rng() * 6), lean: (rng() - 0.5) * 0.6 });
    }
    this.sky = this.paintSky();
    this.ray = this.paintRay();
    this.front = this.paintFoliage(fgW);
    this.motes = [];
    for (let i = 0; i < 70; i++) {
      this.motes.push({ x: rng() * W, y: rng() * GROUND, s: 0.6 + rng() * 2, ph: rng() * 10, d: 0.3 + rng() * 0.9 });
    }
  }

  paintSky() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, this.theme.sky[0]);
    sky.addColorStop(1, this.theme.sky[1]);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    return c;
  }

  // one slanted god-ray; drawn at several offsets each frame
  paintRay() {
    const c = document.createElement('canvas');
    c.width = 420;
    c.height = H;
    const g = c.getContext('2d');
    const x = 325;
    const grd = g.createLinearGradient(x, 0, x - 260, H);
    grd.addColorStop(0, hexA(this.theme.accent, 0.07));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 90, 0);
    g.lineTo(x - 170, H);
    g.lineTo(x - 320, H);
    g.fill();
    return c;
  }

  paintFoliage(fgW) {
    const FH = 260;
    const c = document.createElement('canvas');
    c.width = Math.ceil(fgW) + 200;
    c.height = FH;
    const g = c.getContext('2d');
    g.fillStyle = '#010205';
    for (const f of this.fg) {
      for (let k = 0; k < f.n; k++) {
        const bx = f.x + k * 7 + 100;
        const h = Math.min(FH - 4, f.h * (0.6 + ((k * 37) % 10) / 25));
        g.beginPath();
        g.moveTo(bx - 4, FH);
        g.quadraticCurveTo(bx + f.lean * h * 0.5, FH - h * 0.6, bx + f.lean * h, FH - h);
        g.quadraticCurveTo(bx + f.lean * h * 0.4 + 3, FH - h * 0.5, bx + 5, FH);
        g.fill();
      }
    }
    return c;
  }

  paint(p, color, near, rng, blur) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((this.width - W) * p + W) + 2;
    c.height = H;
    const g = c.getContext('2d');
    if (blur) g.filter = 'blur(1.5px)';
    SHAPES[this.theme.shape](g, rng, c.width, color, near);
    g.filter = 'none';
    // atmospheric fade toward the ground
    const fade = g.createLinearGradient(0, H * 0.45, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, hexA(this.theme.sky[1], near ? 0.18 : 0.45));
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = fade;
    g.fillRect(0, 0, c.width, H);
    return c;
  }

  drawBack(ctx, camX, t) {
    const th = this.theme;
    ctx.drawImage(this.sky, 0, 0);

    // pale moon / dream-light
    const mx = 980 - camX * 0.05;
    glow(ctx, mx, 140, 380, hexA(th.accent, 0.22));
    glow(ctx, mx, 140, 90, hexA('#ffffff', 0.25));
    ctx.fillStyle = hexA('#f4f6ff', 0.85);
    ctx.beginPath();
    ctx.arc(mx, 140, 34, 0, Math.PI * 2);
    ctx.fill();

    if (th.shape === 'vortex') this.drawVortex(ctx, t);

    // god-rays
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 380 - camX * 0.3 + Math.sin(t * 0.2 + i) * 40) % (W + 400) + W + 400) % (W + 400) - 200;
      ctx.drawImage(this.ray, x - 325, 0);
    }
    ctx.restore();

    ctx.drawImage(this.far, -camX * FAR_P, 0);
    this.drawFog(ctx, camX, t, 0.35, 0.07);
    ctx.drawImage(this.mid, -camX * MID_P, 0);
    this.drawFog(ctx, camX, t, 0.7, 0.05);
  }

  drawVortex(ctx, t) {
    ctx.save();
    ctx.translate(W / 2, 230);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = hexA(i % 2 ? this.theme.accent : '#8a4dff', 0.12);
      ctx.lineWidth = 6 + i;
      ctx.beginPath();
      const r0 = 40 + i * 26;
      const a0 = t * (0.25 + i * 0.02) + i;
      ctx.arc(0, 0, r0, a0, a0 + 2.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFog(ctx, camX, t, p, a) {
    for (let i = 0; i < 5; i++) {
      const span = W + 800;
      const x = (((i * 420 - camX * p + t * 12 * (i % 2 ? 1 : -0.6)) % span) + span) % span - 400;
      const y = 470 + (i % 3) * 50;
      glow(ctx, x, y, 420, hexA(this.theme.mote, a), 1, 220);
    }
  }

  // ground is drawn in world space (camera already applied)
  drawGround(ctx, camX) {
    const th = this.theme;
    const x0 = Math.max(0, Math.floor(camX / 24) - 1);
    const x1 = Math.min(this.bumps.length - 1, x0 + Math.ceil(W / 24) + 3);
    ctx.fillStyle = th.ground;
    ctx.beginPath();
    ctx.moveTo(x0 * 24, H + 40);
    for (let i = x0; i <= x1; i++) ctx.lineTo(i * 24, GROUND - this.bumps[i]);
    ctx.lineTo(x1 * 24, H + 40);
    ctx.fill();
    ctx.strokeStyle = hexA(th.accent, 0.22);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = x0; i <= x1; i++) {
      if (i === x0) ctx.moveTo(i * 24, GROUND - this.bumps[i]);
      else ctx.lineTo(i * 24, GROUND - this.bumps[i]);
    }
    ctx.stroke();
  }

  // drawn last, in screen space, over everything
  drawFront(ctx, camX, t) {
    const th = this.theme;
    // motes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = th.mote;
    for (const m of this.motes) {
      const x = (((m.x - camX * m.d + Math.sin(t * 0.5 + m.ph) * 20) % W) + W) % W;
      const y = m.y + Math.sin(t * 0.7 + m.ph) * 14 - ((t * 8 * m.d) % GROUND);
      const yy = ((y % GROUND) + GROUND) % GROUND;
      ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t * 2 + m.ph) ** 2;
      ctx.beginPath();
      ctx.arc(x, yy, m.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // foreground foliage silhouettes (pre-rendered)
    ctx.drawImage(this.front, -camX * FG_P - 100, H - this.front.height);
    ctx.drawImage(vignette(), 0, 0);
  }
}
