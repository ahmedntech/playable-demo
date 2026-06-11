import { Container, Graphics, Rectangle, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten } from '../color';

// A block slides left↔right above the tower. Tap to drop it; the part that
// overhangs the block below is trimmed, so the tower narrows. Miss completely
// and the round ends. Demo auto-drops when near-aligned and loops.
export const stack: Template = {
  id: 'stack',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('blockColor', config.brand.primaryColor);
    const BH = 32; // block height
    const dropY = H * 0.30; // where the tower's top block rests

    const tower = new Container();
    layer.addChild(tower);

    let placed: { left: number; width: number }[] = [];
    let active: Graphics | null = null;
    let dir = 1;
    let speed = 130 + config.gameplay.difficulty * 28;
    let activeLeft = 0;
    let activeWidth = 0;

    function makeBlock(left: number, width: number, level: number) {
      const g = new Graphics();
      const shade = level % 2 === 0 ? p : lighten(p, 0.16);
      g.roundRect(0, 0, width, BH, 6).fill(shade);
      g.roundRect(0, 0, width, 7, 6).fill({ color: lighten(p, 0.5), alpha: 0.3 }); // top shine
      g.x = left;
      return g;
    }

    function relayout() {
      const n = placed.length;
      for (let i = 0; i < n; i++) {
        (tower.children[i] as Graphics).y = dropY + (n - 1 - i) * BH;
      }
    }

    function spawnActive() {
      activeWidth = placed[placed.length - 1].width;
      activeLeft = 20;
      dir = 1;
      active = makeBlock(activeLeft, activeWidth, placed.length);
      active.y = dropY - BH - 6;
      layer.addChild(active);
    }

    function init() {
      const baseW = 130;
      const baseLeft = (W - baseW) / 2;
      placed.push({ left: baseLeft, width: baseW });
      tower.addChild(makeBlock(baseLeft, baseW, 0));
      relayout();
      spawnActive();
    }

    function reset() {
      placed = [];
      tower.removeChildren();
      if (active) { active.destroy(); active = null; }
      speed = 130 + config.gameplay.difficulty * 28;
      init();
    }

    function drop() {
      if (!active) return;
      const below = placed[placed.length - 1];
      const left = Math.max(activeLeft, below.left);
      const right = Math.min(activeLeft + activeWidth, below.left + below.width);
      const overlap = right - left;
      active.destroy();
      active = null;

      if (overlap <= 4) {
        if (demo) { reset(); return; }
        ctx.finish();
        return;
      }
      placed.push({ left, width: overlap });
      tower.addChild(makeBlock(left, overlap, placed.length - 1));
      relayout();
      ctx.addScore();
      speed += 6;
      if (demo && placed.length > 7) { reset(); return; }
      spawnActive();
    }

    const onTap = () => drop();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointertap', onTap);
    }

    init();

    const tick = (t: Ticker) => {
      if (!active) return;
      const dt = t.deltaMS / 1000;
      activeLeft += dir * speed * dt;
      const minLeft = 20;
      const maxLeft = W - 20 - activeWidth;
      if (activeLeft <= minLeft) { activeLeft = minLeft; dir = 1; }
      if (activeLeft >= maxLeft) { activeLeft = maxLeft; dir = -1; }
      active.x = activeLeft;
      if (demo) {
        const below = placed[placed.length - 1];
        if (Math.abs(activeLeft + activeWidth / 2 - (below.left + below.width / 2)) < 6) drop();
      }
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        if (active) active.destroy();
        tower.destroy({ children: true });
      },
    };
  },
};
