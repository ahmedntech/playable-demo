# Playable Platform — MVP

A no-code playable-ad builder (thin slice). Pick a template, customize brand/gameplay/CTA
in a live editor, and export a single self-contained, MRAID-compliant HTML ad.

## The one idea that holds it together

The **same runtime** (`src/runtime/`, built to `public/runtime.iife.js`) powers both the
editor's live preview **and** the exported ad. What you preview is byte-for-byte what ships.

```
Editor (React)  ──mutates──▶  PlayableConfig  ──┬──▶  Live preview  (loads runtime.iife.js)
src/editor/                   src/runtime/types  └──▶  Export engine (inlines runtime + config)
                                                       src/export/exporter.ts
```

## Run

```bash
npm install
npm run dev        # builds the runtime, then starts the editor at http://localhost:5173
```

Click **Export ad** to download a single `.html`. To test it as a real ad, drop it into
AppLovin's playable validator (or any MRAID test container).

## Layout

| Path | Role |
|------|------|
| `src/runtime/game.ts` | The Pixi mini-game. Pure, driven entirely by `PlayableConfig`. |
| `src/runtime/types.ts` | `PlayableConfig` — the single source of truth. |
| `src/runtime/iife-entry.ts` | Exposes `window.PlayableRuntime.start()` for preview + export. |
| `src/editor/` | React editor UI + live preview. |
| `src/export/exporter.ts` | Builds the single-HTML bundle, injects MRAID, validates size. |

## Next steps (in order)

1. **Second template** — extract a `Template` interface so `game.ts` is one of many genres.
2. **Second network** — Unity/ironSource already share the MRAID path; add Meta/Google (different click APIs).
3. **Backend** — Supabase + S3 for accounts, saved projects, asset CDN.
4. **Analytics** — event hooks in the runtime (start, complete, CTA) → ingestion endpoint.
5. **Asset pipeline** — texture compression + atlasing to stay under size budgets.
