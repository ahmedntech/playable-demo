import { Container, Graphics, Ticker, Rectangle } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

interface Obstacle { c: Container; scored: boolean }

// An endless runner: tap to jump over obstacles sliding in from the right.
// Clearing one scores; hitting one ends the round. Demo jumps automatically.
export const jump: Template = {
  id: 'jump',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('heroColor', config.brand.primaryColor);
    const heroTex = ctx.tex('hero');
    const groundY = H * 0.72;

    layer.addChild(new Graphics().rect(0, groundY + 24, W, H - groundY - 24).fill(darken(config.brand.bgColor, 0.3)));
    layer.addChild(new Graphics().rect(0, groundY + 24, W, 3).fill({ color: lighten(p, 0.3), alpha: 0.6 }));

    const hero = new Container();
    if (heroTex) {
      const sp = fitSprite(heroTex, 46, 46);
      sp.y = -23; // sit on the ground line (hero origin is at its feet)
      hero.addChild(sp);
    } else {
      hero.addChild(new Graphics().roundRect(-18, -36, 36, 36, 8).fill(p));
      hero.addChild(new Graphics().circle(6, -24, 5).fill(0xffffff));
    }
    const heroX = W * 0.26;
    let hy = 0, vy = 0; // hy = height above ground
    hero.position.set(heroX, groundY);
    layer.addChild(hero);

    const obs: Obstacle[] = [];
    let spawnT = 0;
    const speed = 240 + config.gameplay.difficulty * 45;

    function spawn() {
      const h = 30 + Math.random() * 26;
      const c = new Container();
      c.addChild(new Graphics().roundRect(-16, -h, 32, h, 6).fill(darken(p, 0.3)));
      c.addChild(new Graphics().roundRect(-16, -h, 32, h, 6).stroke({ width: 2, color: lighten(p, 0.2), alpha: 0.7 }));
      c.position.set(W + 30, groundY + 24);
      layer.addChild(c);
      obs.push({ c, scored: false });
    }

    function doJump() { if (hy <= 0.5) vy = -560; }
    const onTap = () => doJump();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointertap', onTap);
    }

    function end() { if (demo) reset(); else ctx.finish(); }
    function reset() { obs.forEach((o) => o.c.destroy()); obs.length = 0; hy = 0; vy = 0; spawnT = 0; }

    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      vy += 1700 * dt;
      hy -= vy * dt;
      if (hy < 0) { hy = 0; vy = 0; }
      hero.y = groundY - hy;

      spawnT += dt;
      if (spawnT > 1.1 + Math.random() * 0.4) { spawnT = 0; spawn(); }

      if (demo) {
        const near = obs.find((o) => o.c.x - heroX > 0 && o.c.x - heroX < 120);
        if (near && hy <= 0.5) doJump();
      }

      for (const o of [...obs]) {
        o.c.x -= speed * dt;
        if (!o.scored && o.c.x < heroX - 30) { o.scored = true; ctx.addScore(); ringFlash(app, layer, heroX, groundY - hy - 18, lighten(p, 0.4), 16); }
        if (o.c.x < -40) { o.c.destroy(); obs.splice(obs.indexOf(o), 1); continue; }
        // collision: hero box vs obstacle when overlapping in x and hero low enough
        if (Math.abs(o.c.x - heroX) < 28 && hy < 30) { end(); return; }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        obs.forEach((o) => o.c.destroy());
        obs.length = 0;
        hero.destroy({ children: true });
      },
    };
  },
};
