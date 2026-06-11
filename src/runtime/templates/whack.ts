import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { fitSprite } from '../assets';

interface Hole { x: number; y: number; mole: Container | null; t: number }

// A 3x3 grid of holes. Critters pop up and retract; tap one while it's up to
// score. Demo mode auto-bonks them with a flash.
export const whack: Template = {
  id: 'whack',
  start(ctx) {
    const { app, layer, config, W, demo } = ctx;
    const cols = 3, rows = 3, top = 170, gapY = 130, marginX = 56;
    const gapX = (W - 2 * marginX) / (cols - 1);
    const bg = config.brand.bgColor;
    const holes: Hole[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginX + c * gapX;
        const y = top + r * gapY;
        // dirt mound rim (lighter) + recessed hole (darker than bg) for depth
        layer.addChild(new Graphics().ellipse(x, y + 30, 48, 20).fill(lighten(bg, 0.12)));
        layer.addChild(new Graphics().ellipse(x, y + 28, 40, 15).fill(darken(bg, 0.55)));
        holes.push({ x, y, mole: null, t: 0 });
      }
    }

    let spawnT = 0;
    const interval = 1.0 - config.gameplay.difficulty * 0.13;

    const p = ctx.color('mole', config.brand.primaryColor);
    const moleTex = ctx.tex('mole');

    function popUp(h: Hole) {
      const m = new Container();
      if (moleTex) {
        m.addChild(fitSprite(moleTex, 72, 72));
      } else {
        m.addChild(new Graphics().circle(-19, -20, 9).fill(darken(p, 0.15))); // ears
        m.addChild(new Graphics().circle(19, -20, 9).fill(darken(p, 0.15)));
        m.addChild(new Graphics().circle(0, 2, 32).fill(darken(p, 0.18))); // lower body
        m.addChild(new Graphics().circle(0, -2, 30).fill(p)); // face
        m.addChild(new Graphics().circle(-9, -10, 12).fill({ color: lighten(p, 0.45), alpha: 0.45 })); // highlight
        m.addChild(new Graphics().circle(-10, -4, 6).fill(0xffffff)); // eyes
        m.addChild(new Graphics().circle(10, -4, 6).fill(0xffffff));
        m.addChild(new Graphics().circle(-9, -3, 3).fill(0x14202a)); // pupils
        m.addChild(new Graphics().circle(11, -3, 3).fill(0x14202a));
        m.addChild(new Graphics().circle(0, 6, 4).fill(0x14202a)); // nose
      }
      m.x = h.x;
      m.y = h.y;
      m.eventMode = 'static';
      m.cursor = 'pointer';
      m.on('pointertap', () => { if (h.mole === m) hit(h, true); });
      layer.addChild(m);
      ctx.mark(m, 'mole');
      h.mole = m;
      h.t = demo ? 0.4 + Math.random() * 0.5 : 1.5 - config.gameplay.difficulty * 0.18;
    }

    function hit(h: Hole, scored: boolean) {
      if (!h.mole) return;
      const m = h.mole;
      h.mole = null;
      flash(m.x, m.y);
      m.destroy();
      if (scored) ctx.addScore();
    }

    function flash(x: number, y: number) {
      const f = new Graphics().circle(0, 0, 36).stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
      f.position.set(x, y);
      layer.addChild(f);
      let a = 1;
      const ft = (t: Ticker) => {
        a -= t.deltaMS / 250;
        f.alpha = Math.max(0, a);
        f.scale.set(1 + (1 - a));
        if (a <= 0) { f.destroy(); app.ticker.remove(ft); }
      };
      app.ticker.add(ft);
    }

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      spawnT += dt;
      if (spawnT >= interval) {
        spawnT = 0;
        const empty = holes.filter((h) => !h.mole);
        if (empty.length) popUp(empty[Math.floor(Math.random() * empty.length)]);
      }
      for (const h of holes) {
        if (h.mole) {
          h.t -= dt;
          if (h.t <= 0) hit(h, false); // retract (demo: shows a flash, no score)
        }
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        holes.forEach((h) => { if (h.mole) { h.mole.destroy(); h.mole = null; } });
      },
    };
  },
};
