import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { fitSprite } from '../assets';

// A basket tracks the pointer along the bottom. Stars fall; catch one to score.
// Demo mode auto-steers the basket toward the lowest falling star.
export const catchGame: Template = {
  id: 'catch',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;

    const p = ctx.color('basket', config.brand.primaryColor);
    const basketTex = ctx.tex('basket');
    const starTex = ctx.tex('star');
    const paddle = new Container();
    if (basketTex) {
      paddle.addChild(fitSprite(basketTex, 100, 56));
    } else {
      paddle.addChild(new Graphics().roundRect(-48, -16, 96, 34, 17).fill(darken(p, 0.22))); // base
      paddle.addChild(new Graphics().roundRect(-46, -16, 92, 24, 14).fill(p)); // top
      paddle.addChild(new Graphics().roundRect(-40, -13, 80, 6, 3).fill({ color: lighten(p, 0.5), alpha: 0.5 })); // shine
    }
    paddle.x = W / 2;
    paddle.y = H - 96;
    layer.addChild(paddle);
    ctx.mark(paddle, 'basket');

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
      if (starTex) {
        it.addChild(fitSprite(starTex, 44, 44));
      } else {
        it.addChild(new Graphics().star(0, 0, 5, 26, 13).fill({ color: 0xffe27a, alpha: 0.22 })); // glow
        it.addChild(new Graphics().star(0, 0, 5, 18, 9).fill(0xffd54a)); // body
        it.addChild(new Graphics().star(0, 0, 5, 18, 9).stroke({ width: 2, color: 0xffffff, alpha: 0.65 }));
        it.addChild(new Graphics().star(0, -2, 5, 8, 4).fill({ color: 0xffffff, alpha: 0.55 })); // sparkle
      }
      it.x = 40 + Math.random() * (W - 80);
      it.y = -20;
      (it as any)._v = 130 + config.gameplay.difficulty * 32;
      layer.addChild(it);
      ctx.mark(it, 'star');
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
          const hitX = it.x; // capture before destroy
          remove(it);
          flash(hitX, paddle.y - 22);
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
