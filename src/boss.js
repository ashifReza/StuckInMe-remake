// The final fight: the Obsidian Knight (the original game's boss, reimagined),
// and the twist when it falls: it was the witch all along.
import { W, GROUND, GRAVITY, clamp, rand, choice, lerp, glow } from './util.js';
import { Audio } from './audio.js';
import { drawKnight, drawWitch } from './art.js';
import { Enemy, Orb } from './enemies.js';

// ---------- hazards ----------
// A pillar that erupts from the ground after a glowing warning.
class Pillar {
  constructor(x, color = '#ff7a1a') {
    Object.assign(this, { x, color, t: 0, warn: 0.9, up: 0.55, dead: false, dmg: 1, breakable: false, played: false });
  }
  get box() {
    if (this.t < this.warn || this.t > this.warn + this.up) return null;
    return { x: this.x - 16, y: GROUND - 110, w: 32, h: 110 };
  }
  update(dt, g) {
    this.t += dt;
    if (this.t >= this.warn && !this.played) {
      this.played = true;
      Audio.play('thorn');
      g.particles.burst(this.x, GROUND, 12, { speed: 300, angle: -Math.PI / 2, spread: 1, color: this.color, glow: true, life: 0.6, size: 3, g: 700 });
    }
    if (this.t > this.warn + this.up + 0.3) this.dead = true;
  }
  draw(ctx) {
    const rgba = this.color === '#ff7a1a' ? 'rgba(255,120,30,0.85)' : 'rgba(200,110,255,0.85)';
    if (this.t < this.warn) {
      const k = this.t / this.warn;
      glow(ctx, this.x, GROUND, 40 + k * 24, rgba, 0.4 + k * 0.6);
      return;
    }
    const k = this.t - this.warn;
    const h = 110 * Math.min(1, k / 0.08) * (k > this.up ? Math.max(0, 1 - (k - this.up) / 0.3) : 1);
    glow(ctx, this.x, GROUND - h / 2, 60, rgba, 0.8, h / 2 + 20);
    ctx.fillStyle = '#ffe2b0';
    ctx.beginPath();
    ctx.moveTo(this.x - 12, GROUND);
    ctx.quadraticCurveTo(this.x - 6, GROUND - h * 0.6, this.x, GROUND - h);
    ctx.quadraticCurveTo(this.x + 6, GROUND - h * 0.6, this.x + 12, GROUND);
    ctx.fill();
  }
}

// A wave of fire that races along the floor; jump it.
class GroundWave {
  constructor(x, vx, color = '#ff7a1a') {
    Object.assign(this, { x, vx, color, t: 0, dead: false, dmg: 1, breakable: false });
  }
  get box() {
    return { x: this.x - 16, y: GROUND - 34, w: 32, h: 34 };
  }
  update(dt, g) {
    this.t += dt;
    this.x += this.vx * dt;
    if (this.x < -40 || this.x > g.level.width + 40) this.dead = true;
    g.particles.spawn({ x: this.x + rand(-10, 10), y: GROUND - rand(0, 30), vx: -this.vx * 0.1, vy: rand(-140, -40), life: 0.4, size: rand(3, 6), color: this.color, glow: true });
  }
  draw(ctx) {
    glow(ctx, this.x, GROUND - 16, 50, 'rgba(255,120,40,0.85)');
    ctx.fillStyle = '#ffe2b0';
    ctx.beginPath();
    ctx.moveTo(this.x - 14, GROUND);
    ctx.quadraticCurveTo(this.x, GROUND - 46 - Math.sin(this.t * 30) * 6, this.x + 14, GROUND);
    ctx.fill();
  }
}

// ---------- the Obsidian Knight ----------
// target arm/sword/shield/crouch poses for each state
const POSES = {
  intro: { arm: -1.2, sword: -1.0, shield: 0, crouch: 0 },
  landed: { arm: 1.1, sword: 1.0, shield: 0, crouch: 1 },
  walk: { arm: 1.0, sword: 0.9, shield: 0, crouch: 0 },
  guard: { arm: 1.2, sword: 1.1, shield: 1, crouch: 0.3 },
  thrustWind: { arm: 2.7, sword: 3.0, shield: 0, crouch: 0.6 },
  thrust: { arm: 0, sword: 0, shield: 0, crouch: 0.2 },
  slamRaise: { arm: -2.0, sword: -1.7, shield: 0, crouch: 0 },
  slam: { arm: 0.75, sword: 0.65, shield: 0, crouch: 0.8 },
  leapCrouch: { arm: 1.2, sword: 1.0, shield: 0, crouch: 1 },
  leap: { arm: -1.3, sword: -1.1, shield: 0, crouch: 0 },
  plant: { arm: 1.35, sword: 1.55, shield: 0, crouch: 0.7 },
  hex: { arm: 1.0, sword: 0.9, shield: 1, crouch: 0.2 },
  roar: { arm: -0.6, sword: -0.4, shield: 0, crouch: 0.2 },
  recover: { arm: 1.3, sword: 1.2, shield: 0, crouch: 0.5 },
  dying: { arm: 1.5, sword: 1.57, shield: 0, crouch: 1 },
};

export class Knight extends Enemy {
  constructor() {
    super(W * 0.68, -420, 100, 180, 130);
    this.name = 'The Obsidian Knight';
    this.bar = ['#a3260f', '#ffb347']; // health bar gradient
    this.gravity = false; // handles its own falling
    this.kbResist = 1;
    this.points = 1000;
    this.eye = '#ff8a2a';
    this.spawnT = 0;
    this.state = 'intro';
    this.dir = -1;
    this.cd = 1;
    this.walkPh = 0;
    this.pose = { ...POSES.intro };
    this.heat = 0.5;
    this.purple = 0;
    this.kneel = 0;
    this.phaseSeen = 1;
    this.shown = 0;
    this.lastAttack = '';
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.66 ? 1 : k > 0.33 ? 2 : 3;
  }
  get speedMul() {
    return [1, 1.15, 1.3][this.phase - 1];
  }
  hurtbox() {
    return { x: this.x + 14, y: this.y + 8, w: this.w - 28, h: this.h - 8 };
  }
  setState(s) {
    super.setState(s);
    this.fired = false;
  }

  // the sword's damaging area, while it is swinging
  attackBox() {
    const front = (w) => (this.dir > 0 ? this.cx + 10 : this.cx - 10 - w);
    if (this.state === 'thrust') return { x: front(210), y: GROUND - 125, w: 210, h: 50 };
    if (this.state === 'slam' && this.st < 0.14) return { x: front(175), y: GROUND - 160, w: 175, h: 160 };
    return null;
  }

  takeHit(hit, g) {
    if (['intro', 'landed', 'dying'].includes(this.state) || this.dead) return null;
    // a raised shield turns aside hits from the front (Moon Kick and the beam break through)
    const facing = (g.player.cx - this.cx) * this.dir > 0;
    if ((this.state === 'guard' || this.state === 'hex') && facing && !hit.breaker) {
      g.player.vx = g.player.cx < this.cx ? -260 : 260;
      return 'block';
    }
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
      this.setState('roar');
      Audio.play('roar');
      g.shake(16);
      g.flash(this.phase === 3 ? '#c27bff' : '#ff9a4a', 0.35);
      if (this.phase === 3) g.toast("The knight's fire is turning violet...");
    }
    return 'hit';
  }

  update(dt, g) {
    this.t += dt;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    const filling = this.state === 'intro' || this.state === 'landed';
    this.shown = lerp(this.shown, filling ? Math.min(this.maxHp, (this.t / 3) * this.maxHp) : this.hp, Math.min(1, dt * 6));
    this.contact = ['intro', 'dying'].includes(this.state) ? 0 : 1;
    this.ai(dt, g);

    // its own heavy gravity for the entrance and leaps
    if (this.state === 'intro' || this.state === 'leap' || this.y + this.h < GROUND) {
      this.vy = Math.min(this.vy + GRAVITY * 1.1 * dt, 1500);
    }
    this.x = clamp(this.x + this.vx * dt, 10, g.level.width - this.w - 10);
    this.y += this.vy * dt;
    this.onGround = false;
    if (this.y + this.h >= GROUND) {
      this.y = GROUND - this.h;
      this.vy = 0;
      this.onGround = true;
    }

    // ease toward the pose for this state
    const target = POSES[this.state] || POSES.walk;
    const snap = this.state === 'thrust' || this.state === 'slam' ? 30 : 9;
    for (const k of ['arm', 'sword', 'shield', 'crouch']) this.pose[k] += (target[k] - this.pose[k]) * Math.min(1, dt * snap);
    const charging = this.state === 'thrustWind' || this.state === 'slamRaise';
    this.heat = lerp(this.heat, 0.45 + this.phase * 0.18 + (charging ? 0.3 : 0), dt * 3);
    this.purple = lerp(this.purple, this.state === 'dying' ? 1 : this.phase === 3 ? 0.35 : 0, dt * 2);

    // embers drifting off the armor
    if (this.state !== 'intro' && Math.random() < 0.35 + this.heat * 0.3) {
      const violet = this.purple > 0.3 && Math.random() < 0.5;
      g.particles.spawn({ x: this.cx + rand(-40, 40), y: this.y + rand(20, 150), vx: rand(-20, 20), vy: rand(-120, -50), life: rand(0.5, 1.1), size: rand(1.5, 3), color: violet ? '#c27bff' : '#ff9a3a', glow: true });
    }
  }

  ai(dt, g) {
    const p = g.player;
    const dx = p.cx - this.cx;
    const sm = this.speedMul;
    const turn = () => (this.dir = dx > 0 ? 1 : -1);

    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (this.onGround) {
          g.shake(22);
          Audio.play('kick');
          Audio.play('roar');
          g.particles.ring(this.cx, GROUND, '#ff7a1a', 220, 0.6, 6);
          g.particles.burst(this.cx, GROUND, 30, { speed: 420, angle: -Math.PI / 2, spread: 2.6, color: '#1a1216', life: 0.7, size: 5, g: 900 });
          this.setState('landed');
        }
        break;

      case 'landed':
        this.vx = 0;
        if (this.st > 1.4) this.toWalk(0.6);
        break;

      case 'walk': {
        turn();
        const d = Math.abs(dx);
        this.vx = d > 90 ? this.dir * 115 * sm : 0;
        this.walkPh += dt * 6 * sm;
        this.cd -= dt;
        if (this.cd <= 0) {
          const pool = d < 240 ? ['thrust', 'slam', 'guard', 'thrust'] : d < 520 ? ['thrust', 'leap', 'slam'] : ['leap'];
          if (this.phase >= 3) pool.push('eruption', 'hex');
          let pick = choice(pool);
          if (pick === this.lastAttack) pick = choice(pool);
          this.lastAttack = pick;
          this.setState({ thrust: 'thrustWind', slam: 'slamRaise', leap: 'leapCrouch', guard: 'guard', eruption: 'plant', hex: 'hex' }[pick]);
        }
        break;
      }

      case 'guard':
        this.vx = 0;
        turn();
        if (this.st > 1.0) this.toWalk(0.2);
        break;

      case 'thrustWind':
        // pull the blade back; a glint warns you
        this.vx = -this.dir * 30;
        if (!this.fired && this.st > 0.2) {
          this.fired = true;
          g.particles.ring(this.cx - this.dir * 60, this.y + 60, '#fff2d0', 40, 0.3, 3);
        }
        if (this.st > 0.55 / sm) {
          this.setState('thrust');
          this.vx = this.dir * 980;
          Audio.play('dash');
        }
        break;

      case 'thrust':
        this.vx *= 0.94;
        if (this.st > 0.28) this.setState('recover');
        break;

      case 'slamRaise':
        this.vx = 0;
        turn();
        if (this.st > 0.7 / sm) this.setState('slam');
        break;

      case 'slam':
        this.vx = 0;
        if (!this.fired && this.st > 0.08) {
          this.fired = true;
          const tip = this.cx + this.dir * 150;
          g.shake(15);
          Audio.play('kick');
          g.particles.ring(tip, GROUND, '#ff7a1a', 120, 0.45, 5);
          g.spawnHostile(new GroundWave(tip, this.dir * 470));
          if (this.phase >= 2) g.spawnHostile(new GroundWave(tip, -this.dir * 470));
        }
        if (this.st > 0.35) this.setState('recover');
        break;

      case 'leapCrouch':
        this.vx = 0;
        turn();
        if (this.st > 0.4 / sm) {
          this.setState('leap');
          const air = (2 * 1050) / (GRAVITY * 1.1);
          this.vy = -1050;
          this.vx = clamp(dx / air, -1000, 1000);
          this.y -= 2;
          Audio.play('djump');
        }
        break;

      case 'leap':
        if (this.onGround && this.st > 0.15) {
          this.vx = 0;
          g.shake(18);
          Audio.play('kick');
          g.particles.ring(this.cx, GROUND, '#ff7a1a', 170, 0.5, 6);
          g.spawnHostile(new GroundWave(this.cx - 50, -430));
          g.spawnHostile(new GroundWave(this.cx + 50, 430));
          this.setState('recover');
        }
        break;

      case 'plant':
        // sword driven into the ground: fire, and violet witch-fire, erupts
        this.vx = 0;
        if (!this.fired && this.st > 0.6) {
          this.fired = true;
          g.shake(12);
          g.spawnHostile(new Pillar(p.cx));
          for (let i = 0; i < 5; i++) g.spawnHostile(new Pillar(rand(60, g.level.width - 60), i % 2 ? '#c27bff' : '#ff7a1a'));
        }
        if (this.st > 1.8) this.toWalk(0.6);
        break;

      case 'hex':
        // the witch's magic leaking through the armor: homing violet orbs
        this.vx = 0;
        turn();
        if (!this.fired && this.st > 0.6) {
          this.fired = true;
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(p.cy - (this.y + 20), dx) + i * 0.35;
            const o = new Orb(this.cx + this.dir * 20, this.y + 20, Math.cos(a) * 260, Math.sin(a) * 260, '#d48bff', 12, 4);
            o.home = 1.3;
            g.spawnHostile(o);
          }
          Audio.play('shoot');
        }
        if (this.st > 1.2) this.toWalk(0.5);
        break;

      case 'roar':
        this.vx = 0;
        if (Math.random() < 0.3) g.particles.ring(this.cx, this.y + 30, this.phase === 3 ? '#c27bff' : '#ff7a1a', 180, 0.5, 3);
        if (this.st > 1.3) this.toWalk(0.4);
        break;

      case 'recover':
        this.vx *= 0.85;
        if (this.st > 0.95 / sm) this.toWalk(rand(0.3, 0.9) / sm);
        break;

      case 'dying':
        this.vx = 0;
        this.kneel = Math.min(1, this.st / 1.2);
        if (Math.random() < 0.5) {
          g.particles.burst(this.cx + rand(-40, 40), this.y + rand(20, 160), 3, { speed: 200, color: choice(['#c27bff', '#d48bff', '#ffffff']), glow: true, life: 0.7, size: 3 });
          g.shake(4);
        }
        if (this.st > 2.8 && !this.fired) {
          this.fired = true;
          g.startReveal(this);
        }
        break;
    }
  }

  toWalk(cd) {
    this.setState('walk');
    this.cd = cd;
  }

  draw(ctx) {
    drawKnight(ctx, {
      x: this.cx,
      y: this.y + this.h,
      dir: this.dir,
      t: this.t,
      ...this.pose,
      walk: this.walkPh,
      moving: this.state === 'walk' && Math.abs(this.vx) > 10,
      heat: this.heat,
      purple: this.purple,
      flash: this.flash,
      kneel: this.kneel,
    });
  }
}

// ---------- the reveal: the witch rises out of the broken armor ----------
export class WitchReveal {
  constructor(x) {
    Object.assign(this, { x, y: GROUND - 70, t: 0, state: 'emerge', st: 0, done: false, laughT: 0 });
  }
  laugh() {
    this.laughT = 0.8;
  }
  fade() {
    this.state = 'fade';
    this.st = 0;
  }
  update(dt, g) {
    this.t += dt;
    this.st += dt;
    this.laughT = Math.max(0, this.laughT - dt);
    if (this.state === 'emerge') {
      this.y = lerp(this.y, GROUND - 230, Math.min(1, dt * 1.5));
      if (Math.random() < 0.6) g.particles.spawn({ x: this.x + rand(-50, 50), y: GROUND - rand(0, 40), vx: rand(-20, 20), vy: rand(-160, -60), life: 1, size: rand(6, 12), color: 'rgba(40,10,60,0.7)' });
    } else if (this.state === 'fade') {
      if (Math.random() < 0.8) g.particles.burst(this.x + rand(-40, 40), this.y + rand(-90, 90), 3, { speed: 260, color: choice(['#ffffff', '#d48bff', '#ff6fd8']), glow: true, life: 0.8, size: 3 });
      if (this.st > 2.6 && !this.done) {
        this.done = true;
        g.flash('#ffffff', 1.2);
        g.particles.burst(this.x, this.y, 90, { speed: 700, color: '#ffffff', glow: true, life: 1.2, size: 4 });
        g.onBossDefeated();
      }
    }
  }
  draw(ctx) {
    if (this.done) return;
    const appear = Math.min(1, this.t / 1.6);
    const fade = this.state === 'fade' ? Math.max(0, 1 - this.st / 2.6) : 1;
    const flicker = this.state === 'fade' && Math.floor(this.st * 18) % 2 ? 0.4 : 1;
    const shake = this.laughT > 0 ? Math.sin(this.t * 60) * 2 : 0;
    drawWitch(ctx, {
      x: this.x + shake,
      y: this.y + Math.sin(this.t * 1.6) * 6,
      dir: -1,
      t: this.t,
      pose: this.state === 'fade' ? 'stunned' : 'cast',
      alpha: appear * fade * flicker,
    });
  }
}
