// The single source of truth for a playable. The editor mutates this object,
// the runtime renders from it, and the exporter freezes it into the bundle.
// Assets (logo) are stored as data URLs so a config is fully self-contained.
export interface PlayableConfig {
  templateId: string; // which game template to run (see templates/catalog.ts)
  brand: {
    name: string;
    logoDataUrl: string | null; // base64 data URL, inlined into exports
    primaryColor: string; // hex, used for buttons/targets
    bgColor: string; // hex, game background
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
}

// Options the host passes to PlayableRuntime.start(). No Pixi types here so the
// editor can import this freely.
export interface RuntimeStartOptions {
  onCta?: (url: string) => void; // CTA handler (networks inject their own)
  demo?: boolean; // auto-playing loop for gallery previews (no win/end card)
}

export const DEFAULT_CONFIG: PlayableConfig = {
  templateId: 'tap-targets',
  brand: {
    name: 'Your Game',
    logoDataUrl: null,
    primaryColor: '#ff4d6d',
    bgColor: '#2a1f4a',
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
};
