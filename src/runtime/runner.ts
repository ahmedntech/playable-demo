import { Application, Container, Graphics, Sprite, Text, Texture, Assets } from 'pixi.js';
import type { PlayableConfig, RuntimeStartOptions } from './types';
import type { Template, Controller, GameCtx } from './template';
import { tapTargets } from './templates/tapTargets';
import { whack } from './templates/whack';
import { catchGame } from './templates/catch';
import { lighten, darken } from './color';

// Builds a vertical gradient texture from a base color so games have depth
// instead of a flat black void. Robust across Pixi versions (uses a 2D canvas).
function gradientTexture(base: string): Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, lighten(base, 0.32));
  g.addColorStop(0.55, base);
  g.addColorStop(1, darken(base, 0.22));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return Texture.from(c);
}

const W = 360;
const H = 640;

// Template registry. Add a new genre here + in src/templates/catalog.ts.
const REGISTRY: Record<string, Template> = {
  'tap-targets': tapTargets,
  whack,
  catch: catchGame,
};

export class Runner {
  private app = new Application();
  private bgLayer = new Container();
  private root = new Container();
  private layer = new Container();
  private cfg!: PlayableConfig;
  private tpl!: Template;
  private demo = false;
  private onCta!: (url: string) => void;
  private score = 0;
  private hud?: Text;
  private controller?: Controller;

  async start(config: PlayableConfig, mount: HTMLElement, opts: RuntimeStartOptions = {}) {
    this.cfg = config;
    this.demo = !!opts.demo;
    this.onCta = opts.onCta ?? ((url) => window.open(url, '_blank'));
    this.tpl = REGISTRY[config.templateId] ?? tapTargets;

    await this.app.init({
      width: W,
      height: H,
      background: config.brand.bgColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    const cv = this.app.canvas;
    Object.assign(cv.style, { maxWidth: '100%', maxHeight: '100%', display: 'block', margin: 'auto' });
    mount.appendChild(cv);
    this.drawBackdrop();
    this.app.stage.addChild(this.bgLayer, this.root);

    if (this.demo) this.beginRound();
    else void this.showIntro();
    return this;
  }

  destroy() {
    this.controller?.destroy();
    this.app.ticker.stop();
    this.app.destroy(true, { children: true });
  }

  private drawBackdrop() {
    const base = this.cfg.brand.bgColor;
    const bg = new Sprite(gradientTexture(base));
    bg.width = W;
    bg.height = H;
    this.bgLayer.addChild(bg);
    // soft glow near the top for a bit of life
    const glow = new Graphics().circle(W / 2, 80, 240).fill({ color: lighten(base, 0.6), alpha: 0.1 });
    this.bgLayer.addChild(glow);
  }

  private clear() {
    this.controller?.destroy();
    this.controller = undefined;
    this.root.removeChildren();
    this.hud = undefined;
  }

  private label(text: string, size: number, color: string, y: number) {
    const t = new Text({
      text,
      style: { fontFamily: 'Arial', fontSize: size, fill: color, fontWeight: 'bold', align: 'center' },
    });
    t.anchor.set(0.5);
    t.x = W / 2;
    t.y = y;
    this.root.addChild(t);
    return t;
  }

  private button(text: string, y: number, onTap: () => void) {
    const c = new Container();
    c.addChild(new Graphics().roundRect(0, 0, 240, 56, 28).fill(this.cfg.brand.primaryColor));
    const t = new Text({ text, style: { fontFamily: 'Arial', fontSize: 22, fill: '#ffffff', fontWeight: 'bold' } });
    t.anchor.set(0.5);
    t.x = 120;
    t.y = 28;
    c.addChild(t);
    c.x = W / 2 - 120;
    c.y = y;
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', onTap);
    this.root.addChild(c);
    return c;
  }

  private async showIntro() {
    this.clear();
    if (this.cfg.brand.logoDataUrl) {
      try {
        const tex = await Assets.load({ src: this.cfg.brand.logoDataUrl, loadParser: 'loadTextures' });
        const logo = new Sprite(tex);
        logo.anchor.set(0.5);
        logo.scale.set(Math.min(160 / logo.width, 160 / logo.height));
        logo.x = W / 2;
        logo.y = 200;
        this.root.addChild(logo);
      } catch { /* logo optional */ }
    }
    this.label(this.cfg.brand.name, 30, '#ffffff', 320);
    this.label(`Score ${this.cfg.gameplay.targetScore} to win!`, 18, '#aab', 360);
    this.button('Tap to start', 440, () => this.beginRound());
  }

  private beginRound() {
    this.clear();
    this.score = 0;
    this.layer = new Container();
    this.root.addChild(this.layer);
    if (!this.demo) this.hud = this.label(`0 / ${this.cfg.gameplay.targetScore}`, 22, '#ffffff', 44);
    const ctx: GameCtx = {
      app: this.app,
      layer: this.layer,
      config: this.cfg,
      W,
      H,
      demo: this.demo,
      addScore: (n = 1) => this.addScore(n),
    };
    this.controller = this.tpl.start(ctx);
  }

  private addScore(n: number) {
    if (this.demo) return; // demo loops forever
    this.score += n;
    const target = this.cfg.gameplay.targetScore;
    if (this.hud) this.hud.text = `${Math.min(this.score, target)} / ${target}`;
    if (this.score >= target) this.win();
  }

  private win() {
    this.clear();
    this.label('🎉', 64, '#ffffff', 200);
    this.label(this.cfg.endCard.headline, 24, '#ffffff', 300);
    this.button(this.cfg.cta.text, 420, () => this.onCta(this.cfg.cta.url));
  }
}
