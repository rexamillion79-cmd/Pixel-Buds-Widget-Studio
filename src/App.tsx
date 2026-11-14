import React, { useEffect, useState } from 'react';
import { Sun, Moon, Bluetooth } from 'lucide-react';
import {
  INITIAL_BATTERY_STATE,
  REFERENCE_APPEARANCE,
  WALLPAPER_OPTIONS,
} from './data/presets';
import {
  AndroidLauncherId,
  BatteryState,
  ConnectionStatus,
  SavedStudioPreset,
  TelemetrySample,
  WallpaperOption,
  WidgetAppearance,
} from './types/widget';
import { PhoneShowcase } from './components/PhoneShowcase';
import { CustomizationPanel } from './components/CustomizationPanel';
import { SimSpeed, TelemetryPanel } from './components/TelemetryPanel';
import { AndroidExportPanel } from './components/AndroidExportPanel';

type StudioTab = 'customize' | 'telemetry' | 'export';

const STORAGE_APPEARANCE_KEY = 'pixelbuds_widget_appearance_v4';
const STORAGE_PRESETS_KEY = 'pixelbuds_widget_saved_presets_v1';
const STORAGE_THEME_KEY = 'pixelbuds_studio_dark_v1';

function normalizeAppearance(rawObj: Partial<WidgetAppearance>): WidgetAppearance {
  const merged = { ...REFERENCE_APPEARANCE, ...rawObj };
  const isHorizontal = merged.layoutMode === 'horizontal';
  return {
    ...merged,
    layoutMode: isHorizontal ? 'horizontal' : 'standard',
    widgetSize: isHorizontal ? '4x1' : '4x2',
    widgetWidthPx: isHorizontal ? 390 : 396,
    widgetHeightPx: isHorizontal ? 84 : 172,
  };
}

function loadInitialAppearance(): WidgetAppearance {
  try {
    const raw = localStorage.getItem(STORAGE_APPEARANCE_KEY);
    if (raw) {
      return normalizeAppearance(JSON.parse(raw));
    }
  } catch {
    // Ignore malformed storage
  }
  return REFERENCE_APPEARANCE;
}

function loadSavedPresets(): SavedStudioPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_PRESETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore malformed storage
  }
  return [];
}

function loadDarkMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_THEME_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('customize');
  const [activeLauncher, setActiveLauncher] = useState<AndroidLauncherId>('pixel');
  const [darkMode, setDarkMode] = useState<boolean>(loadDarkMode);
  const [appearance, setAppearance] = useState<WidgetAppearance>(loadInitialAppearance);
  const [activeWallpaper, setActiveWallpaper] = useState<WallpaperOption>(
    WALLPAPER_OPTIONS[0]
  );
  const [battery, setBattery] = useState<BatteryState>(INITIAL_BATTERY_STATE);
  const [simSpeed, setSimSpeed] = useState<SimSpeed>(1);
  const [savedPresets, setSavedPresets] = useState<SavedStudioPreset[]>(loadSavedPresets);
  const [history, setHistory] = useState<TelemetrySample[]>(() => [
    { timestamp: '00:00', left: 100, caseBattery: 100, right: 100 },
    { timestamp: '00:01', left: 100, caseBattery: 100, right: 100 },
  ]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_THEME_KEY, String(darkMode));
    } catch {
      // Ignore storage error
    }
  }, [darkMode]);

  // Persist appearance edits
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_APPEARANCE_KEY, JSON.stringify(appearance));
    } catch {
      // Ignore storage error
    }
  }, [appearance]);

  // Persist saved presets
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(savedPresets));
    } catch {
      // Ignore storage error
    }
  }, [savedPresets]);

  // Real-time battery telemetry engine
  useEffect(() => {
    if (simSpeed === 0) return;

    const intervalMs =
      simSpeed === 60 ? 500 : simSpeed === 15 ? 1200 : 4000;

    const timer = window.setInterval(() => {
      setBattery((prev) => {
        const step = simSpeed === 60 ? 2 : 1;
        let nextLeft = prev.left;
        let nextRight = prev.right;
        let nextCase = prev.caseBattery;

        // Left bud physics
        if (prev.leftConnection === 'connected') {
          if (prev.leftCharging && prev.caseBattery > 0) {
            nextLeft = Math.min(100, prev.left + step);
          } else if (!prev.leftCharging) {
            const drainMultiplier = prev.ancMode === 'anc' ? step : 1;
            nextLeft = Math.max(0, prev.left - (simSpeed === 1 ? 0 : drainMultiplier));
          }
        }

        // Right bud physics
        if (prev.rightConnection === 'connected') {
          if (prev.rightCharging && prev.caseBattery > 0) {
            nextRight = Math.min(100, prev.right + step);
          } else if (!prev.rightCharging) {
            const drainMultiplier = prev.ancMode === 'anc' ? step : 1;
            nextRight = Math.max(0, prev.right - (simSpeed === 1 ? 0 : drainMultiplier));
          }
        }

        // Case physics
        if (prev.caseCharging) {
          nextCase = Math.min(100, prev.caseBattery + step);
        } else if (
          (prev.leftCharging && prev.left < 100) ||
          (prev.rightCharging && prev.right < 100)
        ) {
          nextCase = Math.max(0, prev.caseBattery - 1);
        }

        const nowLabel = new Date().toLocaleTimeString([], {
          minute: '2-digit',
          second: '2-digit',
        });

        setHistory((hist) => [
          ...hist.slice(-29),
          {
            timestamp: nowLabel,
            left: nextLeft,
            caseBattery: nextCase,
            right: nextRight,
          },
        ]);

        if (
          nextLeft === prev.left &&
          nextRight === prev.right &&
          nextCase === prev.caseBattery
        ) {
          return prev;
        }

        return {
          ...prev,
          left: nextLeft,
          right: nextRight,
          caseBattery: nextCase,
          lastUpdated: 'now',
        };
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [simSpeed]);

  const handleUpdateAppearance = (patch: Partial<WidgetAppearance>) => {
    setAppearance((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectWallpaper = (wp: WallpaperOption) => {
    setActiveWallpaper(wp);
    if (appearance.adaptiveFromWallpaper) {
      setAppearance((prev) => ({
        ...prev,
        ...wp.extractedPalette,
        schemeId: `monet-${wp.id}`,
        schemeName: `Adaptive (${wp.name})`,
      }));
    }
  };

  const handleUpdateBattery = (patch: Partial<BatteryState>) => {
    setBattery((prev) => {
      const updated = { ...prev, ...patch };
      const nowLabel = new Date().toLocaleTimeString([], {
        minute: '2-digit',
        second: '2-digit',
      });
      setHistory((hist) => [
        ...hist.slice(-29),
        {
          timestamp: nowLabel,
          left: updated.left,
          caseBattery: updated.caseBattery,
          right: updated.right,
        },
      ]);
      return updated;
    });
  };

  const handleCycleConnection = (target: 'left' | 'case' | 'right') => {
    const order: ConnectionStatus[] = ['connected', 'pairing', 'disconnected'];
    const key =
      target === 'left'
        ? 'leftConnection'
        : target === 'case'
        ? 'caseConnection'
        : 'rightConnection';
    const current = battery[key];
    const next = order[(order.indexOf(current) + 1) % order.length];
    handleUpdateBattery({ [key]: next, lastUpdated: 'now' });
  };

  const handleApplyScenario = (
    scenario: 'full' | 'commute' | 'low' | 'charging' | 'asymmetric' | 'pairing'
  ) => {
    if (scenario === 'full') {
      handleUpdateBattery({
        left: 100,
        right: 100,
        caseBattery: 100,
        leftCharging: true,
        rightCharging: true,
        caseCharging: true,
        leftInCase: true,
        rightInCase: true,
        leftConnection: 'connected',
        rightConnection: 'connected',
        caseConnection: 'connected',
        caseLidOpen: true,
        lastUpdated: 'now',
      });
    } else if (scenario === 'commute') {
      handleUpdateBattery({
        left: 78,
        right: 76,
        caseBattery: 92,
        leftCharging: false,
        rightCharging: false,
        caseCharging: false,
        leftInCase: false,
        rightInCase: false,
        leftConnection: 'connected',
        rightConnection: 'connected',
        caseConnection: 'connected',
        ancMode: 'anc',
        caseLidOpen: false,
        lastUpdated: 'now',
      });
    } else if (scenario === 'charging') {
      handleUpdateBattery({
        left: 42,
        right: 45,
        caseBattery: 84,
        leftCharging: true,
        rightCharging: true,
        caseCharging: false,
        leftInCase: true,
        rightInCase: true,
        leftConnection: 'connected',
        rightConnection: 'connected',
        caseConnection: 'connected',
        caseLidOpen: true,
        lastUpdated: 'now',
      });
    } else if (scenario === 'asymmetric') {
      handleUpdateBattery({
        left: 64,
        right: 98,
        caseBattery: 88,
        leftCharging: false,
        rightCharging: true,
        caseCharging: false,
        leftInCase: false,
        rightInCase: true,
        leftConnection: 'connected',
        rightConnection: 'disconnected',
        caseConnection: 'connected',
        caseLidOpen: false,
        lastUpdated: 'now',
      });
    } else if (scenario === 'pairing') {
      handleUpdateBattery({
        left: 85,
        right: 85,
        caseBattery: 90,
        leftCharging: true,
        rightCharging: true,
        caseCharging: false,
        leftConnection: 'pairing',
        rightConnection: 'pairing',
        caseConnection: 'pairing',
        caseLidOpen: true,
        lastUpdated: 'now',
      });
    } else if (scenario === 'low') {
      handleUpdateBattery({
        left: 14,
        right: 9,
        caseBattery: 18,
        leftCharging: false,
        rightCharging: false,
        caseCharging: false,
        leftInCase: false,
        rightInCase: false,
        leftConnection: 'connected',
        rightConnection: 'connected',
        caseConnection: 'connected',
        caseLidOpen: false,
        lastUpdated: 'now',
      });
    }
  };

  const handleSavePreset = (name: string) => {
    const entry: SavedStudioPreset = {
      id: `preset-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      appearance,
    };
    setSavedPresets((prev) => [entry, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('customize');
            }}
            className="text-base sm:text-lg font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            BudsWidget Studio
          </a>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            aria-label="Studio workspace sections"
            className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
          >
            {(
              [
                { id: 'customize', label: 'Customize' },
                { id: 'telemetry', label: 'Telemetry' },
                { id: 'export', label: 'Android Code' },
              ] as const
            ).map((navItem) => {
              const isCurrent = activeTab === navItem.id;
              return (
                <button
                  key={navItem.id}
                  type="button"
                  onClick={() => setActiveTab(navItem.id)}
                  className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'border-blue-600 text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {navItem.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[38px]"
            >
              Export Glance
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Context Strip (No status dots, clean unboxed metadata) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
              <Bluetooth className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {battery.deviceName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-mono">
              L {battery.leftConnection === 'disconnected' ? '--' : `${battery.left}%`}
            </span>
            <span aria-hidden="true">/</span>
            <span className="tabular-nums font-mono">
              C {battery.caseConnection === 'disconnected' ? '--' : `${battery.caseBattery}%`}
            </span>
            <span aria-hidden="true">/</span>
            <span className="tabular-nums font-mono">
              R {battery.rightConnection === 'disconnected' ? '--' : `${battery.right}%`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap min-h-[34px]"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Light Studio</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Studio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Two-Column Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Focal Anchor): Live Android Widget & Launcher Canvas */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <PhoneShowcase
              battery={battery}
              appearance={appearance}
              wallpaper={activeWallpaper}
              activeLauncher={activeLauncher}
              onSelectLauncher={setActiveLauncher}
              onToggleLeftCharging={() =>
                handleUpdateBattery({
                  leftCharging: !battery.leftCharging,
                  lastUpdated: 'now',
                })
              }
              onToggleCaseCharging={() =>
                handleUpdateBattery({
                  caseCharging: !battery.caseCharging,
                  lastUpdated: 'now',
                })
              }
              onToggleRightCharging={() =>
                handleUpdateBattery({
                  rightCharging: !battery.rightCharging,
                  lastUpdated: 'now',
                })
              }
              onCycleConnection={handleCycleConnection}
            />
          </div>

          {/* Right Column: Customization, Real-Time Telemetry, or Android Glance Export */}
          <div className="lg:col-span-7">
            {activeTab === 'customize' && (
              <CustomizationPanel
                appearance={appearance}
                activeWallpaper={activeWallpaper}
                savedPresets={savedPresets}
                onUpdateAppearance={handleUpdateAppearance}
                onSelectWallpaper={handleSelectWallpaper}
                onResetReference={() => {
                  setAppearance(REFERENCE_APPEARANCE);
                  setActiveWallpaper(WALLPAPER_OPTIONS[0]);
                }}
                onSavePreset={handleSavePreset}
                onApplySavedPreset={(preset) =>
                  setAppearance(normalizeAppearance(preset.appearance))
                }
                onDeleteSavedPreset={(id) =>
                  setSavedPresets((prev) => prev.filter((item) => item.id !== id))
                }
              />
            )}

            {activeTab === 'telemetry' && (
              <TelemetryPanel
                battery={battery}
                history={history}
                simSpeed={simSpeed}
                onChangeSimSpeed={setSimSpeed}
                onUpdateBattery={handleUpdateBattery}
                onApplyScenario={handleApplyScenario}
              />
            )}

            {activeTab === 'export' && (
              <AndroidExportPanel
                appearance={appearance}
                battery={battery}
                activeLauncher={activeLauncher}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
