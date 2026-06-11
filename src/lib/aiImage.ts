// AI image generation via Google's Gemini image model ("nano banana").
// The user supplies their own API key (stored locally); calls go straight from
// the browser to Google — no backend needed for this tool.
//
// Game sprites need transparency, but image models return opaque pictures —
// so for element art we ask for a solid uniform backdrop and chroma-key it
// out client-side (sampling the corners to find the actual backdrop color).

const KEY_STORAGE = 'bigwolf-gemini-key';
const MODEL = 'gemini-2.5-flash-image';

export function getApiKey(): string | null {
  try { return localStorage.getItem(KEY_STORAGE); } catch { return null; }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}

export interface GenerateOptions {
  prompt: string;
  aspect: '1:1' | '9:16';
  removeBg: boolean; // sprite mode: solid backdrop requested + keyed out
}

export async function generateImage({ prompt, aspect, removeBg }: GenerateOptions): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error('No API key set');

  const fullPrompt = removeBg
    ? `${prompt}. Single subject, centered, no text. Plain uniform solid bright green (#00FF00) background filling the entire frame edge to edge.`
    : prompt;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: aspect },
        },
      }),
    }
  );

  if (!res.ok) {
    let msg = `Gemini API error (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error?.message) msg = err.error.message;
    } catch { /* keep status message */ }
    throw new Error(msg);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
  const data = img?.inlineData ?? img?.inline_data;
  if (!data?.data) throw new Error('The model returned no image — try rewording the prompt');
  const dataUrl = `data:${data.mimeType ?? data.mime_type ?? 'image/png'};base64,${data.data}`;

  return removeBg ? chromaKey(dataUrl) : dataUrl;
}

// Removes a near-uniform backdrop by sampling the image corners for its color,
// then feathering alpha by color distance. Includes a simple de-spill pass so
// keyed edges don't glow green.
async function chromaKey(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;

  // backdrop color = average of the four 6x6 corner patches
  const corners = [
    [0, 0], [c.width - 6, 0], [0, c.height - 6], [c.width - 6, c.height - 6],
  ];
  let br = 0, bg = 0, bb = 0, n = 0;
  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < 6; dy++) {
      for (let dx = 0; dx < 6; dx++) {
        const i = ((cy + dy) * c.width + (cx + dx)) * 4;
        br += d[i]; bg += d[i + 1]; bb += d[i + 2]; n++;
      }
    }
  }
  br /= n; bg /= n; bb /= n;

  const HARD = 70; // distance fully transparent below this
  const SOFT = 140; // fully opaque above this
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i] - br, d[i + 1] - bg, d[i + 2] - bb);
    if (dist < HARD) {
      d[i + 3] = 0;
    } else if (dist < SOFT) {
      d[i + 3] = Math.round(((dist - HARD) / (SOFT - HARD)) * 255);
      // de-spill: pull the channel that dominates the backdrop toward the others
      const maxCh = bg >= br && bg >= bb ? 1 : br >= bb ? 0 : 2;
      const others = (d[i + ((maxCh + 1) % 3)] + d[i + ((maxCh + 2) % 3)]) / 2;
      if (d[i + maxCh] > others) d[i + maxCh] = others;
    }
  }
  x.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode generated image'));
    img.src = src;
  });
}
