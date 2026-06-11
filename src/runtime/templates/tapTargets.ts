import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten } from '../color';
import { fitSprite } from '../assets';

// Targets spawn at intervals and shrink. Tap one before it vanishes to score.
// Demo mode auto-pops targets so the gallery preview looks alive.
export const tapTargets: Template = {
  id: 'tap-targets',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const targets: Container[] = [];
    let spawnT = 0;
    const interval = 1.2 - config.gameplay.difficulty * 0.17;

    const primary = ctx.color('target', config.brand.primaryColor);
    const tex = ctx.tex('target');

    function spawn() {
      const r = 34;
      const c = new Container();
      c.addChild(new Graphics().ellipse(0, r * 0.7, r * 0.9, r * 0.32).fill({ color: 0x000000, alpha: 0.28 })); // shadow
      if (tex) {
        c.addChild(fitSprite(tex, r * 2.2, r * 2.2));
      } else {
        c.addChild(new Graphics().circle(0, 0, r).fill(primary)); // body
        c.addChild(new Graphics().circle(-r * 0.28, -r * 0.3, r * 0.5).fill({ color: lighten(primary, 0.5), alpha: 0.55 })); // highlight
        c.addChild(new Graphics().circle(0, 0, r).stroke({ width: 3, color: 0xffffff, alpha: 0.9 })); // ring
      }
      c.x = r + 20 + Math.random() * (W - 2 * r - 40);
      c.y = r + 90 + Math.random() * (H - 2 * r - 180);
      (c as any)._life = 2.2 - config.gameplay.difficulty * 0.24;
      (c as any)._demo = 0.4 + Math.random() * 0.7;
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => pop(c, true));
      layer.addChild(c);
      ctx.mark(c, 'target');
      targets.push(c);
    }

    function pop(c: Container, scored: boolean) {
      const i = targets.indexOf(c);
      if (i < 0) return;
      targets.splice(i, 1);
      burst(c.x, c.y);
      c.destroy();
      if (scored) ctx.addScore();
    }

    function burst(x: number, y: number) {
      const f = new Graphics().circle(0, 0, 38).stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
      f.position.set(x, y);
      layer.addChild(f);
      let a = 1;
      const ft = (t: Ticker) => {
        a -= t.deltaMS / 280;
        f.alpha = Math.max(0, a);
        f.scale.set(1 + (1 - a) * 0.7);
        if (a <= 0) { f.destroy(); app.ticker.remove(ft); }
      };
      app.ticker.add(ft);
    }

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      spawnT += dt;
      if (spawnT >= interval) { spawnT = 0; spawn(); }
      for (const c of [...targets]) {
        (c as any)._life -= dt;
        c.scale.set(Math.max(0.2, Math.min(1, (c as any)._life)));
        if (demo) {
          (c as any)._demo -= dt;
          if ((c as any)._demo <= 0) { pop(c, false); continue; }
        }
        if ((c as any)._life <= 0) pop(c, false);
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        targets.forEach((c) => c.destroy());
        targets.length = 0;
      },
    };
  },
};
