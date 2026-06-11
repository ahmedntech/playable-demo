import type { PlayableConfig } from '../runtime/types';

// Per-network specs. AppLovin/Unity/ironSource/Vungle all follow MRAID closely,
// so they share the same template; only size budgets & metadata differ.
// Meta and Google use different click APIs — add them as separate templates later.
export interface NetworkSpec {
  id: string;
  label: string;
  maxBytes: number; // hard size ceiling for the single HTML file
  mraid: boolean;
}

export const NETWORKS: Record<string, NetworkSpec> = {
  applovin: { id: 'applovin', label: 'AppLovin', maxBytes: 5 * 1024 * 1024, mraid: true },
  unity: { id: 'unity', label: 'Unity Ads', maxBytes: 5 * 1024 * 1024, mraid: true },
  ironsource: { id: 'ironsource', label: 'ironSource', maxBytes: 5 * 1024 * 1024, mraid: true },
};

export interface ExportResult {
  html: string;
  bytes: number;
  ok: boolean; // within the network's size budget
  spec: NetworkSpec;
}

// Fetches the prebuilt runtime once. Inlined verbatim into every export so the
// shipped ad runs the exact code the user previewed.
async function loadRuntimeSource(): Promise<string> {
  const res = await fetch('/runtime.iife.js');
  if (!res.ok) throw new Error('runtime.iife.js not found — run `npm run build:runtime`');
  return res.text();
}

// The CTA wiring: prefer the MRAID open() API the network injects at runtime,
// fall back to window.open for standalone testing.
function ctaBridge(useMraid: boolean): string {
  if (!useMraid) return `function __cta(url){ window.open(url, '_blank'); }`;
  return `
    function __cta(url){
      try {
        if (typeof mraid !== 'undefined' && mraid.open) { mraid.open(url); return; }
      } catch (e) {}
      window.open(url, '_blank');
    }`;
}

export async function exportPlayable(
  config: PlayableConfig,
  networkId: string
): Promise<ExportResult> {
  const spec = NETWORKS[networkId];
  if (!spec) throw new Error('Unknown network: ' + networkId);
  const runtime = await loadRuntimeSource();
  const configJson = JSON.stringify(config);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<meta name="ad.size" content="width=360,height=640" />
${spec.mraid ? '<script src="mraid.js"></script>' : ''}
<title>${escapeHtml(config.brand.name)}</title>
<style>
  html,body{margin:0;height:100%;background:${config.brand.bgColor};overflow:hidden;}
  #stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;}
</style>
</head>
<body>
<div id="stage"></div>
<script>${runtime}</script>
<script>
  ${ctaBridge(spec.mraid)}
  var __config = ${configJson};
  function __boot(){
    window.PlayableRuntime.start(__config, document.getElementById('stage'), { onCta: __cta });
  }
  ${spec.mraid
    ? `// MRAID lifecycle: wait until the container says the ad is viewable.
       if (typeof mraid !== 'undefined') {
         if (mraid.getState && mraid.getState() === 'loading') {
           mraid.addEventListener('ready', __boot);
         } else { __boot(); }
       } else { __boot(); }`
    : `__boot();`}
</script>
</body>
</html>`;

  const bytes = new Blob([html]).size;
  return { html, bytes, ok: bytes <= spec.maxBytes, spec };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
