import { GROUND, GRAVITY, clamp, rand, sign, glow } from './util.js';
import { Audio } from './audio.js';

const INK = '#07080f';

export class Enemy {
  constructor(x, y, w, h, hp) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.hp = hp;
    this.maxHp = hp;
    this.vx = 0;
    this.vy = 0;
    this.dir = -1;
    this.t = Math.random() * 10;
    this.state = 'idle';
    this.st = 0; // time in current state
    this.flash = 0;
    this.stagger = 0;
    this.kbResist = 0;
    this.gravity = true;
    this.onGround = false;
    this.contact = 1;
    this.dead = false;
    this.spawnT = 0.7;
    this.points = 30;
    this.eye = '#8fd3ff';
  }

  get cx() {
    return this.x + this.w / 2;
  }
  get cy() {
    return this.y + this.h / 2;
  }
  get spawning() {
    return this.spawnT > 0;
  }

  hurtbox() {
    return this;
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  update(dt, g) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      if (Math.random() < 0.5) {
        g.particles.spawn({ x: this.cx + rand(-30, 30), y: this.cy + rand(-30, 30), vx: rand(-30, 30), vy: rand(-80, -20), life: 0.6, size: rand(4, 9), color: 'rgba(20,10,30,0.8)' });
      }
      return;
    }
    this.st += dt;
    if (this.stagger > 0) {
      this.stagger -= dt;
      this.vx *= Math.max(0, 1 - 6 * dt);
    } else {
      this.ai(dt, g);
    }
    this.physics(dt, g);
  }

  ai() {}

  physics(dt, g) {
    if (this.gravity) this.vy = Math.min(this.vy + GRAVITY * dt, 1200);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 0) {
      this.x = 0;
      this.onWall?.(-1);
    }
    if (this.x + this.w > g.level.width) {
      this.x = g.level.width - this.w;
      this.onWall?.(1);
    }
    if (this.gravity) {
      this.onGround = false;
      if (this.y + this.h >= GROUND) {
        this.y = GROUND - this.h;
        this.vy = 0;
        this.onGround = true;
      }
    } else {
      this.y = clamp(this.y, 40, GROUND - this.h);
    }
  }

  // returns 'hit', 'block' or null
  takeHit(hit, g) {
    if (this.spawning || this.dead) return null;
    this.hp -= hit.dmg;
    this.flash = 0.12;
    this.stagger = 0.18;
    const r = 1 - this.kbResist;
    this.vx = hit.kb * r;
    if (hit.kby) this.vy = hit.kby * r;
    else if (!this.gravity) this.vy *= 0.3;
    if (this.hp <= 0) this.die(g);
    return 'hit';
  }

  die(g) {
    this.dead = true;
    Audio.play('enemyDie');
    g.particles.burst(this.cx, this.cy, 26, { speed: 420, color: INK, life: 0.8, size: 5, g: 900, drag: 1 });
    g.particles.burst(this.cx, this.cy, 14, { speed: 260, color: this.eye, glow: true, life: 0.6, size: 2.5 });
    g.particles.ring(this.cx, this.cy, this.eye, 80, 0.4);
    g.onEnemyKilled(this);
  }

  drawSpawn(ctx) {
    const k = 1 - this.spawnT / 0.7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.eye;
    ctx.globalAlpha = 0.6 * k;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, 40 * k, 50 * k, this.t * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    glow(ctx, this.cx, this.cy, 60 * k, 'rgba(120,60,180,0.6)');
  }

  drawEyes(ctx, ex, ey, gap, r = 3.2, bright = 1) {
    ctx.fillStyle = this.flash > 0 ? '#fff' : this.eye;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.arc(ex + gap, ey, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, ex + gap / 2, ey, 22 * bright, this.eye, 0.5 * bright);
  }

  body() {
    return this.flash > 0 ? '#f4f6ff' : INK;
  }
}

// ---------------- Level 1: Shadeling ----------------
// A small crawling shadow that scuttles closer, crouches, then pounces.
export class Shadeling extends Enemy {
  constructor(x) {
    super(x, GROUND - 36, 48, 36, 3);
    this.points = 30;
    this.eye = '#9fe0ff';
    this.cd = rand(1, 2);
  }
  ai(dt, g) {
    const p = g.player;
    const dx = p.cx - this.cx;
    this.cd -= dt;
    switch (this.state) {
      case 'idle':
        this.dir = sign(dx);
        this.vx = Math.abs(dx) > 40 ? this.dir * 130 : 0;
        if (this.cd <= 0 && Math.abs(dx) < 380 && this.onGround) this.setState('wind');
        break;
      case 'wind':
        this.vx = 0;
        if (this.st > 0.45) {
          this.setState('pounce');
          this.vx = this.dir * 520;
          this.vy = -440;
          this.onGround = false;
        }
        break;
      case 'pounce':
        if (this.onGround && this.st > 0.1) {
          this.setState('idle');
          this.vx = 0;
          this.cd = rand(1.2, 2.2);
        }
        break;
    }
  }
  draw(ctx) {
    if (this.spawning) return this.drawSpawn(ctx);
    const squash = this.state === 'wind' ? 0.75 + Math.sin(this.st * 40) * 0.03 : 1;
    const walk = Math.sin(this.t * 16) * (Math.abs(this.vx) > 10 ? 1 : 0);
    ctx.save();
    ctx.translate(this.cx, this.y + this.h);
    ctx.scale(this.dir, squash);
    ctx.strokeStyle = this.body();
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const lx = -16 + i * 10;
      ctx.beginPath();
      ctx.moveTo(lx, -12);
      ctx.lineTo(lx + 4 + (i % 2 ? walk : -walk) * 4, 0);
      ctx.stroke();
    }
    ctx.fillStyle = this.body();
    ctx.beginPath();
    ctx.ellipse(0, -18, 24, 15, 0, Math.PI, 0);
    ctx.quadraticCurveTo(24, -6, 0, -8);
    ctx.quadraticCurveTo(-24, -6, -24, -18);
    ctx.fill();
    // spiky mane
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-18 + i * 7, -28);
      ctx.lineTo(-22 + i * 7, -40 - Math.sin(this.t * 5 + i) * 3);
      ctx.lineTo(-13 + i * 7, -30);
      ctx.fill();
    }
    ctx.restore();
    this.drawEyes(ctx, this.cx + this.dir * 8 - 4, this.y + this.h - 22, this.dir * 9, 3.2, this.state === 'wind' ? 1.6 : 1);
  }
}

// ---------------- Level 2: Dusk Moth ----------------
// Hovers out of reach, then dives at where you're standing.
export class Moth extends Enemy {
  constructor(x) {
    super(x, rand(240, 360), 52, 40, 2);
    this.gravity = false;
    this.points = 40;
    this.eye = '#f0c4ff';
    this.cd = rand(2, 3.5);
    this.home = this.y;
    this.offset = rand(-200, 200);
  }
  ai(dt, g) {
    const p = g.player;
    this.cd -= dt;
    switch (this.state) {
      case 'idle': {
        const tx = p.cx + this.offset - this.w / 2;
        const ty = this.home + Math.sin(this.t * 2.4) * 40;
        this.vx += clamp((tx - this.x) * 2 - this.vx, -600 * dt * 4, 600 * dt * 4);
        this.vy += clamp((ty - this.y) * 2 - this.vy, -600 * dt * 4, 600 * dt * 4);
        this.dir = sign(p.cx - this.cx);
        if (this.cd <= 0) this.setState('wind');
        break;
      }
      case 'wind':
        this.vx *= 0.9;
        this.vy = -40;
        if (this.st > 0.55) {
          const dx = p.cx - this.cx;
          const dy = p.cy - this.cy;
          const d = Math.hypot(dx, dy) || 1;
          this.vx = (dx / d) * 640;
          this.vy = (dy / d) * 640;
          this.setState('dive');
        }
        break;
      case 'dive':
        if (this.st > 0.75 || this.y + this.h >= GROUND - 2) {
          this.setState('recover');
          this.vy = -260;
          this.vx *= 0.3;
        }
        break;
      case 'recover':
        this.vx *= 0.96;
        if (this.st > 0.8) {
          this.setState('idle');
          this.cd = rand(2.2, 3.6);
          this.offset = rand(-220, 220);
        }
        break;
    }
  }
  draw(ctx) {
    if (this.spawning) return this.drawSpawn(ctx);
    const flap = Math.sin(this.t * (this.state === 'wind' ? 50 : 22));
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.scale(this.dir, 1);
    // dusty wings
    ctx.fillStyle = this.flash > 0 ? '#fff' : 'rgba(170,140,200,0.55)';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(1, 1);
      ctx.rotate(s * (0.3 + flap * 0.5));
      ctx.beginPath();
      ctx.ellipse(-4, s * -18, 26, 14, s * -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = this.body();
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // antennae
    ctx.strokeStyle = this.body();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.quadraticCurveTo(14, -24, 24, -22);
    ctx.moveTo(4, -9);
    ctx.quadraticCurveTo(6, -26, 14, -28);
    ctx.stroke();
    ctx.restore();
    this.drawEyes(ctx, this.cx + this.dir * 4 - 3, this.cy - 2, this.dir * 7, 2.8, this.state === 'wind' ? 1.8 : 1);
  }
}

// ---------------- Level 3: Thornback ----------------
// A heavy armored beetle. Slow, tough, and it curls up to roll at you.
export class Thornback extends Enemy {
  constructor(x) {
    super(x, GROUND - 50, 72, 50, 7);
    this.kbResist = 0.7;
    this.points = 70;
    this.eye = '#ff9a8a';
    this.cd = rand(2, 3);
    this.spin = 0;
  }
  ai(dt, g) {
    const p = g.player;
    const dx = p.cx - this.cx;
    this.cd -= dt;
    switch (this.state) {
      case 'idle':
        this.dir = sign(dx);
        this.vx = this.dir * 70;
        if (this.cd <= 0 && Math.abs(dx) < 650) this.setState('curl');
        break;
      case 'curl':
        this.vx = 0;
        this.spin += dt * 6;
        if (this.st > 0.65) {
          this.setState('roll');
          this.vx = this.dir * 620;
          Audio.play('dash');
        }
        break;
      case 'roll':
        this.spin += dt * this.dir * 14;
        if (this.st > 1.3) {
          this.setState('idle');
          this.cd = rand(2.2, 3.4);
        }
        break;
    }
  }
  onWall(side) {
    if (this.state === 'roll') {
      this.dir = -side;
      this.vx = this.dir * 620;
    }
  }
  draw(ctx) {
    if (this.spawning) return this.drawSpawn(ctx);
    const rolling = this.state === 'roll' || this.state === 'curl';
    ctx.save();
    ctx.translate(this.cx, this.y + this.h - (rolling ? 25 : 0));
    ctx.scale(this.dir, 1);
    if (rolling) ctx.rotate(this.spin);
    ctx.fillStyle = this.body();
    if (rolling) {
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.2) * 23, Math.sin(a - 0.2) * 23);
        ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
        ctx.lineTo(Math.cos(a + 0.2) * 23, Math.sin(a + 0.2) * 23);
        ctx.fill();
      }
    } else {
      // legs
      ctx.strokeStyle = this.body();
      ctx.lineWidth = 4;
      const walk = Math.sin(this.t * 10);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-18 + i * 18, -10);
        ctx.lineTo(-22 + i * 18 + walk * (i % 2 ? 4 : -4), 0);
        ctx.stroke();
      }
      // domed shell with thorns
      ctx.beginPath();
      ctx.ellipse(-4, -18, 34, 26, 0, Math.PI, 0);
      ctx.lineTo(30, -8);
      ctx.lineTo(-38, -8);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i + 0.5) * (Math.PI / 6);
        const bx = -4 + Math.cos(a) * 32;
        const by = -18 + Math.sin(a) * 24;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by + 3);
        ctx.lineTo(-4 + Math.cos(a) * 50, -18 + Math.sin(a) * 40);
        ctx.lineTo(bx + 5, by + 3);
        ctx.fill();
      }
      // pale face plate
      ctx.fillStyle = this.flash > 0 ? '#fff' : '#d8d0c8';
      ctx.beginPath();
      ctx.ellipse(28, -14, 11, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.drawEyes(ctx, this.cx + this.dir * 26 - 3, this.y + this.h - 15, this.dir * 6, 2.4);
      return;
    }
    ctx.restore();
    glow(ctx, this.cx, this.y + this.h - 25, 40, this.eye, 0.3);
  }
}

// ---------------- Level 3: Wisp ----------------
// A ghost-light that keeps its distance and spits slow orbs. Orbs can be punched away.
export class Wisp extends Enemy {
  constructor(x) {
    super(x, rand(260, 380), 38, 42, 3);
    this.gravity = false;
    this.points = 50;
    this.eye = '#ffb8a0';
    this.cd = rand(1.5, 2.5);
    this.side = Math.random() < 0.5 ? -1 : 1;
  }
  ai(dt, g) {
    const p = g.player;
    this.cd -= dt;
    const tx = p.cx + this.side * 330 - this.w / 2;
    const ty = 300 + Math.sin(this.t * 1.7) * 60;
    const speed = this.state === 'charge' ? 0.4 : 1.6;
    this.vx += clamp((tx - this.x) * speed - this.vx, -1600 * dt, 1600 * dt);
    this.vy += clamp((ty - this.y) * speed - this.vy, -1600 * dt, 1600 * dt);
    this.dir = sign(p.cx - this.cx);
    if (this.state === 'idle' && this.cd <= 0) this.setState('charge');
    if (this.state === 'charge' && this.st > 0.7) {
      const dx = p.cx - this.cx;
      const dy = p.cy - this.cy;
      const d = Math.hypot(dx, dy) || 1;
      g.spawnHostile(new Orb(this.cx, this.cy, (dx / d) * 290, (dy / d) * 290, this.eye));
      Audio.play('shoot');
      this.setState('idle');
      this.cd = rand(2, 2.8);
      if (Math.random() < 0.3) this.side *= -1;
    }
  }
  draw(ctx) {
    if (this.spawning) return this.drawSpawn(ctx);
    const charge = this.state === 'charge' ? this.st / 0.7 : 0;
    glow(ctx, this.cx, this.cy, 70 + charge * 50, 'rgba(255,150,120,0.55)');
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.flash > 0 ? '#fff' : 'rgba(255,190,160,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, -30 - Math.sin(this.t * 9) * 5);
    ctx.quadraticCurveTo(18, -8, 14, 6);
    ctx.arc(0, 6, 14, 0, Math.PI);
    ctx.quadraticCurveTo(-18, -8, 0, -30 - Math.sin(this.t * 9) * 5);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(this.cx - 5 + this.dir * 2, this.cy + 4, 3, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(this.cx + 5 + this.dir * 2, this.cy + 4, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------- Hostile projectiles ----------------
export class Orb {
  constructor(x, y, vx, vy, color, r = 11, life = 5) {
    Object.assign(this, { x, y, vx, vy, color, r, life, dead: false, home: 0, t: 0, dmg: 1, breakable: true });
  }
  get box() {
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }
  update(dt, g) {
    this.t += dt;
    this.life -= dt;
    if (this.home > 0 && this.t < 2.2) {
      const p = g.player;
      const a = Math.atan2(p.cy - this.y, p.cx - this.x);
      const cur = Math.atan2(this.vy, this.vx);
      let da = a - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const s = Math.hypot(this.vx, this.vy);
      const na = cur + clamp(da, -this.home * dt, this.home * dt);
      this.vx = Math.cos(na) * s;
      this.vy = Math.sin(na) * s;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life <= 0 || this.y > GROUND + 20 || this.x < -50 || this.x > g.level.width + 50) this.dead = true;
    if (Math.random() < 0.5) g.particles.spawn({ x: this.x, y: this.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35, size: this.r * 0.5, color: this.color, glow: true });
  }
  draw(ctx) {
    glow(ctx, this.x, this.y, this.r * 3.5, this.color, 0.7);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const ENEMY_TYPES = { shadeling: Shadeling, moth: Moth, thornback: Thornback, wisp: Wisp };
