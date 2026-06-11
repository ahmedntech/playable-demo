import { Container, Graphics, Ticker, Rectangle } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

interface Entity { c: Container; lane: number; coin: boolean }

// Hero runs in 3 lanes. Tap left/right to switch lanes, grab coins, avoid
// blocks. Hitting a block ends the round. Demo auto-steers toward coins.
export const lane: Template = {
  id: 'lane',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('heroColor', config.brand.primaryColor);
    const heroTex = ctx.tex('hero');
    const coinTex = ctx.tex('coin');
    const lanes = [W * 0.25, W * 0.5, W * 0.75];
    const heroY = H - 110;

    for (let i = 0; i < lanes.length; i++) {
      layer.addChild(new Graphics().rect(lanes[i] - 38, 0, 76, H).fill({ color: 0xffffff, alpha: 0.03 }));
    }

    const hero = new Container();
    if (heroTex) {
      hero.addChild(fitSprite(heroTex, 52, 52));
    } else {
      hero.addChild(new Graphics().roundRect(-22, -22, 44, 44, 10).fill(p));
      hero.addChild(new Graphics().circle(-8, -6, 5).fill(0xffffff));
      hero.addChild(new Graphics().circle(8, -6, 5).fill(0xffffff));
    }
    let heroLane = 1;
    hero.position.set(lanes[heroLane], heroY);
    layer.addChild(hero);

    const ents: Entity[] = [];
    let spawnT = 0;
    const speed = 230 + config.gameplay.difficulty * 50;
    const interval = 0.85 - config.gameplay.difficulty * 0.08;

    function spawn() {
      const laneIdx = Math.floor(Math.random() * 3);
      const coin = Math.random() < 0.6;
      const c = new Container();
      if (coin) {
        if (coinTex) {
          c.addChild(fitSprite(coinTex, 36, 36));
        } else {
          c.addChild(new Graphics().circle(0, 0, 16).fill(0xffd54a));
          c.addChild(new Graphics().circle(-5, -5, 6).fill({ color: 0xffffff, alpha: 0.5 }));
        }
      } else {
        c.addChild(new Graphics().roundRect(-24, -24, 48, 48, 8).fill(darken(p, 0.35)));
        c.addChild(new Graphics().roundRect(-24, -24, 48, 48, 8).stroke({ width: 3, color: lighten(p, 0.2) }));
      }
      c.position.set(lanes[laneIdx], -30);
      layer.addChild(c);
      ents.push({ c, lane: laneIdx, coin });
    }

    function move(dir: number) {
      heroLane = Math.max(0, Math.min(2, heroLane + dir));
    }
    const onTap = (e: { global: { x: number } }) => move(e.global.x < W / 2 ? -1 : 1);
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointertap', onTap as any);
    }

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      spawnT += dt;
      if (spawnT >= interval) { spawnT = 0; spawn(); }

      if (demo) {
        // steer toward the nearest coin above the hero, away from blocks
        const upcoming = ents.filter((e) => e.c.y > heroY - 220 && e.c.y < heroY - 30);
        const coin = upcoming.find((e) => e.coin);
        const block = upcoming.find((e) => !e.coin && e.lane === heroLane);
        if (coin) heroLane = coin.lane;
        else if (block) heroLane = block.lane === 0 ? 1 : block.lane === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2);
      }
      hero.x += (lanes[heroLane] - hero.x) * Math.min(1, dt * 14);

      for (const e of [...ents]) {
        e.c.y += speed * dt;
        if (e.coin) e.c.rotation += dt * 3;
        if (Math.abs(e.c.y - heroY) < 30 && e.lane === heroLane) {
          if (e.coin) { ctx.addScore(); ringFlash(app, layer, e.c.x, e.c.y, 0xffd54a, 20); remove(e); }
          else if (!demo) { remove(e); ctx.finish(); return; }
          else remove(e);
        } else if (e.c.y > H + 30) remove(e);
      }
    };
    function remove(e: Entity) { const i = ents.indexOf(e); if (i >= 0) { ents.splice(i, 1); e.c.destroy(); } }
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap as any);
        ents.forEach((e) => e.c.destroy());
        ents.length = 0;
        hero.destroy({ children: true });
      },
    };
  },
};
