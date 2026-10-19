import { W, H, GROUND, aabb, clamp, lerp, rand, seeded, weightedPick, glow, FONT_TITLE } from './util.js';
import { LEVELS, POWERS, LEVEL_CLEAR_BONUS, REVEAL_LINES, difficulty, powerCost } from './levels.js';
import { Background } from './background.js';
import { Particles } from './particles.js';
import { Player, SOUL_MAX } from './player.js';
import { ENEMY_TYPES } from './enemies.js';
import { Knight, WitchReveal, Witch } from './boss.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { drawHUD, drawLevelCard, drawBanner, drawToasts, drawDialog } from './ui.js';

const KNIGHT_SHARE = 0.6;
const WITCH_SHARE = 0.65;

const shrink = (b, m) => ({ x: b.x + m, y: b.y + m, w: b.w - m * 2, h: b.h - m * 2 });

function makePlatforms(level, li) {
  if (level.boss) {
    return [
      { x: 110, y: 470, w: 210 },
      { x: W - 320, y: 470, w: 210 },
      { x: W / 2 - 110, y: 360, w: 220 },
    ];
  }
  const r = seeded(500 + li * 31);
  const out = [];
  for (let x = 420; x < level.width - 300; x += 380 + r() * 260) {
    const w = 150 + r() * 110;
    const y = r() < 0.5 ? 485 : 420;
    out.push({ x, y, w });
    if (r() < 0.35) out.push({ x: x + w * 0.4, y: y - 110, w: 130 });
  }
  return out;
}

export class Game {
  // carry = what survives between levels: score, powers, max masks, soul
  constructor(app, li, carry) {
    this.app = app;
    this.li = li;
    this.level = LEVELS[li];
    this.carry = { ...carry, powers: [...carry.powers] };
    this.diff = difficulty(carry.diff);
    this.quota = Math.max(4, Math.round((this.level.quota || 0) * this.diff.quota));
    this.bg = new Background(this.level, 1000 + li * 17);
    this.platforms = makePlatforms(this.level, li);
    this.particles = new Particles();
    this.player = new Player(this.level.boss ? 200 : 120);
    this.player.maxHp = carry.maxHp;
    this.player.hp = carry.maxHp;
    this.player.soul = carry.soul || 0;
    this.powers = new Set(carry.powers);
    this.score = carry.score;
    this.shownScore = carry.score;
    this.enemies = [];
    this.hostiles = [];
    this.shots = [];
    this.beams = [];
    this.pickups = [];
    this.texts = [];
    this.toasts = [];
    this.banner = null;
    this.bannerQueue = [];
    this.kills = 0;
    this.spawned = 0;
    this.spawnT = 1.8;
    this.door = null;
    this.combo = 0;
    this.comboT = 0;
    this.camX = 0;
    this.shakeAmt = 0;
    this.stopT = 0;
    this.flashT = 0;
    this.flashMax = 1;
    this.flashColor = '#fff';
    this.t = 0;
    this.introT = 3.2;
    this.deadT = -1;
    this.wonT = -1;
    this.boss = null;
    this.reveal = null;
    this.dialog = null;
    this.cine = 0; // 0..1 letterbox amount for cinematic moments
    if (this.level.boss) {
      // the difficulty's boss health is shared between the knight and the witch
      this.boss = new Knight();
      this.boss.hp = this.boss.maxHp = Math.round(this.diff.bossHp * KNIGHT_SHARE);
      this.enemies.push(this.boss);
    }
    // stepping through a dream-door: the boy's thoughts, before the level begins
    if (this.level.thoughts) this.say(this.level.thoughts.map((text) => ({ who: 'Boy', text, thought: true })));
  }

  // ---------- cinematic dialog ----------
  say(lines, onDone) {
    this.dialog = { lines, i: 0, chars: 0, t: 0, onDone };
    this.onLine(lines[0]);
  }

  onLine(line) {
    if (line.thought) Audio.play('heartbeat');
    else if (line.who === 'Witch') {
      Audio.play('whisper');
      this.shake(line.text.includes('!') || /[A-Z]{3,}/.test(line.text) ? 10 : 4);
      if (line.laugh) this.reveal?.laugh();
    } else Audio.play('page');
  }

  updateDialog(dt) {
    const d = this.dialog;
    d.t += dt;
    d.chars += dt * 40;
    if (Input.hit('confirm') || Input.hit('punch') || Input.hit('kick') || Input.mouse.clicked) {
      if (d.chars < d.lines[d.i].text.length) d.chars = d.lines[d.i].text.length;
      else if (++d.i >= d.lines.length) {
        this.dialog = null;
        d.onDone?.();
      } else {
        d.chars = 0;
        d.t = 0;
        this.onLine(d.lines[d.i]);
      }
    }
  }

  // the knight has fallen: its armor bursts and the witch rises out of it
  startReveal(k) {
    k.dead = true;
    this.flash('#c27bff', 0.9);
    this.shake(26);
    Audio.play('shatter');
    this.particles.burst(k.cx, k.y + 90, 40, { speed: 520, color: '#1d161b', life: 1, size: 7, g: 1100, drag: 0.5 });
    this.particles.burst(k.cx, k.y + 90, 30, { speed: 380, color: '#c27bff', glow: true, life: 0.9, size: 3 });
    this.particles.ring(k.cx, k.y + 90, '#d48bff', 260, 0.7, 6);
    this.reveal = new WitchReveal(k.cx);
  }

  // ---------- hooks used by entities ----------
  shake(a) {
    this.shakeAmt = Math.max(this.shakeAmt, a);
  }
  hitstop(t) {
    this.stopT = Math.max(this.stopT, t);
  }
  flash(color, t) {
    this.flashColor = color;
    this.flashT = t;
    this.flashMax = t;
  }
  toast(text) {
    if (this.toasts.some((m) => m.text === text)) return;
    this.toasts.push({ text, life: 2.2 });
  }
  spawnHostile(h) {
    this.hostiles.push(h);
  }
  spawnEnemy(e) {
    if (e !== this.boss) e.hp = e.maxHp = Math.max(1, Math.round(e.hp * this.diff.enemyHp));
    this.enemies.push(e);
  }
  clearHostiles() {
    for (const h of this.hostiles) this.particles.burst(h.x, h.y ?? GROUND - 20, 6, { speed: 150, color: '#d48bff', glow: true, life: 0.4 });
    this.hostiles = [];
    for (const e of this.enemies) if (e !== this.boss && !e.dead) e.die(this);
  }
  onPlatform(p) {
    return this.platforms.some((pl) => Math.abs(p.y + p.h - pl.y) < 2 && p.x + p.w > pl.x && p.x < pl.x + pl.w);
  }

  // up = fired straight upward (hold ↑), for flyers and the witch
  fireBeam(p, up = false) {
    const lucid = this.powers.has('heart');
    this.beams.push({ dir: p.dir, up, t: 0, life: 0.42, hit: new Set(), h: lucid ? 64 : 44, dmg: lucid ? 8 : 5 });
    this.shake(8);
    this.particles.ring(up ? p.cx : p.cx + p.dir * 24, up ? p.y - 6 : p.y + 24, '#ffffff', 70, 0.35, 4);
  }

  spawnCrescent(p) {
    this.shots.push({ x: p.cx + p.dir * 30, y: p.y + 30, vx: p.dir * 760, life: 0.55, hit: new Set(), dir: p.dir });
    Audio.play('crescent');
  }

  onEnemyKilled(e) {
    if (e === this.boss) return;
    this.kills++;
    const mult = 1 + Math.min(this.combo, 20) * 0.05;
    const pts = Math.round(e.points * mult);
    this.addScore(pts, e.cx, e.y - 10);
    this.player.soul = Math.min(SOUL_MAX, this.player.soul + 6);
    if (this.player.hp < this.player.maxHp && Math.random() < this.diff.heartDrop) {
      this.pickups.push({ x: e.cx, y: e.cy, vy: -300, t: 0 });
    }
  }

  // phase two: the witch drops the act and fights with her own health bar
  startWitchFight() {
    const w = new Witch(this.reveal.x, this.reveal.y);
    w.hp = w.maxHp = Math.round(this.diff.bossHp * WITCH_SHARE);
    this.reveal = null;
    this.boss = w;
    this.enemies.push(w);
    this.flash('#d48bff', 0.5);
    Audio.music('boss', 6);
  }

  onBossDefeated() {
    const r = this.reveal || this.boss;
    this.addScore(1000 + this.player.hp * 100, r.x ?? W / 2, (r.y ?? 300) - 60);
    this.wonT = 0;
    Audio.play('victory');
  }

  onPlayerDeath() {
    this.deadT = 0;
    Audio.play('gameover');
  }

  addScore(pts, x, y) {
    this.score += pts;
    this.texts.push({ x, y, text: `+${pts}`, t: 0 });
  }

  // ---------- main update ----------
  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    this.shownScore = lerp(this.shownScore, this.score, Math.min(1, dt * 8));
    this.flashT = Math.max(0, this.flashT - dt);
    for (const m of this.toasts) m.life -= dt;
    this.toasts = this.toasts.filter((m) => m.life > 0);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.life) this.banner = null;
    } else if (this.bannerQueue.length) this.banner = this.bannerQueue.shift();

    // cinematic dialog freezes the action until the player reads through it
    this.cine = lerp(this.cine, this.dialog ? 1 : 0, Math.min(1, dt * 4));
    if (this.dialog) {
      this.updateDialog(dt);
      this.reveal?.update(dt, this);
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40);
      return;
    }
    this.introT = Math.max(0, this.introT - dt);

    if (this.stopT > 0) {
      this.stopT -= dt;
      return;
    }

    const p = this.player;
    p.update(dt, this);

    this.updateSpawning(dt);
    // difficulty slows enemies, the boss and their projectiles as a whole
    const edt = dt * this.diff.enemySpeed;
    for (const e of this.enemies) e.update(edt, this);
    this.resolveCombat(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.reveal) {
      this.reveal.update(dt, this);
      if (this.reveal.t > 1.8 && !this.revealSpoken) {
        this.revealSpoken = true;
        this.say(REVEAL_LINES, () => this.startWitchFight());
      }
    }
    for (const h of this.hostiles) h.update(edt, this);
    this.hostiles = this.hostiles.filter((h) => !h.dead);
    this.updatePickups(dt);
    this.updateDoor(dt);
    this.checkPowers();

    for (const tx of this.texts) tx.t += dt;
    this.texts = this.texts.filter((tx) => tx.t < 1);
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;

    // camera leads slightly in the direction you face
    const target = clamp(p.cx - W / 2 + p.dir * 90, 0, Math.max(0, this.level.width - W));
    this.camX = lerp(this.camX, target, Math.min(1, dt * 5));
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40);

    if (this.deadT >= 0) {
      this.deadT += dt;
      if (this.deadT > 2.4) this.app.gameOver(this);
    }
    if (this.wonT >= 0) {
      this.wonT += dt;
      if (this.wonT > 3) this.app.victory(this);
    }
  }

  updateSpawning(dt) {
    if (this.level.boss || this.introT > 2) return;
    const maxAlive = Math.max(1, 3 + this.li + this.diff.crowd);
    this.spawnT -= dt;
    if (this.spawned < this.quota && this.enemies.length < maxAlive && this.spawnT <= 0) {
      const type = weightedPick(this.level.enemies);
      const p = this.player;
      // spawn away from the player, preferably ahead of them
      let x = p.cx + (Math.random() < 0.7 ? p.dir : -p.dir) * rand(380, 620);
      if (x < 60 || x > this.level.width - 100) x = p.cx - (x - p.cx);
      x = clamp(x, 60, this.level.width - 120);
      this.spawnEnemy(new ENEMY_TYPES[type](x));
      this.spawned++;
      this.spawnT = Math.max(0.6, 1.5 - this.li * 0.2) + rand(0, 0.8);
    }
  }

  landHit(e, hit, x, y) {
    const res = e.takeHit(hit, this);
    if (!res) return;
    if (res === 'block') {
      Audio.play('clink');
      this.particles.burst(x, y, 8, { speed: 300, color: '#ffe9b0', glow: true, life: 0.25, size: 2 });
      return;
    }
    Audio.play('hit');
    this.combo++;
    this.comboT = 1.6;
    this.hitstop(e === this.boss ? 0.03 : 0.05);
    this.shake(hit.dmg >= 4 ? 8 : 4);
    const col = hit.ember ? '#ffb070' : '#ffffff';
    this.particles.burst(x, y, 10, { speed: 420, color: col, glow: true, life: 0.25, size: 2.5, kind: 'streak' });
    this.particles.ring(x, y, col, 40, 0.2, 3);
    if (hit.ember) this.particles.burst(x, y, 8, { speed: 160, angle: -Math.PI / 2, spread: 1.5, color: '#ff7a3a', glow: true, life: 0.5, size: 4 });
  }

  resolveCombat(dt) {
    const p = this.player;
    const hb = p.hitbox(this);
    if (hb) {
      let connected = false;
      for (const e of this.enemies) {
        if (hb.hit.has(e) || e.spawning || e.dead) continue;
        if (!aabb(hb.box, e.hurtbox())) continue;
        hb.hit.add(e);
        const ix = clamp(e.cx, hb.box.x, hb.box.x + hb.box.w);
        const iy = clamp(e.cy, hb.box.y, hb.box.y + hb.box.h);
        this.landHit(e, hb, ix, iy);
        connected = true;
      }
      for (const h of this.hostiles) {
        if (h.breakable && aabb(hb.box, h.box)) {
          h.dead = true;
          connected = true;
          p.soul = Math.min(SOUL_MAX, p.soul + 4);
          this.particles.burst(h.x, h.y, 10, { speed: 250, color: h.color, glow: true, life: 0.35 });
          Audio.play('hit');
        }
      }
      if (connected && !hb.hit.has('landed')) {
        hb.hit.add('landed');
        p.onHitLanded(hb.type, this);
      }
    }

    // moon crescents
    for (const s of this.shots) {
      s.life -= dt;
      s.x += s.vx * dt;
      const box = { x: s.x - 20, y: s.y - 34, w: 40, h: 68 };
      for (const e of this.enemies) {
        if (s.hit.has(e) || e.spawning || e.dead || !aabb(box, e.hurtbox())) continue;
        s.hit.add(e);
        this.landHit(e, { dmg: 2, kb: s.dir * 300, kby: 0, type: 'crescent', breaker: true }, e.cx, s.y);
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);

    // dream beams
    for (const b of this.beams) {
      b.t += dt;
      const y = p.y + 24 - b.h / 2;
      const box = b.up
        ? { x: p.cx - b.h / 2, y: p.y - H, w: b.h, h: H }
        : b.dir > 0 ? { x: p.cx, y, w: W, h: b.h } : { x: p.cx - W, y, w: W, h: b.h };
      if (b.t < 0.3) {
        for (const e of this.enemies) {
          if (b.hit.has(e) || e.spawning || e.dead || !aabb(box, e.hurtbox())) continue;
          b.hit.add(e);
          this.landHit(e, { dmg: b.dmg, kb: b.up ? 0 : b.dir * 500, kby: -200, type: 'beam', breaker: true }, e.cx, b.up ? e.cy : y + b.h / 2);
        }
        for (const h of this.hostiles) if (h.breakable && aabb(box, h.box)) h.dead = true;
      }
    }
    this.beams = this.beams.filter((b) => b.t < b.life);

    // damage to the player
    if (!p.dead) {
      const pb = shrink(p, 4);
      for (const e of this.enemies) {
        if (e.spawning || e.dead || !e.contact) continue;
        if (aabb(pb, shrink(e.hurtbox(), 6))) p.hurt(1, e.cx, this);
        const ab = e.attackBox?.();
        if (ab && aabb(pb, ab)) p.hurt(1, e.cx, this);
      }
      for (const h of this.hostiles) {
        const b = h.box;
        if (b && aabb(pb, b)) {
          if (p.hurt(h.dmg, h.x, this) && h.breakable) h.dead = true;
        }
      }
    }
  }

  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      k.t += dt;
      k.vy = Math.min(k.vy + 900 * dt, 400);
      k.y = Math.min(k.y + k.vy * dt, GROUND - 20);
      if (k.t > 0.4 && Math.hypot(p.cx - k.x, p.cy - k.y) < 40 && p.hp < p.maxHp) {
        k.taken = true;
        p.hp++;
        Audio.play('pickup');
        this.particles.burst(k.x, k.y, 14, { speed: 200, color: '#ffffff', glow: true, life: 0.4 });
      }
      if (k.t > 12) k.taken = true;
    }
    this.pickups = this.pickups.filter((k) => !k.taken);
  }

  updateDoor(dt) {
    const p = this.player;
    if (!this.level.boss && !this.door && this.kills >= this.quota && this.enemies.length === 0) {
      const x = clamp(p.cx + p.dir * 260, 80, this.level.width - 140);
      this.door = { x: x - 40, y: GROUND - 150, w: 80, h: 150, t: 0, used: false };
      Audio.play('door');
      this.toast('A dream-door has opened');
      this.particles.ring(x, GROUND - 75, '#ffffff', 140, 0.6, 4);
    }
    if (this.door) {
      this.door.t += dt;
      if (Math.random() < 0.4) {
        const d = this.door;
        this.particles.spawn({ x: d.x + rand(0, d.w), y: d.y + d.h, vx: rand(-10, 10), vy: rand(-90, -40), life: 1, size: 2, color: this.level.theme.mote, glow: true });
      }
      if (!this.door.used && this.door.t > 0.6 && aabb(p, this.door)) {
        this.door.used = true;
        this.score += LEVEL_CLEAR_BONUS;
        Audio.play('confirm');
        this.app.nextLevel(this);
      }
    }
  }

  checkPowers() {
    for (const pw of POWERS) {
      if (this.score >= powerCost(pw, this.diff) && !this.powers.has(pw.id)) {
        this.powers.add(pw.id);
        if (pw.id === 'heart') {
          this.player.maxHp++;
          this.player.hp = this.player.maxHp;
        }
        Audio.play('unlock');
        this.flash('#fff2d0', 0.35);
        this.particles.burst(this.player.cx, this.player.cy, 40, { speed: 380, color: '#ffe8b0', glow: true, life: 0.8 });
        this.bannerQueue.push({ name: pw.name, desc: pw.desc, t: 0, life: 3.4 });
      }
    }
  }

  // carry-over state for the next level
  snapshot() {
    return { score: this.score, powers: [...this.powers], maxHp: this.player.maxHp, soul: this.player.soul, diff: this.diff.id };
  }

  // ---------- drawing ----------
  draw(ctx) {
    const sx = (Math.random() - 0.5) * this.shakeAmt;
    const sy = (Math.random() - 0.5) * this.shakeAmt;
    this.bg.drawBack(ctx, this.camX, this.t);

    ctx.save();
    ctx.translate(Math.round(-this.camX + sx), Math.round(sy));
    this.bg.drawGround(ctx, this.camX);
    this.drawPlatforms(ctx);
    this.drawDoor(ctx);
    for (const k of this.pickups) this.drawPickup(ctx, k);
    for (const e of this.enemies) e.draw(ctx, this);
    this.reveal?.draw(ctx);
    for (const h of this.hostiles) h.draw(ctx);
    this.player.draw(ctx, this);
    this.drawShots(ctx);
    this.particles.draw(ctx);
    this.drawTexts(ctx);
    ctx.restore();

    this.bg.drawFront(ctx, this.camX, this.t);

    if (this.flashT > 0) {
      ctx.globalAlpha = (this.flashT / this.flashMax) * 0.6;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.player.hp === 1 && !this.player.dead) {
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(120,0,30,${0.25 + Math.sin(this.t * 5) * 0.1})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalAlpha = 1 - this.cine;
    drawHUD(ctx, this);
    ctx.globalAlpha = 1;
    // letterbox bars + dialog for cinematic moments
    if (this.cine > 0.01) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, 78 * this.cine);
      ctx.fillRect(0, H - 78 * this.cine, W, 78 * this.cine);
    }
    if (this.dialog) drawDialog(ctx, this);
    drawLevelCard(ctx, this);
    drawBanner(ctx, this);
    drawToasts(ctx, this);

    if (this.deadT >= 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, this.deadT / 2)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.wonT >= 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.wonT / 2.6)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawPlatforms(ctx) {
    const th = this.level.theme;
    for (const pl of this.platforms) {
      if (pl.x + pl.w < this.camX - 50 || pl.x > this.camX + W + 50) continue;
      ctx.fillStyle = th.ground;
      ctx.beginPath();
      ctx.moveTo(pl.x, pl.y);
      ctx.lineTo(pl.x + pl.w, pl.y);
      ctx.lineTo(pl.x + pl.w - 14, pl.y + 18);
      ctx.quadraticCurveTo(pl.x + pl.w / 2, pl.y + 40, pl.x + 14, pl.y + 18);
      ctx.closePath();
      ctx.fill();
      // hanging roots
      ctx.strokeStyle = th.ground;
      ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) {
        const rx = pl.x + (pl.w * i) / 5;
        ctx.beginPath();
        ctx.moveTo(rx, pl.y + 20);
        ctx.quadraticCurveTo(rx + 4, pl.y + 40, rx - 2, pl.y + 46 + ((i * 13) % 20));
        ctx.stroke();
      }
      ctx.strokeStyle = th.accent;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(pl.x + 2, pl.y + 1);
      ctx.lineTo(pl.x + pl.w - 2, pl.y + 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawDoor(ctx) {
    const d = this.door;
    if (!d) return;
    const k = Math.min(1, d.t / 0.8);
    const cx = d.x + d.w / 2;
    glow(ctx, cx, d.y + d.h / 2, 160 * k, 'rgba(255,255,255,0.5)');
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = '#f6f3ff';
    ctx.beginPath();
    ctx.moveTo(d.x, d.y + d.h);
    ctx.lineTo(d.x, d.y + 40);
    ctx.quadraticCurveTo(cx, d.y - 30, d.x + d.w, d.y + 40);
    ctx.lineTo(d.x + d.w, d.y + d.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.level.theme.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(30,30,50,0.6)';
    ctx.font = `700 13px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillText('WAKE', cx, d.y + d.h / 2 + 10);
    ctx.textAlign = 'left';
  }

  drawPickup(ctx, k) {
    const bob = Math.sin(k.t * 4) * 4;
    glow(ctx, k.x, k.y + bob, 34, 'rgba(255,255,255,0.7)');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(k.x, k.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  drawShots(ctx) {
    const p = this.player;
    for (const s of this.shots) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, s.life / 0.2);
      ctx.fillStyle = '#d8e6ff';
      ctx.beginPath();
      ctx.arc(0, 0, 34, -1.3, 1.3);
      ctx.arc(-14, 0, 30, 1.2, -1.2, true);
      ctx.fill();
      ctx.restore();
      glow(ctx, s.x, s.y, 50, 'rgba(180,210,255,0.6)');
    }
    for (const b of this.beams) {
      const k = 1 - b.t / b.life;
      const len = W * Math.min(1, b.t / 0.06);
      const hh = b.h * (0.6 + 0.4 * k) * (1 + Math.sin(b.t * 80) * 0.08);
      // draw along +x from the hand, rotated for direction
      const ox = b.up ? p.cx : p.cx + b.dir * 16;
      const oy = b.up ? p.y - 4 : p.y + 24;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(b.up ? -Math.PI / 2 : b.dir > 0 ? 0 : Math.PI);
      ctx.globalCompositeOperation = 'lighter';
      const grd = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
      grd.addColorStop(0, 'rgba(140,190,255,0)');
      grd.addColorStop(0.5, `rgba(220,240,255,${0.9 * k})`);
      grd.addColorStop(1, 'rgba(140,190,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, -hh / 2, len, hh);
      ctx.fillStyle = `rgba(255,255,255,${k})`;
      ctx.fillRect(0, -hh * 0.12, len, hh * 0.24);
      ctx.restore();
      glow(ctx, ox, oy, 70, 'rgba(220,240,255,0.9)', k);
    }
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.font = `700 18px ${FONT_TITLE}`;
    for (const tx of this.texts) {
      ctx.globalAlpha = 1 - tx.t;
      ctx.fillStyle = '#ffe8b0';
      ctx.fillText(tx.text, tx.x, tx.y - tx.t * 40);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
