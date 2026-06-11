import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';

interface Card { c: Container; cover: Graphics; face: Graphics; value: number; up: boolean; matched: boolean }

// Flip two cards to find matching colors. Demo auto-reveals a matching pair on a
// timer and resets when the board is cleared.
export const memory: Template = {
  id: 'memory',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = config.brand.primaryColor;
    const cols = 4, rows = 2; // 4 pairs
    const cw = 70, ch = 84, gapX = (W - cols * cw) / (cols + 1), gapY = 18, top = H * 0.3;
    const faceColors = [p, lighten(p, 0.35), darken(p, 0.25), lighten(p, 0.1), darken(p, 0.45)];

    let cards: Card[] = [];
    let first: Card | null = null;
    let lock = 0; // mismatch flip-back timer
    let demoT = 0;
    let pending: Card[] | null = null; // the two cards waiting to flip back

    function build() {
      cards.forEach((c) => c.c.destroy());
      cards = [];
      first = null;
      const values: number[] = [];
      for (let i = 0; i < (cols * rows) / 2; i++) { values.push(i, i); }
      // shuffle (index-based, no Math.random bias concerns for a demo)
      for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      let k = 0;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const x = gapX + col * (cw + gapX);
          const y = top + r * (ch + gapY);
          const c = new Container();
          c.x = x; c.y = y;
          const face = new Graphics().roundRect(0, 0, cw, ch, 10).fill(faceColors[values[k] % faceColors.length]);
          face.visible = false;
          const cover = new Graphics().roundRect(0, 0, cw, ch, 10).fill(ctx.color('card', darken(config.brand.bgColor, 0.3)));
          cover.roundRect(0, 0, cw, ch, 10).stroke({ width: 2, color: lighten(p, 0.2), alpha: 0.6 });
          c.addChild(face, cover);
          const card: Card = { c, cover, face, value: values[k], up: false, matched: false };
          c.eventMode = 'static';
          c.cursor = 'pointer';
          c.on('pointertap', () => flip(card));
          layer.addChild(c);
          ctx.mark(c, 'card');
          cards.push(card);
          k++;
        }
      }
    }

    function setUp(card: Card, up: boolean) {
      card.up = up;
      card.face.visible = up;
      card.cover.visible = !up;
    }

    function flip(card: Card) {
      if (lock > 0 || card.up || card.matched) return;
      setUp(card, true);
      if (!first) { first = card; return; }
      if (first.value === card.value) {
        first.matched = card.matched = true;
        first = null;
        ctx.addScore();
        if (cards.every((c) => c.matched)) ctx.finish();
      } else {
        const a = first, b = card;
        first = null;
        lock = 0.6;
        pending = [a, b];
      }
    }

    build();

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      if (lock > 0) {
        lock -= dt;
        if (lock <= 0 && pending) { pending.forEach((c) => setUp(c, false)); pending = null; }
        return;
      }
      if (demo) {
        demoT += dt;
        if (demoT > 0.7) {
          demoT = 0;
          const un = cards.filter((c) => !c.matched);
          if (!un.length) { build(); return; }
          const target = un[0].value;
          const pair = un.filter((c) => c.value === target).slice(0, 2);
          pair.forEach((c) => { c.matched = true; setUp(c, true); });
        }
      }
    };
    app.ticker.add(tick);

    return { destroy() { app.ticker.remove(tick); cards.forEach((c) => c.c.destroy()); cards = []; } };
  },
};
