import { create } from 'zustand';
import { DEFAULT_CONFIG, type PlayableConfig } from './runtime/types';
import { getTemplate } from './templates/catalog';

type View = 'gallery' | 'editor';

// Only the object-valued sections of the config are patchable via set().
// templateId is a plain string and is set via chooseTemplate().
type SectionKey = Exclude<keyof PlayableConfig, 'templateId'>;

interface EditorState {
  view: View;
  config: PlayableConfig;
  previewKey: number; // bump to force the preview to remount (replay)
  chooseTemplate: (id: string) => void;
  backToGallery: () => void;
  set: <K extends SectionKey>(section: K, patch: Partial<PlayableConfig[K]>) => void;
  setImage: (key: string, dataUrl: string | null) => void; // per-element image (null clears)
  setColor: (key: string, hex: string) => void; // per-element color
  setBgImage: (dataUrl: string | null) => void; // global background image
  restart: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  view: 'gallery',
  config: structuredClone(DEFAULT_CONFIG),
  previewKey: 0,
  chooseTemplate: (id) =>
    set((s) => {
      const meta = getTemplate(id);
      // Slots differ per template, so reset per-element overrides on switch.
      return {
        view: 'editor',
        config: {
          ...s.config,
          templateId: id,
          brand: { ...s.config.brand, primaryColor: meta.accent, bgColor: meta.bg, bgImage: null },
          images: {},
          colors: {},
        },
      };
    }),
  backToGallery: () => set({ view: 'gallery' }),
  set: (section, patch) =>
    set((s) => ({ config: { ...s.config, [section]: { ...s.config[section], ...patch } } })),
  setImage: (key, dataUrl) =>
    set((s) => {
      const images = { ...s.config.images };
      if (dataUrl) images[key] = dataUrl;
      else delete images[key];
      return { config: { ...s.config, images } };
    }),
  setColor: (key, hex) =>
    set((s) => ({ config: { ...s.config, colors: { ...s.config.colors, [key]: hex } } })),
  setBgImage: (dataUrl) =>
    set((s) => ({ config: { ...s.config, brand: { ...s.config.brand, bgImage: dataUrl } } })),
  restart: () => set((s) => ({ previewKey: s.previewKey + 1 })),
}));
