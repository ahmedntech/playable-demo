import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';

// Tap to spin the prize wheel; it slows to a stop and scores a prize. Demo
// re-spins automatically whenever it comes to rest.
export const wheel: Template = {
  id: 'wheel',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('wheelColor', config.brand.primaryColor);
    const cx = W / 2, cy = H * 0.46, R = 124;
    const segs = 6;
    const palette = [p, lighten(p, 0.25), darken(p, 0.18), lighten(p, 0.45), darken(p, 0.32), lighten(p, 0.1)];

    const w = new Container();
    w.position.set(cx, cy);
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const g = new Graphics();
      g.moveTo(0, 0).arc(0, 0, R, a0, a1).fill(palette[i % palette.length]);
      w.addChild(g);
    }
    w.addChild(new Graphics().circle(0, 0, 22).fill(lighten(p, 0.5)));
    layer.addChild(w);
    // fixed pointer at the top
    layer.addChild(new Graphics().poly([cx - 14, cy - R - 6, cx + 14, cy - R - 6, cx, cy - R + 18]).fill(0xffffff));

    let av = 0; // angular velocity (rad/s)
    let spinning = false;

    function spin(power: number) {
      if (spinning) return;
      av = power;
      spinning = true;
    }

    const onTap = () => spin(9 + Math.random() * 4);
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.on('pointertap', onTap);
    }

    let restT = 0;
    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      if (spinning) {
        w.rotation += av * dt;
        av *= 0.97;
        if (av < 0.25) {
          spinning = false;
          av = 0;
          ctx.addScore();
          ringFlash(app, layer, cx, cy - R + 4, lighten(p, 0.4), 24);
        }
      } else if (demo) {
        restT += dt;
        if (restT > 0.8) { restT = 0; spin(9 + Math.random() * 4); }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        w.destroy({ children: true });
      },
    };
  },
};
