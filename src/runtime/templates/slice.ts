import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';

interface Fruit { c: Container; x: number; y: number; vx: number; vy: number; r: number }

// Fruit launches from the bottom in arcs. Swipe (drag) across one to slice it
// into two halves. Demo auto-slices each fruit near the top of its arc.
export const slice: Template = {
  id: 'slice',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = config.brand.primaryColor;
    const GRAV = 900;
    const fruits: Fruit[] = [];
    let spawnT = 0;
    const interval = 1.2 - config.gameplay.difficulty * 0.16;

    function makeFruit(r: number) {
      const c = new Container();
      c.addChild(new Graphics().circle(0, 0, r).fill(p));
      c.addChild(new Graphics().circle(-r * 0.3, -r * 0.3, r * 0.45).fill({ color: lighten(p, 0.5), alpha: 0.5 }));
      c.addChild(new Graphics().circle(0, 0, r).stroke({ width: 2, color: 0xffffff, alpha: 0.5 }));
      return c;
    }

    function spawn() {
      const r = 26;
      const x = 50 + Math.random() * (W - 100);
      const c = makeFruit(r);
      c.x = x;
      c.y = H + r;
      layer.addChild(c);
      fruits.push({ c, x, y: H + r, vx: (W / 2 - x) * 0.6 + (Math.random() - 0.5) * 80, vy: -(640 + Math.random() * 130), r });
    }

    function remove(f: Fruit) {
      const i = fruits.indexOf(f);
      if (i >= 0) fruits.splice(i, 1);
      f.c.destroy();
    }

    function halfDisc(r: number, color: string, rightSide: boolean) {
      const g = new Graphics();
      if (rightSide) g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
      else g.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5);
      g.fill(color);
      return g;
    }

    function sliceFruit(f: Fruit) {
      const { x, y, r } = f;
      remove(f);
      ctx.addScore();
      // slash flash
      const slash = new Graphics().moveTo(-34, 10).lineTo(34, -10).stroke({ width: 4, color: 0xffffff, alpha: 0.95 });
      slash.position.set(x, y);
      layer.addChild(slash);
      // two halves fly apart
      const a = halfDisc(r, darken(p, 0.1), false);
      const b = halfDisc(r, lighten(p, 0.12), true);
      a.position.set(x, y);
      b.position.set(x, y);
      layer.addChild(a, b);
      let life = 0;
      const ht = (t: Ticker) => {
        const dt = t.deltaMS / 1000;
        life += dt;
        a.x -= 130 * dt; b.x += 130 * dt;
        a.y += 260 * dt * life; b.y += 260 * dt * life;
        a.rotation -= dt * 3; b.rotation += dt * 3;
        const alpha = Math.max(0, 1 - life);
        a.alpha = b.alpha = alpha;
        slash.alpha = Math.max(0, 0.95 - life * 4);
        if (life >= 1) { a.destroy(); b.destroy(); slash.destroy(); app.ticker.remove(ht); }
      };
      app.ticker.add(ht);
    }

    // swipe input
    let down = false;
    const onDown = () => { down = true; };
    const onUp = () => { down = false; };
    const onMove = (e: FederatedPointerEvent) => {
      if (!down) return;
      const gx = e.global.x, gy = e.global.y;
      for (const f of [...fruits]) {
        const dx = gx - f.c.x, dy = gy - f.c.y;
        if (dx * dx + dy * dy < (f.r + 12) * (f.r + 12)) sliceFruit(f);
      }
    };
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointerdown', onDown);
      app.stage.on('pointerup', onUp);
      app.stage.on('pointerupoutside', onUp);
      app.stage.on('pointermove', onMove);
    }

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      spawnT += dt;
      if (spawnT >= interval) { spawnT = 0; spawn(); }
      for (const f of [...fruits]) {
        f.vy += GRAV * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.c.x = f.x;
        f.c.y = f.y;
        f.c.rotation += dt;
        if (demo && f.vy > -40 && f.vy < 40 && f.y < H * 0.55) { sliceFruit(f); continue; }
        if (f.y > H + 70) remove(f);
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) {
          app.stage.off('pointerdown', onDown);
          app.stage.off('pointerup', onUp);
          app.stage.off('pointerupoutside', onUp);
          app.stage.off('pointermove', onMove);
        }
        fruits.forEach((f) => f.c.destroy());
        fruits.length = 0;
      },
    };
  },
};
