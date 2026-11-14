import React from 'react';
import { BUDS_FINISHES } from '../data/presets';
import { BudsFinishId } from '../types/widget';

interface BudSvgProps {
  finishId: BudsFinishId;
  side: 'left' | 'right';
  size?: number;
}

export const BudIllustration: React.FC<BudSvgProps> = ({
  finishId,
  side,
  size = 44,
}) => {
  const finish = BUDS_FINISHES[finishId];
  const isLeft = side === 'left';
  const gradId = `bud-grad-${finishId}-${side}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="select-none drop-shadow-sm"
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={finish.accent} />
          <stop offset="60%" stopColor={finish.shell} />
          <stop offset="100%" stopColor={finish.shellShade} />
        </radialGradient>
      </defs>

      <g transform={isLeft ? 'translate(-2, 0)' : 'translate(66, 0) scale(-1, 1)'}>
        {/* Dark inner acoustic body & ear tip peeking left (mirrors for right) */}
        <ellipse cx="25" cy="34" rx="11.5" ry="9.5" fill="#1C2430" />
        {/* Soft matte silicone ear tip */}
        <ellipse cx="17.5" cy="35.5" rx="5.2" ry="7.2" fill="#111722" />
        <ellipse cx="17.2" cy="35.5" rx="2.8" ry="4.4" fill="#0B0F17" />

        {/* Subtle stabilizer wing contour at upper inner rim */}
        <path
          d="M27 24C28.5 21 32.5 20 35.5 21.5L31 27.5L27 24Z"
          fill="#1C2430"
        />

        {/* Circular touch-capacitive outer bud disc (centered visually in ring) */}
        <circle cx="36" cy="32" r="14.5" fill={`url(#${gradId})`} />
        <circle
          cx="36"
          cy="32"
          r="14.1"
          stroke="#FFFFFF"
          strokeOpacity="0.35"
          strokeWidth="0.7"
        />
      </g>
    </svg>
  );
};

interface CaseSvgProps {
  finishId: BudsFinishId;
  lidOpen: boolean;
  isCharging: boolean;
  size?: number;
}

export const CaseIllustration: React.FC<CaseSvgProps> = ({
  size = 38,
}) => {
  return (
    <img
      src="/assets/aistudio/PixelBudsCase_039ee831.png"
      alt="Pixel Buds charging case"
      draggable={false}
      style={{ width: size, height: size }}
      className="object-contain select-none pointer-events-none drop-shadow-sm"
    />
  );
};
