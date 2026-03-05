import type { CSSProperties } from 'react';

const darkTemplates: Record<string, CSSProperties> = {
  // Login backgrounds
  'gradient-mesh': { background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #0f172a 50%, #164e63 75%, #0f172a 100%)' },
  'gradient-aurora': { background: 'linear-gradient(135deg, #020617 0%, #0c4a6e 30%, #134e4a 50%, #1e1b4b 70%, #020617 100%)' },
  'gradient-cosmic': { background: 'linear-gradient(135deg, #0f0720 0%, #2d1b69 30%, #1a0a3e 50%, #0d1f3c 70%, #0f0720 100%)' },
  'gradient-ocean': { background: 'linear-gradient(135deg, #0c1220 0%, #0c4a6e 30%, #155e75 50%, #0e7490 60%, #0c1220 100%)' },
  'gradient-sunset': { background: 'linear-gradient(135deg, #1a0a0a 0%, #7c2d12 25%, #92400e 40%, #78350f 55%, #1a0a0a 100%)' },
  'gradient-forest': { background: 'linear-gradient(135deg, #052e16 0%, #14532d 25%, #166534 40%, #065f46 55%, #052e16 100%)' },
  'gradient-slate': { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #334155 50%, #1e293b 70%, #0f172a 100%)' },
  // App backgrounds
  'app-subtle-grid': { background: '#030712', backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' },
  'app-subtle-dots': { background: '#030712', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' },
  'app-gradient-dark': { background: 'linear-gradient(180deg, #0f172a 0%, #030712 40%, #030712 100%)' },
  'app-noise': { background: '#030712', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")' },
  'app-mesh-dark': { background: 'linear-gradient(135deg, #030712 0%, #0f172a 25%, #030712 50%, #111827 75%, #030712 100%)' },
  'app-vignette': { background: 'radial-gradient(ellipse at center, #111827 0%, #030712 70%)' },
  'app-deep-space': { background: 'linear-gradient(180deg, #020617 0%, #0c0a1d 30%, #0a0f1e 60%, #020617 100%)' },
};

const lightTemplates: Record<string, CSSProperties> = {
  // Login backgrounds - light equivalents
  'gradient-mesh': { background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 25%, #e0e7ff 50%, #a5f3fc 75%, #e0e7ff 100%)' },
  'gradient-aurora': { background: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 30%, #99f6e4 50%, #e0e7ff 70%, #f0f9ff 100%)' },
  'gradient-cosmic': { background: 'linear-gradient(135deg, #faf5ff 0%, #c4b5fd 30%, #e9d5ff 50%, #bfdbfe 70%, #faf5ff 100%)' },
  'gradient-ocean': { background: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 30%, #a5f3fc 50%, #67e8f9 60%, #f0f9ff 100%)' },
  'gradient-sunset': { background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 25%, #fdba74 40%, #fde68a 55%, #fff7ed 100%)' },
  'gradient-forest': { background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 25%, #86efac 40%, #a7f3d0 55%, #f0fdf4 100%)' },
  'gradient-slate': { background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 50%, #e2e8f0 70%, #f8fafc 100%)' },
  // App backgrounds - light equivalents
  'app-subtle-grid': { background: '#f9fafb', backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' },
  'app-subtle-dots': { background: '#f9fafb', backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)', backgroundSize: '24px 24px' },
  'app-gradient-dark': { background: 'linear-gradient(180deg, #e2e8f0 0%, #f9fafb 40%, #f9fafb 100%)' },
  'app-noise': { background: '#f9fafb', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")' },
  'app-mesh-dark': { background: 'linear-gradient(135deg, #f9fafb 0%, #e2e8f0 25%, #f9fafb 50%, #f3f4f6 75%, #f9fafb 100%)' },
  'app-vignette': { background: 'radial-gradient(ellipse at center, #ffffff 0%, #f3f4f6 70%)' },
  'app-deep-space': { background: 'linear-gradient(180deg, #f1f5f9 0%, #e8edf5 30%, #eef2f7 60%, #f1f5f9 100%)' },
};

function isLightMode(): boolean {
  return document.documentElement.classList.contains('light');
}

export function getBackgroundStyle(id: string | null | undefined): CSSProperties {
  if (!id) return {};
  const templates = isLightMode() ? lightTemplates : darkTemplates;
  return templates[id] || {};
}
