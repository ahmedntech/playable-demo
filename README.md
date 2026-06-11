# bigwolf · Playable Studio — MVP

A no-code playable-ad builder. Browse a **gallery of game templates** with live auto-playing
previews, pick one, customize brand/gameplay/CTA in a live editor, and export a single
self-contained, MRAID-compliant HTML ad.

**17 game templates** ship today, spanning genres: Tap Frenzy, Whack Attack, Catch Master,
Tower Stack, Slice It, Tile Tap, Perfect Stop, Spin Wheel, Match Pairs, Bubble Pop, Color Fill,
Lane Dash, Tap & Fly, Knife Hit, Ball Drop, Cannon Pop, Tap Jump. Each has an interactive mode
and an auto-playing demo loop used for the gallery previews.

**Per-element customization.** Each template declares editable *slots* (in `catalog.ts`):
upload an image to swap a game object (the basket, the bird, the critter…), set a background
image, and recolor individual elements. The editor renders these controls automatically from
the slot list; the runtime gives each game `ctx.tex(key)` / `ctx.color(key, fallback)` and
falls back to the drawn shape when no image is provided.

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
| `src/runtime/types.ts` | `PlayableConfig` — the single source of truth (no Pixi). |
| `src/runtime/template.ts` | `Template` interface every game genre implements. |
| `src/runtime/templates/` | One file per genre (`tapTargets`, `whack`, `catch`). |
| `src/runtime/runner.ts` | Owns lifecycle: intro, HUD, score, win, end card, CTA; dispatches to a template. |
| `src/runtime/iife-entry.ts` | Exposes `window.PlayableRuntime.start()` for preview + export. |
| `src/templates/catalog.ts` | Template metadata for the gallery (no Pixi — editor-safe). |
| `src/editor/` | Gallery, editor UI, live preview. |
| `src/components/` | `RuntimeMount` (shared mount), `Brand` (bigwolf mark). |
| `src/export/exporter.ts` | Builds the single-HTML bundle, injects MRAID, validates size. |

## Adding a new template

1. Add `src/runtime/templates/<id>.ts` implementing `Template`, with a `demo` auto-play branch.
2. Register it in `src/runtime/runner.ts` (the `REGISTRY` map).
3. Add its metadata to `src/templates/catalog.ts`.
That's it — the gallery card, live preview, editor, and export all pick it up automatically.

## Next steps (in order)

1. **Backend** — Supabase + S3 for accounts, saved projects, asset CDN.
2. **Analytics** — event hooks in the runtime (start, complete, CTA) → ingestion endpoint (the future "Data" product).
3. **More networks** — Unity/ironSource share the MRAID path already; add Meta/Google (different click APIs).
4. **Asset pipeline** — texture compression + atlasing to stay under size budgets as templates get richer.
5. **Per-template controls** — let each template declare its own editor fields instead of the shared set.
