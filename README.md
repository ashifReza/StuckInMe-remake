# Stuck In Me (Remake)

A boy falls asleep in his family's new house in the woods, and the witch who haunts it curses him: fight the creatures of his dreams alone. Win, and he wakes up. Lose, and he stays there forever.

A browser remake of my original iGraphics/C++ game, with a Hollow Knight-inspired look. Everything is drawn and synthesized in code (HTML5 Canvas + WebAudio): no image or sound files, no build step, no dependencies.

## Play

**Play online: https://ashifreza.github.io/StuckInMe-remake/**

- Free to play, with no account or install. Runs in any modern desktop browser (Chrome, Edge, Firefox, Safari).
- Needs a keyboard, so it works on desktops and laptops only; there are no touch controls yet.
- High scores (the Hall of Dreamers) are saved in each player's own browser, not on a shared leaderboard.
- Best with sound on. Press M to mute.

### Run it locally

ES modules need a local web server (opening `index.html` directly won't work):

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Controls

| Action | Keys |
| --- | --- |
| Move | A / D or ← / → |
| Jump (press again in the air to double-jump) | Space / W / ↑ |
| Dash (dodges through attacks) | Shift |
| Punch (hold ↑ to uppercut) | J or Z |
| Kick (hold ↓ in the air to dive-kick and bounce) | K or X |
| Dream Beam (once unlocked, costs soul; hold ↑ to fire upward) | L or C |
| Focus: hold to heal one mask | F or V |
| Drop through a ledge | ↓ + Jump |
| Pause / Mute | Esc / M |

## The game

- **Storyboard intro**: six illustrated panels with speech bubbles, clicked through one at a time.
- **Level 1, The Whispering Woods**: Shadelings crawl closer, crouch, then pounce.
- **Level 2, Moth Hollow**: Dusk Moths hover out of reach, then dive at you.
- **Level 3, The Thorn Garden**: armored Thornbacks curl up and roll; Wisps hover at jump height and spit orbs (which you can punch away), then sink within reach for a moment after each shot.
- **Level 4, The Witch's Heart**: Morwen, the Wicked Witch, has her own health bar and three phases: homing hex orbs, a floor-raking swoop that leaves her stunned, thorns from the ground, summoned minions, and slam shockwaves.

Clear a level's creature quota and a dream-door opens to the next one.

### Difficulty

Pick a mode when you start a new dream (your last choice is remembered):

| | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Starting masks | 8 | 6 | 5 |
| Enemy speed and aggression | 72% | 86% | 100% |
| Enemy health | 70% | 85% | 100% |
| Creatures per level / at once | fewer | a few less | full |
| Invulnerability after a hit | 1.8s | 1.5s | 1.2s |
| Healing orb drop chance | 30% | 18% | 12% |
| Witch health | 80 | 105 | 130 |
| Power unlock scores | 70% | 85% | 100% |

Hard is the original tuning. All values live in `DIFFICULTIES` in `src/levels.js`.

### Powers (unlocked by Dream Essence score; scores shown are for Hard)

| Score | Power |
| --- | --- |
| 250 | **Ember Fists**: punches burn, double damage, wider reach |
| 700 | **Moon Kick**: forward kicks hurl a crescent of moonlight |
| 1200 | **Dream Beam**: a piercing beam, costs one soul vessel |
| 1700 | **Lucid Heart**: an extra mask, and a fiercer beam |

Landing hits fills the soul vessel (top left), which pays for the Dream Beam and for Focus healing. Chained hits build a combo that boosts points.

## Code map

| File | What it does |
| --- | --- |
| `src/main.js` | Screen flow: boot → story → menu → levels → ending → scores |
| `src/game.js` | A level in play: spawning, combat, camera, door, powers |
| `src/player.js` | The boy: movement, attacks, dash, focus |
| `src/enemies.js` | Shadeling, Moth, Thornback, Wisp, and enemy projectiles |
| `src/boss.js` | Morwen the witch and her hazards |
| `src/levels.js` | Level list, power thresholds and difficulty modes |
| `src/story.js` | Storyboard panels for the intro and the ending |
| `src/background.js` | Procedural parallax scenery per level |
| `src/art.js` | Character drawings shared by gameplay and the story |
| `src/ui.js` | HUD, menus, controls, high scores |
| `src/audio.js` | Synthesized sound effects and ambient music |
