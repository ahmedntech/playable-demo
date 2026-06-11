import { Container, Graphics, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';

// Tiles fall down 4 columns; tap each tile before it slides off the bottom.
export const piano: Template = {
  id: 'piano',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = config.brand.primaryColor;
    const cols = 4;
    const cw = W / cols;
    const tw = cw - 10;
    const th = 96;
    const tile = darken(config.brand.bgColor, 0.4);

    for (let i = 1; i < cols; i++) {
      layer.addChild(new Graphics().rect(i * cw - 1, 0, 2, H).fill({ color: 0xffffff, alpha: 0.06 }));
    }

    const tiles: Container[] = [];
    let spawnT = 0;
    const interval = 0.9 - config.gameplay.difficulty * 0.1;
    const speed = 160 + config.gameplay.difficulty * 36;

    function spawn() {
      const col = Math.floor(Math.random() * cols);
      const t = new Container();
      t.addChild(new Graphics().roundRect(0, 0, tw, th, 8).fill(tile));
      t.addChild(new Graphics().roundRect(0, 0, tw, th, 8).stroke({ width: 2, color: lighten(p, 0.2), alpha: 0.9 }));
      t.addChild(new Graphics().roundRect(8, 10, tw - 16, 8, 4).fill({ color: lighten(p, 0.4), alpha: 0.35 }));
      t.x = col * cw + 5;
      t.y = -th;
      (t as any)._demo = 0.5 + Math.random() * 0.6;
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointertap', () => pop(t, true));
      layer.addChild(t);
      tiles.push(t);
    }

    function pop(t: Container, scored: boolean) {
      const i = tiles.indexOf(t);
      if (i < 0) return;
      tiles.splice(i, 1);
      ringFlash(app, layer, t.x + tw / 2, t.y + th / 2, 0xffffff, 28);
      t.destroy();
      if (scored) ctx.addScore();
    }

    const tick = (tk: Ticker) => {
      const dt = tk.deltaMS / 1000;
      spawnT += dt;
      if (spawnT >= interval) { spawnT = 0; spawn(); }
      for (const t of [...tiles]) {
        t.y += speed * dt;
        if (demo) {
          (t as any)._demo -= dt;
          if ((t as any)._demo <= 0) { pop(t, false); continue; }
        }
        if (t.y > H) pop(t, false);
      }
    };
    app.ticker.add(tick);

    return { destroy() { app.ticker.remove(tick); tiles.forEach((t) => t.destroy()); tiles.length = 0; } };
  },
};
