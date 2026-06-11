// Template metadata — the catalog shown in the gallery. No Pixi here, so the
// editor/gallery can import it without pulling the runtime. The actual gameplay
// implementations live in src/runtime/templates/ and are keyed by `id`.
export interface TemplateMeta {
  id: string;
  name: string;
  genre: string;
  tagline: string;
  accent: string; // suggested primary color (game objects, buttons)
  bg: string; // suggested game background (a gradient is derived from it)
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'tap-targets',
    name: 'Tap Frenzy',
    genre: 'Reflex',
    tagline: 'Tap the targets before they shrink away.',
    accent: '#ff4d6d',
    bg: '#2a1f4a', // deep violet
  },
  {
    id: 'whack',
    name: 'Whack Attack',
    genre: 'Arcade',
    tagline: 'Bonk the critters as they pop out of their holes.',
    accent: '#ffb020',
    bg: '#1c4736', // forest green
  },
  {
    id: 'catch',
    name: 'Catch Master',
    genre: 'Casual',
    tagline: 'Slide the basket to catch the falling stars.',
    accent: '#28b6e8',
    bg: '#16314f', // night sky blue
  },
  {
    id: 'stack',
    name: 'Tower Stack',
    genre: 'Skill',
    tagline: 'Time your taps to stack the tower high.',
    accent: '#4f9dff',
    bg: '#13294a', // deep blue
  },
  {
    id: 'slice',
    name: 'Slice It',
    genre: 'Action',
    tagline: 'Swipe to slice the fruit out of the air.',
    accent: '#ff6b5e',
    bg: '#2a1330', // dark plum
  },
  {
    id: 'piano',
    name: 'Tile Tap',
    genre: 'Rhythm',
    tagline: 'Tap the falling tiles in time.',
    accent: '#7c5cff',
    bg: '#15132e',
  },
  {
    id: 'timing',
    name: 'Perfect Stop',
    genre: 'Timing',
    tagline: 'Stop the marker inside the target zone.',
    accent: '#ffce4d',
    bg: '#2a2410',
  },
  {
    id: 'wheel',
    name: 'Spin Wheel',
    genre: 'Luck',
    tagline: 'Spin the wheel and land your prize.',
    accent: '#ff5da2',
    bg: '#2a1224',
  },
  {
    id: 'memory',
    name: 'Match Pairs',
    genre: 'Puzzle',
    tagline: 'Flip the cards and find every match.',
    accent: '#3fd6a8',
    bg: '#10302b',
  },
  {
    id: 'bubblepop',
    name: 'Bubble Pop',
    genre: 'Puzzle',
    tagline: 'Pop clusters of same-colored bubbles.',
    accent: '#36b9ff',
    bg: '#102a3a',
  },
  {
    id: 'paint',
    name: 'Color Fill',
    genre: 'Casual',
    tagline: 'Tap to paint every tile on the board.',
    accent: '#ff8a3d',
    bg: '#251a12',
  },
  {
    id: 'lane',
    name: 'Lane Dash',
    genre: 'Runner',
    tagline: 'Switch lanes to grab coins and dodge blocks.',
    accent: '#4f9dff',
    bg: '#101b33',
  },
  {
    id: 'flappy',
    name: 'Tap & Fly',
    genre: 'Arcade',
    tagline: 'Tap to flap through the gaps.',
    accent: '#ffd24d',
    bg: '#16283a',
  },
  {
    id: 'knife',
    name: 'Knife Hit',
    genre: 'Skill',
    tagline: 'Throw knives into the spinning log.',
    accent: '#e0654f',
    bg: '#241a14',
  },
  {
    id: 'drop',
    name: 'Ball Drop',
    genre: 'Luck',
    tagline: 'Drop the ball through the pegs.',
    accent: '#22c1c3',
    bg: '#10262e',
  },
  {
    id: 'cannon',
    name: 'Cannon Pop',
    genre: 'Action',
    tagline: 'Time your shot to pop the targets.',
    accent: '#ff7a45',
    bg: '#2a1810',
  },
  {
    id: 'jump',
    name: 'Tap Jump',
    genre: 'Arcade',
    tagline: 'Jump over the obstacles to keep running.',
    accent: '#9d7bff',
    bg: '#1a1530',
  },
];

export function getTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
