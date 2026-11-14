import React, { useRef, useState } from 'react';
import { Upload, RotateCcw, BookmarkPlus, Trash2, Check } from 'lucide-react';
import {
  ACCENT_SWATCHES,
  BUDS_FINISHES,
  COLOR_SCHEME_PRESETS,
  WALLPAPER_OPTIONS,
} from '../data/presets';
import {
  BudsFinishId,
  SavedStudioPreset,
  WallpaperOption,
  WidgetAppearance,
  WidgetDensity,
  WidgetLayoutMode,
  WidgetSize,
} from '../types/widget';
import { extractMaterialYouFromImage } from '../utils/colorExtractor';

interface CustomizationPanelProps {
  appearance: WidgetAppearance;
  activeWallpaper: WallpaperOption;
  savedPresets: SavedStudioPreset[];
  onUpdateAppearance: (patch: Partial<WidgetAppearance>) => void;
  onSelectWallpaper: (wallpaper: WallpaperOption) => void;
  onResetReference: () => void;
  onSavePreset: (name: string) => void;
  onApplySavedPreset: (preset: SavedStudioPreset) => void;
  onDeleteSavedPreset: (id: string) => void;
}

const LAYOUT_OPTIONS: {
  id: WidgetSize;
  label: string;
  subtitle: string;
  layoutMode: WidgetLayoutMode;
  width: number;
  height: number;
}[] = [
  {
    id: '4x1',
    label: '4×1 Horizontal',
    subtitle: 'Compact single-row bar',
    layoutMode: 'horizontal',
    width: 390,
    height: 84,
  },
  {
    id: '4x2',
    label: '4×2 Standard',
    subtitle: 'Three circular battery rings',
    layoutMode: 'standard',
    width: 396,
    height: 172,
  },
];

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  appearance,
  activeWallpaper,
  savedPresets,
  onUpdateAppearance,
  onSelectWallpaper,
  onResetReference,
  onSavePreset,
  onApplySavedPreset,
  onDeleteSavedPreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetName, setPresetName] = useState('');
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const extracted = await extractMaterialYouFromImage(dataUrl);
        const customWallpaper: WallpaperOption = {
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 22) || 'Custom Wallpaper',
          category: 'Uploaded',
          isDarkWallpaper: extracted.isDarkWallpaper,
          dominantHex: extracted.dominantHex,
          accentHex: extracted.palette.primaryContainerColor || '#72A8F9',
          backgroundCss: '',
          customImageUrl: dataUrl,
          extractedPalette: extracted.palette,
        };
        onSelectWallpaper(customWallpaper);
      } catch {
        setExtractError('Could not read colors from this image. Try a PNG or JPG.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = presetName.trim();
    if (!trimmed) return;
    onSavePreset(trimmed);
    setPresetName('');
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Widget Layout (4x1 Horizontal & 4x2 Standard) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Widget Layout
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose between 4×1 Horizontal and 4×2 Standard widget layouts
            </p>
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {appearance.layoutMode === 'horizontal' ? '4×1 Horizontal' : '4×2 Standard'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {LAYOUT_OPTIONS.map((option) => {
            const active = appearance.layoutMode === option.layoutMode;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  onUpdateAppearance({
                    layoutMode: option.layoutMode,
                    widgetSize: option.id,
                    widgetWidthPx: option.width,
                    widgetHeightPx: option.height,
                  })
                }
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[54px] ${
                  active
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold">{option.label}</p>
                  <p className="text-[11px] opacity-75 mt-0.5">{option.subtitle}</p>
                </div>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Wallpaper & Adaptive Material You */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Wallpaper &amp; Adaptive Colors
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Material You dynamically extracts tonal surface colors from your background
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateAppearance({
                adaptiveFromWallpaper: !appearance.adaptiveFromWallpaper,
                ...(!appearance.adaptiveFromWallpaper ? activeWallpaper.extractedPalette : {}),
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap min-h-[36px] ${
              appearance.adaptiveFromWallpaper
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {appearance.adaptiveFromWallpaper ? 'Adaptive Monet: On' : 'Adaptive Monet: Off'}
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {WALLPAPER_OPTIONS.map((wp) => {
            const isSelected = activeWallpaper.id === wp.id;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => onSelectWallpaper(wp)}
                className={`group relative h-14 rounded-xl overflow-hidden border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
                style={{ background: wp.backgroundCss }}
                title={wp.name}
              >
                <span className="sr-only">{wp.name}</span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
                <span className="absolute inset-x-1 bottom-1 text-[10px] font-medium truncate px-1 py-0.5 rounded bg-black/45 text-white">
                  {wp.name}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span className="text-[10px] font-medium">Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleWallpaperUpload}
            className="hidden"
          />
        </div>

        {extractError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{extractError}</p>
        )}
      </div>

      {/* Section 3: Accent Color Swatches, Scheme Presets & Color Channels */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Color Scheme &amp; Accent Palette
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pick from 10 Material You accent tones, curated schemes, or custom hex colors
            </p>
          </div>
          <button
            type="button"
            onClick={onResetReference}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Reference</span>
          </button>
        </div>

        {/* Wide Range of Accent Color Swatches */}
        <div className="mb-5">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Material You Accent Swatches
          </span>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {ACCENT_SWATCHES.map((swatch) => {
              const selected =
                appearance.primaryContainerColor.toUpperCase() ===
                swatch.primaryContainer.toUpperCase();
              return (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() =>
                    onUpdateAppearance({
                      primaryContainerColor: swatch.primaryContainer,
                      onPrimaryContainerColor: swatch.onPrimaryContainer,
                      activeRingColor: swatch.activeRing,
                      adaptiveFromWallpaper: false,
                    })
                  }
                  title={swatch.name}
                  aria-label={`Select ${swatch.name} accent color`}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-transform cursor-pointer hover:scale-105 ${
                    selected
                      ? 'border-blue-600 ring-2 ring-blue-500/40'
                      : 'border-black/10 dark:border-white/10'
                  }`}
                  style={{ backgroundColor: swatch.primaryContainer }}
                >
                  {selected && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: swatch.onPrimaryContainer }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
          {COLOR_SCHEME_PRESETS.map((preset) => {
            const active =
              appearance.schemeId === preset.id && !appearance.adaptiveFromWallpaper;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onUpdateAppearance({
                    ...preset.appearance,
                    adaptiveFromWallpaper: false,
                  })
                }
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[56px] ${
                  active
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {preset.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {preset.subtitle}
                  </p>
                </div>

                <div className="flex items-center -space-x-1 shrink-0">
                  <span
                    className="w-5 h-5 rounded-full border border-white/60 dark:border-slate-900"
                    style={{ backgroundColor: preset.appearance.surfaceColor }}
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/60 dark:border-slate-900"
                    style={{ backgroundColor: preset.appearance.primaryContainerColor }}
                  />
                  <span
                    className="w-5 h-5 rounded-full border border-white/60 dark:border-slate-900"
                    style={{ backgroundColor: preset.appearance.chargingRingColor }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Direct Color Pickers */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(
            [
              { key: 'surfaceColor', label: 'Surface' },
              { key: 'primaryContainerColor', label: 'Accent Icon' },
              { key: 'chargingRingColor', label: 'Charging Ring' },
              { key: 'activeRingColor', label: 'Active Ring' },
              { key: 'textColor', label: 'Text Ink' },
            ] as const
          ).map((token) => (
            <label key={token.key} className="flex flex-col gap-1.5 cursor-pointer">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                {token.label}
              </span>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <input
                  type="color"
                  value={appearance[token.key]}
                  onChange={(e) =>
                    onUpdateAppearance({
                      [token.key]: e.target.value.toUpperCase(),
                      schemeId: 'custom',
                      schemeName: 'Custom Palette',
                      adaptiveFromWallpaper: false,
                    })
                  }
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0 p-0"
                />
                <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {appearance[token.key]}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Section 4: Transparency (0% to 100%), Blur & Corner Geometry */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Transparency &amp; Shape Geometry
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* Background Opacity 0% - 100% */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Background Opacity
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {appearance.surfaceOpacity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={appearance.surfaceOpacity}
              onChange={(e) =>
                onUpdateAppearance({ surfaceOpacity: Number(e.target.value) })
              }
              className="studio-slider w-full bg-slate-200 dark:bg-slate-700"
            />
          </div>

          {/* Backdrop Blur */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Frosted Blur
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {appearance.backdropBlur}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={appearance.backdropBlur}
              onChange={(e) =>
                onUpdateAppearance({ backdropBlur: Number(e.target.value) })
              }
              className="studio-slider w-full bg-slate-200 dark:bg-slate-700"
            />
          </div>

          {/* Corner Radius */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Corner Radius
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {appearance.cornerRadius}dp
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={36}
              value={appearance.cornerRadius}
              onChange={(e) =>
                onUpdateAppearance({ cornerRadius: Number(e.target.value) })
              }
              className="studio-slider w-full bg-slate-200 dark:bg-slate-700"
            />
          </div>

          {/* Ring Stroke Width */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Ring Thickness
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {appearance.ringStrokeWidth}px
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={10}
              value={appearance.ringStrokeWidth}
              onChange={(e) =>
                onUpdateAppearance({ ringStrokeWidth: Number(e.target.value) })
              }
              className="studio-slider w-full bg-slate-200 dark:bg-slate-700"
            />
          </div>

          {/* Border Opacity */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Glass Hairline Outline
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {appearance.borderOpacity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={45}
              value={appearance.borderOpacity}
              onChange={(e) =>
                onUpdateAppearance({ borderOpacity: Number(e.target.value) })
              }
              className="studio-slider w-full bg-slate-200 dark:bg-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Hardware Finish & Battery Information Density */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Hardware Finish &amp; Information Density
          </h2>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(BUDS_FINISHES) as BudsFinishId[]).map((id) => {
              const finish = BUDS_FINISHES[id];
              const selected = appearance.budsFinish === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateAppearance({ budsFinish: id })}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer min-h-[40px] ${
                    selected
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15"
                    style={{ backgroundColor: finish.shell }}
                  />
                  <span>{finish.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* Sparse vs Dense Battery Layout */}
          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Battery Info Density
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(
                [
                  { id: 'sparse', label: 'Sparse (Clean)' },
                  { id: 'dense', label: 'Dense (Detailed)' },
                ] as { id: WidgetDensity; label: string }[]
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onUpdateAppearance({ density: d.id })}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    appearance.density === d.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label Style */}
          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Battery Label Format
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => onUpdateAppearance({ labelFormat: 'short' })}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  appearance.labelFormat === 'short'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                L: 100%
              </button>
              <button
                type="button"
                onClick={() => onUpdateAppearance({ labelFormat: 'full' })}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  appearance.labelFormat === 'full'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Left 100%
              </button>
            </div>
          </div>
        </div>

        {/* Display Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          {(
            [
              { key: 'showChargingBolt', label: 'Charging Bolt Badge' },
              { key: 'showEstimates', label: 'Remaining Time' },
            ] as const
          ).map((toggle) => (
            <button
              key={toggle.key}
              type="button"
              onClick={() =>
                onUpdateAppearance({ [toggle.key]: !appearance[toggle.key] })
              }
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer min-h-[42px] ${
                appearance[toggle.key]
                  ? 'border-blue-600/40 bg-blue-50/50 dark:bg-blue-950/20 text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <span>{toggle.label}</span>
              <span
                className={`w-7 h-4 rounded-full relative transition-colors ${
                  appearance[toggle.key]
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    appearance[toggle.key] ? 'left-3.5' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 6: Saved Custom Presets */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Saved Configurations
        </h2>

        <form onSubmit={handleSaveSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Name your widget preset (e.g. Night Glass)"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!presetName.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </form>

        {savedPresets.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No saved configurations yet. Tweak colors or transparency above and save your look locally.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => onApplySavedPreset(preset)}
                  className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                    style={{ backgroundColor: preset.appearance.surfaceColor }}
                  />
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {preset.name}
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                    {preset.appearance.surfaceOpacity}% · {preset.appearance.cornerRadius}dp
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSavedPreset(preset.id)}
                  aria-label={`Delete ${preset.name}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
