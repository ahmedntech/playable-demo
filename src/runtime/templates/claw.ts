import { Container, Graphics, Text, Ticker } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

const PRIZE_EMOJI = ['🧸', '⭐', '🎁', '🍬', '👾'];

interface Prize { c: Container; x: number; taken: boolean }

// A claw sweeps across the top. Tap to drop it — line it up over a prize to
// grab and lift it for a point. Demo auto-times its grabs.
export const claw: Template = {
  id: 'claw',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const clawCol = ctx.color('claw', config.brand.primaryColor);
    const prizeTex = ctx.tex('prize');
    const topY = 70;
    const binY = H - 150;

    // cabinet
    layer.addChild(new Graphics().roundRect(24, 50, W - 48, H - 90, 18).stroke({ width: 3, color: lighten(config.brand.bgColor, 0.25), alpha: 0.5 }));
    layer.addChild(new Graphics().roundRect(40, binY + 36, W - 80, 90, 12).fill({ color: 0x000000, alpha: 0.22 }));
    layer.addChild(new Graphics().rect(40, topY, W - 80, 5).fill({ color: lighten(clawCol, 0.2), alpha: 0.6 }));

    // claw
    const claw = new Container();
    function drawClaw(open: number) {
      claw.removeChildren().forEach((c) => c.destroy());
      claw.addChild(new Graphics().rect(-3, -40, 6, 40).fill(darken(clawCol, 0.2)));
      claw.addChild(new Graphics().circle(0, 0, 9).fill(clawCol));
      const spread = 10 + open * 12;
      claw.addChild(new Graphics().poly([-4, 2, -spread, 22, -spread + 6, 24, -2, 6]).fill(darken(clawCol, 0.1)));
      claw.addChild(new Graphics().poly([4, 2, spread, 22, spread - 6, 24, 2, 6]).fill(darken(clawCol, 0.1)));
    }
    drawClaw(1);
    claw.position.set(W / 2, topY);
    layer.addChild(claw);
    ctx.mark(claw, 'claw');

    // prizes
    const prizes: Prize[] = [];
    function makePrize(x: number, i: number) {
      const c = new Container();
      if (prizeTex) c.addChild(fitSprite(prizeTex, 52, 52));
      else { const e = new Text({ text: PRIZE_EMOJI[i % PRIZE_EMOJI.length], style: { fontSize: 44 } }); e.anchor.set(0.5); c.addChild(e); }
      c.position.set(x, binY);
      layer.addChild(c);
      prizes.push({ c, x, taken: false });
    }
    const slots = [70, 130, 190, 250, 300];
    slots.forEach((x, i) => makePrize(x, i));
    if (prizeTex) prizes.forEach((p) => ctx.mark(p.c, 'prize'));

    let dir = 1;
    let mode: 'sweep' | 'drop' | 'lift' = 'sweep';
    let clawX = W / 2, clawY = topY;
    let held: Prize | null = null;
    let demoCool = 0;
    const speed = 130 + config.gameplay.difficulty * 22;

    function tryGrab() {
      let best: Prize | null = null, bestD = 26;
      for (const p of prizes) {
        if (p.taken) continue;
        const d = Math.abs(p.x - clawX);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) {
        held = best; best.taken = true;
        ctx.addScore();
        ringFlash(app, layer, best.x, binY, lighten(clawCol, 0.5), 34);
      }
    }
    const onTap = () => { if (mode === 'sweep') { mode = 'drop'; drawClaw(1); } };
    if (!demo) { app.stage.eventMode = 'static'; app.stage.on('pointertap', onTap); }

    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      if (mode === 'sweep') {
        clawX += dir * speed * dt;
        if (clawX < 60) { clawX = 60; dir = 1; }
        if (clawX > W - 60) { clawX = W - 60; dir = -1; }
        if (demo) {
          demoCool -= dt;
          const over = prizes.some((p) => !p.taken && Math.abs(p.x - clawX) < 12);
          if (demoCool <= 0 && over) { mode = 'drop'; demoCool = 1.6; }
        }
      } else if (mode === 'drop') {
        clawY += 320 * dt;
        if (clawY >= binY - 18) { clawY = binY - 18; drawClaw(0); tryGrab(); mode = 'lift'; }
      } else if (mode === 'lift') {
        clawY -= 260 * dt;
        if (held) { held.c.x = clawX; held.c.y = clawY + 30; }
        if (clawY <= topY) {
          clawY = topY;
          if (held) {
            held.c.destroy();
            const idx = prizes.indexOf(held);
            prizes.splice(idx, 1);
            held = null;
            // respawn a fresh prize at an empty slot
            const taken = new Set(prizes.map((p) => Math.round(p.x)));
            const free = slots.find((s) => !taken.has(Math.round(s))) ?? slots[Math.floor(Math.random() * slots.length)];
            makePrize(free, Math.floor(Math.random() * PRIZE_EMOJI.length));
            if (prizeTex) ctx.mark(prizes[prizes.length - 1].c, 'prize');
          }
          drawClaw(1);
          mode = 'sweep';
        }
      }
      claw.position.set(clawX, clawY);
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointertap', onTap);
        claw.destroy({ children: true });
        prizes.forEach((p) => p.c.destroy());
      },
    };
  },
};
