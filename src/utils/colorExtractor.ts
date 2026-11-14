import { WidgetAppearance } from '../types/widget';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) {
    return { r: 14, g: 35, b: 66 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgba(hex: string, opacityPercent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const alpha = clamp(opacityPercent / 100, 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h >= 0 && h < 60) {
    rn = c;
    gn = x;
  } else if (h >= 60 && h < 120) {
    rn = x;
    gn = c;
  } else if (h >= 120 && h < 180) {
    gn = c;
    bn = x;
  } else if (h >= 180 && h < 240) {
    gn = x;
    bn = c;
  } else if (h >= 240 && h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return rgbToHex({
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  });
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function buildMaterialYouPaletteFromSeed(
  seedHex: string,
  preferLight = false
): Partial<WidgetAppearance> {
  const hsl = rgbToHsl(hexToRgb(seedHex));
  const hue = hsl.h;
  const sat = clamp(hsl.s, 18, 68);

  if (preferLight) {
    return {
      surfaceColor: hslToHex(hue, Math.min(sat, 26), 95),
      primaryContainerColor: hslToHex(hue, Math.max(sat, 50), 84),
      onPrimaryContainerColor: hslToHex(hue, Math.max(sat, 60), 16),
      activeRingColor: hslToHex(hue, Math.max(sat, 65), 44),
      ringTrackColor: hslToHex(hue, Math.min(sat, 22), 86),
      ringInnerFillColor: hslToHex(hue, Math.min(sat, 24), 90),
      textColor: hslToHex(hue, 20, 10),
      mutedTextColor: hslToHex(hue, 16, 36),
      controlSurfaceColor: hslToHex(hue, Math.min(sat, 24), 88),
    };
  }

  return {
    surfaceColor: hslToHex(hue, Math.min(sat, 42), 14),
    primaryContainerColor: hslToHex(hue, Math.max(sat, 58), 72),
    onPrimaryContainerColor: hslToHex(hue, Math.max(sat, 58), 14),
    activeRingColor: hslToHex(hue, Math.max(sat, 62), 68),
    ringTrackColor: hslToHex(hue, Math.min(sat, 36), 24),
    ringInnerFillColor: hslToHex(hue, Math.min(sat, 38), 19),
    textColor: hslToHex(hue, 20, 95),
    mutedTextColor: hslToHex(hue, 22, 74),
    controlSurfaceColor: hslToHex(hue, Math.min(sat, 36), 23),
  };
}

export async function extractMaterialYouFromImage(
  imageDataUrl: string
): Promise<{
  dominantHex: string;
  isDarkWallpaper: boolean;
  palette: Partial<WidgetAppearance>;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 48;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let lumaSum = 0;
      let count = 0;

      // Also track most vibrant non-gray pixel for Monet accent
      let bestScore = -1;
      let bestRgb: RGB = { r: 114, g: 168, b: 249 };

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;

        rSum += r;
        gSum += g;
        bSum += b;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumaSum += luma;
        count++;

        const hsl = rgbToHsl({ r, g, b });
        const vibrancy = hsl.s * (1 - Math.abs(hsl.l - 50) / 60);
        if (vibrancy > bestScore) {
          bestScore = vibrancy;
          bestRgb = { r, g, b };
        }
      }

      if (count === 0) {
        reject(new Error('No opaque pixels found'));
        return;
      }

      const avgLuma = lumaSum / count;
      const isDarkWallpaper = avgLuma < 145;
      const dominantHex = rgbToHex({
        r: rSum / count,
        g: gSum / count,
        b: bSum / count,
      });
      const vibrantHex = rgbToHex(bestRgb);

      resolve({
        dominantHex,
        isDarkWallpaper,
        palette: buildMaterialYouPaletteFromSeed(vibrantHex, !isDarkWallpaper),
      });
    };
    img.onerror = () => reject(new Error('Failed to decode wallpaper image'));
    img.src = imageDataUrl;
  });
}
