import { create } from 'zustand';
import { DEFAULT_CONFIG, type PlayableConfig, type TextOverlay } from './runtime/types';
import { getTemplate } from './templates/catalog';

// ---- project persistence (localStorage) ----
// The whole project is one config object (images inline as data URLs), so a
// single key survives refreshes. Quota errors (huge images) fail silently —
// the session still works, it just won't persist.
const STORAGE_KEY = 'bigwolf-playable-project-v1';

function loadSaved(): PlayableConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // merge over defaults so older saves survive config-shape changes
    return {
      ...structuredClone(DEFAULT_CONFIG),
      ...saved,
      brand: { ...DEFAULT_CONFIG.brand, ...saved.brand },
      cta: { ...DEFAULT_CONFIG.cta, ...saved.cta },
      gameplay: { ...DEFAULT_CONFIG.gameplay, ...saved.gameplay },
      endCard: { ...DEFAULT_CONFIG.endCard, ...saved.endCard },
    };
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist(config: PlayableConfig) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch { /* quota exceeded — skip */ }
  }, 400);
}

type View = 'gallery' | 'editor';

const savedConfig = loadSaved();

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
  addText: () => void; // adds an overlay and opens its popover
  updateText: (id: string, patch: Partial<Omit<TextOverlay, 'id'>>) => void;
  removeText: (id: string) => void;
  toggleEditMode: () => void;
  setActiveElement: (key: string | null) => void;
  resetProject: () => void; // clear saved work and return to the gallery
  restart: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  // A saved project drops you straight back into the editor where you left off.
  view: savedConfig ? 'editor' : 'gallery',
  config: savedConfig ?? structuredClone(DEFAULT_CONFIG),
  previewKey: 0,
  editMode: false,
  activeElement: null,
  chooseTemplate: (id) =>
    set((s) => {
      // Re-picking the current template keeps your work; a different one
      // resets per-element overrides (they're template-specific).
      if (id === s.config.templateId) return { view: 'editor', editMode: true, activeElement: null };
      const meta = getTemplate(id);
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
          texts: [],
        },
      };
    }),
  backToGallery: () => set({ view: 'gallery', editMode: false, activeElement: null }),
  resetProject: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    set({ view: 'gallery', editMode: false, activeElement: null, config: structuredClone(DEFAULT_CONFIG) });
  },
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
  addText: () =>
    set((s) => {
      const id = 't' + (Date.now() % 1e7).toString(36) + s.config.texts.length;
      const t: TextOverlay = { id, content: 'YOUR TEXT', x: 0.5, y: 0.22, size: 30, color: '#ffffff' };
      return {
        config: { ...s.config, texts: [...s.config.texts, t] },
        activeElement: 'text:' + id,
        editMode: true,
      };
    }),
  updateText: (id, patch) =>
    set((s) => ({
      config: { ...s.config, texts: s.config.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) },
    })),
  removeText: (id) =>
    set((s) => ({
      config: { ...s.config, texts: s.config.texts.filter((t) => t.id !== id) },
      activeElement: s.activeElement === 'text:' + id ? null : s.activeElement,
    })),
  restart: () => set((s) => ({ previewKey: s.previewKey + 1 })),
}));

// Autosave: any config change persists (debounced) so a refresh never loses work.
useEditor.subscribe((s, prev) => {
  if (s.config !== prev.config) persist(s.config);
});
