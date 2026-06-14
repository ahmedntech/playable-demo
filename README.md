# bigwolf · Playable Studio — MVP

A no-code playable-ad builder. Browse a **gallery of game templates** with live auto-playing
previews, pick one, customize brand/gameplay/CTA in a live editor, and export a single
self-contained, MRAID-compliant HTML ad.

**26 game templates** ship today, spanning genres: Tap Frenzy, Whack Attack, Catch Master,
Tower Stack, Slice It, Tile Tap, Perfect Stop, Spin Wheel, Match Pairs, Bubble Pop, Color Fill,
Lane Dash, Tap & Fly, Knife Hit, Ball Drop, Cannon Pop, Tap Jump; a casino pack — Lucky Slots,
Scratch & Win, Lucky Dice, Higher or Lower; and an arcade/puzzle pack — Brick Breaker, Claw
Machine, 2048, Gem Match (match-3), Bubble Shooter. Each has an interactive mode and an
auto-playing demo loop used for the gallery previews (lazy-mounted in view, so the browser's
WebGL context limit is never hit).

**Canvas edit mode.** Opening a template lands you in edit mode: the game plays at full
speed for ~2s so the scene populates, then eases into **slow motion** so moving elements
are easy to tap. Every editable element glows with a labeled tag — tap the element itself
(the basket, the bird, the critter…) to get a popover with just its controls — upload art
to replace it, or recolor it. Tap empty space to edit the background (image or color).
An **inspector panel** beside the phone holds everything: element tabs, a drag-and-drop
art zone (the current image is the interface — hover to replace/remove), curated color
swatches plus a custom picker, AI generation with style presets, and text controls.

**Text overlays.** “＋ Add text” drops a styled text onto the game. Edit its content, size
and color in the popover, and **drag it on the phone** to place it. Text edits live-patch
the running game (no remount), and overlays ship inside the exported ad.

**End-card juice.** Confetti rain, a pulsing CTA, the brand logo above the headline, and
a score-counter pop on every point. Backdrops carry ambient drifting particles, and the
intro's start button pulses.

**Autosave.** The whole project (template, art, colors, texts) persists to localStorage —
refresh and you land back in the editor where you left off. “Start over” in the Export
section clears it.

**AI art (nano-banana).** Every image-capable element (and the background) has a
“✨ Generate with AI” panel: a prompt pre-seeded from the element, rendered by Google's
Gemini image model. Sprites are requested on a solid backdrop and **chroma-keyed to
transparency client-side** (corner-sampled, feathered, de-spilled) so they drop cleanly
into the game. Bring your own free API key from aistudio.google.com — it stays in your
browser; calls go directly to Google.

Under the hood each template declares its `elements` in `catalog.ts` and tags its display
objects with `ctx.mark(obj, key)`; the runner outlines one representative instance per key
each frame and hit-tests taps against all of them. Games read overrides via `ctx.tex(key)` /
`ctx.color(key, fallback)` and fall back to the drawn shape when no image is provided.

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
