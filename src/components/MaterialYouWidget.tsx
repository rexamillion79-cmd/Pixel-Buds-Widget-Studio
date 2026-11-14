import React from 'react';
import {
  Zap,
  Bluetooth,
  BluetoothSearching,
  BluetoothOff,
} from 'lucide-react';
import {
  BatteryState,
  ConnectionStatus,
  WidgetAppearance,
} from '../types/widget';
import { hexToRgba } from '../utils/colorExtractor';
import { BudIllustration, CaseIllustration } from './BudsIllustration';

interface MaterialYouWidgetProps {
  battery: BatteryState;
  appearance: WidgetAppearance;
  onToggleLeftCharging?: () => void;
  onToggleCaseCharging?: () => void;
  onToggleRightCharging?: () => void;
  onCycleConnection?: (target: 'left' | 'case' | 'right') => void;
}

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  accentColor: string;
  mutedColor: string;
  showLabel?: boolean;
}

const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  status,
  accentColor,
  mutedColor,
  showLabel = false,
}) => {
  if (status === 'pairing') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10.5px] font-medium"
        style={{ color: '#FBBF24' }}
        title="Pairing mode active"
      >
        <BluetoothSearching className="w-3 h-3 animate-pulse shrink-0" />
        {showLabel && <span>Pairing</span>}
      </span>
    );
  }
  if (status === 'disconnected') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10.5px] font-medium opacity-75"
        style={{ color: mutedColor }}
        title="Disconnected"
      >
        <BluetoothOff className="w-3 h-3 shrink-0" />
        {showLabel && <span>Offline</span>}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-medium"
      style={{ color: accentColor }}
      title="Connected"
    >
      <Bluetooth className="w-3 h-3 shrink-0" />
      {showLabel && <span>Connected</span>}
    </span>
  );
};

interface BatteryRingProps {
  percent: number;
  isCharging: boolean;
  connection: ConnectionStatus;
  appearance: WidgetAppearance;
  ringColor: string;
  label: string;
  subLabel?: string;
  sizePx?: number;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}

const BatteryRing: React.FC<BatteryRingProps> = ({
  percent,
  isCharging,
  connection,
  appearance,
  ringColor,
  label,
  subLabel,
  sizePx = 78,
  onClick,
  title,
  children,
}) => {
  const stroke = appearance.ringStrokeWidth;
  const center = sizePx / 2;
  const radius = center - stroke - 2.5;
  const circumference = 2 * Math.PI * radius;

  const isDisconnected = connection === 'disconnected';
  const isPairing = connection === 'pairing';
  const effectivePercent = isDisconnected ? 0 : Math.max(0, Math.min(100, percent));

  const hasBoltGap = isCharging && appearance.showChargingBolt && !isDisconnected;
  // Clean 42-degree gap at 12 o'clock framing the charging bolt circle just like the photo
  const maxSweepRatio = hasBoltGap ? 0.875 : 1;
  const activeSweep = (effectivePercent / 100) * circumference * maxSweepRatio;
  const trackSweep = circumference * maxSweepRatio;
  const rotationDeg = hasBoltGap ? -90 + (360 * (1 - maxSweepRatio)) / 2 : -90;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-2xl py-1 px-0 transition-all duration-150 active:scale-[0.97] cursor-pointer ${
        isDisconnected ? 'opacity-55' : 'opacity-100'
      }`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: sizePx, height: sizePx }}
      >
        {/* Inner tonal disc */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200"
          style={{
            width: radius * 2 - stroke * 0.9,
            height: radius * 2 - stroke * 0.9,
            backgroundColor: appearance.ringInnerFillColor,
            opacity: appearance.surfaceOpacity < 25 ? 0.82 : 1,
          }}
        />

        {/* Circular SVG Ring (absolute so it never offsets center icon) */}
        <svg
          width={sizePx}
          height={sizePx}
          viewBox={`0 0 ${sizePx} ${sizePx}`}
          className="absolute inset-0 overflow-visible"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={appearance.ringTrackColor}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={isPairing ? '5 5' : `${trackSweep} ${circumference}`}
            transform={`rotate(${rotationDeg} ${center} ${center})`}
          />
          {!isDisconnected && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={isPairing ? '#FBBF24' : ringColor}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={
                isPairing ? '6 6' : `${activeSweep} ${circumference}`
              }
              transform={`rotate(${rotationDeg} ${center} ${center})`}
              style={{
                transition:
                  'stroke-dasharray 320ms cubic-bezier(0.16, 1, 0.3, 1), stroke 220ms ease',
              }}
            />
          )}
        </svg>

        {/* Top-center Charging Lightning Badge centered directly on the 12 o'clock ring radius */}
        {hasBoltGap && (
          <div
            className="absolute z-20 w-[19px] h-[19px] rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110"
            style={{
              top: `${center - radius}px`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: ringColor,
              color: '#051B2C',
            }}
          >
            <Zap className="w-2.5 h-2.5 fill-current stroke-[2.2]" />
          </div>
        )}

        {/* Center Hardware Illustration */}
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-transform duration-200 group-hover:scale-105">
          {children}
        </div>
      </div>

      {/* Numeric Readout + Connection Indicator (only show icon in sparse mode if pairing/offline so connected matches reference cleanly) */}
      <div className="mt-2 flex items-center gap-1">
        <span
          className="text-[14.5px] font-normal tracking-tight tabular-nums leading-tight"
          style={{ color: appearance.textColor }}
        >
          {label}
        </span>
        {appearance.density === 'sparse' && connection !== 'connected' && (
          <ConnectionBadge
            status={connection}
            accentColor={ringColor}
            mutedColor={appearance.mutedTextColor}
          />
        )}
      </div>

      {(appearance.density === 'dense' || subLabel) && (
        <div className="mt-0.5 flex flex-col items-center gap-0.5">
          {appearance.density === 'dense' && (
            <ConnectionBadge
              status={connection}
              accentColor={ringColor}
              mutedColor={appearance.mutedTextColor}
              showLabel
            />
          )}
          {subLabel && (
            <span
              className="text-[10.5px] tabular-nums leading-tight opacity-85"
              style={{ color: appearance.mutedTextColor }}
            >
              {subLabel}
            </span>
          )}
        </div>
      )}
    </button>
  );
};

export const MaterialYouWidget: React.FC<MaterialYouWidgetProps> = ({
  battery,
  appearance,
  onToggleLeftCharging,
  onToggleCaseCharging,
  onToggleRightCharging,
  onCycleConnection,
}) => {

  const getRingColor = (
    percent: number,
    isCharging: boolean,
    connection: ConnectionStatus
  ): string => {
    if (connection === 'pairing') return '#FBBF24';
    if (connection === 'disconnected') return appearance.mutedTextColor;
    if (percent <= 10 && !isCharging) return appearance.criticalRingColor;
    if (percent <= 20 && !isCharging) return appearance.warningRingColor;
    if (isCharging) return appearance.chargingRingColor;
    return appearance.activeRingColor;
  };

  const getConnectionHeadline = (): string => {
    if (
      battery.leftConnection === 'pairing' ||
      battery.rightConnection === 'pairing' ||
      battery.caseConnection === 'pairing'
    ) {
      return 'Pairing';
    }
    if (
      battery.leftConnection === 'disconnected' &&
      battery.rightConnection === 'disconnected' &&
      battery.caseConnection === 'disconnected'
    ) {
      return 'Disconnected';
    }
    if (battery.left <= 15 || battery.right <= 15 || battery.caseBattery <= 15) {
      return 'Low battery';
    }
    if (battery.leftCharging || battery.rightCharging || battery.caseCharging) {
      return 'Charging';
    }
    return 'Connected';
  };

  const formatLabel = (
    side: 'L' | 'C' | 'R',
    percent: number,
    conn: ConnectionStatus
  ): string => {
    const val = conn === 'disconnected' ? '--' : `${percent}%`;
    if (appearance.labelFormat === 'full') {
      const prefix = side === 'L' ? 'Left' : side === 'C' ? 'Case' : 'Right';
      return `${prefix} ${val}`;
    }
    return `${side}: ${val}`;
  };

  const estimateBudHours = (
    percent: number,
    isCharging: boolean,
    conn: ConnectionStatus
  ): string => {
    if (conn === 'disconnected') return 'Offline';
    if (conn === 'pairing') return 'Searching';
    if (isCharging) {
      const mins = Math.max(4, Math.round((100 - percent) * 0.45));
      return percent === 100 ? 'Full' : `${mins}m to full`;
    }
    const maxHrs = battery.ancMode === 'anc' ? 8 : 12;
    const hrs = ((percent / 100) * maxHrs).toFixed(1);
    return `~${hrs}h left`;
  };

  const estimateCaseHours = (
    percent: number,
    isCharging: boolean,
    conn: ConnectionStatus
  ): string => {
    if (conn === 'disconnected') return 'Lid closed';
    if (conn === 'pairing') return 'Pairing';
    if (isCharging) {
      const mins = Math.max(5, Math.round((100 - percent) * 0.9));
      return percent === 100 ? 'Full' : `${mins}m to full`;
    }
    const hrs = Math.round((percent / 100) * 30);
    return `+${hrs}h reserve`;
  };

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: hexToRgba(appearance.surfaceColor, appearance.surfaceOpacity),
    backdropFilter:
      appearance.backdropBlur > 0 && appearance.surfaceOpacity > 0
        ? `blur(${appearance.backdropBlur}px)`
        : undefined,
    WebkitBackdropFilter:
      appearance.backdropBlur > 0 && appearance.surfaceOpacity > 0
        ? `blur(${appearance.backdropBlur}px)`
        : undefined,
    borderRadius: `${appearance.cornerRadius}px`,
    border:
      appearance.borderOpacity > 0
        ? `1px solid rgba(255, 255, 255, ${(appearance.borderOpacity / 100).toFixed(2)})`
        : '1px solid transparent',
    width: `${appearance.widgetWidthPx}px`,
    maxWidth: '100%',
    minHeight: `${appearance.widgetHeightPx}px`,
  };

  const leftColor = getRingColor(
    battery.left,
    battery.leftCharging,
    battery.leftConnection
  );
  const caseColor = getRingColor(
    battery.caseBattery,
    battery.caseCharging,
    battery.caseConnection
  );
  const rightColor = getRingColor(
    battery.right,
    battery.rightCharging,
    battery.rightConnection
  );

  const showSubEstimates = appearance.showEstimates || appearance.density === 'dense';

  // Determine active layout mode (or auto-adapt based on dimensions)
  const effectiveLayout = appearance.layoutMode;

  return (
    <div
      className="group/widget relative shadow-2xl transition-all duration-200 flex flex-col justify-between"
      style={surfaceStyle}
      role="region"
      aria-label="Pixel Buds Material You battery widget"
    >
      {/* 1. COMPACT HORIZONTAL VIEW */}
      {effectiveLayout === 'horizontal' && (
        <div className="px-4 py-3 flex-1 flex items-center justify-center">
          <div className="w-full grid grid-cols-3 gap-2">
            {[
              {
                key: 'L',
                pct: battery.left,
                chg: battery.leftCharging,
                conn: battery.leftConnection,
                col: leftColor,
                fn: onToggleLeftCharging,
                target: 'left' as const,
              },
              {
                key: 'C',
                pct: battery.caseBattery,
                chg: battery.caseCharging,
                conn: battery.caseConnection,
                col: caseColor,
                fn: onToggleCaseCharging,
                target: 'case' as const,
              },
              {
                key: 'R',
                pct: battery.right,
                chg: battery.rightCharging,
                conn: battery.rightConnection,
                col: rightColor,
                fn: onToggleRightCharging,
                target: 'right' as const,
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.fn}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onCycleConnection?.(item.target);
                }}
                className={`flex flex-col items-center justify-center px-2.5 py-2 rounded-2xl transition-colors cursor-pointer ${
                  item.conn === 'disconnected' ? 'opacity-50' : ''
                }`}
                style={{ backgroundColor: appearance.controlSurfaceColor }}
                title="Click to toggle charging · Right-click to cycle connection"
              >
                <div className="flex items-center gap-1">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: item.col }}
                  >
                    {item.key}
                  </span>
                  {item.chg && appearance.showChargingBolt && item.conn !== 'disconnected' && (
                    <Zap className="w-2.5 h-2.5" style={{ color: item.col }} />
                  )}
                  <ConnectionBadge
                    status={item.conn}
                    accentColor={item.col}
                    mutedColor={appearance.mutedTextColor}
                  />
                </div>
                <span
                  className="text-xs font-medium tabular-nums mt-0.5"
                  style={{ color: appearance.textColor }}
                >
                  {item.conn === 'disconnected' ? '--' : `${item.pct}%`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. STANDARD MATERIAL YOU 4x2 VIEW */}
      {effectiveLayout !== 'horizontal' && (
        <div className="px-5 py-5 flex-1 flex flex-col justify-center">
          {/* Main 3-Column Battery Ring Row with generous spacing so circles never touch */}
          <div className="grid grid-cols-3 items-start justify-items-center gap-5 sm:gap-6">
            <BatteryRing
              percent={battery.left}
              isCharging={battery.leftCharging}
              connection={battery.leftConnection}
              appearance={appearance}
              ringColor={leftColor}
              label={formatLabel('L', battery.left, battery.leftConnection)}
              subLabel={
                showSubEstimates
                  ? estimateBudHours(
                      battery.left,
                      battery.leftCharging,
                      battery.leftConnection
                    )
                  : undefined
              }
              sizePx={78}
              onClick={onToggleLeftCharging}
              title="Click to toggle Left earbud charging"
            >
              <BudIllustration
                finishId={appearance.budsFinish}
                side="left"
                size={38}
              />
            </BatteryRing>

            <BatteryRing
              percent={battery.caseBattery}
              isCharging={battery.caseCharging}
              connection={battery.caseConnection}
              appearance={appearance}
              ringColor={caseColor}
              label={formatLabel('C', battery.caseBattery, battery.caseConnection)}
              subLabel={
                showSubEstimates
                  ? estimateCaseHours(
                      battery.caseBattery,
                      battery.caseCharging,
                      battery.caseConnection
                    )
                  : undefined
              }
              sizePx={78}
              onClick={onToggleCaseCharging}
              title="Click to toggle Charging Case power"
            >
              <CaseIllustration
                finishId={appearance.budsFinish}
                lidOpen={battery.caseLidOpen}
                isCharging={battery.caseCharging}
                size={34}
              />
            </BatteryRing>

            <BatteryRing
              percent={battery.right}
              isCharging={battery.rightCharging}
              connection={battery.rightConnection}
              appearance={appearance}
              ringColor={rightColor}
              label={formatLabel('R', battery.right, battery.rightConnection)}
              subLabel={
                showSubEstimates
                  ? estimateBudHours(
                      battery.right,
                      battery.rightCharging,
                      battery.rightConnection
                    )
                  : undefined
              }
              sizePx={78}
              onClick={onToggleRightCharging}
              title="Click to toggle Right earbud charging"
            >
              <BudIllustration
                finishId={appearance.budsFinish}
                side="right"
                size={38}
              />
            </BatteryRing>
          </div>

          {/* Dense Case Connection Status Bar */}
          {appearance.density === 'dense' && (
            <div
              className="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]"
              style={{
                borderColor: `rgba(255, 255, 255, ${
                  appearance.textColor === '#0F172A' ? '0.09' : '0.12'
                })`,
                color: appearance.mutedTextColor,
              }}
            >
              <span className="truncate">
                {getConnectionHeadline()} · {battery.multipointDevice}
              </span>
              <span className="shrink-0 tabular-nums">
                Case {battery.caseConnection}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
