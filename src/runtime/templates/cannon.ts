import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

interface Target { g: Container; x: number; y: number; vx: number }
interface Shot { g: Graphics; x: number; y: number; vx: number; vy: number }

// A cannon at the bottom sweeps its aim back and forth. Tap to fire along the
// current angle and pop the drifting targets. Demo fires when aimed at a target.
export const cannon: Template = {
  id: 'cannon',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = config.brand.primaryColor;
    const targetCol = ctx.color('targetColor', p);
    const targetTex = ctx.tex('target');
    const ox = W / 2, oy = H - 70;

    const barrel = new Container();
    barrel.position.set(ox, oy);
    barrel.addChild(new Graphics().roundRect(-9, -56, 18, 56, 6).fill(darken(p, 0.15)));
    barrel.addChild(new Graphics().roundRect(-9, -56, 18, 12, 6).fill(lighten(p, 0.3)));
    layer.addChild(barrel);
    layer.addChild(new Graphics().circle(ox, oy, 26).fill(p));

    let aim = -Math.PI / 2; // straight up
    let aimDir = 1;
    const aimSpeed = 1.4;

    const targets: Target[] = [];
    const shots: Shot[] = [];
    let spawnT = 0;

    function spawnTarget() {
      const g = new Container();
      if (targetTex) {
        g.addChild(fitSprite(targetTex, 44, 44));
      } else {
        g.addChild(new Graphics().circle(0, 0, 20).fill(lighten(targetCol, 0.35)));
        g.addChild(new Graphics().circle(0, 0, 10).fill(targetCol));
      }
      const y = 80 + Math.random() * (H * 0.4);
      const fromLeft = Math.random() < 0.5;
      g.position.set(fromLeft ? -20 : W + 20, y);
      layer.addChild(g);
      targets.push({ g, x: g.x, y, vx: (fromLeft ? 1 : -1) * (50 + config.gameplay.difficulty * 18) });
    }

    function fire() {
      const g = new Graphics().circle(0, 0, 9).fill(lighten(p, 0.2));
      g.position.set(ox, oy - 40);
      layer.addChild(g);
      const sp = 520;
      shots.push({ g, x: ox, y: oy - 40, vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp });
    }
    const onTap = () => fire();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.on('pointertap', onTap);
    }

    let demoT = 0;
    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      aim += aimDir * aimSpeed * dt;
      if (aim < -Math.PI * 0.85) { aim = -Math.PI * 0.85; aimDir = 1; }
      if (aim > -Math.PI * 0.15) { aim = -Math.PI * 0.15; aimDir = -1; }
      barrel.rotation = aim + Math.PI / 2;

      spawnT += dt;
      if (spawnT > 1.0) { spawnT = 0; spawnTarget(); }

      if (demo) {
        demoT += dt;
        // fire if a target lies roughly along the aim ray
        const aligned = targets.some((tg) => {
          const ang = Math.atan2(tg.y - oy, tg.x - ox);
          return Math.abs(ang - aim) < 0.12;
        });
        if (demoT > 0.2 && aligned) { demoT = 0; fire(); }
      }

      for (const tg of [...targets]) {
        tg.x += tg.vx * dt;
        tg.g.x = tg.x;
        if (tg.x < -40 || tg.x > W + 40) remove(targets, tg, tg.g);
      }
      for (const s of [...shots]) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.g.position.set(s.x, s.y);
        if (s.x < -20 || s.x > W + 20 || s.y < -20) { remove(shots, s, s.g); continue; }
        for (const tg of [...targets]) {
          const dx = s.x - tg.x, dy = s.y - tg.y;
          if (dx * dx + dy * dy < 28 * 28) {
            ringFlash(app, layer, tg.x, tg.y, lighten(p, 0.5), 22);
            ctx.addScore();
            remove(targets, tg, tg.g);
            remove(shots, s, s.g);
            break;
          }
        }
      }
    };
    function remove<T>(arr: T[], item: T, g: Container) { const i = arr.indexOf(item); if (i >= 0) { arr.splice(i, 1); g.destroy(); } }
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        targets.forEach((t) => t.g.destroy());
        shots.forEach((s) => s.g.destroy());
        targets.length = 0; shots.length = 0;
        barrel.destroy({ children: true });
      },
    };
  },
};
