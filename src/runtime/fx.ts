import { Container, Graphics, Ticker, type Application } from 'pixi.js';

// Small reusable expanding-ring flash, used by many templates on a hit/score.
export function ringFlash(app: Application, layer: Container, x: number, y: number, color: number | string = 0xffffff, r = 32) {
  const f = new Graphics().circle(0, 0, r).stroke({ width: 3, color, alpha: 0.9 });
  f.position.set(x, y);
  layer.addChild(f);
  let a = 1;
  const ft = (t: Ticker) => {
    a -= t.deltaMS / 260;
    f.alpha = Math.max(0, a);
    f.scale.set(1 + (1 - a) * 0.8);
    if (a <= 0) { f.destroy(); app.ticker.remove(ft); }
  };
  app.ticker.add(ft);
}
