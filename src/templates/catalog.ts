// Template metadata — the catalog shown in the gallery. No Pixi here, so the
// editor/gallery can import it without pulling the runtime. The actual gameplay
// implementations live in src/runtime/templates/ and are keyed by `id`.
// An editable in-game element. One entry = one clickable thing in edit mode.
// `image` → user can swap the drawn object for an uploaded picture;
// `color` → user can recolor it. Both can be true (e.g. a target you can
// recolor OR replace with art). Games look these up via ctx.tex(key) and
// ctx.color(key, fallback), and tag their display objects with ctx.mark(obj, key)
// so edit mode can outline them and route taps.
export interface ElementDef {
  key: string;
  label: string;
  image: boolean;
  color: boolean;
}

export interface TemplateMeta {
  id: string;
  name: string;
  genre: string;
  tagline: string;
  accent: string; // suggested primary color (game objects, buttons)
  bg: string; // suggested game background (a gradient is derived from it)
  elements: ElementDef[]; // clickable/editable elements in edit mode
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'tap-targets',
    name: 'Tap Frenzy',
    genre: 'Reflex',
    tagline: 'Tap the targets before they shrink away.',
    accent: '#ff4d6d',
    bg: '#2a1f4a', // deep violet
    elements: [{ key: 'target', label: 'Target', image: true, color: true }],
  },
  {
    id: 'whack',
    name: 'Whack Attack',
    genre: 'Arcade',
    tagline: 'Bonk the critters as they pop out of their holes.',
    accent: '#ffb020',
    bg: '#1c4736', // forest green
    elements: [{ key: 'mole', label: 'Critter', image: true, color: true }],
  },
  {
    id: 'catch',
    name: 'Catch Master',
    genre: 'Casual',
    tagline: 'Slide the basket to catch the falling stars.',
    accent: '#28b6e8',
    bg: '#16314f', // night sky blue
    elements: [
      { key: 'basket', label: 'Basket', image: true, color: true },
      { key: 'star', label: 'Falling item', image: true, color: false },
    ],
  },
  {
    id: 'stack',
    name: 'Tower Stack',
    genre: 'Skill',
    tagline: 'Time your taps to stack the tower high.',
    accent: '#4f9dff',
    bg: '#13294a', // deep blue
    elements: [{ key: 'block', label: 'Block', image: false, color: true }],
  },
  {
    id: 'slice',
    name: 'Slice It',
    genre: 'Action',
    tagline: 'Swipe to slice the fruit out of the air.',
    accent: '#ff6b5e',
    bg: '#2a1330', // dark plum
    elements: [{ key: 'fruit', label: 'Fruit', image: true, color: true }],
  },
  {
    id: 'piano',
    name: 'Tile Tap',
    genre: 'Rhythm',
    tagline: 'Tap the falling tiles in time.',
    accent: '#7c5cff',
    bg: '#15132e',
    elements: [{ key: 'tile', label: 'Tile', image: true, color: true }],
  },
  {
    id: 'timing',
    name: 'Perfect Stop',
    genre: 'Timing',
    tagline: 'Stop the marker inside the target zone.',
    accent: '#ffce4d',
    bg: '#2a2410',
    elements: [{ key: 'zone', label: 'Target zone', image: false, color: true }],
  },
  {
    id: 'wheel',
    name: 'Spin Wheel',
    genre: 'Luck',
    tagline: 'Spin the wheel and land your prize.',
    accent: '#ff5da2',
    bg: '#2a1224',
    elements: [{ key: 'wheel', label: 'Wheel', image: false, color: true }],
  },
  {
    id: 'memory',
    name: 'Match Pairs',
    genre: 'Puzzle',
    tagline: 'Flip the cards and find every match.',
    accent: '#3fd6a8',
    bg: '#10302b',
    elements: [{ key: 'card', label: 'Card back', image: false, color: true }],
  },
  {
    id: 'bubblepop',
    name: 'Bubble Pop',
    genre: 'Puzzle',
    tagline: 'Pop clusters of same-colored bubbles.',
    accent: '#36b9ff',
    bg: '#102a3a',
    elements: [{ key: 'bubble', label: 'Bubbles', image: false, color: true }],
  },
  {
    id: 'paint',
    name: 'Color Fill',
    genre: 'Casual',
    tagline: 'Tap to paint every tile on the board.',
    accent: '#ff8a3d',
    bg: '#251a12',
    elements: [{ key: 'paint', label: 'Paint tiles', image: false, color: true }],
  },
  {
    id: 'lane',
    name: 'Lane Dash',
    genre: 'Runner',
    tagline: 'Switch lanes to grab coins and dodge blocks.',
    accent: '#4f9dff',
    bg: '#101b33',
    elements: [
      { key: 'hero', label: 'Runner', image: true, color: true },
      { key: 'coin', label: 'Coin', image: true, color: false },
    ],
  },
  {
    id: 'flappy',
    name: 'Tap & Fly',
    genre: 'Arcade',
    tagline: 'Tap to flap through the gaps.',
    accent: '#ffd24d',
    bg: '#16283a',
    elements: [
      { key: 'bird', label: 'Bird', image: true, color: true },
      { key: 'pipe', label: 'Pipes', image: false, color: true },
    ],
  },
  {
    id: 'knife',
    name: 'Knife Hit',
    genre: 'Skill',
    tagline: 'Throw knives into the spinning log.',
    accent: '#e0654f',
    bg: '#241a14',
    elements: [
      { key: 'knife', label: 'Knife', image: true, color: false },
      { key: 'log', label: 'Log', image: false, color: true },
    ],
  },
  {
    id: 'drop',
    name: 'Ball Drop',
    genre: 'Luck',
    tagline: 'Drop the ball through the pegs.',
    accent: '#22c1c3',
    bg: '#10262e',
    elements: [{ key: 'ball', label: 'Ball', image: true, color: true }],
  },
  {
    id: 'cannon',
    name: 'Cannon Pop',
    genre: 'Action',
    tagline: 'Time your shot to pop the targets.',
    accent: '#ff7a45',
    bg: '#2a1810',
    elements: [{ key: 'target', label: 'Target', image: true, color: true }],
  },
  {
    id: 'jump',
    name: 'Tap Jump',
    genre: 'Arcade',
    tagline: 'Jump over the obstacles to keep running.',
    accent: '#9d7bff',
    bg: '#1a1530',
    elements: [{ key: 'hero', label: 'Hero', image: true, color: true }],
  },
  {
    id: 'slots',
    name: 'Lucky Slots',
    genre: 'Casino',
    tagline: 'Spin the reels and line up the jackpot.',
    accent: '#ffd24d',
    bg: '#3a0d18', // deep casino red
    elements: [
      { key: 'machine', label: 'Machine', image: false, color: true },
      { key: 'symbol', label: 'Jackpot symbol', image: true, color: false },
    ],
  },
  {
    id: 'scratch',
    name: 'Scratch & Win',
    genre: 'Casino',
    tagline: 'Scratch the foil to reveal your prize.',
    accent: '#c8a24a',
    bg: '#0e3b25', // felt green
    elements: [
      { key: 'foil', label: 'Foil', image: false, color: true },
      { key: 'prize', label: 'Prize', image: true, color: false },
    ],
  },
  {
    id: 'dice',
    name: 'Lucky Dice',
    genre: 'Casino',
    tagline: 'Roll for sevens, elevens and doubles.',
    accent: '#e84d5b',
    bg: '#12352a', // felt green
    elements: [{ key: 'dice', label: 'Dice', image: false, color: true }],
  },
  {
    id: 'highlow',
    name: 'Higher or Lower',
    genre: 'Casino',
    tagline: 'Call the next card to win the streak.',
    accent: '#b3304a',
    bg: '#1c1430', // velvet purple
    elements: [{ key: 'card', label: 'Card frame', image: false, color: true }],
  },
];

export function getTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
