import { GROUND, GRAVITY, clamp, rand, glow } from './util.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { drawBoy } from './art.js';

const SPEED = 360;
const JUMP_V = -840;
const DJUMP_V = -840; // ~160px of extra height, enough to reach the ledges from the floor
const DASH_V = 940;
export const SOUL_COST = 33;
export const SOUL_MAX = 99;

// a0..a1 is the active window in seconds; w/h is the hitbox
const ATTACKS = {
  punch: { dur: 0.24, a0: 0.04, a1: 0.13, cd: 0.06, dmg: 1, kb: 260, w: 62, h: 42 },
  upPunch: { dur: 0.26, a0: 0.04, a1: 0.14, cd: 0.08, dmg: 1, kb: 60, kby: -320, w: 58, h: 70, dirY: -1 },
  kick: { dur: 0.36, a0: 0.1, a1: 0.22, cd: 0.12, dmg: 2, kb: 500, w: 84, h: 46 },
  downKick: { dur: 0.32, a0: 0.04, a1: 0.24, cd: 0.08, dmg: 2, kb: 80, kby: 300, w: 58, h: 64, dirY: 1 },
  beam: { dur: 0.45, a0: 99, a1: 99, cd: 0.2 },
};

export class Player {
  constructor(x) {
    this.w = 30;
    this.h = 62;
    this.x = x;
    this.y = GROUND - this.h;
    this.vx = 0;
    this.vy = 0;
    this.dir = 1;
    this.onGround = true;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.airJumps = 1;
    this.maxHp = 5;
    this.hp = 5;
    this.soul = 0;
    this.inv = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.airDash = true;
    this.dropT = 0;
    this.atk = null;
    this.atkCd = 0;
    this.hurtT = 0;
    this.focusT = 0;
    this.t = 0;
    this.dead = false;
  }

  get cx() {
    return this.x + this.w / 2;
  }
  get cy() {
    return this.y + this.h / 2;
  }

  update(dt, g) {
    this.t += dt;
    if (this.dead) {
      this.vy += GRAVITY * dt;
      this.y = Math.min(this.y + this.vy * dt, GROUND - this.h);
      return;
    }
    const left = Input.held('left');
    const right = Input.held('right');
    const upH = Input.held('up');
    const downH = Input.held('down');

    this.inv = Math.max(0, this.inv - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (Input.hit('jump')) this.jumpBuf = 0.12;

    // ---- focus: hold to spend soul and mend a mask ----
    const canFocus = this.onGround && !this.atk && this.dashT <= 0 && this.soul >= SOUL_COST && this.hp < this.maxHp;
    if (Input.held('focus') && canFocus) {
      this.focusT += dt;
      this.vx = 0;
      if (Math.random() < 0.6) {
        const a = rand(0, Math.PI * 2);
        g.particles.spawn({ x: this.cx + Math.cos(a) * 60, y: this.cy + Math.sin(a) * 60, vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 120, life: 0.45, size: 2.5, color: '#cfe9ff', glow: true });
      }
      if (this.focusT >= 1) {
        this.focusT = 0;
        this.hp++;
        this.soul -= SOUL_COST;
        Audio.play('heal');
        g.particles.burst(this.cx, this.cy - 10, 26, { speed: 260, color: '#e6f4ff', glow: true, life: 0.6 });
        g.particles.ring(this.cx, this.cy, '#cfe9ff', 90, 0.5);
      }
      this.applyPhysics(dt, g);
      return;
    }
    this.focusT = 0;

    // ---- attacks ----
    if (this.atk) {
      this.atk.t += dt;
      if (this.atk.t >= this.atk.def.dur) {
        this.atkCd = this.atk.def.cd;
        this.atk = null;
      }
    }
    if (!this.atk && this.atkCd <= 0 && this.dashT <= 0) {
      if (Input.hit('punch')) this.startAttack(upH ? 'upPunch' : 'punch', g);
      else if (Input.hit('kick')) this.startAttack(!this.onGround && downH ? 'downKick' : 'kick', g);
      else if (Input.hit('beam')) {
        if (!g.powers.has('beam')) g.toast('The Dream Beam is still locked');
        else if (this.soul < SOUL_COST) g.toast('Not enough soul. Land hits to fill it');
        else {
          this.soul -= SOUL_COST;
          this.startAttack('beam', g);
          this.beamUp = upH;
          g.fireBeam(this, upH);
        }
      }
    }

    // ---- dash ----
    if (Input.hit('dash') && this.dashCd <= 0 && (this.onGround || this.airDash) && !this.atk) {
      this.dashT = 0.16;
      this.dashCd = 0.5;
      if (!this.onGround) this.airDash = false;
      if (left) this.dir = -1;
      if (right) this.dir = 1;
      Audio.play('dash');
    }

    // ---- horizontal movement ----
    const beaming = this.atk && this.atk.type === 'beam';
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dir * DASH_V;
      this.vy = 0;
      g.particles.spawn({ x: this.cx - this.dir * 10, y: this.cy + rand(-20, 20), vx: -this.dir * 200, vy: 0, life: 0.25, size: 3, color: '#8ff5ff', kind: 'streak', glow: true });
    } else if (this.hurtT > 0.25) {
      // knocked back: no control briefly
    } else {
      const target = beaming ? 0 : (right - left) * SPEED;
      const accel = this.onGround ? 5200 : 3400;
      const dv = target - this.vx;
      this.vx += clamp(dv, -accel * dt, accel * dt);
      if (!this.atk && left !== right) this.dir = right ? 1 : -1;
    }

    // ---- jumping ----
    if (this.jumpBuf > 0 && !beaming) {
      if ((this.onGround || this.coyote > 0) && downH && g.onPlatform(this)) {
        this.dropT = 0.25;
        this.jumpBuf = 0;
        this.onGround = false;
      } else if (this.onGround || this.coyote > 0) {
        this.vy = JUMP_V;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuf = 0;
        Audio.play('jump');
        g.particles.burst(this.cx, this.y + this.h, 8, { speed: 120, angle: -Math.PI / 2, spread: 2.4, color: '#9cc9e8', life: 0.35, size: 2.5 });
      } else if (this.airJumps > 0 && this.dashT <= 0) {
        this.airJumps--;
        this.vy = Math.min(this.vy, DJUMP_V); // never slower than you were already rising
        this.jumpBuf = 0;
        Audio.play('djump');
        g.particles.ring(this.cx, this.y + this.h, '#cfe9ff', 40, 0.35);
        g.particles.burst(this.cx, this.y + this.h, 12, { speed: 200, angle: Math.PI / 2, spread: 2, color: '#dff0ff', glow: true, life: 0.4, size: 2 });
      }
    }
    if (Input.let('jump') && this.vy < -280) this.vy *= 0.45;

    if (beaming) this.vy *= 0.6;
    this.applyPhysics(dt, g);
  }

  applyPhysics(dt, g) {
    if (this.dashT <= 0) this.vy = Math.min(this.vy + GRAVITY * dt, 1150);
    const prevBottom = this.y + this.h;
    this.x = clamp(this.x + this.vx * dt, 0, g.level.width - this.w);
    this.y += this.vy * dt;

    const wasGround = this.onGround;
    this.onGround = false;
    if (this.y + this.h >= GROUND) {
      this.y = GROUND - this.h;
      this.vy = 0;
      this.onGround = true;
    } else if (this.vy >= 0 && this.dropT <= 0) {
      for (const p of g.platforms) {
        if (this.x + this.w > p.x + 4 && this.x < p.x + p.w - 4 && prevBottom <= p.y + 1 && this.y + this.h >= p.y) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          break;
        }
      }
    }
    if (this.onGround) {
      this.airJumps = 1;
      this.airDash = true;
      if (!wasGround) {
        Audio.play('land');
        g.particles.burst(this.cx, this.y + this.h, 6, { speed: 90, angle: -Math.PI / 2, spread: 3, color: '#7d9db5', life: 0.3, size: 2 });
      }
    } else if (wasGround && this.vy >= 0) {
      this.coyote = 0.1;
    }
  }

  startAttack(type, g) {
    this.atk = { type, def: ATTACKS[type], t: 0, hit: new Set() };
    const ember = g.powers.has('ember') && (type === 'punch' || type === 'upPunch');
    if (type === 'beam') Audio.play('beam');
    else if (ember) Audio.play('ember');
    else Audio.play(type.includes('unch') ? 'punch' : 'kick');
    if (type === 'kick' && g.powers.has('moon')) {
      g.spawnCrescent(this);
    }
  }

  // Returns the live hitbox for the current attack, or null
  hitbox(g) {
    const a = this.atk;
    if (!a) return null;
    const d = a.def;
    if (a.t < d.a0 || a.t > d.a1) return null;
    const ember = g.powers.has('ember') && (a.type === 'punch' || a.type === 'upPunch');
    const w = d.w * (ember ? 1.35 : 1);
    const h = d.h * (ember ? 1.2 : 1);
    let box;
    if (d.dirY === -1) box = { x: this.cx - w / 2, y: this.y - h + 14, w, h };
    else if (d.dirY === 1) box = { x: this.cx - w / 2, y: this.y + this.h - 16, w, h };
    else box = { x: this.dir > 0 ? this.x + this.w - 8 : this.x + 8 - w, y: this.y + 6, w, h };
    return { box, dmg: d.dmg * (ember ? 2 : 1), kb: d.kb * this.dir, kby: d.kby || 0, type: a.type, hit: a.hit, ember, breaker: a.type === 'kick' && g.powers.has('moon') };
  }

  // Called by the game when one of our attacks connects
  onHitLanded(type, g) {
    this.soul = Math.min(SOUL_MAX, this.soul + 11);
    if (type === 'downKick') {
      this.vy = -640;
      this.airJumps = 1;
      this.airDash = true;
    } else if (type === 'punch' || type === 'kick') {
      this.vx -= this.dir * (this.onGround ? 90 : 160);
    }
  }

  hurt(dmg, fromX, g) {
    if (this.dead || this.inv > 0 || this.dashT > 0) return false;
    this.hp -= dmg;
    this.inv = g.diff.inv;
    this.hurtT = 0.4;
    this.focusT = 0;
    this.atk = null;
    this.vx = (this.cx < fromX ? -1 : 1) * 430;
    this.vy = -430;
    this.onGround = false;
    Audio.play('hurt');
    g.shake(14);
    g.hitstop(0.12);
    g.flash('#ffffff', 0.25);
    g.particles.burst(this.cx, this.cy, 22, { speed: 380, color: '#0a0a12', life: 0.6, size: 4, g: 600 });
    g.particles.burst(this.cx, this.cy, 10, { speed: 300, color: '#ffffff', glow: true, life: 0.35, size: 2.5 });
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      g.onPlayerDeath();
    }
    return true;
  }

  pose() {
    if (this.dead) return 'hurt';
    if (this.atk) return this.atk.type === 'beam' && this.beamUp ? 'upPunch' : this.atk.type;
    if (this.dashT > 0) return 'dash';
    if (this.hurtT > 0) return 'hurt';
    if (this.focusT > 0) return 'focus';
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (Math.abs(this.vx) > 30) return 'run';
    return 'idle';
  }

  draw(ctx, g) {
    const pose = this.pose();
    const ember = g.powers.has('ember');
    glow(ctx, this.cx, this.y + 14, 140, 'rgba(110,230,255,0.15)');
    if (this.focusT > 0) glow(ctx, this.cx, this.cy, 70 + this.focusT * 40, 'rgba(210,235,255,0.5)');
    const flicker = this.inv > 0 && !this.dead && Math.floor(this.inv * 18) % 2 === 0;
    const p = this.atk ? this.atk.t / this.atk.def.dur : 0;
    drawBoy(ctx, { x: this.cx, y: this.y + this.h, dir: this.dir, t: this.t, pose, p, alpha: flicker ? 0.35 : 1, ember });
    this.drawSlash(ctx, g, ember);
  }

  drawSlash(ctx, g, ember) {
    const a = this.atk;
    if (!a || a.type === 'beam') return;
    const d = a.def;
    const k = (a.t - d.a0) / (d.a1 - d.a0 + 0.06);
    if (k < 0 || k > 1) return;
    const isKick = a.type === 'kick' || a.type === 'downKick';
    const R = isKick ? 52 : 40 * (ember && !isKick ? 1.3 : 1);
    ctx.save();
    ctx.translate(this.cx, this.y + (isKick ? 34 : 24));
    ctx.scale(this.dir, 1);
    if (d.dirY === -1) {
      ctx.translate(0, -30);
      ctx.rotate(-Math.PI / 2);
    } else if (d.dirY === 1) {
      ctx.translate(0, 40);
      ctx.rotate(Math.PI / 2);
    } else ctx.translate(18, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k;
    const col = ember && !isKick ? '#ffb070' : isKick && g.powers.has('moon') ? '#cfe0ff' : '#ffffff';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, R, -1.1, 1.1);
    ctx.arc(-R * 0.35, 0, R * 0.8, 1.0, -1.0, true);
    ctx.fill();
    ctx.restore();
  }
}
