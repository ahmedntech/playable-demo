import { Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';

// Tap empty cells to paint them with the brand color. Fill the whole grid.
// Demo auto-paints cells on a timer and clears when full.
export const paint: Template = {
  id: 'paint',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('paint', config.brand.primaryColor);
    const cols = 5, rows = 6;
    const cell = 54, gap = 6;
    const ox = (W - cols * (cell + gap) + gap) / 2;
    const oy = H * 0.18;
    const empty = darken(config.brand.bgColor, 0.25);

    const cells: { g: Graphics; filled: boolean }[] = [];
    let demoT = 0;

    function fill(idx: number) {
      const c = cells[idx];
      if (!c || c.filled) return;
      c.filled = true;
      c.g.clear().roundRect(0, 0, cell, cell, 8).fill(p);
      c.g.roundRect(6, 6, cell - 12, 8, 4).fill({ color: lighten(p, 0.45), alpha: 0.4 });
      ctx.addScore();
      if (cells.every((x) => x.filled)) {
        if (demo) reset();
        else ctx.finish();
      }
    }

    function reset() {
      cells.forEach((c) => { c.filled = false; c.g.clear().roundRect(0, 0, cell, cell, 8).fill(empty); });
    }

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const g = new Graphics().roundRect(0, 0, cell, cell, 8).fill(empty);
        g.position.set(ox + col * (cell + gap), oy + r * (cell + gap));
        const idx = cells.length;
        g.eventMode = 'static';
        g.cursor = 'pointer';
        g.on('pointertap', () => fill(idx));
        layer.addChild(g);
        ctx.mark(g, 'paint');
        cells.push({ g, filled: false });
      }
    }

    const tick = (t: Ticker) => {
      if (!demo) return;
      demoT += t.deltaMS / 1000;
      if (demoT > 0.18) {
        demoT = 0;
        const open = cells.map((c, i) => (c.filled ? -1 : i)).filter((i) => i >= 0);
        if (open.length) fill(open[Math.floor(Math.random() * open.length)]);
      }
    };
    app.ticker.add(tick);

    return { destroy() { app.ticker.remove(tick); cells.forEach((c) => c.g.destroy()); cells.length = 0; } };
  },
};
