import { Container, Graphics, Rectangle, Ticker, type FederatedPointerEvent } from 'pixi.js';
import type { Template } from '../template';
import { lighten, darken } from '../color';
import { ringFlash } from '../fx';
import { fitSprite } from '../assets';

interface Brick { g: Container; x: number; y: number; w: number; h: number; alive: boolean }

// Classic brick breaker. The paddle follows your finger; the ball clears the
// wall of bricks. Losing the ball ends the round. Demo auto-tracks the ball.
export const brickbreak: Template = {
  id: 'brickbreak',
  start(ctx) {
    const { app, layer, config, W, H, demo } = ctx;
    const paddleCol = ctx.color('paddle', config.brand.primaryColor);
    const ballCol = ctx.color('ball', lighten(config.brand.primaryColor, 0.4));
    const brickCol = ctx.color('brick', config.brand.primaryColor);
    const paddleTex = ctx.tex('paddle');

    const PADDLE_W = 86, PADDLE_H = 16, paddleY = H - 70;

    // bricks
    const bricks: Brick[] = [];
    const cols = 6, rows = 4, bw = 50, bh = 22, gap = 6;
    const totalW = cols * bw + (cols - 1) * gap;
    const ox = (W - totalW) / 2, oy = 110;
    const bricksLayer = new Container();
    layer.addChild(bricksLayer);
    function buildBricks() {
      bricksLayer.removeChildren().forEach((c) => c.destroy());
      bricks.length = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const g = new Container();
          const shade = r % 2 === 0 ? brickCol : lighten(brickCol, 0.18);
          g.addChild(new Graphics().roundRect(0, 0, bw, bh, 5).fill(shade));
          g.addChild(new Graphics().roundRect(0, 0, bw, 6, 5).fill({ color: lighten(shade, 0.4), alpha: 0.35 }));
          const x = ox + c * (bw + gap), y = oy + r * (bh + gap);
          g.position.set(x, y);
          bricksLayer.addChild(g);
          bricks.push({ g, x, y, w: bw, h: bh, alive: true });
        }
      }
    }
    buildBricks();
    ctx.mark(bricksLayer, 'brick');

    // paddle
    const paddle = new Container();
    if (paddleTex) {
      paddle.addChild(fitSprite(paddleTex, PADDLE_W + 8, PADDLE_H + 18));
    } else {
      paddle.addChild(new Graphics().roundRect(-PADDLE_W / 2, -PADDLE_H / 2, PADDLE_W, PADDLE_H, 8).fill(darken(paddleCol, 0.15)));
      paddle.addChild(new Graphics().roundRect(-PADDLE_W / 2, -PADDLE_H / 2, PADDLE_W, PADDLE_H * 0.5, 8).fill({ color: lighten(paddleCol, 0.4), alpha: 0.5 }));
    }
    paddle.position.set(W / 2, paddleY);
    layer.addChild(paddle);
    ctx.mark(paddle, 'paddle');

    // ball
    const R = 9;
    const ball = new Container();
    ball.addChild(new Graphics().circle(0, 0, R).fill(ballCol));
    ball.addChild(new Graphics().circle(-3, -3, 3).fill({ color: 0xffffff, alpha: 0.6 }));
    layer.addChild(ball);
    ctx.mark(ball, 'ball');

    let bx = W / 2, by = paddleY - 28;
    let vx = 150, vy = -300;
    let paddleX = W / 2;

    function resetBall() {
      bx = W / 2; by = paddleY - 28;
      vx = (Math.random() < 0.5 ? -1 : 1) * 150; vy = -300;
    }
    resetBall();

    const onMove = (e: FederatedPointerEvent) => { paddleX = e.global.x; };
    if (!demo) {
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, W, H);
      app.stage.on('pointermove', onMove);
    }

    const tick = (t: Ticker) => {
      const dt = Math.min(t.deltaMS / 1000, 0.05);
      // paddle: follow pointer, or auto-track ball in demo
      const targetX = demo ? bx : paddleX;
      paddle.x += (targetX - paddle.x) * Math.min(1, dt * 12);
      paddle.x = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, paddle.x));

      bx += vx * dt; by += vy * dt;
      // walls
      if (bx < R) { bx = R; vx = Math.abs(vx); }
      if (bx > W - R) { bx = W - R; vx = -Math.abs(vx); }
      if (by < R + 40) { by = R + 40; vy = Math.abs(vy); }
      // paddle bounce
      if (vy > 0 && by + R >= paddleY - PADDLE_H / 2 && by + R <= paddleY + PADDLE_H && Math.abs(bx - paddle.x) <= PADDLE_W / 2 + R) {
        by = paddleY - PADDLE_H / 2 - R;
        vy = -Math.abs(vy);
        vx += (bx - paddle.x) * 4; // english based on hit position
        vx = Math.max(-340, Math.min(340, vx));
      }
      // brick collisions
      for (const br of bricks) {
        if (!br.alive) continue;
        if (bx + R > br.x && bx - R < br.x + br.w && by + R > br.y && by - R < br.y + br.h) {
          br.alive = false;
          br.g.visible = false;
          ringFlash(app, layer, br.x + br.w / 2, br.y + br.h / 2, lighten(brickCol, 0.5), 22);
          ctx.addScore();
          // reflect off the nearer axis
          const overlapX = Math.min(bx + R - br.x, br.x + br.w - (bx - R));
          const overlapY = Math.min(by + R - br.y, br.y + br.h - (by - R));
          if (overlapX < overlapY) vx = -vx; else vy = -vy;
          break;
        }
      }
      // all cleared → rebuild (keeps the rally going)
      if (bricks.every((b) => !b.alive)) buildBricks();
      // ball lost
      if (by > H + 20) {
        if (demo) resetBall();
        else { ctx.finish(); return; }
      }
      ball.position.set(bx, by);
    };
    app.ticker.add(tick);

    return {
      destroy() {
        app.ticker.remove(tick);
        if (!demo) app.stage.off('pointermove', onMove);
        bricksLayer.destroy({ children: true });
        paddle.destroy({ children: true });
        ball.destroy({ children: true });
      },
    };
  },
};
