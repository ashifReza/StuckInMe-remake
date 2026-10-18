const down = new Set();
const pressed = new Set();
const released = new Set();
let typed = [];

export const Keys = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  punch: ['KeyJ', 'KeyZ'],
  kick: ['KeyK', 'KeyX'],
  beam: ['KeyL', 'KeyC'],
  dash: ['ShiftLeft', 'ShiftRight'],
  focus: ['KeyF', 'KeyV'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space'],
  mute: ['KeyM'],
};

export const Input = {
  mouse: { x: 0, y: 0, clicked: false, moved: false },
  held(action) {
    return Keys[action].some((k) => down.has(k));
  },
  hit(action) {
    return Keys[action].some((k) => pressed.has(k));
  },
  let(action) {
    return Keys[action].some((k) => released.has(k));
  },
  anyKey() {
    return pressed.size > 0;
  },
  typed() {
    return typed;
  },
  endFrame() {
    pressed.clear();
    released.clear();
    typed = [];
    this.mouse.clicked = false;
    this.mouse.moved = false;
  },
};

const BLOCK = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

window.addEventListener('keydown', (e) => {
  if (!down.has(e.code)) pressed.add(e.code);
  down.add(e.code);
  if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') typed.push(e.key);
  if (BLOCK.includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  down.delete(e.code);
  released.add(e.code);
});
window.addEventListener('blur', () => down.clear());

export function bindMouse(canvas, W, H) {
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    Input.mouse.x = ((e.clientX - r.left) / r.width) * W;
    Input.mouse.y = ((e.clientY - r.top) / r.height) * H;
  };
  canvas.addEventListener('mousemove', (e) => {
    toLocal(e);
    Input.mouse.moved = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    toLocal(e);
    Input.mouse.clicked = true;
  });
}
