import { useEffect } from 'react';
import { useBranding } from './useBranding';

const DEFAULT_TITLE = 'HiveTech PM';
const DEFAULT_FAVICON = '/favicon.ico';

export function useBrandingEffect(workspaceId: string) {
  const { data: branding } = useBranding(workspaceId);

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

    return () => {
      document.title = DEFAULT_TITLE;
      const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (link) link.href = DEFAULT_FAVICON;
    };
  }, [branding]);

  return branding;
}
