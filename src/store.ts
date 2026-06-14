import { create } from 'zustand';
import { DEFAULT_CONFIG, type PlayableConfig, type TextOverlay } from './runtime/types';
import { getTemplate } from './templates/catalog';

// A reusable brand kit, saved across projects. Apply it to any playable to set
// the logo, primary color, CTA, and text font in one click.
export interface BrandKit {
  logoDataUrl: string | null;
  primaryColor: string;
  ctaText: string;
  ctaUrl: string;
  font: string;
}

// ---- persistence (localStorage) ----
// The project is the full set of A/B variants (images inline as data URLs).
// Quota errors (many large images) fail silently — the session still works.
const STORAGE_KEY = 'bigwolf-playable-project-v2';
const BRANDKIT_KEY = 'bigwolf-brandkit-v1';

function sanitize(c: any): PlayableConfig {
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...c,
    brand: { ...DEFAULT_CONFIG.brand, ...c?.brand },
    cta: { ...DEFAULT_CONFIG.cta, ...c?.cta },
    gameplay: { ...DEFAULT_CONFIG.gameplay, ...c?.gameplay },
    endCard: { ...DEFAULT_CONFIG.endCard, ...c?.endCard },
    images: c?.images ?? {},
    colors: c?.colors ?? {},
    texts: c?.texts ?? [],
  };
}

function loadSaved(): { variants: PlayableConfig[]; activeVariant: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved?.variants) && saved.variants.length) {
      return {
        variants: saved.variants.map(sanitize),
        activeVariant: Math.min(saved.activeVariant ?? 0, saved.variants.length - 1),
      };
    }
    if (saved?.templateId) return { variants: [sanitize(saved)], activeVariant: 0 }; // legacy single-config saves
    return null;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist(variants: PlayableConfig[], activeVariant: number) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ variants, activeVariant }));
    } catch { /* quota exceeded — skip */ }
  }, 400);
}

function loadBrandKit(): BrandKit | null {
  try { const r = localStorage.getItem(BRANDKIT_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function persistBrandKit(k: BrandKit | null) {
  try { if (k) localStorage.setItem(BRANDKIT_KEY, JSON.stringify(k)); else localStorage.removeItem(BRANDKIT_KEY); } catch { /* ignore */ }
}

type View = 'gallery' | 'editor';

const saved = loadSaved();
const initialVariants = saved?.variants ?? [structuredClone(DEFAULT_CONFIG)];
const initialActive = saved?.activeVariant ?? 0;

// Only the object-valued sections of the config are patchable via set().
type SectionKey = Exclude<keyof PlayableConfig, 'templateId'>;

interface EditorState {
  view: View;
  config: PlayableConfig; // always === variants[activeVariant]
  variants: PlayableConfig[];
  activeVariant: number;
  brandKit: BrandKit | null;
  previewKey: number;
  editMode: boolean;
  activeElement: string | null;
  chooseTemplate: (id: string) => void;
  backToGallery: () => void;
  set: <K extends SectionKey>(section: K, patch: Partial<PlayableConfig[K]>) => void;
  setImage: (key: string, dataUrl: string | null) => void;
  setColor: (key: string, hex: string) => void;
  setBgImage: (dataUrl: string | null) => void;
  addText: () => void;
  updateText: (id: string, patch: Partial<Omit<TextOverlay, 'id'>>) => void;
  removeText: (id: string) => void;
  // variants
  addVariant: () => void;
  removeVariant: (i: number) => void;
  switchVariant: (i: number) => void;
  // brand kit
  saveBrandKit: () => void;
  applyBrandKit: () => void;
  clearBrandKit: () => void;
  toggleEditMode: () => void;
  setActiveElement: (key: string | null) => void;
  resetProject: () => void;
  restart: () => void;
}

// Writes `next` as the active variant and keeps config in sync — every config
// mutation goes through this so variants[] is always current.
function commit(s: { activeVariant: number; variants: PlayableConfig[] }, next: PlayableConfig) {
  const variants = s.variants.slice();
  variants[s.activeVariant] = next;
  return { config: next, variants };
}

export const useEditor = create<EditorState>((set) => ({
  view: saved ? 'editor' : 'gallery',
  config: initialVariants[initialActive],
  variants: initialVariants,
  activeVariant: initialActive,
  brandKit: loadBrandKit(),
  previewKey: 0,
  editMode: false,
  activeElement: null,

  chooseTemplate: (id) =>
    set((s) => {
      if (id === s.config.templateId) return { view: 'editor', editMode: true, activeElement: null };
      // a different template is a fresh project — reset to a single variant
      const meta = getTemplate(id);
      const cfg: PlayableConfig = {
        ...structuredClone(DEFAULT_CONFIG),
        templateId: id,
        brand: { ...DEFAULT_CONFIG.brand, primaryColor: meta.accent, bgColor: meta.bg, bgImage: null },
      };
      return { view: 'editor', editMode: true, activeElement: null, variants: [cfg], activeVariant: 0, config: cfg };
    }),
  backToGallery: () => set({ view: 'gallery', editMode: false, activeElement: null }),
  resetProject: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const cfg = structuredClone(DEFAULT_CONFIG);
    set({ view: 'gallery', editMode: false, activeElement: null, variants: [cfg], activeVariant: 0, config: cfg });
  },
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode, activeElement: null })),
  setActiveElement: (key) => set({ activeElement: key }),

  set: (section, patch) =>
    set((s) => commit(s, { ...s.config, [section]: { ...s.config[section], ...patch } })),
  setImage: (key, dataUrl) =>
    set((s) => {
      const images = { ...s.config.images };
      if (dataUrl) images[key] = dataUrl; else delete images[key];
      return commit(s, { ...s.config, images });
    }),
  setColor: (key, hex) =>
    set((s) => commit(s, { ...s.config, colors: { ...s.config.colors, [key]: hex } })),
  setBgImage: (dataUrl) =>
    set((s) => commit(s, { ...s.config, brand: { ...s.config.brand, bgImage: dataUrl } })),
  addText: () =>
    set((s) => {
      const id = 't' + (Date.now() % 1e7).toString(36) + s.config.texts.length;
      const t: TextOverlay = { id, content: 'YOUR TEXT', x: 0.5, y: 0.22, size: 30, color: '#ffffff', font: s.brandKit?.font ?? 'Arial' };
      return { ...commit(s, { ...s.config, texts: [...s.config.texts, t] }), activeElement: 'text:' + id, editMode: true };
    }),
  updateText: (id, patch) =>
    set((s) => commit(s, { ...s.config, texts: s.config.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeText: (id) =>
    set((s) => ({
      ...commit(s, { ...s.config, texts: s.config.texts.filter((t) => t.id !== id) }),
      activeElement: s.activeElement === 'text:' + id ? null : s.activeElement,
    })),

  addVariant: () =>
    set((s) => {
      const clone = structuredClone(s.config);
      const variants = [...s.variants, clone];
      return { variants, activeVariant: variants.length - 1, config: clone, activeElement: null };
    }),
  removeVariant: (i) =>
    set((s) => {
      if (s.variants.length <= 1) return {};
      const variants = s.variants.filter((_, idx) => idx !== i);
      const activeVariant = Math.max(0, Math.min(i <= s.activeVariant ? s.activeVariant - 1 : s.activeVariant, variants.length - 1));
      return { variants, activeVariant, config: variants[activeVariant], activeElement: null };
    }),
  switchVariant: (i) =>
    set((s) => (i >= 0 && i < s.variants.length ? { activeVariant: i, config: s.variants[i], activeElement: null } : {})),

  saveBrandKit: () =>
    set((s) => {
      const kit: BrandKit = {
        logoDataUrl: s.config.brand.logoDataUrl,
        primaryColor: s.config.brand.primaryColor,
        ctaText: s.config.cta.text,
        ctaUrl: s.config.cta.url,
        font: s.config.texts[0]?.font ?? 'Arial',
      };
      persistBrandKit(kit);
      return { brandKit: kit };
    }),
  applyBrandKit: () =>
    set((s) => {
      const k = s.brandKit;
      if (!k) return {};
      const next: PlayableConfig = {
        ...s.config,
        brand: { ...s.config.brand, primaryColor: k.primaryColor, logoDataUrl: k.logoDataUrl },
        cta: { ...s.config.cta, text: k.ctaText, url: k.ctaUrl },
        texts: s.config.texts.map((t) => ({ ...t, font: k.font })),
      };
      return commit(s, next);
    }),
  clearBrandKit: () => { persistBrandKit(null); set({ brandKit: null }); },

  restart: () => set((s) => ({ previewKey: s.previewKey + 1 })),
}));

// Autosave: persist the whole variant set whenever it changes.
useEditor.subscribe((s, prev) => {
  if (s.variants !== prev.variants || s.activeVariant !== prev.activeVariant) persist(s.variants, s.activeVariant);
});
