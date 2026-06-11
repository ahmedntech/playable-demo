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
  editMode: boolean; // canvas edit mode: tap elements in the preview to edit them
  activeElement: string | null; // element key being edited ('background' for bg), null = none
  chooseTemplate: (id: string) => void;
  backToGallery: () => void;
  set: <K extends SectionKey>(section: K, patch: Partial<PlayableConfig[K]>) => void;
  setImage: (key: string, dataUrl: string | null) => void; // per-element image (null clears)
  setColor: (key: string, hex: string) => void; // per-element color
  setBgImage: (dataUrl: string | null) => void; // global background image
  toggleEditMode: () => void;
  setActiveElement: (key: string | null) => void;
  restart: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  view: 'gallery',
  config: structuredClone(DEFAULT_CONFIG),
  previewKey: 0,
  editMode: false,
  activeElement: null,
  chooseTemplate: (id) =>
    set((s) => {
      const meta = getTemplate(id);
      // Elements differ per template, so reset per-element overrides on switch.
      return {
        view: 'editor',
        editMode: true, // land straight in edit mode — tap things to restyle them
        activeElement: null,
        config: {
          ...s.config,
          templateId: id,
          brand: { ...s.config.brand, primaryColor: meta.accent, bgColor: meta.bg, bgImage: null },
          images: {},
          colors: {},
        },
      };
    }),
  backToGallery: () => set({ view: 'gallery', editMode: false, activeElement: null }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode, activeElement: null })),
  setActiveElement: (key) => set({ activeElement: key }),
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
