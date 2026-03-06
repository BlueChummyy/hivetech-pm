import { useState, useEffect } from 'react';
import { attachmentsApi } from '@/api/attachments';

/**
 * Fetches a thumbnail blob URL for an image attachment.
 * Returns null while loading or if the attachment is not an image.
 */
export function useThumbnail(attachmentId: string, mimeType?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  const isImage = mimeType?.startsWith('image/') ?? false;

  useEffect(() => {
    if (!isImage || !attachmentId) return;

    let revoked = false;
    let objectUrl: string | null = null;

    attachmentsApi.thumbnail(attachmentId).then((blobUrl) => {
      if (revoked) {
        URL.revokeObjectURL(blobUrl);
        return;
      }
      objectUrl = blobUrl;
      setUrl(blobUrl);
    }).catch(() => {
      // Silently fail — will show file icon fallback
    });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, isImage]);

  return url;
}
