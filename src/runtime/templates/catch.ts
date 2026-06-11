import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template } from '../template';

// A basket tracks the pointer along the bottom. Stars fall; catch one to score.
// Demo mode auto-steers the basket toward the lowest falling star.
export const catchGame: Template = {
  id: 'catch',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;

    const paddle = new Container();
    paddle.addChild(new Graphics().roundRect(-46, -15, 92, 30, 15).fill(config.brand.primaryColor));
    paddle.x = W / 2;
    paddle.y = H - 96;
    layer.addChild(paddle);

    let targetX = W / 2;
    const onMove = (e: FederatedPointerEvent) => { targetX = e.global.x; };
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointermove', onMove);
    }

    const items: Container[] = [];
    let spawnT = 0;
    const interval = 1.0 - config.gameplay.difficulty * 0.13;

    function spawn() {
      const it = new Container();
      it.addChild(new Graphics().star(0, 0, 5, 18, 9).fill(0xffd54a));
      it.addChild(new Graphics().star(0, 0, 5, 18, 9).stroke({ width: 3, color: 0xffffff, alpha: 0.7 }));
      it.x = 40 + Math.random() * (W - 80);
      it.y = -20;
      (it as any)._v = 130 + config.gameplay.difficulty * 32;
      layer.addChild(it);
      items.push(it);
    }

    function remove(it: Container) {
      const i = items.indexOf(it);
      if (i >= 0) { items.splice(i, 1); it.destroy(); }
    }

    function flash(x: number, y: number) {
      const f = new Graphics().circle(0, 0, 24).stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
      f.position.set(x, y);
      layer.addChild(f);
      let a = 1;
      const ft = (t: Ticker) => {
        a -= t.deltaMS / 240;
        f.alpha = Math.max(0, a);
        f.scale.set(1 + (1 - a));
        if (a <= 0) { f.destroy(); app.ticker.remove(ft); }
      };
      app.ticker.add(ft);
    }

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      spawnT += dt;
      if (spawnT >= interval) { spawnT = 0; spawn(); }

      if (demo && items.length) {
        const lowest = items.reduce((a, b) => (b.y > a.y ? b : a));
        targetX = lowest.x;
      }
      paddle.x += (targetX - paddle.x) * Math.min(1, dt * 10);
      paddle.x = Math.max(46, Math.min(W - 46, paddle.x));

      for (const it of [...items]) {
        it.y += (it as any)._v * dt;
        it.rotation += dt * 2;
        if (it.y >= paddle.y - 22 && Math.abs(it.x - paddle.x) < 56) {
          remove(it);
          flash(it.x, paddle.y - 22);
          ctx.addScore();
        } else if (it.y > H + 30) {
          remove(it);
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        app.stage.off('pointermove', onMove);
        items.forEach((it) => it.destroy());
        paddle.destroy();
      },
    };
  },
};
