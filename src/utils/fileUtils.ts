import { useEffect, useState } from 'react';

/**
 * Converts a base64 data: URL into a Blob URL.
 * Blob URLs render reliably inside <iframe>/<embed> even for large
 * files (a few MB+), where browsers can silently fail to display a
 * raw data: URI of the same size. Downloads via <a href download>
 * still work fine with a plain data: URL either way.
 */
export function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return null;
    const header = dataUrl.slice(0, commaIndex);
    const base64 = dataUrl.slice(commaIndex + 1);
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to convert data URL to Blob URL', e);
    return null;
  }
}

/**
 * React hook: given a data:...;base64,... URL (or undefined), returns a
 * Blob URL that's safe to use as an <iframe src>. Automatically revokes
 * the previous Blob URL when the input changes or the component unmounts,
 * to avoid leaking memory.
 */
export function useBlobPreviewUrl(dataUrl: string | undefined | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      setBlobUrl(null);
      return;
    }
    const url = dataUrlToBlobUrl(dataUrl);
    setBlobUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [dataUrl]);

  return blobUrl;
}
