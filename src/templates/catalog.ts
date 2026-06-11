// Template metadata — the catalog shown in the gallery. No Pixi here, so the
// editor/gallery can import it without pulling the runtime. The actual gameplay
// implementations live in src/runtime/templates/ and are keyed by `id`.
export interface TemplateMeta {
  id: string;
  name: string;
  genre: string;
  tagline: string;
  accent: string; // suggested primary color, also tints the gallery card
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'tap-targets',
    name: 'Tap Frenzy',
    genre: 'Reflex',
    tagline: 'Tap the targets before they shrink away.',
    accent: '#ff4d6d',
  },
  {
    id: 'whack',
    name: 'Whack Attack',
    genre: 'Arcade',
    tagline: 'Bonk the critters as they pop out of their holes.',
    accent: '#ffb020',
  },
  {
    id: 'catch',
    name: 'Catch Master',
    genre: 'Casual',
    tagline: 'Slide the basket to catch the falling stars.',
    accent: '#21c79a',
  },
];

export function getTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
