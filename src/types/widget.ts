export type AncMode = 'anc' | 'transparency' | 'off';

export type AndroidLauncherId =
  | 'pixel'
  | 'oneui'
  | 'nova'
  | 'niagara'
  | 'nothing';

export type ConnectionStatus = 'connected' | 'disconnected' | 'pairing';

export type WidgetLayoutMode = 'horizontal' | 'standard';

export type WidgetDensity = 'sparse' | 'dense';

export type WidgetSize = '4x1' | '4x2';

export type LabelFormat = 'short' | 'full';

export type BudsFinishId =
  | 'wintergreen'
  | 'porcelain'
  | 'hazel'
  | 'peony'
  | 'obsidian';

export interface BudsFinish {
  id: BudsFinishId;
  name: string;
  shell: string;
  shellShade: string;
  accent: string;
  wing: string;
  caseExterior: string;
  caseInterior: string;
}

export interface TelemetrySample {
  timestamp: string;
  left: number;
  caseBattery: number;
  right: number;
}

export interface BatteryState {
  deviceName: string;
  left: number;
  right: number;
  caseBattery: number;
  leftCharging: boolean;
  rightCharging: boolean;
  caseCharging: boolean;
  leftInCase: boolean;
  rightInCase: boolean;
  leftConnection: ConnectionStatus;
  rightConnection: ConnectionStatus;
  caseConnection: ConnectionStatus;
  caseLidOpen: boolean;
  ancMode: AncMode;
  spatialAudio: boolean;
  multipointDevice: string;
  firmwareVersion: string;
  codec: 'Opus' | 'AAC' | 'SBC';
  lastUpdated: string;
  bluetoothConnected: boolean;
  bluetoothDeviceLabel: string | null;
}

export interface AccentSwatch {
  id: string;
  name: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  activeRing: string;
}

export interface WidgetAppearance {
  schemeId: string;
  schemeName: string;
  surfaceColor: string;
  surfaceOpacity: number; // 0 - 100
  backdropBlur: number; // 0 - 32 px
  cornerRadius: number; // 12 - 36 dp
  borderOpacity: number; // 0 - 45 %
  ringStrokeWidth: number; // 4 - 10 px
  primaryContainerColor: string;
  onPrimaryContainerColor: string;
  chargingRingColor: string;
  activeRingColor: string;
  warningRingColor: string;
  criticalRingColor: string;
  ringTrackColor: string;
  ringInnerFillColor: string;
  textColor: string;
  mutedTextColor: string;
  controlSurfaceColor: string;
  budsFinish: BudsFinishId;
  widgetSize: WidgetSize;
  layoutMode: WidgetLayoutMode;
  density: WidgetDensity;
  widgetWidthPx: number; // 210 - 420 px
  widgetHeightPx: number; // 84 - 440 px (auto-min / resizable)
  labelFormat: LabelFormat;
  showChargingBolt: boolean;
  showEstimates: boolean;
  showHeaderMetadata: boolean;
  adaptiveFromWallpaper: boolean;
}

export interface WallpaperOption {
  id: string;
  name: string;
  category: string;
  backgroundCss: string;
  isDarkWallpaper: boolean;
  dominantHex: string;
  accentHex: string;
  extractedPalette: Partial<WidgetAppearance>;
  customImageUrl?: string;
}

export interface ColorSchemePreset {
  id: string;
  name: string;
  subtitle: string;
  appearance: Partial<WidgetAppearance>;
}

export interface SavedStudioPreset {
  id: string;
  name: string;
  createdAt: string;
  appearance: WidgetAppearance;
}
