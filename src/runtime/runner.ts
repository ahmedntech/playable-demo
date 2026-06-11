import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, Assets } from 'pixi.js';
import { coverSprite } from './assets';
import type { PlayableConfig, RuntimeStartOptions } from './types';
import type { Template, Controller, GameCtx } from './template';
import { tapTargets } from './templates/tapTargets';
import { whack } from './templates/whack';
import { catchGame } from './templates/catch';
import { stack } from './templates/stack';
import { slice } from './templates/slice';
import { piano } from './templates/piano';
import { timing } from './templates/timing';
import { wheel } from './templates/wheel';
import { memory } from './templates/memory';
import { bubblepop } from './templates/bubblepop';
import { paint } from './templates/paint';
import { lane } from './templates/lane';
import { flappy } from './templates/flappy';
import { knife } from './templates/knife';
import { drop } from './templates/drop';
import { cannon } from './templates/cannon';
import { jump } from './templates/jump';
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
  stack,
  slice,
  piano,
  timing,
  wheel,
  memory,
  bubblepop,
  paint,
  lane,
  flappy,
  knife,
  drop,
  cannon,
  jump,
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
  private textures = new Map<string, Texture>(); // preloaded per-element images
  private bgTex: Texture | null = null;
  // --- edit mode state ---
  private editMode = false;
  private onElementTap?: (key: string) => void;
  private elementLabels: Record<string, string> = {};
  private marked: { obj: Container; key: string }[] = [];
  private editOverlay = new Container();
  private outlineGfx = new Graphics();
  private labelPills = new Map<string, Container>();
  private editTime = 0;

  async start(config: PlayableConfig, mount: HTMLElement, opts: RuntimeStartOptions = {}) {
    this.cfg = config;
    this.editMode = !!opts.editMode;
    this.demo = !!opts.demo || this.editMode; // edit mode rides on the auto-play loop
    this.onCta = opts.onCta ?? ((url) => window.open(url, '_blank'));
    this.onElementTap = opts.onElementTap;
    this.elementLabels = opts.elementLabels ?? {};
    this.tpl = REGISTRY[config.templateId] ?? tapTargets;

    await this.app.init({
      width: W,
      height: H,
      background: config.brand.bgColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    await this.preloadAssets();

    const cv = this.app.canvas;
    Object.assign(cv.style, { maxWidth: '100%', maxHeight: '100%', display: 'block', margin: 'auto' });
    mount.appendChild(cv);
    this.drawBackdrop();
    this.app.stage.addChild(this.bgLayer, this.root);
    if (this.editMode) this.enterEditMode();

    if (this.demo) this.beginRound();
    else void this.showIntro();
    return this;
  }

  destroy() {
    this.controller?.destroy();
    this.app.ticker.stop();
    this.app.destroy(true, { children: true });
  }

  // ---------- edit mode ----------
  // The demo keeps playing underneath; we outline one representative instance
  // of each marked element (pulsing, labeled) and route taps: a tap on any
  // marked instance reports its key, a tap on empty space reports 'background'.
  private enterEditMode() {
    this.editOverlay.addChild(this.outlineGfx);
    this.app.stage.addChild(this.editOverlay);
    // Children must not swallow taps (e.g. tap-targets pop on tap).
    this.root.interactiveChildren = false;
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new Rectangle(0, 0, W, H);
    this.app.stage.on('pointertap', (e) => {
      const pt = e.global;
      let best: { key: string; area: number } | null = null;
      for (const m of this.liveMarked()) {
        const b = m.obj.getBounds();
        const pad = 10;
        if (pt.x >= b.x - pad && pt.x <= b.x + b.width + pad && pt.y >= b.y - pad && pt.y <= b.y + b.height + pad) {
          const area = Math.max(1, b.width * b.height);
          if (!best || area < best.area) best = { key: m.key, area }; // most specific wins
        }
      }
      this.onElementTap?.(best ? best.key : 'background');
    });
    this.app.ticker.add(this.editTick);
  }

  private liveMarked() {
    this.marked = this.marked.filter((m) => !m.obj.destroyed && m.obj.parent);
    return this.marked;
  }

  private editTick = () => {
    this.editTime += this.app.ticker.deltaMS / 1000;
    const pulse = 0.55 + 0.45 * Math.sin(this.editTime * 4);
    const g = this.outlineGfx;
    g.clear();

    // pick one representative per key: the instance nearest the canvas center
    const reps = new Map<string, Container>();
    for (const m of this.liveMarked()) {
      const b = m.obj.getBounds();
      const d = Math.hypot(b.x + b.width / 2 - W / 2, b.y + b.height / 2 - H / 2);
      const cur = reps.get(m.key);
      if (!cur) { reps.set(m.key, m.obj); (m.obj as any).__d = d; continue; }
      if (d < ((cur as any).__d ?? Infinity)) { reps.set(m.key, m.obj); (m.obj as any).__d = d; }
    }

    const seen = new Set<string>();
    for (const [key, obj] of reps) {
      seen.add(key);
      const b = obj.getBounds();
      const pad = 7;
      const x = b.x - pad, y = b.y - pad, w = b.width + pad * 2, h = b.height + pad * 2;
      g.roundRect(x, y, w, h, 10).stroke({ width: 6, color: 0xfcb514, alpha: 0.22 * pulse });
      g.roundRect(x, y, w, h, 10).stroke({ width: 2, color: 0xffffff, alpha: 0.5 + 0.5 * pulse });
      const pill = this.pill(key);
      pill.visible = true;
      pill.x = Math.max(4, Math.min(W - pill.width - 4, x + w / 2 - pill.width / 2));
      pill.y = y - 26 < 4 ? y + h + 6 : y - 26;
    }
    for (const [key, pill] of this.labelPills) if (!seen.has(key)) pill.visible = false;
  };

  private pill(key: string): Container {
    let p = this.labelPills.get(key);
    if (p) return p;
    p = new Container();
    const label = this.elementLabels[key] ?? key;
    const t = new Text({ text: '✎ ' + label, style: { fontFamily: 'Arial', fontSize: 12, fill: 0x1d2a31, fontWeight: 'bold' } });
    const bgr = new Graphics().roundRect(0, 0, t.width + 16, 20, 10).fill({ color: 0xfcb514, alpha: 0.95 });
    t.x = 8;
    t.y = 3;
    p.addChild(bgr, t);
    this.editOverlay.addChild(p);
    this.labelPills.set(key, p);
    return p;
  }

  // Loads every uploaded image (per-element slots + background) into textures.
  private async preloadAssets() {
    const jobs: Promise<void>[] = [];
    for (const [key, url] of Object.entries(this.cfg.images ?? {})) {
      if (!url) continue;
      jobs.push(
        Assets.load({ src: url, loadParser: 'loadTextures' })
          .then((t: Texture) => { this.textures.set(key, t); })
          .catch(() => {})
      );
    }
    if (this.cfg.brand.bgImage) {
      jobs.push(
        Assets.load({ src: this.cfg.brand.bgImage, loadParser: 'loadTextures' })
          .then((t: Texture) => { this.bgTex = t; })
          .catch(() => {})
      );
    }
    await Promise.all(jobs);
  }

  private drawBackdrop() {
    const base = this.cfg.brand.bgColor;
    if (this.bgTex) {
      this.bgLayer.addChild(coverSprite(this.bgTex, W, H));
      // subtle darken so game objects stay legible over any photo
      this.bgLayer.addChild(new Graphics().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.18 }));
      return;
    }
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
    this.marked = [];
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
      finish: () => this.finish(),
      color: (key, fallback) => this.cfg.colors?.[key] || fallback,
      tex: (key) => this.textures.get(key) ?? null,
      mark: (obj, key) => { if (this.editMode) this.marked.push({ obj, key }); },
    };
    this.controller = this.tpl.start(ctx);
  }

  private finish() {
    if (this.demo) this.beginRound(); // restart the preview loop
    else this.showEndCard();
  }

  private addScore(n: number) {
    if (this.demo) return; // demo loops forever
    this.score += n;
    const target = this.cfg.gameplay.targetScore;
    if (this.hud) this.hud.text = `${Math.min(this.score, target)} / ${target}`;
    if (this.score >= target) this.showEndCard();
  }

  private showEndCard() {
    this.clear();
    this.label('🎉', 64, '#ffffff', 200);
    this.label(this.cfg.endCard.headline, 24, '#ffffff', 300);
    this.button(this.cfg.cta.text, 420, () => this.onCta(this.cfg.cta.url));
  }
}
