import { rand } from './util.js';

export class Particles {
  constructor() {
    this.list = [];
  }

  spawn(o) {
    const p = Object.assign(
      { x: 0, y: 0, vx: 0, vy: 0, life: 0.5, size: 3, color: '#fff', g: 0, drag: 0, glow: false, kind: 'dot', grow: 0 },
      o
    );
    p.max = p.life;
    this.list.push(p);
    return p;
  }

  burst(x, y, n, o = {}) {
    const { speed = 300, spread = Math.PI * 2, angle = 0, life = 0.5, size = 3 } = o;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * rand(0.3, 1);
      this.spawn({
        ...o,
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * rand(0.6, 1.2),
        size: size * rand(0.6, 1.3),
      });
    }
  }

  ring(x, y, color, maxR = 60, life = 0.35, width = 3) {
    this.spawn({ x, y, kind: 'ring', color, life, size: maxR, width, glow: true });
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) {
        l[i] = l[l.length - 1];
        l.pop();
        continue;
      }
      p.vy += p.g * dt;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
    }
  }

  draw(ctx, layer = null) {
    for (const p of this.list) {
      if (layer !== null && (p.layer || 0) !== layer) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.5) * (p.alpha ?? 1);
      ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k * 0.85), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'streak') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.3, p.size * (p.shrink === false ? 1 : k)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
