// Caps how many live WebGL previews run at once. Each gallery card is its own
// Pixi Application = its own WebGL context, and browsers hard-limit concurrent
// contexts (~16) — exceeding it makes the browser kill contexts and blank
// canvases. So at most MAX previews are live at any time, always the ones
// nearest the viewport center; the rest show a static poster until they scroll
// closer. Independent of screen size, so it's safe on large monitors.
const MAX = 6;
const MARGIN = 240; // px beyond the viewport still considered "eligible"

interface Entry {
  el: HTMLElement;
  setLive: (v: boolean) => void;
  live: boolean;
}

const entries = new Set<Entry>();
let scheduled = false;

function recompute() {
  scheduled = false;
  const vh = window.innerHeight;
  const scored = [...entries].map((e) => {
    const r = e.el.getBoundingClientRect();
    const center = r.top + r.height / 2;
    const eligible = r.bottom > -MARGIN && r.top < vh + MARGIN;
    return { e, dist: Math.abs(center - vh / 2), eligible };
  });
  scored.sort((a, b) => a.dist - b.dist);
  let granted = 0;
  for (const s of scored) {
    const want = s.eligible && granted < MAX;
    if (want) granted++;
    if (s.e.live !== want) { s.e.live = want; s.e.setLive(want); }
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  // microtask so it fires reliably even in background tabs (rAF is throttled)
  Promise.resolve().then(recompute);
}

export function registerPreview(el: HTMLElement, setLive: (v: boolean) => void): () => void {
  const entry: Entry = { el, setLive, live: false };
  entries.add(entry);
  schedule();
  return () => { entries.delete(entry); schedule(); };
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule);
}
