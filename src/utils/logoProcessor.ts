const LOGO_URL = '/assets/aistudio/images_ec8962d0.png';

export interface ProcessedLogo {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

let cachedPromise: Promise<ProcessedLogo | null> | null = null;

/**
 * Removes the light background from the Estação Cupim logo using smooth
 * luminance-to-alpha extraction, converts ink pixels to warm ivory (#F5F0E8),
 * and trims surrounding transparent margins so the emblem sits cleanly on dark
 * and glass surfaces with zero rectangular halo.
 */
export function getTransparentLogo(
  tintRgb: [number, number, number] = [245, 240, 232]
): Promise<ProcessedLogo | null> {
  if (cachedPromise) return cachedPromise;

  cachedPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const w = img.naturalWidth || 225;
        const h = img.naturalHeight || 225;
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = w;
        rawCanvas.height = h;
        const ctx = rawCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const srcAlpha = data[idx + 3] / 255;

            // Perceived luminance (255 = pure white background, 0 = solid black ink)
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            // Smooth threshold eliminates light JPEG/PNG compression noise cleanly
            const rawInk = (242 - lum) / 210;
            const alpha = Math.max(0, Math.min(1, rawInk)) * srcAlpha;

            if (alpha <= 0.04) {
              data[idx + 3] = 0;
            } else {
              // Slight contrast curve for crisp fine lines on dark backgrounds
              const boosted = Math.min(1, Math.pow(alpha, 0.85) * 1.08);
              data[idx] = tintRgb[0];
              data[idx + 1] = tintRgb[1];
              data[idx + 2] = tintRgb[2];
              data[idx + 3] = Math.round(boosted * 255);

              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        if (maxX <= minX || maxY <= minY) {
          resolve(null);
          return;
        }

        // Crop tight around the artwork with a tiny 2px breathing edge
        const pad = 2;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
        const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = sw;
        croppedCanvas.height = sh;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) {
          resolve(null);
          return;
        }

        croppedCtx.drawImage(rawCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

        resolve({
          dataUrl: croppedCanvas.toDataURL('image/png'),
          width: sw,
          height: sh,
          aspectRatio: sw / sh,
        });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });

  return cachedPromise;
}
