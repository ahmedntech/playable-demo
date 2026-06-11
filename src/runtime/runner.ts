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
  private textLayer = new Container(); // user text overlays, above gameplay
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
  private onTextMove?: (id: string, x: number, y: number) => void;
  private elementLabels: Record<string, string> = {};
  private marked: { obj: Container; key: string }[] = [];
  private editOverlay = new Container();
  private outlineGfx = new Graphics();
  private labelPills = new Map<string, Container>();
  private editTime = 0; // real (unscaled) seconds since edit mode began
  // Slow-mo: edit mode plays at full speed briefly so the scene populates,
  // then eases down so moving elements are easy to tap.
  private static readonly WARMUP_S = 2.2;
  private static readonly SLOWMO = 0.12;
  // drag state for repositioning text overlays
  private drag: { obj: Container; id: string; dx: number; dy: number; moved: boolean } | null = null;
  private downHit: string | null = null;

  // Lifecycle guards: start() awaits app init + image decoding, and the host
  // may destroy us mid-flight (the editor remounts on every config change).
  // Without these, a cancelled instance can finish initializing late and
  // append a dead, frozen canvas over the live one.
  private dead = false;
  private inited = false;

  async start(config: PlayableConfig, mount: HTMLElement, opts: RuntimeStartOptions = {}) {
    this.cfg = config;
    this.editMode = !!opts.editMode;
    this.demo = !!opts.demo || this.editMode; // edit mode rides on the auto-play loop
    this.onCta = opts.onCta ?? ((url) => window.open(url, '_blank'));
    this.onElementTap = opts.onElementTap;
    this.onTextMove = opts.onTextMove;
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
    this.inited = true;
    if (this.dead) { this.teardown(); return this; } // destroyed during init

    await this.preloadAssets();
    if (this.dead) { this.teardown(); return this; } // destroyed during image decode

    const cv = this.app.canvas;
    Object.assign(cv.style, { maxWidth: '100%', maxHeight: '100%', display: 'block', margin: 'auto' });
    mount.appendChild(cv);
    this.drawBackdrop();
    this.renderTexts();
    this.app.stage.addChild(this.bgLayer, this.root, this.textLayer);
    if (this.editMode) this.enterEditMode();

    if (this.demo) this.beginRound();
    else void this.showIntro();
    return this;
  }

  // Live-update path: text edits (content/size/color/position) patch the
  // running game without a remount — no flash, no warm-up restart, and the
  // editor input stays snappy while typing.
  applyTexts(texts: PlayableConfig['texts'], labels?: Record<string, string>) {
    if (this.dead) return;
    this.cfg = { ...this.cfg, texts };
    if (labels) this.elementLabels = { ...this.elementLabels, ...labels };
    // label pills cache their text — rebuild the text ones
    for (const [key, pill] of [...this.labelPills]) {
      if (key.startsWith('text:')) { pill.destroy(); this.labelPills.delete(key); }
    }
    this.renderTexts();
  }

  // User text overlays live above the gameplay for the whole session.
  // In edit mode each one is marked (tap to edit) and draggable.
  private renderTexts() {
    this.marked = this.marked.filter((m) => !m.key.startsWith('text:'));
    this.textLayer.removeChildren().forEach((c) => c.destroy());
    for (const tx of this.cfg.texts ?? []) {
      const t = new Text({
        text: tx.content,
        style: {
          fontFamily: tx.font || 'Arial',
          fontSize: tx.size,
          fill: tx.color,
          fontWeight: 'bold',
          align: 'center',
          dropShadow: { color: '#000000', alpha: 0.45, blur: 4, distance: 2, angle: Math.PI / 3 },
        },
      });
      t.anchor.set(0.5);
      t.x = tx.x * W;
      t.y = tx.y * H;
      (t as any).__textId = tx.id;
      this.textLayer.addChild(t);
      if (this.editMode) this.marked.push({ obj: t, key: 'text:' + tx.id });
    }
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    // If start() is still awaiting init/assets, it will see `dead` when it
    // resumes and tear down then — destroying a half-initialized app throws.
    if (this.inited) this.teardown();
  }

  private teardown() {
    this.controller?.destroy();
    this.controller = undefined;
    this.app.ticker.stop();
    this.app.canvas?.remove(); // never leave a dead canvas in the DOM
    this.app.destroy(true, { children: true });
  }

  // ---------- edit mode ----------
  // The demo plays at full speed briefly so the scene populates, then eases
  // into slow motion so moving elements are easy to tap. Marked elements get
  // pulsing outlines + labels; taps route to the editor ('background' for
  // empty space); text overlays can be dragged to reposition.
  private enterEditMode() {
    this.editOverlay.addChild(this.outlineGfx);
    this.app.stage.addChild(this.editOverlay);
    // Children must not swallow taps (e.g. tap-targets pop on tap).
    this.root.interactiveChildren = false;
    this.textLayer.interactiveChildren = false;
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new Rectangle(0, 0, W, H);

    this.app.stage.on('pointerdown', (e) => {
      const hit = this.hitTest(e.global.x, e.global.y);
      this.downHit = hit;
      if (hit?.startsWith('text:')) {
        const m = this.liveMarked().find((x) => x.key === hit);
        if (m) this.drag = { obj: m.obj, id: hit.slice(5), dx: m.obj.x - e.global.x, dy: m.obj.y - e.global.y, moved: false };
      }
    });
    this.app.stage.on('pointermove', (e) => {
      if (!this.drag) return;
      const nx = Math.max(14, Math.min(W - 14, e.global.x + this.drag.dx));
      const ny = Math.max(14, Math.min(H - 14, e.global.y + this.drag.dy));
      if (Math.hypot(nx - this.drag.obj.x, ny - this.drag.obj.y) > 2) this.drag.moved = true;
      this.drag.obj.x = nx;
      this.drag.obj.y = ny;
    });
    const finishPointer = () => {
      if (this.drag?.moved) {
        // commit the new spot (normalized) — the editor stores it in the config
        this.onTextMove?.(this.drag.id, this.drag.obj.x / W, this.drag.obj.y / H);
      } else {
        this.onElementTap?.(this.downHit ?? 'background');
      }
      this.drag = null;
      this.downHit = null;
    };
    this.app.stage.on('pointerup', finishPointer);
    this.app.stage.on('pointerupoutside', () => { this.drag = null; this.downHit = null; });
    this.app.ticker.add(this.editTick);
  }

  private hitTest(x: number, y: number): string | null {
    let best: { key: string; area: number } | null = null;
    for (const m of this.liveMarked()) {
      const b = m.obj.getBounds();
      const pad = 10;
      if (x >= b.x - pad && x <= b.x + b.width + pad && y >= b.y - pad && y <= b.y + b.height + pad) {
        const area = Math.max(1, b.width * b.height);
        if (!best || area < best.area) best = { key: m.key, area }; // most specific wins
      }
    }
    return best ? best.key : null;
  }

  private liveMarked() {
    this.marked = this.marked.filter((m) => !m.obj.destroyed && m.obj.parent);
    return this.marked;
  }

  private editTick = () => {
    // elapsedMS is real time (ticker.speed does not scale it) — the pulse and
    // the warm-up clock must keep moving even in slow motion.
    this.editTime += this.app.ticker.elapsedMS / 1000;
    const over = this.editTime - Runner.WARMUP_S;
    if (over <= 0) this.app.ticker.speed = 1;
    else if (over < 0.6) this.app.ticker.speed = 1 + (Runner.SLOWMO - 1) * (over / 0.6); // ease in
    else this.app.ticker.speed = Runner.SLOWMO;

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
    } else {
      const bg = new Sprite(gradientTexture(base));
      bg.width = W;
      bg.height = H;
      this.bgLayer.addChild(bg);
      // soft glow near the top for a bit of life
      const glow = new Graphics().circle(W / 2, 80, 240).fill({ color: lighten(base, 0.6), alpha: 0.1 });
      this.bgLayer.addChild(glow);
    }
    this.ambientParticles(base);
  }

  // Soft dust motes drifting upward — gives every game a living backdrop.
  private ambientParticles(base: string) {
    const cont = new Container();
    this.bgLayer.addChild(cont);
    interface Mote { g: Graphics; v: number; sway: number; phase: number }
    const motes: Mote[] = [];
    for (let i = 0; i < 14; i++) {
      const r = 1.5 + Math.random() * 2.5;
      const g = new Graphics().circle(0, 0, r).fill({ color: lighten(base, 0.7), alpha: 0.1 + Math.random() * 0.15 });
      g.x = Math.random() * W;
      g.y = Math.random() * H;
      cont.addChild(g);
      motes.push({ g, v: 8 + Math.random() * 14, sway: 6 + Math.random() * 10, phase: Math.random() * Math.PI * 2 });
    }
    let t = 0;
    const cb = () => {
      if (cont.destroyed) { this.app.ticker.remove(cb); return; }
      const dt = this.app.ticker.deltaMS / 1000;
      t += dt;
      for (const m of motes) {
        m.g.y -= m.v * dt;
        m.g.x += Math.sin(t + m.phase) * m.sway * dt;
        if (m.g.y < -6) { m.g.y = H + 6; m.g.x = Math.random() * W; }
      }
    };
    this.app.ticker.add(cb);
  }

  // Gentle scale pulse for tappable buttons (intro start, end-card CTA).
  private pulseButton(btn: Container) {
    btn.pivot.set(120, 28);
    btn.x = W / 2;
    btn.y += 28;
    let t = 0;
    const cb = () => {
      if (btn.destroyed) { this.app.ticker.remove(cb); return; }
      t += this.app.ticker.deltaMS / 1000;
      btn.scale.set(1 + 0.04 * Math.sin(t * 4.5));
    };
    this.app.ticker.add(cb);
  }

  private clear() {
    this.controller?.destroy();
    this.controller = undefined;
    this.root.removeChildren();
    this.hud = undefined;
    // text overlays live outside root and survive round restarts — keep their marks
    this.marked = this.marked.filter((m) => m.key.startsWith('text:'));
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
        if (this.dead) return; // destroyed while the logo decoded
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
    this.pulseButton(this.button('Tap to start', 412, () => this.beginRound()));
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
    if (this.hud) {
      this.hud.text = `${Math.min(this.score, target)} / ${target}`;
      this.popHud();
    }
    if (this.score >= target) void this.showEndCard();
  }

  // quick scale pop on the score counter — makes every point feel earned
  private popHud() {
    const hud = this.hud;
    if (!hud) return;
    let s = 1.45;
    const cb = () => {
      if (hud.destroyed) { this.app.ticker.remove(cb); return; }
      s += (1 - s) * 0.25;
      hud.scale.set(s);
      if (Math.abs(s - 1) < 0.01) { hud.scale.set(1); this.app.ticker.remove(cb); }
    };
    this.app.ticker.add(cb);
  }

  private async showEndCard() {
    this.clear();
    // brand logo above the headline when available (cached by Assets)
    if (this.cfg.brand.logoDataUrl) {
      try {
        const tex = await Assets.load({ src: this.cfg.brand.logoDataUrl, loadParser: 'loadTextures' });
        if (this.dead) return;
        const logo = new Sprite(tex);
        logo.anchor.set(0.5);
        logo.scale.set(Math.min(120 / logo.width, 120 / logo.height));
        logo.x = W / 2;
        logo.y = 150;
        this.root.addChild(logo);
      } catch { /* logo optional */ }
    } else {
      this.label('🎉', 64, '#ffffff', 170);
    }
    this.label(this.cfg.endCard.headline, 24, '#ffffff', 290);
    const cta = this.button(this.cfg.cta.text, 420, () => this.onCta(this.cfg.cta.url));
    // pivot at center so the pulse scales in place
    cta.pivot.set(120, 28);
    cta.x = W / 2;
    cta.y = 448;
    this.celebrate(cta);
  }

  // Confetti rain + CTA pulse for the end card. One ticker callback drives
  // both; it self-removes when the end card is cleared or the app dies.
  private celebrate(cta: Container) {
    const palette = [this.cfg.brand.primaryColor, lighten(this.cfg.brand.primaryColor, 0.4), '#fcb514', '#ffffff'];
    const confetti = new Container();
    this.root.addChildAt(confetti, 0); // behind the labels/button
    interface Piece { g: Graphics; vy: number; vr: number; sway: number; phase: number }
    const pieces: Piece[] = [];
    for (let i = 0; i < 36; i++) {
      const g = new Graphics().roundRect(-4, -7, 8, 14, 2).fill(palette[i % palette.length]);
      g.x = Math.random() * W;
      g.y = -20 - Math.random() * H; // staggered entry
      g.rotation = Math.random() * Math.PI;
      g.alpha = 0.9;
      confetti.addChild(g);
      pieces.push({ g, vy: 90 + Math.random() * 130, vr: (Math.random() - 0.5) * 5, sway: 14 + Math.random() * 22, phase: Math.random() * Math.PI * 2 });
    }
    let t = 0;
    const cb = () => {
      if (confetti.destroyed || cta.destroyed) { this.app.ticker.remove(cb); return; }
      const dt = this.app.ticker.deltaMS / 1000;
      t += dt;
      for (const p of pieces) {
        p.g.y += p.vy * dt;
        p.g.x += Math.sin(t * 2 + p.phase) * p.sway * dt;
        p.g.rotation += p.vr * dt;
        if (p.g.y > H + 20) { p.g.y = -20; p.g.x = Math.random() * W; }
      }
      cta.scale.set(1 + 0.05 * Math.sin(t * 5));
    };
    this.app.ticker.add(cb);
  }
}
