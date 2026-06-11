// The single source of truth for a playable. The editor mutates this object,
// the runtime renders from it, and the exporter freezes it into the bundle.
// Assets (logo) are stored as data URLs so a config is fully self-contained.
export interface PlayableConfig {
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
    targetScore: number; // taps needed to win
    difficulty: number; // 1 (easy) .. 5 (hard) — affects spawn speed & lifetime
  };
  endCard: {
    headline: string;
  };
}

export const DEFAULT_CONFIG: PlayableConfig = {
  brand: {
    name: 'Your Game',
    logoDataUrl: null,
    primaryColor: '#ff4d6d',
    bgColor: '#101426',
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
