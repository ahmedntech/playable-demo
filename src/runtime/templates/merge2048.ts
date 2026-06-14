import { Container, Graphics, Rectangle, Text, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import type { Controller } from '../template';

// Swipe to slide the tiles; equal tiles merge and double. Each merge scores.
// Demo auto-swipes in directions that move the board.
export const merge2048: Template = {
  id: 'merge2048',
  start(ctx): Controller {
    const { app, layer, config, W, H, demo } = ctx;
    const base = ctx.color('tile', config.brand.primaryColor);
    const N = 4, cell = 74, gap = 8;
    const boardW = N * cell + (N + 1) * gap;
    const ox = (W - boardW) / 2, oy = 150;

    layer.addChild(new Graphics().roundRect(ox, oy, boardW, boardW, 14).fill(darken(config.brand.bgColor, 0.3)));
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        layer.addChild(new Graphics().roundRect(ox + gap + c * (cell + gap), oy + gap + r * (cell + gap), cell, cell, 8).fill({ color: 0xffffff, alpha: 0.05 }));

    const tilesLayer = new Container();
    layer.addChild(tilesLayer);
    ctx.mark(tilesLayer, 'tile');

    let board: number[][] = Array.from({ length: N }, () => Array(N).fill(0));

    function spawn() {
      const empty: [number, number][] = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!board[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
    spawn(); spawn();

    function cellPos(r: number, c: number) {
      return { x: ox + gap + c * (cell + gap), y: oy + gap + r * (cell + gap) };
    }
    function tileColor(v: number) {
      const step = Math.min(1, Math.log2(v) / 11); // 2..2048
      return lighten(base, step * 0.55);
    }
    function render() {
      tilesLayer.removeChildren().forEach((c) => c.destroy());
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const v = board[r][c];
          if (!v) continue;
          const { x, y } = cellPos(r, c);
          const g = new Container();
          g.addChild(new Graphics().roundRect(0, 0, cell, cell, 8).fill(tileColor(v)));
          g.addChild(new Graphics().roundRect(0, 0, cell, 8, 8).fill({ color: 0xffffff, alpha: 0.18 }));
          const t = new Text({ text: String(v), style: { fontFamily: 'Arial Black, Arial', fontSize: v < 100 ? 30 : v < 1000 ? 24 : 19, fill: 0xffffff, fontWeight: 'bold' } });
          t.anchor.set(0.5);
          t.position.set(cell / 2, cell / 2);
          g.addChild(t);
          g.position.set(x, y);
          tilesLayer.addChild(g);
        }
      }
    }
    render();

    // slide one line toward index 0; returns [newLine, merges]
    function slide(line: number[]): [number[], number] {
      const nums = line.filter((v) => v);
      let merges = 0;
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] === nums[i + 1]) { nums[i] *= 2; nums.splice(i + 1, 1); merges++; }
      }
      while (nums.length < N) nums.push(0);
      return [nums, merges];
    }

    // dir: 0=left 1=right 2=up 3=down. Returns merges, or -1 if nothing moved.
    function move(dir: number): number {
      const before = JSON.stringify(board);
      let merges = 0;
      const get = (i: number, j: number) =>
        dir === 0 ? board[i][j] : dir === 1 ? board[i][N - 1 - j] : dir === 2 ? board[j][i] : board[N - 1 - j][i];
      const set = (i: number, j: number, v: number) => {
        if (dir === 0) board[i][j] = v; else if (dir === 1) board[i][N - 1 - j] = v;
        else if (dir === 2) board[j][i] = v; else board[N - 1 - j][i] = v;
      };
      for (let i = 0; i < N; i++) {
        const line = Array.from({ length: N }, (_, j) => get(i, j));
        const [nl, m] = slide(line);
        merges += m;
        for (let j = 0; j < N; j++) set(i, j, nl[j]);
      }
      if (JSON.stringify(board) === before) return -1;
      return merges;
    }

    function doMove(dir: number) {
      const m = move(dir);
      if (m < 0) return false;
      if (m > 0) ctx.addScore(m);
      spawn();
      render();
      return true;
    }

    // swipe input
    let downX = 0, downY = 0, downAt = false;
    const onDown = (e: FederatedPointerEvent) => { downX = e.global.x; downY = e.global.y; downAt = true; };
    const onUp = (e: FederatedPointerEvent) => {
      if (!downAt) return; downAt = false;
      const dx = e.global.x - downX, dy = e.global.y - downY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : 0);
      else doMove(dy > 0 ? 3 : 2);
    };
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointerdown', onDown);
      app.stage.on('pointerup', onUp);
      app.stage.on('pointerupoutside', onUp);
    }

    let demoT = 0;
    const tick = (t: Ticker) => {
      if (!demo) return;
      demoT += t.deltaMS / 1000;
      if (demoT > 0.55) {
        demoT = 0;
        const dirs = [3, 0, 1, 2].sort(() => Math.random() - 0.5);
        for (const d of dirs) if (doMove(d)) break;
        // board jammed → reset for a fresh loop
        if (board.every((row) => row.every((v) => v))) {
          let full = true;
          for (let r = 0; r < N && full; r++) for (let c = 0; c < N; c++) {
            if (c < N - 1 && board[r][c] === board[r][c + 1]) full = false;
            if (r < N - 1 && board[r][c] === board[r + 1][c]) full = false;
          }
          if (full) { board = Array.from({ length: N }, () => Array(N).fill(0)); spawn(); spawn(); render(); }
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) { app.stage.off('pointerdown', onDown); app.stage.off('pointerup', onUp); app.stage.off('pointerupoutside', onUp); }
        tilesLayer.destroy({ children: true });
      },
    };
  },
};
