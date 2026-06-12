import { Container, Graphics, Text, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
  { s: '♠', red: false }, { s: '♥', red: true }, { s: '♦', red: true }, { s: '♣', red: false },
];

// A card is shown — call whether the next is higher or lower. Right call
// scores; the deck never ends. Demo peeks at the next card and mostly wins.
export const highlow: Template = {
  id: 'highlow',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const cardCol = ctx.color('card', config.brand.primaryColor);
    const cx = W / 2, cy = H * 0.38;
    const CW = 150, CH = 210;

    let current = Math.floor(Math.random() * 13);
    let next = Math.floor(Math.random() * 13);
    let suit = SUITS[Math.floor(Math.random() * 4)];

    const card = new Container();
    card.position.set(cx, cy);
    layer.addChild(card);
    ctx.mark(card, 'card');
    const face = new Graphics();
    const rankTop = new Text({ text: '', style: { fontFamily: 'Georgia', fontSize: 34, fontWeight: 'bold', fill: 0x222222 } });
    const suitBig = new Text({ text: '', style: { fontSize: 64 } });
    rankTop.position.set(-CW / 2 + 14, -CH / 2 + 8);
    suitBig.anchor.set(0.5);
    suitBig.y = 14;
    card.addChild(face, rankTop, suitBig);

    function drawCard(flip = 0) {
      face.clear();
      face.roundRect(-CW / 2, -CH / 2, CW, CH, 14).fill(0xf8f5ee);
      face.roundRect(-CW / 2, -CH / 2, CW, CH, 14).stroke({ width: 4, color: darken(cardCol, 0.15) });
      face.roundRect(-CW / 2 + 6, -CH / 2 + 6, CW - 12, CH - 12, 10).stroke({ width: 1.5, color: cardCol, alpha: 0.5 });
      rankTop.text = RANKS[current];
      rankTop.style.fill = suit.red ? 0xc22d3f : 0x222222;
      suitBig.text = suit.s;
      suitBig.style.fill = suit.red ? 0xc22d3f : 0x222222;
      card.scale.x = Math.abs(Math.cos(flip));
    }
    drawCard();

    // higher / lower buttons
    function makeBtn(label: string, y: number, onTap: () => void) {
      const b = new Container();
      b.addChild(new Graphics().roundRect(-92, -26, 184, 52, 26).fill(cardCol));
      b.addChild(new Graphics().roundRect(-92, -26, 184, 52, 26).stroke({ width: 2, color: lighten(cardCol, 0.4), alpha: 0.8 }));
      const t = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 19, fill: 0xffffff, fontWeight: 'bold' } });
      t.anchor.set(0.5);
      b.addChild(t);
      b.position.set(cx, y);
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.on('pointertap', onTap);
      layer.addChild(b);
      return b;
    }
    const btnHi = makeBtn('▲  HIGHER', cy + CH / 2 + 52, () => guess(true));
    const btnLo = makeBtn('▼  LOWER', cy + CH / 2 + 114, () => guess(false));

    let flipping = false;
    let flipT = 0;
    let pendingGuess: boolean | null = null;
    let demoT = 0;
    let nextPreset = false; // demo peeks and pre-deals the next card

    function guess(higher: boolean) {
      if (flipping) return;
      flipping = true;
      flipT = 0;
      pendingGuess = higher;
      if (!nextPreset) {
        // never deal an equal card — always a clear result
        next = Math.floor(Math.random() * 13);
        if (next === current) next = (next + 1) % 13;
      }
      nextPreset = false;
    }

    function resolve() {
      const wasHigher = next > current;
      const win = pendingGuess === wasHigher;
      current = next;
      suit = SUITS[Math.floor(Math.random() * 4)];
      if (win) {
        ctx.addScore();
        ringFlash(app, layer, cx, cy, 0xffd54a, 70);
      } else {
        // gentle shake, no punishment — keep the ad upbeat
        card.rotation = 0.06;
      }
    }

    const tick = (tk: Ticker) => {
      const dt = tk.deltaMS / 1000;
      card.rotation *= 0.86;
      if (flipping) {
        flipT += dt;
        const phase = flipT * 6;
        if (phase < Math.PI / 2) {
          drawCard(phase);
        } else if (phase < Math.PI) {
          if (pendingGuess !== null) { resolve(); pendingGuess = null; }
          drawCard(phase);
        } else {
          drawCard(0);
          flipping = false;
        }
      } else if (demo) {
        demoT += dt;
        if (demoT > 1.2) {
          demoT = 0;
          // peek: guess correctly 80% of the time
          const peek = Math.floor(Math.random() * 13);
          next = peek === current ? (peek + 1) % 13 : peek;
          nextPreset = true;
          const correct = next > current;
          guess(Math.random() < 0.8 ? correct : !correct);
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        card.destroy({ children: true });
        btnHi.destroy({ children: true });
        btnLo.destroy({ children: true });
      },
    };
  },
};
