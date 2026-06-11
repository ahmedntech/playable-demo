import { Graphics, Ticker, Rectangle } from 'pixi.js';
import type { Template } from '../template';
import { lighten } from '../color';
import { ringFlash } from '../fx';

// Tap to drop a ball; it bounces through a peg field into the slots below.
// Each ball that lands scores. Demo auto-drops at random positions.
export const drop: Template = {
  id: 'drop',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = config.brand.primaryColor;
    const pegTop = H * 0.22, pegRows = 6, pegGap = 46;

    // decorative pegs + nudge rows
    const pegYs: number[] = [];
    for (let r = 0; r < pegRows; r++) {
      const y = pegTop + r * pegGap;
      pegYs.push(y);
      const offset = r % 2 ? pegGap / 2 : 0;
      for (let x = offset + 30; x < W - 20; x += pegGap) {
        layer.addChild(new Graphics().circle(x, y, 5).fill({ color: lighten(p, 0.3), alpha: 0.8 }));
      }
    }
    // slot dividers near the bottom
    const slotY = pegTop + pegRows * pegGap + 10;
    for (let x = 30; x <= W - 30; x += 60) {
      layer.addChild(new Graphics().rect(x - 1, slotY, 2, 70).fill({ color: 0xffffff, alpha: 0.08 }));
    }

    interface Ball { g: Graphics; x: number; y: number; vx: number; vy: number; row: number }
    const balls: Ball[] = [];
    let demoT = 0;

    function dropAt(x: number) {
      const g = new Graphics();
      g.circle(0, 0, 12).fill(p);
      g.circle(-4, -4, 4).fill({ color: 0xffffff, alpha: 0.5 });
      g.position.set(x, pegTop - 40);
      layer.addChild(g);
      balls.push({ g, x, y: pegTop - 40, vx: 0, vy: 0, row: 0 });
    }

    const onTap = (e: { global: { x: number } }) => dropAt(Math.max(30, Math.min(W - 30, e.global.x)));
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointertap', onTap as any);
    }

    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      if (demo) { demoT += dt; if (demoT > 0.7) { demoT = 0; dropAt(30 + Math.random() * (W - 60)); } }
      for (const b of [...balls]) {
        b.vy += 700 * dt;
        b.y += b.vy * dt;
        b.x += b.vx * dt;
        b.vx *= 0.96;
        // nudge when crossing a peg row
        if (b.row < pegYs.length && b.y >= pegYs[b.row]) {
          b.row++;
          b.vx += (Math.random() - 0.5) * 240;
        }
        b.x = Math.max(20, Math.min(W - 20, b.x));
        b.g.position.set(b.x, b.y);
        if (b.y >= slotY + 50) {
          ringFlash(app, layer, b.x, slotY + 50, lighten(p, 0.4), 18);
          ctx.addScore();
          b.g.destroy();
          balls.splice(balls.indexOf(b), 1);
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap as any);
        balls.forEach((b) => b.g.destroy());
        balls.length = 0;
      },
    };
  },
};
