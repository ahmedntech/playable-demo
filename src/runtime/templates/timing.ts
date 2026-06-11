import { Graphics, Ticker, Rectangle } from 'pixi.js';
import type { Template } from '../template';
import { darken, lighten } from '../color';
import { ringFlash } from '../fx';

// A marker sweeps across a bar; tap while it's inside the target zone. Each hit
// shrinks the zone and moves it. Demo taps when the marker is inside the zone.
export const timing: Template = {
  id: 'timing',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('zone', config.brand.primaryColor);
    const barX = 40, barW = W - 80, barY = H * 0.5, barH = 28;

    layer.addChild(new Graphics().roundRect(barX, barY, barW, barH, 14).fill(darken(config.brand.bgColor, 0.4)));
    const zone = new Graphics();
    const marker = new Graphics();
    layer.addChild(zone, marker);
    ctx.mark(zone, 'zone');

    let zoneW = 120;
    let zoneX = barX;
    let mx = barX;
    let dir = 1;
    const speed = 250 + config.gameplay.difficulty * 45;

    function placeZone() {
      zoneX = barX + Math.random() * (barW - zoneW);
      zone.clear().roundRect(zoneX, barY, zoneW, barH, 14).fill({ color: p, alpha: 0.9 });
    }
    placeZone();

    function attempt() {
      if (mx >= zoneX && mx <= zoneX + zoneW) {
        ctx.addScore();
        ringFlash(app, layer, mx, barY + barH / 2, lighten(p, 0.4));
        zoneW = Math.max(46, zoneW - 12);
        placeZone();
      }
    }

    const onTap = () => attempt();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointertap', onTap);
    }

    const tick = (t: Ticker) => {
      const dt = t.deltaMS / 1000;
      mx += dir * speed * dt;
      if (mx <= barX) { mx = barX; dir = 1; }
      if (mx >= barX + barW) { mx = barX + barW; dir = -1; }
      marker.clear().rect(mx - 3, barY - 14, 6, barH + 28).fill(0xffffff);
      if (demo && mx >= zoneX + 8 && mx <= zoneX + zoneW - 8) attempt();
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        zone.destroy();
        marker.destroy();
      },
    };
  },
};
