import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template, Controller } from '../template';
import { darken } from '../color';
import { ringFlash } from '../fx';

const COLORS = ['#ff4d6d', '#ffce4d', '#3fd6a8', '#28b6e8'];

// Aim the launcher and fire bubbles into the pack; 3+ of a color pop. The
// launcher sweeps; tap to shoot. Demo aims at same-color clusters.
export const bubbleshoot: Template = {
  id: 'bubbleshoot',
  start(ctx): Controller {
    const { app, layer, config, W, H, demo } = ctx;
    const launchCol = ctx.color('launcher', config.brand.primaryColor);
    const cols = 7, rows = 11, cell = 44, R = 20;
    const ox = (W - cols * cell) / 2, oy = 64;
    const cx = (c: number) => ox + c * cell + cell / 2;
    const cy = (r: number) => oy + r * cell + cell / 2;

    const board: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const gfx: (Container | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    const bubblesLayer = new Container();
    layer.addChild(bubblesLayer);

    function drawBubble(color: number, x: number, y: number) {
      const c = new Container();
      const hex = COLORS[color];
      c.addChild(new Graphics().circle(0, 0, R).fill(hex));
      c.addChild(new Graphics().circle(-R * 0.3, -R * 0.3, R * 0.4).fill({ color: 0xffffff, alpha: 0.45 }));
      c.position.set(x, y);
      return c;
    }
    function setCell(r: number, c: number, color: number) {
      board[r][c] = color;
      if (gfx[r][c]) gfx[r][c]!.destroy();
      if (color < 0) { gfx[r][c] = null; return; }
      const g = drawBubble(color, cx(c), cy(r));
      bubblesLayer.addChild(g);
      gfx[r][c] = g;
    }
    function fillTop(rowsN: number) {
      for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) if (board[r][c] < 0) setCell(r, c, Math.floor(Math.random() * COLORS.length));
    }
    fillTop(4);
    ctx.mark(bubblesLayer, 'launcher');

    // launcher
    const base = new Container();
    base.position.set(W / 2, H - 58);
    base.addChild(new Graphics().circle(0, 0, 26).fill(darken(launchCol, 0.15)));
    base.addChild(new Graphics().roundRect(-7, -40, 14, 40, 6).fill(launchCol));
    layer.addChild(base);
    ctx.mark(base, 'launcher');
    const aimLine = new Graphics();
    layer.addChild(aimLine);
    const nextDot = new Graphics();
    base.addChild(nextDot);

    let angle = -Math.PI / 2;
    let aimDir = 1;
    let curColor = Math.floor(Math.random() * COLORS.length);
    function drawNext() { nextDot.clear().circle(0, -2, 11).fill(COLORS[curColor]); }
    drawNext();

    interface Shot { g: Container; x: number; y: number; vx: number; vy: number; color: number }
    let shot: Shot | null = null;

    function fire() {
      if (shot) return;
      const sp = 560;
      const g = drawBubble(curColor, base.x, base.y - 30);
      layer.addChild(g);
      shot = { g, x: base.x, y: base.y - 30, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, color: curColor };
      curColor = pickColor();
      drawNext();
    }
    function pickColor(): number {
      const present = new Set<number>();
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (board[r][c] >= 0) present.add(board[r][c]);
      const arr = present.size ? [...present] : COLORS.map((_, i) => i);
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function neighbors(r: number, c: number): [number, number][] {
      return ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][]).filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols);
    }
    function cluster(r: number, c: number, color: number): [number, number][] {
      const seen = new Set<string>(), res: [number, number][] = [], st: [number, number][] = [[r, c]];
      while (st.length) {
        const [cr, cc] = st.pop()!; const k = cr + ',' + cc;
        if (seen.has(k)) continue; seen.add(k);
        if (board[cr][cc] !== color) continue;
        res.push([cr, cc]);
        for (const n of neighbors(cr, cc)) st.push(n);
      }
      return res;
    }

    function land(sx: number, sy: number, color: number) {
      let c = Math.round((sx - ox - cell / 2) / cell);
      let r = Math.round((sy - oy - cell / 2) / cell);
      c = Math.max(0, Math.min(cols - 1, c));
      r = Math.max(0, Math.min(rows - 1, r));
      if (board[r][c] >= 0) {
        // nudge to nearest empty neighbor
        const open = neighbors(r, c).filter(([nr, nc]) => board[nr][nc] < 0);
        if (open.length) { [r, c] = open[0]; } else return;
      }
      setCell(r, c, color);
      const cl = cluster(r, c, color);
      if (cl.length >= 3) {
        for (const [pr, pc] of cl) { ringFlash(app, layer, cx(pc), cy(pr), 0xffffff, 16); setCell(pr, pc, -1); }
        ctx.addScore(cl.length >= 5 ? 2 : 1);
      } else if (r >= rows - 2) {
        if (demo) reset(); else ctx.finish();
        return;
      }
      // keep it lively: refill when the pack thins out
      let count = 0;
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) if (board[rr][cc] >= 0) count++;
      if (count < 6) fillTop(3);
    }

    function reset() {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) setCell(r, c, -1);
      fillTop(4);
    }

    const onTap = () => fire();
    if (!demo) { app.stage.eventMode = 'static'; app.stage.on('pointertap', onTap); }

    let demoT = 0;
    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.04);
      // aim sweep
      if (!demo) {
        angle += aimDir * 1.1 * dt;
        if (angle < -Math.PI + 0.5) { angle = -Math.PI + 0.5; aimDir = 1; }
        if (angle > -0.5) { angle = -0.5; aimDir = -1; }
        aimLine.clear().moveTo(base.x, base.y - 26).lineTo(base.x + Math.cos(angle) * 90, base.y - 26 + Math.sin(angle) * 90).stroke({ width: 3, color: 0xffffff, alpha: 0.25 });
        base.rotation = angle + Math.PI / 2;
      }
      if (shot) {
        for (let s = 0; s < 3; s++) { // substep to avoid tunneling
          shot.x += shot.vx * dt / 3; shot.y += shot.vy * dt / 3;
          if (shot.x < ox + R) { shot.x = ox + R; shot.vx = Math.abs(shot.vx); }
          if (shot.x > ox + cols * cell - R) { shot.x = ox + cols * cell - R; shot.vx = -Math.abs(shot.vx); }
          let hit = shot.y <= oy + R;
          if (!hit) {
            outer: for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
              if (board[r][c] < 0) continue;
              const dx = shot.x - cx(c), dy = shot.y - cy(r);
              if (dx * dx + dy * dy < (R * 1.7) * (R * 1.7)) { hit = true; break outer; }
            }
          }
          if (hit) { const { x, y, color } = shot; shot.g.destroy(); shot = null; land(x, y, color); break; }
        }
        if (shot) shot.g.position.set(shot.x, shot.y);
      } else if (demo) {
        demoT += dt;
        if (demoT > 0.9) {
          demoT = 0;
          // aim at the nearest bubble matching the current color
          let best: [number, number] | null = null, bestD = Infinity;
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if (board[r][c] !== curColor) continue;
            const dx = cx(c) - base.x, dy = cy(r) - (base.y - 26), d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = [r, c]; }
          }
          if (best) angle = Math.atan2(cy(best[0]) - (base.y - 26), cx(best[1]) - base.x);
          base.rotation = angle + Math.PI / 2;
          fire();
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        if (shot) shot.g.destroy();
        bubblesLayer.destroy({ children: true });
        base.destroy({ children: true });
        aimLine.destroy();
      },
    };
  },
};
