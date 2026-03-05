import { useEffect } from 'react';
import { useBranding } from './useBranding';

const DEFAULT_TITLE = 'HiveTech PM';
const DEFAULT_FAVICON = '/favicon.ico';

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(baseHex: string): Record<string, string> {
  const hsl = hexToHsl(baseHex);
  if (!hsl) return {};
  const { h, s } = hsl;
  // Generate shades from light to dark, base = 500
  return {
    '--primary-50': hslToHex(h, Math.min(s, 100), 97),
    '--primary-100': hslToHex(h, Math.min(s, 96), 93),
    '--primary-200': hslToHex(h, Math.min(s, 90), 85),
    '--primary-300': hslToHex(h, Math.min(s, 85), 72),
    '--primary-400': hslToHex(h, Math.min(s, 80), 58),
    '--primary-500': baseHex,
    '--primary-600': hslToHex(h, Math.min(s + 5, 100), 38),
    '--primary-700': hslToHex(h, Math.min(s + 8, 100), 30),
    '--primary-800': hslToHex(h, Math.min(s + 10, 100), 23),
    '--primary-900': hslToHex(h, Math.min(s + 10, 100), 18),
    '--primary-950': hslToHex(h, Math.min(s + 10, 100), 10),
  };
}

export function useBrandingEffect() {
  const { data: branding } = useBranding();

  useEffect(() => {
    if (!branding) {
      document.title = DEFAULT_TITLE;
      return;
    }

    // Update document title
    if (branding.orgName) {
      document.title = branding.orgName;
    } else {
      document.title = DEFAULT_TITLE;
    }

    // Update favicon
    if (branding.faviconUrl) {
      const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
      const faviconUrl = branding.faviconUrl.startsWith('http')
        ? branding.faviconUrl
        : `${apiBase}${branding.faviconUrl}`;

      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    // Apply primary color palette
    if (branding.primaryColor) {
      const palette = generatePalette(branding.primaryColor);
      const root = document.documentElement;
      for (const [key, value] of Object.entries(palette)) {
        root.style.setProperty(key, value);
      }
      // Also update the focus ring color in index.css
      root.style.setProperty('--focus-ring-color', branding.primaryColor);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (link) link.href = DEFAULT_FAVICON;
      // Remove custom primary colors
      const root = document.documentElement;
      const vars = ['--primary-50', '--primary-100', '--primary-200', '--primary-300', '--primary-400', '--primary-500', '--primary-600', '--primary-700', '--primary-800', '--primary-900', '--primary-950', '--focus-ring-color'];
      vars.forEach(v => root.style.removeProperty(v));
    };
  }, [branding]);

  return branding;
}
