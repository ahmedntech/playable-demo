// A user-added text overlay rendered above the gameplay. Position is
// normalized (0..1 of the design size) so it survives any canvas scale.
export interface TextOverlay {
  id: string;
  content: string;
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  size: number; // font size at design resolution
  color: string;
  font?: string; // web-safe family; defaults to Arial
}

// Web-safe font presets offered for text overlays (safe inside ad iframes —
// no webfont loading allowed in most networks).
export const TEXT_FONTS = ['Arial', 'Arial Black', 'Georgia', 'Impact', 'Courier New', 'Trebuchet MS'] as const;

// The single source of truth for a playable. The editor mutates this object,
// the runtime renders from it, and the exporter freezes it into the bundle.
// Assets (logo) are stored as data URLs so a config is fully self-contained.
export interface PlayableConfig {
  templateId: string; // which game template to run (see templates/catalog.ts)
  brand: {
    name: string;
    logoDataUrl: string | null; // base64 data URL, inlined into exports
    primaryColor: string; // hex, default color for game objects/buttons
    bgColor: string; // hex, game background (used when no bgImage)
    bgImage: string | null; // data URL — cover-fills the game background
  };
  cta: {
    text: string;
    url: string; // store / app listing the ad drives to
  };
  gameplay: {
    targetScore: number; // taps/catches needed to win
    difficulty: number; // 1 (easy) .. 5 (hard) — affects speed & lifetime
  };
  endCard: {
    headline: string;
  };
  // Per-element customization, keyed by the element keys a template declares
  // (see TemplateMeta.elements). images = uploaded data URLs; colors = hex overrides.
  images: Record<string, string>;
  colors: Record<string, string>;
  // User-added text overlays, drawn above the gameplay in every round.
  texts: TextOverlay[];
}

// Options the host passes to PlayableRuntime.start(). No Pixi types here so the
// editor can import this freely.
export interface RuntimeStartOptions {
  onCta?: (url: string) => void; // CTA handler (networks inject their own)
  demo?: boolean; // auto-playing loop for gallery previews (no win/end card)
  // Edit mode: the demo keeps playing, but marked elements get glowing
  // outlines + labels and taps are routed here instead of into the game.
  // key is the element key, or 'background' for a tap on empty space.
  editMode?: boolean;
  onElementTap?: (key: string) => void;
  elementLabels?: Record<string, string>; // key → display label for edit-mode tags
  // Fired when a text overlay is dragged to a new spot in edit mode (x/y normalized).
  onTextMove?: (id: string, x: number, y: number) => void;
}

export const DEFAULT_CONFIG: PlayableConfig = {
  templateId: 'tap-targets',
  brand: {
    name: 'Your Game',
    logoDataUrl: null,
    primaryColor: '#ff4d6d',
    bgColor: '#2a1f4a',
    bgImage: null,
  },
  cta: {
    text: 'Play Now',
    url: 'https://example.com/app',
  },
  gameplay: {
    targetScore: 8,
    difficulty: 3,
  },
  endCard: {
    headline: 'Like what you played?',
  },
  images: {},
  colors: {},
  texts: [],
};
