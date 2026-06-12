import { Container, Graphics, Rectangle, Text, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template } from '../template';
import { lighten } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

// A 3x3 prize card under a foil layer. Drag to scratch the foil off; every
// revealed money cell scores. Demo auto-scratches sweeping paths and resets.
// The prize art (💰) can be replaced with an upload.
export const scratch: Template = {
  id: 'scratch',
  start(ctx) {
    const { app, layer, W, H, demo } = ctx;
    const foilCol = ctx.color('foil', '#9aa3b8');
    const prizeTex = ctx.tex('prize');
    const cols = 3, rows = 3;
    const cell = 86, gapC = 8;
    const cardW = cols * cell + (cols + 1) * gapC;
    const cardH = rows * cell + (rows + 1) * gapC;
    const ox = (W - cardW) / 2, oy = H * 0.42 - cardH / 2;

    const card = new Container();
    layer.addChild(card);
    ctx.mark(card, 'foil');

    interface Cell { isPrize: boolean; left: number; revealed: boolean }
    let cells: Cell[] = [];
    let foilTiles: { g: Graphics; cellIdx: number }[] = [];
    const TILES_PER_CELL = 16; // 4x4 foil tiles per cell

    function build() {
      card.removeChildren().forEach((c) => c.destroy());
      cells = [];
      foilTiles = [];
      // card base
      card.addChild(new Graphics().roundRect(ox - 8, oy - 36, cardW + 16, cardH + 52, 16).fill(0xf4f0e6));
      const head = new Text({ text: 'SCRATCH & WIN', style: { fontFamily: 'Arial Black, Arial', fontSize: 18, fill: 0x8a2433, fontWeight: 'bold' } });
      head.anchor.set(0.5);
      head.position.set(W / 2, oy - 16);
      card.addChild(head);

      // pick 3 prize cells
      const idx = [...Array(cols * rows).keys()];
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      const prizeSet = new Set(idx.slice(0, 3));

      for (let r = 0; r < rows; r++) {
        for (let c2 = 0; c2 < cols; c2++) {
          const i = r * cols + c2;
          const x = ox + gapC + c2 * (cell + gapC);
          const y = oy + gapC + r * (cell + gapC);
          const isPrize = prizeSet.has(i);
          // prize face
          card.addChild(new Graphics().roundRect(x, y, cell, cell, 8).fill(0xffffff));
          if (isPrize && prizeTex) {
            const sp = fitSprite(prizeTex, cell - 22, cell - 22);
            sp.position.set(x + cell / 2, y + cell / 2);
            card.addChild(sp);
          } else {
            const face = new Text({ text: isPrize ? '💰' : ['🍀', '🎲', '🃏', '🪙'][i % 4], style: { fontSize: 40 } });
            face.anchor.set(0.5);
            face.position.set(x + cell / 2, y + cell / 2);
            card.addChild(face);
          }
          cells.push({ isPrize, left: TILES_PER_CELL, revealed: false });
          // foil tiles on top
          const n = Math.sqrt(TILES_PER_CELL);
          const ts = cell / n;
          for (let ty = 0; ty < n; ty++) {
            for (let tx = 0; tx < n; tx++) {
              const g = new Graphics().rect(0, 0, ts + 0.5, ts + 0.5).fill(tx % 2 === ty % 2 ? foilCol : lighten(foilCol, 0.12));
              g.position.set(x + tx * ts, y + ty * ts);
              card.addChild(g);
              foilTiles.push({ g, cellIdx: i });
            }
          }
        }
      }
    }

    function scratchAt(gx: number, gy: number) {
      const R = 26;
      for (const t of foilTiles) {
        if (t.g.destroyed || !t.g.visible) continue;
        const dx = t.g.x + 11 - gx, dy = t.g.y + 11 - gy;
        if (dx * dx + dy * dy < R * R) {
          t.g.visible = false;
          const c = cells[t.cellIdx];
          c.left--;
          if (!c.revealed && c.left <= TILES_PER_CELL * 0.35) {
            c.revealed = true;
            if (c.isPrize) {
              ctx.addScore();
              ringFlash(app, layer, t.g.x, t.g.y, 0xffd54a, 30);
            }
            if (cells.every((cc) => cc.revealed)) {
              if (demo) resetSoon = 0.9;
            }
          }
        }
      }
    }

    let down = false;
    const onDown = (e: FederatedPointerEvent) => { down = true; scratchAt(e.global.x, e.global.y); };
    const onMove = (e: FederatedPointerEvent) => { if (down) scratchAt(e.global.x, e.global.y); };
    const onUp = () => { down = false; };
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointerdown', onDown);
      app.stage.on('pointermove', onMove);
      app.stage.on('pointerup', onUp);
      app.stage.on('pointerupoutside', onUp);
    }

    // demo: sweep a scratching path
    let sweepT = 0;
    let resetSoon = -1;
    build();

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      if (!demo) return;
      if (resetSoon >= 0) {
        resetSoon -= dt;
        if (resetSoon < 0) build();
        return;
      }
      sweepT += dt;
      const px = ox + (cardW / 2) + Math.sin(sweepT * 2.2) * cardW * 0.42;
      const py = oy + ((sweepT * 60) % cardH);
      scratchAt(px, py);
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) {
          app.stage.off('pointerdown', onDown);
          app.stage.off('pointermove', onMove);
          app.stage.off('pointerup', onUp);
          app.stage.off('pointerupoutside', onUp);
        }
        card.destroy({ children: true });
      },
    };
  },
};
