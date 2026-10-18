import { W, H, store, FONT_TITLE, FONT_BODY } from './util.js';
import { Input, bindMouse } from './input.js';
import { Audio } from './audio.js';
import { Background } from './background.js';
import { LEVELS } from './levels.js';
import { Game } from './game.js';
import { Storyboard, INTRO, ENDING } from './story.js';
import { drawBootScreen, drawTitle, drawMenu, menuItemRects, drawControls, drawScores, drawNameEntry, drawPanelBg } from './ui.js';
import { drawBoy } from './art.js';

const SCORE_KEY = 'stuckinme.scores';
const NEW_RUN = { score: 0, powers: [], maxHp: 5, soul: 0 };

class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'boot';
    this.t = 0;
    this.sel = 0;
    this.menuBg = new Background(LEVELS[0], 555);
    this.scores = store.get(SCORE_KEY, []);
    this.highlight = -1;
    this.name = '';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    bindMouse(canvas, W, H);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    this.canvas.style.width = `${Math.floor(W * s)}px`;
    this.canvas.style.height = `${Math.floor(H * s)}px`;
    this.canvas.width = Math.floor(W * s * dpr);
    this.canvas.height = Math.floor(H * s * dpr);
    this.scale = s * dpr;
  }

  // ---------- transitions ----------
  startStory() {
    this.state = 'story';
    Audio.music('story');
    this.story = new Storyboard(INTRO, 'Chapter One  ·  The Curse', () => this.toMenu());
  }

  toMenu() {
    this.state = 'menu';
    this.sel = 0;
    this.game = null;
    Audio.music('menu');
  }

  startLevel(li, carry) {
    this.game = new Game(this, li, carry);
    this.state = 'play';
    Audio.music(LEVELS[li].boss ? 'boss' : 'level', li);
  }

  nextLevel(g) {
    const carry = g.snapshot();
    if (g.li + 1 < LEVELS.length) this.startLevel(g.li + 1, carry);
  }

  gameOver(g) {
    if (this.state !== 'play') return;
    this.state = 'gameover';
    this.sel = 0;
    this.over = { li: g.li, carry: g.carry, score: g.score };
  }

  victory(g) {
    if (this.state !== 'play') return;
    this.final = { score: g.score, won: true, level: LEVELS.length };
    this.state = 'ending';
    Audio.music('ending');
    this.story = new Storyboard(ENDING, 'Epilogue  ·  Morning', () => this.toNameEntry(), 'The End  ▸');
  }

  toNameEntry() {
    this.state = 'name';
    this.name = '';
  }

  saveScore() {
    const entry = { name: this.name.trim() || 'Dreamer', score: this.final.score, won: this.final.won, level: this.final.level };
    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 7);
    this.highlight = this.scores.indexOf(entry);
    store.set(SCORE_KEY, this.scores);
    this.state = 'scores';
  }

  // ---------- menus ----------
  runMenu(items, onPick, y0, gap) {
    if (Input.hit('down')) {
      this.sel = (this.sel + 1) % items.length;
      Audio.play('select');
    }
    if (Input.hit('up')) {
      this.sel = (this.sel + items.length - 1) % items.length;
      Audio.play('select');
    }
    const rects = menuItemRects(items, y0, gap);
    const m = Input.mouse;
    rects.forEach((r, i) => {
      const inside = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
      if (inside && m.moved && this.sel !== i) {
        this.sel = i;
        Audio.play('select');
      }
      if (inside && m.clicked) {
        Audio.play('confirm');
        onPick(i);
      }
    });
    if (Input.hit('confirm')) {
      Audio.play('confirm');
      onPick(this.sel);
    }
  }

  update(dt) {
    this.t += dt;
    if (Input.hit('mute')) Audio.toggleMute();

    switch (this.state) {
      case 'boot':
        if (Input.anyKey() || Input.mouse.clicked) {
          Audio.init();
          this.startStory();
        }
        break;

      case 'story':
      case 'ending':
        this.story.update(dt);
        break;

      case 'menu':
        this.runMenu(['Begin the Dream', 'Replay the Story', 'Controls', 'Hall of Dreamers'], (i) => {
          if (i === 0) this.startLevel(0, NEW_RUN);
          if (i === 1) this.startStory();
          if (i === 2) this.state = 'controls';
          if (i === 3) {
            this.highlight = -1;
            this.state = 'scores';
          }
        });
        break;

      case 'controls':
      case 'scores':
        if (Input.hit('pause') || Input.hit('confirm') || Input.mouse.clicked) {
          Audio.play('select');
          this.toMenu();
        }
        break;

      case 'play':
        if (Input.hit('pause')) {
          this.state = 'pause';
          this.sel = 0;
          break;
        }
        this.game.update(dt);
        break;

      case 'pause':
        if (Input.hit('pause')) {
          this.state = 'play';
          break;
        }
        this.runMenu(['Resume', 'Restart Level', 'Quit to Menu'], (i) => {
          if (i === 0) this.state = 'play';
          if (i === 1) this.startLevel(this.game.li, this.game.carry);
          if (i === 2) this.toMenu();
        }, 360, 60);
        break;

      case 'gameover':
        this.runMenu(['Try Again', 'Give Up'], (i) => {
          if (i === 0) this.startLevel(this.over.li, this.over.carry);
          else {
            this.final = { score: this.over.score, won: false, level: this.over.li + 1 };
            if (this.final.score > 0) this.toNameEntry();
            else this.toMenu();
          }
        }, 440, 60);
        break;

      case 'name':
        for (const k of Input.typed()) {
          if (k === 'Enter') {
            this.saveScore();
            Audio.play('confirm');
            break;
          } else if (k === 'Backspace') this.name = this.name.slice(0, -1);
          else if (/^[\w \-.!]$/.test(k) && this.name.length < 12) this.name += k;
        }
        break;
    }
    Input.endFrame();
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    switch (this.state) {
      case 'boot':
        drawBootScreen(ctx, this.t);
        break;
      case 'story':
      case 'ending':
        this.story.draw(ctx);
        break;
      case 'menu':
      case 'controls':
      case 'scores':
      case 'name':
        this.drawMenuBack(ctx);
        if (this.state === 'menu') {
          drawTitle(ctx, this.t);
          drawMenu(ctx, ['Begin the Dream', 'Replay the Story', 'Controls', 'Hall of Dreamers'], this.sel, this.t);
          ctx.font = `600 15px ${FONT_BODY}`;
          ctx.fillStyle = 'rgba(220,225,240,0.45)';
          ctx.textAlign = 'center';
          ctx.fillText('↑ ↓ to choose · Enter to select · M to mute', W / 2, 690);
          ctx.textAlign = 'left';
        }
        if (this.state === 'controls') drawControls(ctx);
        if (this.state === 'scores') drawScores(ctx, this.scores, this.highlight);
        if (this.state === 'name') drawNameEntry(ctx, this.name, this.final.score, this.final.won, this.t);
        break;
      case 'play':
        this.game.draw(ctx);
        break;
      case 'pause':
        this.game.draw(ctx);
        drawPanelBg(ctx, 0.6);
        ctx.textAlign = 'center';
        ctx.font = `700 46px ${FONT_TITLE}`;
        ctx.fillStyle = '#f2f5fb';
        ctx.fillText('Paused', W / 2, 270);
        drawMenu(ctx, ['Resume', 'Restart Level', 'Quit to Menu'], this.sel, this.t, 360, 60);
        break;
      case 'gameover':
        this.drawGameOver(ctx);
        break;
    }
    if (Audio.muted && this.state !== 'boot') {
      ctx.font = `600 14px ${FONT_TITLE}`;
      ctx.fillStyle = 'rgba(230,230,245,0.6)';
      ctx.textAlign = 'right';
      ctx.fillText('MUTED', W - 20, H - 16);
      ctx.textAlign = 'left';
    }
  }

  drawMenuBack(ctx) {
    this.menuBg.drawBack(ctx, 300 + Math.sin(this.t * 0.05) * 200, this.t);
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 640, W, 80);
    drawBoy(ctx, { x: 230, y: 640, scale: 1.4, t: this.t, pose: 'idle', dir: 1 });
    this.menuBg.drawFront(ctx, 300, this.t);
  }

  drawGameOver(ctx) {
    ctx.fillStyle = '#030208';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `700 16px ${FONT_TITLE}`;
    ctx.fillStyle = '#b48ae0';
    ctx.fillText(`FALLEN IN ${LEVELS[this.over.li].name.toUpperCase()}`, W / 2, 210);
    ctx.font = `700 60px ${FONT_TITLE}`;
    ctx.fillStyle = '#f2eefa';
    ctx.fillText('The Dream Holds You', W / 2, 290);
    ctx.font = `italic 600 26px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(220,210,240,0.7)';
    ctx.fillText('"Stay with me, little one... forever."', W / 2, 340);
    drawMenu(ctx, ['Try Again', 'Give Up'], this.sel, this.t, 440, 60);
  }
}

// ---------- boot ----------
const canvas = document.getElementById('game');
const app = new App(canvas);
window.__app = app; // handy for debugging in the console

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  app.update(dt);
  app.draw();
  requestAnimationFrame(frame);
}

// wait briefly for the web fonts so canvas text uses them
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => requestAnimationFrame(frame));
