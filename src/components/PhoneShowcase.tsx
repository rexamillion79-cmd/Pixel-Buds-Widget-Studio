import React, { useState } from 'react';
import {
  Wifi,
  Signal,
  BatteryCharging,
  Image as ImageIcon,
  Smartphone,
  Eye,
  Phone,
  MessageSquare,
  Camera,
  Music,
  Search,
} from 'lucide-react';
import {
  AndroidLauncherId,
  BatteryState,
  WallpaperOption,
  WidgetAppearance,
} from '../types/widget';
import { MaterialYouWidget } from './MaterialYouWidget';

interface PhoneShowcaseProps {
  battery: BatteryState;
  appearance: WidgetAppearance;
  wallpaper: WallpaperOption;
  activeLauncher: AndroidLauncherId;
  onSelectLauncher: (launcher: AndroidLauncherId) => void;
  onToggleLeftCharging: () => void;
  onToggleCaseCharging: () => void;
  onToggleRightCharging: () => void;
  onCycleConnection: (target: 'left' | 'case' | 'right') => void;
}

type ShowcaseView = 'launcher' | 'isolated' | 'reference';

const LAUNCHER_OPTIONS: { id: AndroidLauncherId; label: string; osNote: string }[] = [
  { id: 'pixel', label: 'Pixel', osNote: 'Android 16 · Monet' },
  { id: 'oneui', label: 'One UI', osNote: 'Samsung Galaxy' },
  { id: 'nova', label: 'Nova', osNote: 'Sub-grid Desktop' },
  { id: 'niagara', label: 'Niagara', osNote: 'Minimalist List' },
  { id: 'nothing', label: 'Nothing OS', osNote: 'Dot & Mono' },
];

export const PhoneShowcase: React.FC<PhoneShowcaseProps> = ({
  battery,
  appearance,
  wallpaper,
  activeLauncher,
  onSelectLauncher,
  onToggleLeftCharging,
  onToggleCaseCharging,
  onToggleRightCharging,
  onCycleConnection,
}) => {
  const [viewMode, setViewMode] = useState<ShowcaseView>('launcher');
  const [refImgError, setRefImgError] = useState(false);

  const now = new Date();
  const timeText = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dateText = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const wallpaperStyle: React.CSSProperties = wallpaper.customImageUrl
    ? {
        backgroundImage: `url(${wallpaper.customImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: wallpaper.backgroundCss,
      };

  const statusTextColor = wallpaper.isDarkWallpaper ? 'text-white/90' : 'text-slate-900/90';
  const statusMutedColor = wallpaper.isDarkWallpaper ? 'text-white/70' : 'text-slate-700/80';
  const currentLauncherMeta =
    LAUNCHER_OPTIONS.find((l) => l.id === activeLauncher) || LAUNCHER_OPTIONS[0];

  return (
    <section
      aria-label="Live Android Widget Preview"
      className="flex flex-col items-center w-full"
    >
      {/* Top Preview Mode Switcher */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {currentLauncherMeta.osNote}
          </span>
          <span aria-hidden="true" className="mx-1.5">·</span>
          <span className="tabular-nums">
            {appearance.widgetWidthPx}×{appearance.widgetHeightPx} dp
          </span>
          <span aria-hidden="true" className="mx-1.5">·</span>
          <span className="tabular-nums">{appearance.surfaceOpacity}% opacity</span>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
          role="tablist"
          aria-label="Preview canvas mode"
        >
          {(
            [
              { id: 'launcher', label: 'Phone View', icon: Smartphone },
              { id: 'isolated', label: 'Widget Focus', icon: Eye },
              { id: 'reference', label: 'Reference', icon: ImageIcon },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[34px] ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal Android Launcher & Phone Simulator Switcher */}
      {viewMode === 'launcher' && (
        <div
          className="w-full max-w-[448px] grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 mb-3"
          role="tablist"
          aria-label="Android Launcher Environment"
        >
          {LAUNCHER_OPTIONS.map((launcher) => {
            const active = activeLauncher === launcher.id;
            return (
              <button
                key={launcher.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectLauncher(launcher.id)}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer truncate ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {launcher.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Preview Stage */}
      {viewMode === 'launcher' && (
        <div className="w-full max-w-[448px] rounded-[44px] p-3 bg-slate-900 dark:bg-slate-800 shadow-2xl border border-slate-800 dark:border-slate-700">
          <div
            className="relative w-full min-h-[630px] rounded-[34px] overflow-hidden flex flex-col justify-between p-4 sm:p-5 transition-all duration-300"
            style={wallpaperStyle}
          >
            {wallpaper.customImageUrl && (
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent pointer-events-none"
              />
            )}

            {/* Status Bar */}
            <div className="relative z-10">
              <div className={`flex items-center justify-between text-xs font-medium px-1 mb-4 ${statusTextColor}`}>
                <span className="tabular-nums">{timeText}</span>
                <div
                  aria-hidden="true"
                  className="w-4 h-4 rounded-full bg-black/90 border border-white/10"
                />
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5" />
                  <Wifi className="w-3.5 h-3.5" />
                  <BatteryCharging className="w-4 h-4" />
                </div>
              </div>

              {/* Launcher-Specific Header */}
              {activeLauncher === 'pixel' && (
                <div className="px-1 mb-4">
                  <p className={`text-xl font-display font-semibold tracking-tight ${statusTextColor}`}>
                    {dateText}
                  </p>
                  <p className={`text-xs mt-0.5 ${statusMutedColor}`}>
                    {battery.deviceName} · {battery.codec}
                  </p>
                </div>
              )}

              {activeLauncher === 'oneui' && (
                <div className="px-1 mb-4 flex items-end justify-between">
                  <div>
                    <p className={`text-3xl font-display font-light tracking-tight tabular-nums ${statusTextColor}`}>
                      {timeText}
                    </p>
                    <p className={`text-xs ${statusMutedColor}`}>{dateText}</p>
                  </div>
                  <p className={`text-[11px] ${statusMutedColor}`}>One UI Home · 4×6</p>
                </div>
              )}

              {activeLauncher === 'nova' && (
                <div
                  className="mb-4 px-3.5 py-2.5 rounded-full border flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: wallpaper.isDarkWallpaper
                      ? 'rgba(15, 23, 42, 0.52)'
                      : 'rgba(255, 255, 255, 0.72)',
                    borderColor: wallpaper.isDarkWallpaper
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(15,23,42,0.1)',
                    color: wallpaper.isDarkWallpaper ? '#E2E8F0' : '#334155',
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 opacity-75" />
                    <span>Nova Search</span>
                  </span>
                  <span className="text-[11px] opacity-70">Sub-grid 5×7</span>
                </div>
              )}

              {activeLauncher === 'niagara' && (
                <div className="px-1 mb-3">
                  <p className={`text-lg font-display font-medium ${statusTextColor}`}>
                    {dateText}
                  </p>
                </div>
              )}

              {activeLauncher === 'nothing' && (
                <div className="px-1 mb-4 flex items-center justify-between">
                  <span className={`font-mono text-lg tracking-widest ${statusTextColor}`}>
                    {timeText}
                  </span>
                  <span className={`font-mono text-[11px] ${statusMutedColor}`}>
                    NOTHING OS
                  </span>
                </div>
              )}

              {/* LIVE MATERIAL YOU PIXEL BUDS WIDGET */}
              <div className="flex justify-center">
                <MaterialYouWidget
                  battery={battery}
                  appearance={appearance}
                  onToggleLeftCharging={onToggleLeftCharging}
                  onToggleCaseCharging={onToggleCaseCharging}
                  onToggleRightCharging={onToggleRightCharging}
                  onCycleConnection={onCycleConnection}
                />
              </div>

              {/* Niagara Vertical Favorite List */}
              {activeLauncher === 'niagara' && (
                <div className={`mt-5 space-y-2.5 px-2 ${statusTextColor}`}>
                  {[
                    { label: 'Phone', icon: Phone },
                    { label: 'Messages', icon: MessageSquare },
                    { label: 'Music', icon: Music },
                    { label: 'Camera', icon: Camera },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3 text-sm font-medium opacity-90">
                        <Icon className="w-4 h-4 opacity-80" />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className={`mt-3 text-center text-[11px] ${statusMutedColor}`}>
                Tap rings to toggle charging
              </p>
            </div>

            {/* Launcher-Specific Bottom Dock */}
            <div className="relative z-10 mt-6">
              {activeLauncher !== 'niagara' && (
                <div
                  className={`grid ${
                    activeLauncher === 'nova' ? 'grid-cols-5' : 'grid-cols-4'
                  } gap-2.5 mb-3.5 px-1`}
                >
                  {[
                    {
                      name: 'Buds',
                      bg: appearance.primaryContainerColor,
                      fg: appearance.onPrimaryContainerColor,
                      glyph: 'PB',
                    },
                    { name: 'Phone', bg: '#1E293B', fg: '#F8FAFC', glyph: 'PH' },
                    { name: 'Music', bg: '#1E293B', fg: '#F8FAFC', glyph: 'YT' },
                    { name: 'Camera', bg: '#1E293B', fg: '#F8FAFC', glyph: 'CM' },
                    ...(activeLauncher === 'nova'
                      ? [{ name: 'Drawer', bg: '#1E293B', fg: '#F8FAFC', glyph: '::' }]
                      : []),
                  ].map((app) => (
                    <div key={app.name} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-11 h-11 flex items-center justify-center text-xs font-semibold shadow-sm ${
                          activeLauncher === 'oneui'
                            ? 'rounded-[18px]'
                            : activeLauncher === 'nothing'
                            ? 'rounded-full border border-white/25'
                            : 'rounded-2xl'
                        }`}
                        style={{
                          backgroundColor: app.bg,
                          color: app.fg,
                          opacity: 0.92,
                        }}
                      >
                        {app.glyph}
                      </div>
                      {activeLauncher !== 'nova' && (
                        <span className={`text-[10.5px] ${statusMutedColor}`}>
                          {app.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeLauncher === 'pixel' && (
                <div
                  className="h-11 rounded-full px-4 flex items-center justify-between text-xs border"
                  style={{
                    backgroundColor: wallpaper.isDarkWallpaper
                      ? 'rgba(15, 23, 42, 0.65)'
                      : 'rgba(255, 255, 255, 0.78)',
                    borderColor: wallpaper.isDarkWallpaper
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(15,23,42,0.08)',
                    backdropFilter: 'blur(14px)',
                    color: wallpaper.isDarkWallpaper ? '#E2E8F0' : '#334155',
                  }}
                >
                  <span className="font-display font-semibold">G</span>
                  <span className="opacity-70">Search apps &amp; devices</span>
                  <span className="text-[11px] opacity-75">Mic</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'isolated' && (
        <div
          className="w-full min-h-[460px] rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300"
          style={wallpaperStyle}
        >
          <MaterialYouWidget
            battery={battery}
            appearance={appearance}
            onToggleLeftCharging={onToggleLeftCharging}
            onToggleCaseCharging={onToggleCaseCharging}
            onToggleRightCharging={onToggleRightCharging}
            onCycleConnection={onCycleConnection}
          />
          <p className={`mt-5 text-xs tabular-nums ${statusMutedColor}`}>
            {appearance.layoutMode === 'horizontal'
              ? '4×1 Horizontal'
              : '4×2 Standard'}{' '}
            · {appearance.widgetWidthPx}×{appearance.widgetHeightPx} dp · {appearance.surfaceOpacity}% opacity
          </p>
        </div>
      )}

      {viewMode === 'reference' && (
        <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Live Widget Output
            </p>
            <div
              className="rounded-2xl p-6 flex justify-center"
              style={wallpaperStyle}
            >
              <MaterialYouWidget
                battery={battery}
                appearance={appearance}
                onToggleLeftCharging={onToggleLeftCharging}
                onToggleCaseCharging={onToggleCaseCharging}
                onToggleRightCharging={onToggleRightCharging}
                onCycleConnection={onCycleConnection}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Target Material You Reference
            </p>
            {!refImgError ? (
              <img
                src="/assets/aistudio/Pixel-Buds-fully-charged-notification_7323cb7f.webp"
                alt="Reference Android Pixel Buds Material You battery notification card"
                referrerPolicy="no-referrer"
                onError={() => setRefImgError(true)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 object-cover"
              />
            ) : (
              <div className="w-full h-44 rounded-2xl bg-slate-900 text-slate-300 flex items-center justify-center text-xs">
                Reference asset unavailable
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
