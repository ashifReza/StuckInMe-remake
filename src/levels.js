// Three dream realms, each introducing a new creature, then the witch herself.
export const LEVELS = [
  {
    name: 'The Whispering Woods',
    sub: 'The dream begins where the house ends',
    enemies: { shadeling: 1 },
    quota: 10,
    width: 2800,
    theme: { sky: ['#050d1a', '#14334d'], far: '#0e2438', mid: '#0a1a2a', ground: '#050b14', accent: '#8fd3ff', mote: '#bfe7ff', shape: 'trees' },
  },
  {
    name: 'Moth Hollow',
    sub: 'Something flutters in the dark',
    // what the boy thinks as he steps through the dream-door into this level
    thoughts: [
      'That door led deeper... not out. Of course it did.',
      'The shadows back there bled light when they broke. Like they were never really alive.',
      "Mom. Dad. If you can hear me... hold on. I'm coming home.",
    ],
    enemies: { moth: 2.5, shadeling: 1 },
    quota: 12,
    width: 3000,
    theme: { sky: ['#0e0a1c', '#30244a'], far: '#22193c', mid: '#170f2a', ground: '#0a0614', accent: '#e0b4ff', mote: '#f5d6ff', shape: 'hollow' },
  },
  {
    name: 'The Thorn Garden',
    sub: 'Every rose remembers a wound',
    thoughts: [
      'The moths were whispering my name. All of them. In HER voice.',
      "My hands won't stop shaking.",
      "...No. She wants me scared. I won't give her that.",
    ],
    enemies: { thornback: 2, wisp: 2, shadeling: 0.6, moth: 0.6 },
    quota: 14,
    width: 3200,
    theme: { sky: ['#140508', '#401820'], far: '#2c0f16', mid: '#1d080e', ground: '#0c0306', accent: '#ff8f8f', mote: '#ffc0b0', shape: 'thorns' },
  },
  {
    name: "The Witch's Heart",
    sub: 'Win, and wake. Lose, and stay forever.',
    thoughts: [
      'The air is burning. Something enormous is breathing in the dark.',
      'A knight...? Maybe someone else got trapped here too. Maybe it can help me.',
      "...No. Its armor is on fire, and it's standing between me and the way out.",
      "If I fall here, I never wake up. So I won't fall.",
    ],
    boss: true,
    width: 1280,
    theme: { sky: ['#05020b', '#2c0a3a'], far: '#1f0731', mid: '#140420', ground: '#080210', accent: '#ff6fd8', mote: '#ffc0f0', shape: 'vortex' },
  },
];

// Score thresholds that unlock new abilities
export const POWERS = [
  { id: 'ember', at: 250, name: 'Ember Fists', desc: 'Your punches burn: double damage, wider reach.' },
  { id: 'moon', at: 700, name: 'Moon Kick', desc: 'Forward kicks hurl a crescent of moonlight.' },
  { id: 'beam', at: 1200, name: 'Dream Beam', desc: 'Press L to unleash a beam of pure dream. Costs 1 soul vessel.' },
  { id: 'heart', at: 1700, name: 'Lucid Heart', desc: 'One more mask, and the Dream Beam grows fiercer.' },
];

export const LEVEL_CLEAR_BONUS = 150;

// Difficulty modes. Hard is the original tuning; every value is a multiplier
// or override applied on top of the level data above.
//   masks       starting health (Lucid Heart adds one more)
//   enemySpeed  time scale for enemies, the boss and their projectiles:
//               slows movement, wind-ups and attack cooldowns together
//   enemyHp     multiplier on enemy health
//   quota       multiplier on creatures needed to open each dream-door
//   crowd       how many more/fewer creatures may attack at once
//   inv         seconds of invulnerability after taking a hit
//   heartDrop   chance a defeated creature drops a healing orb
//   bossHp      the witch's health
//   powerAt     multiplier on the score needed for each power
export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    desc: '8 masks. Slower, gentler creatures and more healing.',
    masks: 8,
    enemySpeed: 0.72,
    enemyHp: 0.7,
    quota: 0.7,
    crowd: -2,
    inv: 1.8,
    heartDrop: 0.3,
    bossHp: 80,
    powerAt: 0.7,
  },
  {
    id: 'medium',
    name: 'Medium',
    desc: '6 masks. Calmer creatures, fewer at once.',
    masks: 6,
    enemySpeed: 0.86,
    enemyHp: 0.85,
    quota: 0.85,
    crowd: -1,
    inv: 1.5,
    heartDrop: 0.18,
    bossHp: 105,
    powerAt: 0.85,
  },
  {
    id: 'hard',
    name: 'Hard',
    desc: '5 masks. The original nightmare: relentless creatures.',
    masks: 5,
    enemySpeed: 1,
    enemyHp: 1,
    quota: 1,
    crowd: 0,
    inv: 1.2,
    heartDrop: 0.12,
    bossHp: 130,
    powerAt: 1,
  },
];

export const difficulty = (id) => DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];

// Score needed for a power in a given difficulty (rounded to a tidy number)
export const powerCost = (pw, diff) => Math.round((pw.at * diff.powerAt) / 10) * 10;

// The twist after the Obsidian Knight falls
export const REVEAL_LINES = [
  { who: 'Boy', text: "It's... over? I did it! Now let me WAKE UP!" },
  { who: 'Witch', text: 'Ah, ah, ah. Not so fast, little dreamer.', laugh: true },
  { who: 'Witch', text: 'A knight? Oh, sweet child... there was never any knight. It was ME. It was always me.' },
  { who: 'Boy', text: 'You were inside that armor... the whole time?' },
  { who: 'Boy', text: 'Then nothing changes. I beat your knight. I beat your monsters. I beat YOU.' },
  { who: 'Witch', text: 'Impossible... my curse... it is CRACKING!' },
];
