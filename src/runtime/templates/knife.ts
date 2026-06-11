import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

// Throw knives into a spinning log. Land a knife on top of an existing one and
// the round ends. Demo throws whenever the top is clear.
export const knife: Template = {
  id: 'knife',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = config.brand.primaryColor;
    const logCol = ctx.color('logColor', darken(p, 0.25));
    const knifeTex = ctx.tex('knife');
    const cx = W / 2, cy = H * 0.4, R = 96;

    const log = new Container();
    log.position.set(cx, cy);
    log.addChild(new Graphics().circle(0, 0, R).fill(logCol));
    log.addChild(new Graphics().circle(0, 0, R * 0.6).stroke({ width: 6, color: darken(logCol, 0.25), alpha: 0.6 }));
    log.addChild(new Graphics().circle(0, 0, 14).fill(lighten(logCol, 0.35)));
    layer.addChild(log);

    const stuck: number[] = []; // angles (radians, in log space) of stuck knives
    const spin = 1.4 + config.gameplay.difficulty * 0.25;
    let flying: { g: Container; y: number } | null = null;

    function makeKnife(): Container {
      const c = new Container();
      if (knifeTex) { c.addChild(fitSprite(knifeTex, 22, 70)); return c; }
      const g = new Graphics();
      g.roundRect(-4, 0, 8, 46, 3).fill(0xdfe6ee);
      g.poly([-4, 0, 4, 0, 0, -12]).fill(0xeef3f8);
      g.roundRect(-5, 40, 10, 16, 3).fill(darken(p, 0.1));
      c.addChild(g);
      return c;
    }

    function stickKnife(g: Container) {
      // angle on the log where it sticks = the bottom (pointing up into the log)
      const ang = (Math.PI / 2 - log.rotation) % (Math.PI * 2);
      // collision: too close to an existing knife angle?
      const hit = stuck.some((a) => Math.abs(angDiff(a, ang)) < 0.32);
      if (hit) {
        ringFlash(app, layer, cx, cy + R, 0xff5a5a, 26);
        g.destroy();
        if (demo) { reset(); } else ctx.finish();
        return;
      }
      stuck.push(ang);
      // attach the knife in log space so it spins with the log
      const holder = new Container();
      holder.rotation = ang - Math.PI / 2;
      const kk = makeKnife();
      kk.position.set(0, -R - 2);
      holder.addChild(kk);
      log.addChild(holder);
      g.destroy();
      ctx.addScore();
      ringFlash(app, layer, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, lighten(p, 0.4), 16);
    }

    function reset() {
      stuck.length = 0;
      log.children.slice(3).forEach((c) => c.destroy());
      if (flying) { flying.g.destroy(); flying = null; }
    }

    function throwKnife() {
      if (flying) return;
      const g = makeKnife();
      g.position.set(cx, H - 60);
      layer.addChild(g);
      flying = { g, y: H - 60 };
    }
    const onTap = () => throwKnife();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.on('pointertap', onTap);
    }

    let demoT = 0;
    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      log.rotation += spin * dt;
      if (flying) {
        flying.y -= 900 * dt;
        flying.g.y = flying.y;
        if (flying.y <= cy + R) { const g = flying.g; flying = null; stickKnife(g); }
      } else if (demo) {
        demoT += dt;
        const topAng = (Math.PI / 2 - log.rotation) % (Math.PI * 2);
        const clear = stuck.every((a) => Math.abs(angDiff(a, topAng)) > 0.5);
        if (demoT > 0.25 && clear) { demoT = 0; throwKnife(); }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        if (flying) flying.g.destroy();
        log.destroy({ children: true });
      },
    };
  },
};

function angDiff(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
