import { Application, Container, Graphics, Text, Sprite, Assets, Ticker } from 'pixi.js';
import type { PlayableConfig } from './types';

// Logical design size. The stage scales to fit whatever container it mounts in,
// so the same build works in a 320x480 ad slot or a full-screen preview.
const W = 360;
const H = 640;

export interface StartOptions {
  // Called when the user taps the CTA. Default opens config.cta.url.
  // Networks (MRAID etc.) override this to call their own click API.
  onCta?: (url: string) => void;
}

export class PlayableGame {
  private app = new Application();
  private root = new Container();
  private score = 0;
  private spawnTimer = 0;
  private targets: Container[] = [];
  private running = false;
  private cfg!: PlayableConfig;
  private onCta!: (url: string) => void;
  private hud!: Text;

  async start(config: PlayableConfig, mount: HTMLElement, opts: StartOptions = {}) {
    this.cfg = config;
    this.onCta = opts.onCta ?? ((url) => window.open(url, '_blank'));

    await this.app.init({
      width: W,
      height: H,
      background: config.brand.bgColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    // Scale-to-fit the mount container while preserving aspect ratio.
    const canvas = this.app.canvas;
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.style.display = 'block';
    canvas.style.margin = 'auto';
    mount.appendChild(canvas);

    this.app.stage.addChild(this.root);
    this.showIntro();
    return this;
  }

  destroy() {
    this.app.ticker.stop();
    this.app.destroy(true, { children: true });
  }

  private clear() {
    this.root.removeChildren();
    this.targets = [];
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
    const g = new Graphics().roundRect(0, 0, 240, 56, 28).fill(this.cfg.brand.primaryColor);
    const t = new Text({
      text,
      style: { fontFamily: 'Arial', fontSize: 22, fill: '#ffffff', fontWeight: 'bold' },
    });
    t.anchor.set(0.5);
    t.x = 120;
    t.y = 28;
    c.addChild(g, t);
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
        const scale = Math.min(160 / logo.width, 160 / logo.height);
        logo.scale.set(scale);
        logo.x = W / 2;
        logo.y = 200;
        this.root.addChild(logo);
      } catch { /* logo optional */ }
    }
    this.label(this.cfg.brand.name, 30, '#ffffff', 320);
    this.label(`Tap ${this.cfg.gameplay.targetScore} targets!`, 18, '#aab', 360);
    this.button('Tap to start', 440, () => this.startRound());
  }

  private startRound() {
    this.clear();
    this.score = 0;
    this.spawnTimer = 0;
    this.running = true;
    this.hud = this.label('0 / ' + this.cfg.gameplay.targetScore, 22, '#ffffff', 40);
    this.app.ticker.add(this.tick);
  }

  private tick = (ticker: Ticker) => {
    if (!this.running) return;
    const dt = ticker.deltaMS / 1000;
    // Difficulty 1..5 -> spawn interval 1.1s .. 0.35s
    const interval = 1.2 - this.cfg.gameplay.difficulty * 0.17;
    this.spawnTimer += dt;
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.spawnTarget();
    }
    // Age out targets
    for (const tgt of [...this.targets]) {
      (tgt as any)._life -= dt;
      const life = (tgt as any)._life as number;
      tgt.scale.set(Math.max(0.2, Math.min(1, life)));
      if (life <= 0) this.removeTarget(tgt);
    }
  };

  private spawnTarget() {
    const r = 34;
    const c = new Container();
    const g = new Graphics().circle(0, 0, r).fill(this.cfg.brand.primaryColor);
    const ring = new Graphics().circle(0, 0, r).stroke({ width: 4, color: 0xffffff, alpha: 0.6 });
    c.addChild(g, ring);
    c.x = r + 20 + Math.random() * (W - 2 * r - 40);
    c.y = r + 80 + Math.random() * (H - 2 * r - 160);
    // Lifetime shrinks with difficulty: 2.0s .. 1.0s
    (c as any)._life = 2.2 - this.cfg.gameplay.difficulty * 0.24;
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => this.onHit(c));
    this.root.addChild(c);
    this.targets.push(c);
  }

  private removeTarget(tgt: Container) {
    this.targets = this.targets.filter((t) => t !== tgt);
    tgt.destroy();
  }

  private onHit(tgt: Container) {
    if (!this.running) return;
    this.removeTarget(tgt);
    this.score++;
    this.hud.text = `${this.score} / ${this.cfg.gameplay.targetScore}`;
    if (this.score >= this.cfg.gameplay.targetScore) this.win();
  }

  private win() {
    this.running = false;
    this.app.ticker.remove(this.tick);
    this.showEndCard();
  }

  private showEndCard() {
    this.clear();
    this.label('🎉', 64, '#ffffff', 200);
    this.label(this.cfg.endCard.headline, 24, '#ffffff', 300);
    this.button(this.cfg.cta.text, 420, () => this.onCta(this.cfg.cta.url));
  }
}
