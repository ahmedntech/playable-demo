import { Container, Graphics, Text, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

const SYMBOLS = ['💎', '🍒', '🍋', '🔔', '⭐'];

// Three reels spin and stop left-to-right. Pairs score 1, triples score 3 —
// odds are rigged generous (playable ads always let you win). Tap to spin.
// The jackpot symbol (💎) can be replaced with uploaded art.
export const slots: Template = {
  id: 'slots',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const machine = ctx.color('machine', config.brand.primaryColor);
    const jackpotTex = ctx.tex('symbol');
    const cx = W / 2, cy = H * 0.42;
    const cellW = 86, cellH = 110, gap = 10;

    // cabinet
    const frame = new Container();
    frame.addChild(new Graphics().roundRect(-150, -105, 300, 210, 22).fill(darken(machine, 0.25)));
    frame.addChild(new Graphics().roundRect(-150, -105, 300, 210, 22).stroke({ width: 4, color: lighten(machine, 0.3) }));
    frame.addChild(new Graphics().roundRect(-150, -140, 300, 44, 14).fill(machine));
    const title = new Text({ text: '✦ LUCKY SPIN ✦', style: { fontFamily: 'Arial Black, Arial', fontSize: 17, fill: 0xffffff, fontWeight: 'bold' } });
    title.anchor.set(0.5);
    title.y = -118;
    frame.addChild(title);
    frame.position.set(cx, cy);
    layer.addChild(frame);
    ctx.mark(frame, 'machine');

    // reels: each cell shows an emoji Text or the custom jackpot sprite
    interface Reel { box: Container; emoji: Text; custom: Container | null; value: number }
    const reels: Reel[] = [];
    for (let i = 0; i < 3; i++) {
      const box = new Container();
      const x = (i - 1) * (cellW + gap);
      box.position.set(x, 8);
      box.addChild(new Graphics().roundRect(-cellW / 2, -cellH / 2, cellW, cellH, 10).fill(0xf4f0e6));
      box.addChild(new Graphics().roundRect(-cellW / 2, -cellH / 2, cellW, cellH, 10).stroke({ width: 3, color: darken(machine, 0.4), alpha: 0.6 }));
      const emoji = new Text({ text: SYMBOLS[i % SYMBOLS.length], style: { fontSize: 52 } });
      emoji.anchor.set(0.5);
      box.addChild(emoji);
      let custom: Container | null = null;
      if (jackpotTex) {
        custom = new Container();
        custom.addChild(fitSprite(jackpotTex, 64, 64));
        custom.visible = false;
        box.addChild(custom);
      }
      frame.addChild(box);
      reels.push({ box, emoji, custom, value: i % SYMBOLS.length });
    }

    function show(reel: Reel, v: number) {
      reel.value = v;
      const isJackpotArt = v === 0 && reel.custom;
      reel.emoji.visible = !isJackpotArt;
      if (reel.custom) reel.custom.visible = !!isJackpotArt;
      if (!isJackpotArt) reel.emoji.text = SYMBOLS[v];
    }

    // rigged outcome: 35% triple, 35% pair, 30% miss
    function outcome(): number[] {
      const r = Math.random();
      const a = Math.floor(Math.random() * SYMBOLS.length);
      if (r < 0.35) return [a, a, a];
      if (r < 0.7) {
        let b = (a + 1 + Math.floor(Math.random() * (SYMBOLS.length - 1))) % SYMBOLS.length;
        return [a, a, b];
      }
      const b = (a + 1) % SYMBOLS.length;
      const c = (a + 2) % SYMBOLS.length;
      return [a, b, c];
    }

    let spinning = false;
    let stopAt: number[] = [];
    let final: number[] = [];
    let t = 0;
    let swapT = 0;
    let demoT = 0;

    function spin() {
      if (spinning) return;
      spinning = true;
      t = 0;
      final = outcome();
      stopAt = [0.7, 1.15, 1.6];
    }

    const onTap = () => spin();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.on('pointertap', onTap);
    }

    function settle() {
      spinning = false;
      const [a, b, c] = final;
      if (a === b && b === c) {
        ctx.addScore(3);
        for (const r of reels) ringFlash(app, layer, cx + r.box.x, cy + r.box.y + 8, 0xffd54a, 40);
      } else if (a === b || b === c || a === c) {
        ctx.addScore(1);
        ringFlash(app, layer, cx, cy + 8, 0xffffff, 50);
      }
    }

    const tick = (tk: Ticker) => {
      const dt = tk.deltaMS / 1000;
      if (spinning) {
        t += dt;
        swapT += dt;
        for (let i = 0; i < 3; i++) {
          if (t >= stopAt[i]) {
            show(reels[i], final[i]);
            reels[i].box.y = 8;
          } else {
            // cycle symbols fast + jiggle for spin feel
            if (swapT > 0.055) show(reels[i], Math.floor(Math.random() * SYMBOLS.length));
            reels[i].box.y = 8 + Math.sin(t * 40 + i) * 3;
          }
        }
        if (swapT > 0.055) swapT = 0;
        if (t >= stopAt[2] + 0.05) settle();
      } else if (demo) {
        demoT += dt;
        if (demoT > 1.1) { demoT = 0; spin(); }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        frame.destroy({ children: true });
      },
    };
  },
};
