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
  restart: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  view: 'gallery',
  config: structuredClone(DEFAULT_CONFIG),
  previewKey: 0,
  chooseTemplate: (id) =>
    set((s) => {
      const meta = getTemplate(id);
      return {
        view: 'editor',
        config: { ...s.config, templateId: id, brand: { ...s.config.brand, primaryColor: meta.accent } },
      };
    }),
  backToGallery: () => set({ view: 'gallery' }),
  set: (section, patch) =>
    set((s) => ({ config: { ...s.config, [section]: { ...s.config[section], ...patch } } })),
  restart: () => set((s) => ({ previewKey: s.previewKey + 1 })),
}));
