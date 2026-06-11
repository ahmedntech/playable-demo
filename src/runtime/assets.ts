import { Sprite, type Texture } from 'pixi.js';

// Scales a texture to FIT inside w×h (whole image visible), anchored at center.
// Used to drop a user's uploaded art in place of a drawn game object.
export function fitSprite(tex: Texture, w: number, h: number): Sprite {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.scale.set(Math.min(w / tex.width, h / tex.height));
  return s;
}

// Scales a texture to COVER w×h (fills the area, may crop), top-left anchored.
// Used for the background image.
export function coverSprite(tex: Texture, w: number, h: number): Sprite {
  const s = new Sprite(tex);
  const sc = Math.max(w / tex.width, h / tex.height);
  s.scale.set(sc);
  s.x = (w - tex.width * sc) / 2;
  s.y = (h - tex.height * sc) / 2;
  return s;
}
