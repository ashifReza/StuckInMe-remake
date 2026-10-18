import { W, GROUND, clamp, rand, choice, lerp, glow } from './util.js';
import { Audio } from './audio.js';
import { drawWitch } from './art.js';
import { Enemy, Orb, Shadeling, Moth } from './enemies.js';

export const BOSS_NAME = 'Morwen, the Wicked Witch';

class ThornSpike {
  constructor(x) {
    Object.assign(this, { x, t: 0, warn: 0.9, up: 0.55, dead: false, dmg: 1, breakable: false, played: false });
  }
  get box() {
    if (this.t < this.warn || this.t > this.warn + this.up) return null;
    return { x: this.x - 16, y: GROUND - 100, w: 32, h: 100 };
  }
  update(dt, g) {
    this.t += dt;
    if (this.t >= this.warn && !this.played) {
      this.played = true;
      Audio.play('thorn');
      g.particles.burst(this.x, GROUND, 10, { speed: 260, angle: -Math.PI / 2, spread: 1.2, color: '#1a0820', life: 0.5, size: 4, g: 900 });
    }
    if (this.t > this.warn + this.up + 0.3) this.dead = true;
  }
  draw(ctx) {
    if (this.t < this.warn) {
      const k = this.t / this.warn;
      glow(ctx, this.x, GROUND, 40 + k * 20, 'rgba(255,90,200,0.8)', 0.4 + k * 0.6);
      return;
    }
    const k = this.t - this.warn;
    const h = 100 * Math.min(1, k / 0.08) * (k > this.up ? Math.max(0, 1 - (k - this.up) / 0.3) : 1);
    ctx.fillStyle = '#12061a';
    ctx.beginPath();
    ctx.moveTo(this.x - 18, GROUND);
    ctx.lineTo(this.x - 4, GROUND - h * 0.6);
    ctx.lineTo(this.x - 10, GROUND - h * 0.65);
    ctx.lineTo(this.x + 2, GROUND - h);
    ctx.lineTo(this.x + 8, GROUND - h * 0.55);
    ctx.lineTo(this.x + 18, GROUND);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,216,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class GroundWave {
  constructor(x, vx) {
    Object.assign(this, { x, vx, t: 0, dead: false, dmg: 1, breakable: false });
  }
  get box() {
    return { x: this.x - 16, y: GROUND - 34, w: 32, h: 34 };
  }
  update(dt, g) {
    this.t += dt;
    this.x += this.vx * dt;
    if (this.x < -40 || this.x > g.level.width + 40) this.dead = true;
    g.particles.spawn({ x: this.x + rand(-10, 10), y: GROUND - rand(0, 30), vx: -this.vx * 0.1, vy: rand(-120, -40), life: 0.4, size: rand(3, 6), color: '#ff6fd8', glow: true });
  }
  draw(ctx) {
    glow(ctx, this.x, GROUND - 16, 50, 'rgba(255,90,210,0.8)');
    ctx.fillStyle = '#ffd0f4';
    ctx.beginPath();
    ctx.moveTo(this.x - 14, GROUND);
    ctx.quadraticCurveTo(this.x, GROUND - 46 - Math.sin(this.t * 30) * 6, this.x + 14, GROUND);
    ctx.fill();
  }
}

export class Witch extends Enemy {
  constructor() {
    super(W / 2 - 40, -260, 80, 150, 130);
    this.gravity = false;
    this.kbResist = 1;
    this.points = 1000;
    this.eye = '#e0a0ff';
    this.spawnT = 0;
    this.state = 'intro';
    this.targetX = W / 2 - 40;
    this.hover = 230;
    this.lastAttack = '';
    this.floatFor = 1.6;
    this.phaseSeen = 1;
    this.deathT = 0;
    this.pose = 'float';
    this.shown = 0; // drives the health bar fill animation
  }

  setState(s) {
    super.setState(s);
    this.fired = false;
    this.warned = false;
    this.swoopSide = undefined;
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.66 ? 1 : k > 0.33 ? 2 : 3;
  }
  get speedMul() {
    return [1, 1.2, 1.45][this.phase - 1];
  }
  get contactOn() {
    return !['intro', 'dying', 'stunned', 'scream'].includes(this.state);
  }

  takeHit(hit, g) {
    if (['intro', 'dying', 'scream'].includes(this.state)) return null;
    this.hp -= hit.dmg;
    this.flash = 0.1;
    Audio.play('bossHit');
    if (this.hp <= 0) {
      this.hp = 0;
      this.setState('dying');
      Audio.play('roar');
      g.clearHostiles();
      return 'hit';
    }
    if (this.phase !== this.phaseSeen) {
      this.phaseSeen = this.phase;
      this.setState('scream');
      Audio.play('roar');
      g.shake(18);
      g.flash('#d48bff', 0.4);
    }
    return 'hit';
  }

  update(dt, g) {
    this.t += dt;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.shown = lerp(this.shown, this.state === 'intro' ? (this.st / 2.6) * this.maxHp : this.hp, Math.min(1, dt * 6));
    this.contact = this.contactOn ? 1 : 0;
    this.ai(dt, g);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, 20, g.level.width - this.w - 20);
  }

  moveTo(tx, ty, k, dt) {
    this.vx = (tx - this.x) * k;
    this.vy = (ty - this.y) * k;
  }

  pickAttack() {
    const pool = ['orbs', 'swoop'];
    if (this.phase >= 2) pool.push('thorns', 'summon', 'thorns');
    if (this.phase >= 3) pool.push('slam', 'swoop', 'slam');
    let a = choice(pool);
    if (a === this.lastAttack) a = choice(pool);
    this.lastAttack = a;
    return a;
  }

  ai(dt, g) {
    const p = g.player;
    this.dir = p.cx < this.cx ? -1 : 1;
    const sm = this.speedMul;
    this.pose = 'float';

    switch (this.state) {
      case 'intro':
        this.moveTo(this.x, this.hover, 1.6, dt);
        if (this.st > 0.3 && !this.roared) {
          this.roared = true;
          Audio.play('roar');
          g.shake(12);
        }
        if (this.st > 2.6) this.enterFloat();
        break;

      case 'float':
        this.moveTo(this.targetX, this.hover + Math.sin(this.t * 1.6) * 70, 2.2 * sm, dt);
        if (this.st > this.floatFor / sm) this.setState(this.pickAttack());
        break;

      case 'orbs':
        this.pose = 'cast';
        this.vx *= 0.9;
        this.vy *= 0.9;
        if (this.st > 0.7 && !this.fired) {
          this.fired = true;
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) {
            const a = Math.atan2(p.cy - this.cy, p.cx - this.cx) + (i - (n - 1) / 2) * 0.32;
            const o = new Orb(this.cx, this.cy - 30, Math.cos(a) * 250 * sm, Math.sin(a) * 250 * sm, '#d48bff', 13, 4.5);
            o.home = 1.4;
            g.spawnHostile(o);
          }
          Audio.play('shoot');
        }
        if (this.st > 1.5) this.enterFloat();
        break;

      case 'swoop': {
        // rise to the far side, then rake across the floor
        const side = this.swoopSide ?? (this.swoopSide = p.cx < W / 2 ? 1 : -1);
        const sx = side > 0 ? g.level.width - this.w - 40 : 40;
        if (this.st < 0.8) {
          this.moveTo(sx, 120, 5, dt);
        } else if (this.st < 1.25) {
          this.vx = 0;
          this.vy = 0;
          this.pose = 'cast';
          if (!this.warned) {
            this.warned = true;
            g.particles.ring(this.cx, this.cy - 58, '#ffffff', 60, 0.4, 4);
          }
        } else {
          this.pose = 'swoop';
          this.vx = -side * 980 * sm;
          this.vy = (GROUND - this.h - 6 - this.y) * 6;
          if (Math.random() < 0.8) g.particles.spawn({ x: this.cx, y: this.cy + rand(-60, 60), vx: -this.vx * 0.2, vy: rand(-40, 40), life: 0.5, size: 5, color: '#a35cff', glow: true });
          const reached = side > 0 ? this.x <= 30 : this.x >= g.level.width - this.w - 30;
          if (reached) {
            this.vx = 0;
            this.vy = 0;
            this.y = GROUND - this.h;
            g.shake(10);
            this.setState('stunned');
          }
        }
        break;
      }

      case 'thorns':
        this.pose = 'cast';
        this.vx *= 0.9;
        this.vy *= 0.9;
        if (this.st > 0.5 && !this.fired) {
          this.fired = true;
          const n = 4 + this.phase;
          g.spawnHostile(new ThornSpike(p.cx));
          for (let i = 1; i < n; i++) g.spawnHostile(new ThornSpike(rand(60, g.level.width - 60)));
        }
        if (this.st > 1.6) this.enterFloat();
        break;

      case 'summon':
        this.pose = 'cast';
        this.vx *= 0.9;
        this.vy *= 0.9;
        if (this.st > 0.8 && !this.fired) {
          this.fired = true;
          if (g.enemies.length < 3) {
            for (const x of [160, g.level.width - 220]) g.spawnEnemy(Math.random() < 0.5 ? new Shadeling(x) : new Moth(x));
          }
        }
        if (this.st > 1.3) this.enterFloat();
        break;

      case 'slam':
        if (this.st < 0.5) {
          this.moveTo(clamp(p.x - 25, 40, g.level.width - this.w - 40), 90, 6, dt);
        } else {
          this.pose = 'swoop';
          this.vx = 0;
          this.vy = 1500;
          if (this.y + this.h >= GROUND) {
            this.y = GROUND - this.h;
            this.vy = 0;
            g.shake(16);
            Audio.play('kick');
            for (const s of [-1, 1]) {
              g.spawnHostile(new GroundWave(this.cx + s * 40, s * 460));
              g.spawnHostile(new GroundWave(this.cx + s * 40 - s * 260, s * 460));
            }
            g.particles.ring(this.cx, GROUND, '#ff6fd8', 160, 0.5, 5);
            this.setState('stunned');
          }
        }
        break;

      case 'stunned':
        this.pose = 'stunned';
        this.vx = 0;
        this.vy = 0;
        if (this.st > 1.5) this.setState('recover');
        break;

      case 'recover':
        this.moveTo(this.x, this.hover, 3, dt);
        if (this.st > 0.7) this.enterFloat();
        break;

      case 'scream':
        this.pose = 'cast';
        this.vx *= 0.85;
        this.vy *= 0.85;
        if (!this.fired) {
          this.fired = true;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            g.spawnHostile(new Orb(this.cx, this.cy, Math.cos(a) * 200, Math.sin(a) * 200, '#ff6fd8', 11, 3));
          }
        }
        if (Math.random() < 0.3) g.particles.ring(this.cx, this.cy, '#d48bff', 200, 0.6, 3);
        if (this.st > 1.5) this.enterFloat();
        break;

      case 'dying':
        this.vx = 0;
        this.vy = -12;
        this.pose = 'stunned';
        if (Math.random() < 0.6) {
          g.particles.burst(this.cx + rand(-40, 40), this.cy + rand(-80, 80), 6, { speed: 300, color: choice(['#ffffff', '#d48bff', '#ff6fd8']), glow: true, life: 0.8, size: 3 });
          g.shake(6);
        }
        if (this.st > 3 && !this.dead) {
          this.dead = true;
          g.flash('#ffffff', 1.2);
          g.particles.burst(this.cx, this.cy, 80, { speed: 700, color: '#ffffff', glow: true, life: 1.2, size: 4 });
          g.onBossDefeated(this);
        }
        break;
    }
  }

  enterFloat() {
    this.setState('float');
    this.floatFor = rand(1.2, 2.2);
    this.targetX = rand(120, W - 220);
  }

  draw(ctx) {
    const alpha = this.state === 'dying' ? Math.max(0, 1 - this.st / 3) + (Math.floor(this.st * 20) % 2) * 0.3 : 1;
    drawWitch(ctx, { x: this.cx, y: this.cy + 10, dir: this.dir, t: this.t, pose: this.pose, flash: this.flash, alpha: Math.min(1, alpha) });
  }
}
