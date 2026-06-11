import { Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';

// A grid of colored bubbles. Tap one to pop its whole connected same-color
// cluster. Demo auto-pops a random bubble; rebuilds when the board empties.
export const bubblepop: Template = {
  id: 'bubblepop',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('bubble', config.brand.primaryColor);
    const cols = 6, rows = 7;
    const r = 24, gap = 4;
    const cellW = r * 2 + gap;
    const ox = (W - cols * cellW) / 2 + r;
    const oy = H * 0.16 + r;
    const colors = [p, lighten(p, 0.4), darken(p, 0.3)];

    type Cell = { g: Graphics; ci: number } | null;
    let grid: Cell[][] = [];
    let demoT = 0;

    function build() {
      grid.flat().forEach((c) => c?.g.destroy());
      grid = [];
      for (let row = 0; row < rows; row++) {
        const line: Cell[] = [];
        for (let col = 0; col < cols; col++) {
          const ci = Math.floor(Math.random() * colors.length);
          const g = makeBubble(col, row, ci);
          line.push({ g, ci });
        }
        grid.push(line);
      }
    }

    function makeBubble(col: number, row: number, ci: number) {
      const x = ox + col * cellW;
      const y = oy + row * cellW;
      const g = new Graphics();
      g.circle(0, 0, r).fill(colors[ci]);
      g.circle(-r * 0.3, -r * 0.3, r * 0.4).fill({ color: 0xffffff, alpha: 0.3 });
      g.position.set(x, y);
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.on('pointertap', () => popAt(col, row));
      layer.addChild(g);
      ctx.mark(g, 'bubble');
      return g;
    }

    function popAt(col: number, row: number) {
      const start = grid[row]?.[col];
      if (!start) return;
      const ci = start.ci;
      const stack = [[col, row]];
      const found: [number, number][] = [];
      const seen = new Set<string>();
      while (stack.length) {
        const [c, rw] = stack.pop()!;
        const key = c + ',' + rw;
        if (seen.has(key)) continue;
        seen.add(key);
        const cell = grid[rw]?.[c];
        if (!cell || cell.ci !== ci) continue;
        found.push([c, rw]);
        stack.push([c + 1, rw], [c - 1, rw], [c, rw + 1], [c, rw - 1]);
      }
      for (const [c, rw] of found) {
        const cell = grid[rw][c]!;
        ringFlash(app, layer, cell.g.x, cell.g.y, 0xffffff, 18);
        cell.g.destroy();
        grid[rw][c] = null;
        ctx.addScore();
      }
      if (grid.flat().every((c) => c === null)) {
        if (demo) build();
        else ctx.finish();
      }
    }

    build();

    const tick = (t: Ticker) => {
      if (!demo) return;
      demoT += t.deltaMS / 1000;
      if (demoT > 0.55) {
        demoT = 0;
        const live: [number, number][] = [];
        grid.forEach((line, rw) => line.forEach((c, col) => { if (c) live.push([col, rw]); }));
        if (live.length) { const [c, rw] = live[Math.floor(Math.random() * live.length)]; popAt(c, rw); }
      }
    };
    app.ticker.add(tick);

    return { destroy() { app.ticker.remove(tick); grid.flat().forEach((c) => c?.g.destroy()); grid = []; } };
  },
};
