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
    enemies: { moth: 2.5, shadeling: 1 },
    quota: 12,
    width: 3000,
    theme: { sky: ['#0e0a1c', '#30244a'], far: '#22193c', mid: '#170f2a', ground: '#0a0614', accent: '#e0b4ff', mote: '#f5d6ff', shape: 'hollow' },
  },
  {
    name: 'The Thorn Garden',
    sub: 'Every rose remembers a wound',
    enemies: { thornback: 2, wisp: 2, shadeling: 0.6, moth: 0.6 },
    quota: 14,
    width: 3200,
    theme: { sky: ['#140508', '#401820'], far: '#2c0f16', mid: '#1d080e', ground: '#0c0306', accent: '#ff8f8f', mote: '#ffc0b0', shape: 'thorns' },
  },
  {
    name: "The Witch's Heart",
    sub: 'Win, and wake. Lose, and stay forever.',
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
