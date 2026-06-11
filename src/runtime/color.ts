// Tiny hex color helpers shared by the runtime for highlights/shadows/gradients.
function hexToRgb(hex: string) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return toHex({ r: r + (255 - r) * amt, g: g + (255 - g) * amt, b: b + (255 - b) * amt });
}

export function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return toHex({ r: r * (1 - amt), g: g * (1 - amt), b: b * (1 - amt) });
}
