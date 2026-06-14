import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template, Controller } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';

const GEMS = ['#ff4d6d', '#ffce4d', '#3fd6a8', '#28b6e8', '#b06bff'];

interface Gem { color: number; g: Container; tr: number; tc: number }

// Tap two adjacent gems to swap them; line up 3+ to clear, with gravity and
// cascading refills. Demo finds a productive swap each beat.
export const match3: Template = {
  id: 'match3',
  start(ctx): Controller {
    const { app, layer, config, W, H, demo } = ctx;
    const cols = 6, rows = 7, size = 50, gap = 3;
    const boardW = cols * size + (cols + 1) * gap;
    const ox = (W - boardW) / 2, oy = 128;
    const frameCol = ctx.color('frame', darken(config.brand.bgColor, 0.3));

    const frame = new Graphics().roundRect(ox, oy, boardW, rows * size + (rows + 1) * gap, 14).fill(frameCol);
    layer.addChild(frame);
    ctx.mark(frame, 'frame');
    const gemsLayer = new Container();
    layer.addChild(gemsLayer);

    const board: (Gem | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    const pos = (r: number, c: number) => ({ x: ox + gap + c * (size + gap) + size / 2, y: oy + gap + r * (size + gap) + size / 2 });

    function makeGem(color: number, r: number, c: number, fromRow: number): Gem {
      const g = new Container();
      const hex = GEMS[color];
      g.addChild(new Graphics().roundRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 10).fill(hex));
      g.addChild(new Graphics().roundRect(-size / 2 + 8, -size / 2 + 8, size - 16, 8, 4).fill({ color: lighten(hex, 0.5), alpha: 0.5 }));
      g.addChild(new Graphics().circle(0, 2, 5).fill({ color: lighten(hex, 0.6), alpha: 0.5 }));
      const p = pos(r, c), start = pos(fromRow, c);
      g.position.set(p.x, start.y);
      gemsLayer.addChild(g);
      return { color, g, tr: r, tc: c };
    }
    function randColorAt(r: number, c: number): number {
      // avoid making an instant 3-run while filling
      let col: number;
      do {
        col = Math.floor(Math.random() * GEMS.length);
      } while (
        (c >= 2 && board[r][c - 1]?.color === col && board[r][c - 2]?.color === col) ||
        (r >= 2 && board[r - 1][c]?.color === col && board[r - 2][c]?.color === col)
      );
      return col;
    }
    function fillBoard() {
      gemsLayer.removeChildren().forEach((x) => x.destroy());
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          board[r][c] = makeGem(randColorAt(r, c), r, c, r);
    }
    fillBoard();

    function findMatches(): boolean[][] {
      const mk = Array.from({ length: rows }, () => Array(cols).fill(false));
      for (let r = 0; r < rows; r++) {
        let run = 1;
        for (let c = 1; c <= cols; c++) {
          const same = c < cols && board[r][c] && board[r][c - 1] && board[r][c]!.color === board[r][c - 1]!.color;
          if (same) run++; else { if (run >= 3) for (let k = c - run; k < c; k++) mk[r][k] = true; run = 1; }
        }
      }
      for (let c = 0; c < cols; c++) {
        let run = 1;
        for (let r = 1; r <= rows; r++) {
          const same = r < rows && board[r][c] && board[r - 1][c] && board[r][c]!.color === board[r - 1][c]!.color;
          if (same) run++; else { if (run >= 3) for (let k = r - run; k < r; k++) mk[k][c] = true; run = 1; }
        }
      }
      return mk;
    }
    function hasMatches() { return findMatches().some((row) => row.some(Boolean)); }

    function resolve() {
      let total = 0;
      for (let guard = 0; guard < 30; guard++) {
        const mk = findMatches();
        let cnt = 0;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (mk[r][c]) cnt++;
        if (!cnt) break;
        total += cnt;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (mk[r][c] && board[r][c]) { const p = pos(r, c); ringFlash(app, layer, p.x, p.y, 0xffffff, 16); board[r][c]!.g.destroy(); board[r][c] = null; }
        }
        // gravity + refill per column
        for (let c = 0; c < cols; c++) {
          const stack: Gem[] = [];
          for (let r = rows - 1; r >= 0; r--) if (board[r][c]) stack.push(board[r][c]!);
          let r = rows - 1;
          for (const gem of stack) { board[r][c] = gem; gem.tr = r; gem.tc = c; r--; }
          let above = 1;
          while (r >= 0) { board[r][c] = makeGem(Math.floor(Math.random() * GEMS.length), r, c, -above); r--; above++; }
        }
      }
      if (total > 0) ctx.addScore(Math.max(1, Math.round(total / 3)));
    }

    // selection
    let sel: { r: number; c: number } | null = null;
    const ring = new Graphics().roundRect(-size / 2, -size / 2, size, size, 12).stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
    ring.visible = false;
    gemsLayer.addChild(ring);
    function showRing() {
      if (!sel || ring.destroyed) { if (!ring.destroyed) ring.visible = false; return; }
      gemsLayer.addChild(ring); // keep above newly spawned gems
      const p = pos(sel.r, sel.c); ring.position.set(p.x, p.y); ring.visible = true;
    }
    function swapCells(a: { r: number; c: number }, b: { r: number; c: number }) {
      const ga = board[a.r][a.c], gb = board[b.r][b.c];
      board[a.r][a.c] = gb; board[b.r][b.c] = ga;
      if (ga) { ga.tr = b.r; ga.tc = b.c; }
      if (gb) { gb.tr = a.r; gb.tc = a.c; }
    }
    const adjacent = (a: { r: number; c: number }, b: { r: number; c: number }) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

    function trySwap(a: { r: number; c: number }, b: { r: number; c: number }) {
      swapCells(a, b);
      if (hasMatches()) resolve();
      else swapCells(a, b); // revert
    }

    function cellAt(gx: number, gy: number) {
      const c = Math.floor((gx - ox - gap) / (size + gap));
      const r = Math.floor((gy - oy - gap) / (size + gap));
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      return { r, c };
    }
    const onTap = (e: FederatedPointerEvent) => {
      const cell = cellAt(e.global.x, e.global.y);
      if (!cell) { sel = null; showRing(); return; }
      if (!sel) sel = cell;
      else if (sel.r === cell.r && sel.c === cell.c) sel = null;
      else if (adjacent(sel, cell)) { trySwap(sel, cell); sel = null; }
      else sel = cell;
      showRing();
    };
    if (!demo) { app.stage.eventMode = 'static'; app.stage.hitArea = new Rectangle(0, 0, W, H); app.stage.on('pointertap', onTap); }

    function findGoodSwap(): [{ r: number; c: number }, { r: number; c: number }] | null {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = { r, c };
        for (const b of [{ r: r + 1, c }, { r, c: c + 1 }]) {
          if (b.r >= rows || b.c >= cols) continue;
          swapCells(a, b);
          const ok = hasMatches();
          swapCells(a, b);
          if (ok) return [a, b];
        }
      }
      return null;
    }

    let demoT = 0;
    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      // lerp every gem toward its cell
      const f = Math.min(1, dt * 16);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const gem = board[r][c]; if (!gem) continue;
        const p = pos(gem.tr, gem.tc);
        gem.g.x += (p.x - gem.g.x) * f;
        gem.g.y += (p.y - gem.g.y) * f;
      }
      if (demo) {
        demoT += dt;
        if (demoT > 0.85) {
          demoT = 0;
          const sw = findGoodSwap();
          if (sw) trySwap(sw[0], sw[1]);
          else fillBoard();
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        gemsLayer.destroy({ children: true });
        frame.destroy();
      },
    };
  },
};
