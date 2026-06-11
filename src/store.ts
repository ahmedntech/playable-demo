import { create } from 'zustand';
import { DEFAULT_CONFIG, type PlayableConfig } from './runtime/types';

interface EditorState {
  config: PlayableConfig;
  previewKey: number; // bump to force the preview to remount
  set: <K extends keyof PlayableConfig>(section: K, patch: Partial<PlayableConfig[K]>) => void;
  restart: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  config: structuredClone(DEFAULT_CONFIG),
  previewKey: 0,
  set: (section, patch) =>
    set((s) => ({
      config: { ...s.config, [section]: { ...s.config[section], ...patch } },
    })),
  restart: () => set((s) => ({ previewKey: s.previewKey + 1 })),
}));
