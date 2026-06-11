import { Container, Graphics, Ticker, Rectangle } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

interface Pipe { c: Container; gapY: number; gapH: number; passed: boolean }

// Tap to flap the bird up through pipe gaps. Hitting a pipe (or the floor/ceiling)
// ends the round. Demo auto-flaps to stay centered in the next gap.
export const flappy: Template = {
  id: 'flappy',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const p = ctx.color('bird', config.brand.primaryColor);
    const birdTex = ctx.tex('bird');
    const pipeCol = ctx.color('pipe', darken(config.brand.primaryColor, 0.2));
    const birdX = W * 0.3;
    const pipeW = 56;
    const gapH = 180 - config.gameplay.difficulty * 12;
    const speed = 130 + config.gameplay.difficulty * 22;

    const bird = new Container();
    if (birdTex) {
      bird.addChild(fitSprite(birdTex, 40, 40));
    } else {
      bird.addChild(new Graphics().circle(0, 0, 16).fill(p));
      bird.addChild(new Graphics().circle(5, -4, 4).fill(0xffffff));
      bird.addChild(new Graphics().poly([14, 0, 24, -4, 24, 4]).fill(lighten(p, 0.3)));
    }
    let by = H / 2, vy = 0;
    bird.position.set(birdX, by);
    layer.addChild(bird);
    ctx.mark(bird, 'bird');

    const pipes: Pipe[] = [];
    let spawnT = 1.2;

    function spawn() {
      const gapY = 120 + Math.random() * (H - 320);
      const c = new Container();
      c.addChild(new Graphics().rect(0, 0, pipeW, gapY).fill(pipeCol));
      c.addChild(new Graphics().rect(0, gapY + gapH, pipeW, H - gapY - gapH).fill(pipeCol));
      c.addChild(new Graphics().rect(0, 0, pipeW, gapY).stroke({ width: 2, color: lighten(pipeCol, 0.3), alpha: 0.5 }));
      c.x = W + 10;
      layer.addChild(c);
      ctx.mark(c, 'pipe');
      pipes.push({ c, gapY, gapH, passed: false });
    }

    function flap() { vy = -300; }
    const onTap = () => flap();
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointertap', onTap);
    }

    function end() { if (demo) reset(); else ctx.finish(); }
    function reset() {
      pipes.forEach((p2) => p2.c.destroy());
      pipes.length = 0;
      by = H / 2; vy = 0; spawnT = 1.2;
    }

    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      vy += 900 * dt;
      by += vy * dt;
      bird.y = by;
      bird.rotation = Math.max(-0.5, Math.min(0.9, vy / 500));

      spawnT += dt;
      if (spawnT >= 1.7) { spawnT = 0; spawn(); }

      if (demo) {
        const next = pipes.find((pp) => pp.c.x + pipeW > birdX - 10);
        const targetY = next ? next.gapY + next.gapH / 2 : H / 2;
        if (by > targetY + 10 && vy > -120) flap();
      }

      for (const pp of [...pipes]) {
        pp.c.x -= speed * dt;
        if (!pp.passed && pp.c.x + pipeW < birdX) { pp.passed = true; ctx.addScore(); ringFlash(app, layer, birdX, by, lighten(p, 0.4), 18); }
        if (pp.c.x < -pipeW - 20) { pp.c.destroy(); pipes.splice(pipes.indexOf(pp), 1); continue; }
        // collision
        if (birdX + 14 > pp.c.x && birdX - 14 < pp.c.x + pipeW) {
          if (by - 14 < pp.gapY || by + 14 > pp.gapY + pp.gapH) { end(); return; }
        }
      }
      if (by > H - 16 || by < 16) end();
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        pipes.forEach((pp) => pp.c.destroy());
        pipes.length = 0;
        bird.destroy({ children: true });
      },
    };
  },
};
