import React, { useState } from 'react';
import { Copy, Check, Download, Code2, CheckCircle2 } from 'lucide-react';
import { AndroidLauncherId, BatteryState, WidgetAppearance } from '../types/widget';
import {
  generateGlanceKotlin,
  generateKwgtExport,
  generateManifestAndProviderXml,
  generateUniversalAppWidgetKotlin,
} from '../utils/androidExporter';

interface AndroidExportPanelProps {
  appearance: WidgetAppearance;
  battery: BatteryState;
  activeLauncher: AndroidLauncherId;
}

type CodeTab = 'universal' | 'glance' | 'manifest' | 'kwgt';

export const AndroidExportPanel: React.FC<AndroidExportPanelProps> = ({
  appearance,
  battery,
  activeLauncher,
}) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('universal');
  const [copied, setCopied] = useState(false);

  const codeMap: Record<CodeTab, { filename: string; content: string; note: string }> = {
    universal: {
      filename: 'PixelBudsWidgetProvider.kt',
      content: generateUniversalAppWidgetKotlin(appearance, battery),
      note: 'RemoteViews AppWidgetProvider for Android 8.0–16 (API 26+) · Works on every OEM & launcher',
    },
    glance: {
      filename: 'PixelBudsGlanceWidget.kt',
      content: generateGlanceKotlin(appearance, battery),
      note: 'Jetpack Glance 1.1+ Compose widget with automatic Android 12+ Monet fallback',
    },
    manifest: {
      filename: 'AndroidManifest_and_widget_info.xml',
      content: generateManifestAndProviderXml(appearance),
      note: 'Bluetooth permissions, BroadcastReceiver intent-filters, and universal resize bounds',
    },
    kwgt: {
      filename: 'kwgt_universal_preset.txt',
      content: generateKwgtExport(appearance, battery, activeLauncher),
      note: 'Ready-to-paste KWGT / KLWP formulas & tokens for zero-code setup on any launcher',
    },
  };

  const current = codeMap[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Universal Compatibility Matrix */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Universal Android &amp; Launcher Compatibility
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          {[
            'Android 8.0–16+ (API 26–35) via RemoteViews fallback',
            'Material You Monet (Android 12+) + explicit ARGB fallback',
            'Pixel Launcher, One UI Home, Nova, Niagara, Lawnchair, Smart Launcher',
            'Dynamic resize adaptation via onAppWidgetOptionsChanged',
            'Standard Bluetooth BATTERY_LEVEL_CHANGED + Fast Pair broadcast sync',
            'Zero-code KWGT / KLWP formulas for instant launcher installation',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Export Viewer */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Android &amp; Launcher Export
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {current.note}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[38px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-x-auto">
          {(
            [
              { id: 'universal', label: 'UniversalWidget.kt (All Phones)' },
              { id: 'glance', label: 'GlanceWidget.kt' },
              { id: 'manifest', label: 'Manifest & XML' },
              { id: 'kwgt', label: 'KWGT Formulas' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap min-h-[34px] ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <pre className="w-full max-h-[420px] overflow-auto rounded-xl bg-slate-950 text-slate-100 p-4 text-xs font-mono leading-relaxed border border-slate-800">
          <code>{current.content}</code>
        </pre>
      </div>
    </div>
  );
};
