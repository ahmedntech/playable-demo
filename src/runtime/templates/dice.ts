import { Container, Graphics, Text, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';

// Tap to roll two dice. Seven, eleven, or doubles win. Dice tumble with spin
// and bounce before settling. Demo auto-rolls.
export const dice: Template = {
  id: 'dice',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const dcol = ctx.color('dice', '#f4f0e6');
    const cx = W / 2, cy = H * 0.42;

    // felt table hint
    layer.addChild(new Graphics().roundRect(cx - 150, cy - 110, 300, 220, 24).fill({ color: 0x000000, alpha: 0.18 }));
    layer.addChild(new Graphics().roundRect(cx - 150, cy - 110, 300, 220, 24).stroke({ width: 3, color: lighten(config.brand.bgColor, 0.25), alpha: 0.6 }));

    const banner = new Text({ text: 'ROLL 7 · 11 · DOUBLES', style: { fontFamily: 'Arial Black, Arial', fontSize: 15, fill: 0xffffff, fontWeight: 'bold' } });
    banner.anchor.set(0.5);
    banner.position.set(cx, cy - 140);
    banner.alpha = 0.85;
    layer.addChild(banner);

    const SIZE = 84;
    function drawFace(g: Graphics, v: number) {
      g.clear();
      g.roundRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 16).fill(dcol);
      g.roundRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 16).stroke({ width: 3, color: darken(dcol, 0.3), alpha: 0.5 });
      const pip = darken(dcol, 0.75);
      const o = SIZE * 0.23, r = 6.5;
      const spots: Record<number, [number, number][]> = {
        1: [[0, 0]],
        2: [[-o, -o], [o, o]],
        3: [[-o, -o], [0, 0], [o, o]],
        4: [[-o, -o], [o, -o], [-o, o], [o, o]],
        5: [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]],
        6: [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]],
      };
      for (const [px, py] of spots[v]) g.circle(px, py, r).fill(pip);
    }

    interface Die { c: Container; g: Graphics; value: number; home: { x: number; y: number } }
    const dies: Die[] = [];
    for (let i = 0; i < 2; i++) {
      const c = new Container();
      const g = new Graphics();
      drawFace(g, i + 3);
      c.addChild(g);
      c.position.set(cx + (i === 0 ? -55 : 55), cy);
      layer.addChild(c);
      ctx.mark(c, 'dice');
      dies.push({ c, g, value: i + 3, home: { x: c.x, y: c.y } });
    }

    let rolling = false;
    let t = 0;
    let swapT = 0;
    let demoT = 0;
    let final: number[] = [3, 4];

    function roll() {
      if (rolling) return;
      rolling = true;
      t = 0;
      // generous rig: 55% winning combo
      if (Math.random() < 0.55) {
        if (Math.random() < 0.5) { const a = 1 + Math.floor(Math.random() * 6); final = [a, a]; }
        else { const a = 1 + Math.floor(Math.random() * 6); final = [a, Math.min(6, Math.max(1, 7 - a))]; }
      } else {
        let a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
        if (a === b || a + b === 7 || a + b === 11) b = b === 6 ? 1 : b + 1;
        final = [a, b];
      }
    }

    const onTap = () => roll();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.on('pointertap', onTap);
    }

    function settle() {
      rolling = false;
      for (let i = 0; i < 2; i++) {
        dies[i].value = final[i];
        drawFace(dies[i].g, final[i]);
        dies[i].c.rotation = 0;
        dies[i].c.position.set(dies[i].home.x, dies[i].home.y);
      }
      const [a, b] = final;
      if (a === b || a + b === 7 || a + b === 11) {
        ctx.addScore(a === b ? 2 : 1);
        dies.forEach((d) => ringFlash(app, layer, d.c.x, d.c.y, 0xffd54a, 52));
      }
    }

    const tick = (tk: Ticker) => {
      const dt = tk.deltaMS / 1000;
      if (rolling) {
        t += dt;
        swapT += dt;
        const ease = Math.max(0, 1 - t / 0.85); // tumble fades out
        for (let i = 0; i < 2; i++) {
          const d = dies[i];
          d.c.rotation = Math.sin(t * 22 + i * 2) * 0.5 * ease;
          d.c.x = d.home.x + Math.sin(t * 17 + i) * 14 * ease;
          d.c.y = d.home.y + Math.abs(Math.sin(t * 13 + i * 3)) * -22 * ease;
          if (swapT > 0.07 && ease > 0.15) drawFace(d.g, 1 + Math.floor(Math.random() * 6));
        }
        if (swapT > 0.07) swapT = 0;
        if (t >= 0.85) settle();
      } else if (demo) {
        demoT += dt;
        if (demoT > 1.3) { demoT = 0; roll(); }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        dies.forEach((d) => d.c.destroy({ children: true }));
        banner.destroy();
      },
    };
  },
};
