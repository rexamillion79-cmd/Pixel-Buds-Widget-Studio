import React, { useState } from 'react';
import {
  Bluetooth,
  Play,
  Pause,
  Zap,
  BatteryLow,
  Headphones,
} from 'lucide-react';
import { BatteryState, ConnectionStatus, TelemetrySample } from '../types/widget';

export type SimSpeed = 0 | 1 | 15 | 60;

interface TelemetryPanelProps {
  battery: BatteryState;
  history: TelemetrySample[];
  simSpeed: SimSpeed;
  onChangeSimSpeed: (speed: SimSpeed) => void;
  onUpdateBattery: (patch: Partial<BatteryState>) => void;
  onApplyScenario: (
    scenario: 'full' | 'commute' | 'low' | 'charging' | 'asymmetric' | 'pairing'
  ) => void;
}

const CONNECTION_STATES: { id: ConnectionStatus; label: string }[] = [
  { id: 'connected', label: 'Connected' },
  { id: 'pairing', label: 'Pairing' },
  { id: 'disconnected', label: 'Offline' },
];

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  battery,
  history,
  simSpeed,
  onChangeSimSpeed,
  onUpdateBattery,
  onApplyScenario,
}) => {
  const [bleMessage, setBleMessage] = useState<string | null>(null);
  const [bleScanning, setBleScanning] = useState(false);

  const handleBluetoothConnect = async () => {
    setBleMessage(null);
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice: (opts: {
          acceptAllDevices?: boolean;
          optionalServices?: (string | number)[];
        }) => Promise<{
          name?: string;
          gatt?: {
            connect: () => Promise<{
              getPrimaryService: (svc: number) => Promise<{
                getCharacteristic: (chr: number) => Promise<{
                  readValue: () => Promise<DataView>;
                }>;
              }>;
            }>;
          };
        }>;
      };
    };

    if (!nav.bluetooth) {
      setBleMessage(
        'Web Bluetooth is unavailable in this browser or iframe. Use the live telemetry controls below to test real-time drain, pairing, and audio states.'
      );
      return;
    }

    try {
      setBleScanning(true);
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x180f],
      });
      if (device.gatt) {
        const server = await device.gatt.connect();
        try {
          const service = await server.getPrimaryService(0x180f);
          const char = await service.getCharacteristic(0x2a19);
          const value = await char.readValue();
          const level = value.getUint8(0);
          onUpdateBattery({
            left: level,
            right: level,
            leftConnection: 'connected',
            rightConnection: 'connected',
            bluetoothConnected: true,
            bluetoothDeviceLabel: device.name || 'Bluetooth Audio Device',
            lastUpdated: 'now',
          });
          setBleMessage(
            `Connected to ${device.name || 'BLE Device'} (${level}% reported via GATT 0x180F).`
          );
        } catch {
          setBleMessage(
            `Paired with ${device.name || 'Device'}, but it does not broadcast standard GATT Battery Service (0x180F) over Web Bluetooth.`
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bluetooth scan cancelled';
      setBleMessage(msg);
    } finally {
      setBleScanning(false);
    }
  };

  const chartWidth = 440;
  const chartHeight = 110;
  const toPoints = (key: 'left' | 'caseBattery' | 'right') => {
    if (history.length < 2) return '';
    return history
      .map((sample, idx) => {
        const x = (idx / (history.length - 1)) * chartWidth;
        const y = chartHeight - (sample[key] / 100) * (chartHeight - 16) - 8;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Live Engine Controls, Audio Playback & Scenarios */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Real-Time Battery &amp; Connection Telemetry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control per-bud connection states and live charge or drain rate
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {(
              [
                { speed: 0, label: 'Hold', icon: Pause },
                { speed: 1, label: '1× Live', icon: Play },
                { speed: 15, label: '15×', icon: Zap },
                { speed: 60, label: '60×', icon: Zap },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = simSpeed === opt.speed;
              return (
                <button
                  key={opt.speed}
                  type="button"
                  onClick={() => onChangeSimSpeed(opt.speed)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[34px] ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Scenario Triggers */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { id: 'full', label: '100% Charged' },
            { id: 'commute', label: 'In Use (ANC On)' },
            { id: 'charging', label: 'Buds Charging in Case' },
            { id: 'asymmetric', label: 'Right Bud Offline' },
            { id: 'pairing', label: 'Fast Pair Mode' },
            { id: 'low', label: 'Low Battery Alert' },
          ].map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() =>
                onApplyScenario(
                  sc.id as
                    | 'full'
                    | 'commute'
                    | 'low'
                    | 'charging'
                    | 'asymmetric'
                    | 'pairing'
                )
              }
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[38px]"
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Individual Channel Sliders, Charging & Connection State */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {(
            [
              {
                title: 'Left Earbud',
                pctKey: 'left' as const,
                chgKey: 'leftCharging' as const,
                connKey: 'leftConnection' as const,
              },
              {
                title: 'Charging Case',
                pctKey: 'caseBattery' as const,
                chgKey: 'caseCharging' as const,
                connKey: 'caseConnection' as const,
              },
              {
                title: 'Right Earbud',
                pctKey: 'right' as const,
                chgKey: 'rightCharging' as const,
                connKey: 'rightConnection' as const,
              },
            ] as const
          ).map((ch) => {
            const pct = battery[ch.pctKey];
            const isCharging = battery[ch.chgKey];
            const conn = battery[ch.connKey];
            return (
              <div
                key={ch.title}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {ch.title}
                    </span>
                    <span className="font-mono text-xs tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {pct}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Connection Status Segmented Selector */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800">
                      {CONNECTION_STATES.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            onUpdateBattery({
                              [ch.connKey]: st.id,
                              lastUpdated: 'now',
                            })
                          }
                          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            conn === st.id
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBattery({
                          [ch.chgKey]: !isCharging,
                          lastUpdated: 'now',
                        })
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer min-h-[28px] ${
                        isCharging
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{isCharging ? 'Charging' : 'Idle'}</span>
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={(e) =>
                    onUpdateBattery({
                      [ch.pctKey]: Number(e.target.value),
                      lastUpdated: 'now',
                    })
                  }
                  className="studio-slider w-full bg-slate-200 dark:bg-slate-700"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-Time Telemetry History Chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
            Charge &amp; Discharge Curve
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-blue-500 inline-block" />
              Left
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" />
              Case
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-violet-500 inline-block" />
              Right
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-3">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-28 overflow-visible"
            role="img"
            aria-label="Real-time battery history chart for Left bud, Case, and Right bud"
          >
            {[25, 50, 75].map((tick) => {
              const y = chartHeight - (tick / 100) * (chartHeight - 16) - 8;
              return (
                <line
                  key={tick}
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
              );
            })}

            {history.length >= 2 && (
              <>
                <polyline
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={toPoints('left')}
                />
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={toPoints('caseBattery')}
                />
                <polyline
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={toPoints('right')}
                />
              </>
            )}
          </svg>
        </div>

        {/* Hardware / Web Bluetooth Pairing Bridge */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {battery.left <= 20 || battery.right <= 20 ? (
              <BatteryLow className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Headphones className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Web Bluetooth GATT Bridge
              </p>
              <p className="mt-0.5">
                {bleMessage ||
                  'Test live browser BLE Battery Service (0x180F) or export Jetpack Glance code for Android Fast Pair.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBluetoothConnect}
            disabled={bleScanning}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Bluetooth className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{bleScanning ? 'Scanning...' : 'Pair BLE Device'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
