import { AndroidLauncherId, BatteryState, WidgetAppearance } from '../types/widget';

function toAndroidArgb(hex: string, opacityPercent: number): string {
  const clean = hex.replace('#', '').toUpperCase();
  const alpha = Math.round((opacityPercent / 100) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `0x${alpha}${clean}`;
}

function toXmlArgb(hex: string, opacityPercent: number): string {
  const clean = hex.replace('#', '').toUpperCase();
  const alpha = Math.round((opacityPercent / 100) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `#${alpha}${clean}`;
}

/**
 * Universal Android AppWidgetProvider (API 26+ / Android 8.0 - 16)
 * Works on ALL Android phones (Samsung, Xiaomi, OnePlus, Motorola, Nothing, Pixel)
 * and ALL launchers (One UI Home, Nova, Niagara, Lawnchair, Smart Launcher, Pixel Launcher).
 */
export function generateUniversalAppWidgetKotlin(
  appearance: WidgetAppearance,
  battery: BatteryState
): string {
  const surfaceArgb = toAndroidArgb(appearance.surfaceColor, appearance.surfaceOpacity);
  const primaryArgb = toAndroidArgb(appearance.primaryContainerColor, 100);
  const onPrimaryArgb = toAndroidArgb(appearance.onPrimaryContainerColor, 100);
  const chargingRingArgb = toAndroidArgb(appearance.chargingRingColor, 100);
  const activeRingArgb = toAndroidArgb(appearance.activeRingColor, 100);
  const warningRingArgb = toAndroidArgb(appearance.warningRingColor, 100);
  const criticalRingArgb = toAndroidArgb(appearance.criticalRingColor, 100);
  const trackArgb = toAndroidArgb(appearance.ringTrackColor, 100);
  const innerFillArgb = toAndroidArgb(appearance.ringInnerFillColor, 100);
  const textArgb = toAndroidArgb(appearance.textColor, 100);
  const mutedArgb = toAndroidArgb(appearance.mutedTextColor, 100);
  const borderAlpha = Math.round((appearance.borderOpacity / 100) * 255);

  return `package com.pixelbuds.widget

import android.Manifest
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.*
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import androidx.core.content.ContextCompat

/**
 * Universal Pixel Buds Material You AppWidgetProvider
 * Compatible with Android 8.0+ (API 26+) and all third-party/OEM launchers
 * (Pixel Launcher, Samsung One UI, Nova, Niagara, Lawnchair, Smart Launcher).
 */
class PixelBudsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            renderWidget(context, appWidgetManager, appWidgetId, options)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        // Triggered dynamically when resized in Nova, Niagara, One UI, or Pixel Launcher
        renderWidget(context, appWidgetManager, appWidgetId, newOptions)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action ?: return
        if (action in REFRESH_ACTIONS) {
            // Persist standard Bluetooth battery broadcasts (API 27+) and Fast Pair extras
            if (action == "android.bluetooth.device.action.BATTERY_LEVEL_CHANGED") {
                val level = intent.getIntExtra("android.bluetooth.device.extra.BATTERY_LEVEL", -1)
                if (level in 0..100) {
                    FastPairCache.updateFallbackLevel(context, level)
                }
            }
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, PixelBudsWidgetProvider::class.java)
            )
            onUpdate(context, manager, ids)
        }
    }

    private fun renderWidget(
        context: Context,
        manager: AppWidgetManager,
        widgetId: Int,
        options: Bundle
    ) {
        val widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, ${appearance.widgetWidthPx})
        val heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, ${appearance.widgetHeightPx})

        // Responsive layout selection across any launcher grid (4x1 Horizontal or 4x2 Standard)
        val layoutRes = when {
            heightDp < 115 -> R.layout.widget_pixel_buds_horizontal
            else -> R.layout.widget_pixel_buds_standard
        }

        val views = RemoteViews(context.packageName, layoutRes)
        val snapshot = UniversalBluetoothReader.read(context)

        // Material You dynamic surface on Android 12+ if enabled, else user ARGB palette
        val surfaceColor = resolveSurfaceColor(context)
        val bgBitmap = WidgetSurfaceRenderer.renderRoundedSurface(
            widthPx = (widthDp * 2.5f).toInt().coerceIn(320, 1024),
            heightPx = (heightDp * 2.5f).toInt().coerceIn(140, 1024),
            fillColor = surfaceColor,
            cornerRadiusPx = ${appearance.cornerRadius}f * 2.5f,
            borderColor = Color.argb(${borderAlpha}, 255, 255, 255)
        )
        views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)

        // Render L / C / R Circular Battery Rings
        bindChannel(views, R.id.ring_left, R.id.label_left, "L", snapshot.left)
        bindChannel(views, R.id.ring_case, R.id.label_case, "C", snapshot.caseUnit)
        bindChannel(views, R.id.ring_right, R.id.label_right, "R", snapshot.right)

        // Tap widget to open Android Bluetooth / Pixel Buds companion settings
        val launchIntent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)
        val pending = PendingIntent.getActivity(
            context,
            widgetId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pending)

        manager.updateAppWidget(widgetId, views)
    }

    private fun bindChannel(
        views: RemoteViews,
        ringViewId: Int,
        labelViewId: Int,
        shortPrefix: String,
        unit: UnitTelemetry
    ) {
        val ringColor = when {
            unit.connection == ConnectionState.PAIRING -> 0xFFFBBF24.toInt()
            unit.connection == ConnectionState.DISCONNECTED -> ${mutedArgb}.toInt()
            unit.percent <= 10 && !unit.isCharging -> ${criticalRingArgb}.toInt()
            unit.percent <= 20 && !unit.isCharging -> ${warningRingArgb}.toInt()
            unit.isCharging -> ${chargingRingArgb}.toInt()
            else -> ${activeRingArgb}.toInt()
        }

        val ringBitmap = RingGaugeRenderer.drawArcBitmap(
            sizePx = 196,
            percent = if (unit.connection == ConnectionState.DISCONNECTED) 0 else unit.percent,
            strokePx = ${(appearance.ringStrokeWidth * 2.4).toFixed(0)}f,
            arcColor = ringColor,
            trackColor = ${trackArgb}.toInt(),
            innerFillColor = ${innerFillArgb}.toInt(),
            showBolt = ${appearance.showChargingBolt} && unit.isCharging,
            isPairing = unit.connection == ConnectionState.PAIRING
        )
        views.setImageViewBitmap(ringViewId, ringBitmap)

        val valueText = if (unit.connection == ConnectionState.DISCONNECTED) "--" else "\${unit.percent}%"
        val prefix = if (${appearance.labelFormat === 'full'}) {
            when (shortPrefix) { "L" -> "Left"; "C" -> "Case"; else -> "Right" }
        } else "$shortPrefix:"
        val denseSuffix = if (${appearance.density === 'dense'}) " · \${unit.connection.label}" else ""

        views.setTextViewText(labelViewId, "$prefix $valueText$denseSuffix")
        views.setTextColor(labelViewId, ${textArgb}.toInt())
    }

    private fun resolveSurfaceColor(context: Context): Int {
        if (${appearance.adaptiveFromWallpaper} && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val dynamicBase = ContextCompat.getColor(context, android.R.color.system_neutral1_900)
            val alpha = (${appearance.surfaceOpacity} * 255 / 100).coerceIn(0, 255)
            return Color.argb(alpha, Color.red(dynamicBase), Color.green(dynamicBase), Color.blue(dynamicBase))
        }
        return ${surfaceArgb}.toInt()
    }

    companion object {
        private val REFRESH_ACTIONS = setOf(
            AppWidgetManager.ACTION_APPWIDGET_UPDATE,
            "android.bluetooth.device.action.BATTERY_LEVEL_CHANGED",
            BluetoothDevice.ACTION_ACL_CONNECTED,
            BluetoothDevice.ACTION_ACL_DISCONNECTED,
            BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED
        )
    }
}

enum class ConnectionState(val label: String) {
    CONNECTED("Connected"),
    PAIRING("Pairing"),
    DISCONNECTED("Offline")
}

data class UnitTelemetry(
    val percent: Int,
    val isCharging: Boolean,
    val connection: ConnectionState
)

data class BudsSnapshot(
    val headline: String,
    val lastSync: String,
    val left: UnitTelemetry,
    val caseUnit: UnitTelemetry,
    val right: UnitTelemetry
)

object UniversalBluetoothReader {
    fun read(context: Context): BudsSnapshot {
        val hasBtPerm = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED

        val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val pairedBuds = if (hasBtPerm) {
            btManager?.adapter?.bondedDevices?.firstOrNull {
                it.name?.contains("Pixel Buds", ignoreCase = true) == true
            }
        } else null

        val cached = FastPairCache.load(context)
        val connected = pairedBuds != null && cached.left.connection == ConnectionState.CONNECTED
        val headline = when {
            cached.left.isCharging || cached.right.isCharging || cached.caseUnit.isCharging -> "Charging"
            connected -> "Connected"
            else -> "Standby"
        }

        return BudsSnapshot(
            headline = headline,
            lastSync = "now",
            left = cached.left,
            caseUnit = cached.caseUnit,
            right = cached.right
        )
    }
}

object FastPairCache {
    private const val PREFS = "pixel_buds_widget_cache"

    fun updateFallbackLevel(context: Context, level: Int) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putInt("left_pct", level)
            .putInt("right_pct", level)
            .apply()
    }

    fun load(context: Context): BudsSnapshot {
        val sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return BudsSnapshot(
            headline = "Connected",
            lastSync = "now",
            left = UnitTelemetry(sp.getInt("left_pct", ${battery.left}), ${battery.leftCharging}, ConnectionState.${battery.leftConnection.toUpperCase()}),
            caseUnit = UnitTelemetry(sp.getInt("case_pct", ${battery.caseBattery}), ${battery.caseCharging}, ConnectionState.${battery.caseConnection.toUpperCase()}),
            right = UnitTelemetry(sp.getInt("right_pct", ${battery.right}), ${battery.rightCharging}, ConnectionState.${battery.rightConnection.toUpperCase()})
        )
    }
}

object WidgetSurfaceRenderer {
    fun renderRoundedSurface(
        widthPx: Int,
        heightPx: Int,
        fillColor: Int,
        cornerRadiusPx: Float,
        borderColor: Int
    ): Bitmap {
        val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val rect = RectF(1f, 1f, widthPx - 1f, heightPx - 1f)
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = fillColor }
        canvas.drawRoundRect(rect, cornerRadiusPx, cornerRadiusPx, fillPaint)

        if (Color.alpha(borderColor) > 0) {
            val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = 2f
                color = borderColor
            }
            canvas.drawRoundRect(rect, cornerRadiusPx, cornerRadiusPx, strokePaint)
        }
        return bmp
    }
}

object RingGaugeRenderer {
    fun drawArcBitmap(
        sizePx: Int,
        percent: Int,
        strokePx: Float,
        arcColor: Int,
        trackColor: Int,
        innerFillColor: Int,
        showBolt: Boolean,
        isPairing: Boolean
    ): Bitmap {
        val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val center = sizePx / 2f
        val radius = center - strokePx - 8f

        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = innerFillColor }
        canvas.drawCircle(center, center, radius - strokePx * 0.45f, fillPaint)

        val rect = RectF(center - radius, center - radius, center + radius, center + radius)
        val startAngle = if (showBolt) -65f else -90f
        val maxSweep = if (showBolt) 310f else 360f

        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = strokePx
            strokeCap = Paint.Cap.ROUND
            color = trackColor
            if (isPairing) pathEffect = DashPathEffect(floatArrayOf(12f, 12f), 0f)
        }
        canvas.drawArc(rect, startAngle, maxSweep, false, trackPaint)

        if (percent > 0) {
            val arcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = strokePx
                strokeCap = Paint.Cap.ROUND
                color = arcColor
                if (isPairing) pathEffect = DashPathEffect(floatArrayOf(12f, 12f), 0f)
            }
            canvas.drawArc(rect, startAngle, (percent / 100f) * maxSweep, false, arcPaint)
        }

        if (showBolt) {
            val badgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = arcColor }
            canvas.drawCircle(center, strokePx + 6f, 18f, badgePaint)
        }
        return bmp
    }
}
`;
}

/**
 * Jetpack Glance Widget (Android 12+ Material You / API 26+ fallback)
 */
export function generateGlanceKotlin(
  appearance: WidgetAppearance,
  battery: BatteryState
): string {
  const surfaceArgb = toAndroidArgb(appearance.surfaceColor, appearance.surfaceOpacity);
  const primaryArgb = toAndroidArgb(appearance.primaryContainerColor, 100);
  const onPrimaryArgb = toAndroidArgb(appearance.onPrimaryContainerColor, 100);
  const chargingRingArgb = toAndroidArgb(appearance.chargingRingColor, 100);
  const activeRingArgb = toAndroidArgb(appearance.activeRingColor, 100);
  const textArgb = toAndroidArgb(appearance.textColor, 100);
  const mutedArgb = toAndroidArgb(appearance.mutedTextColor, 100);
  const trackArgb = toAndroidArgb(appearance.ringTrackColor, 100);
  const innerFillArgb = toAndroidArgb(appearance.ringInnerFillColor, 100);

  return `package com.pixelbuds.widget

import android.content.Context
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.cornerRadius
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider

/**
 * Pixel Buds Jetpack Glance Widget (${appearance.schemeName})
 * Works across Pixel Launcher, Samsung One UI, Nova, Niagara & Lawnchair
 */
class PixelBudsGlanceWidget : GlanceAppWidget() {

    companion object {
        private val COMPACT_HORIZONTAL = DpSize(250.dp, 84.dp)
        private val STANDARD_4X2 = DpSize(280.dp, 160.dp)
    }

    override val sizeMode = SizeMode.Responsive(
        setOf(COMPACT_HORIZONTAL, STANDARD_4X2)
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val state = UniversalBluetoothReader.read(context)
        provideContent {
            val size = LocalSize.current
            val surfaceColor = resolveAdaptiveSurface(context)
            when {
                size.height < 120.dp -> CompactHorizontalWidget(context, state, surfaceColor)
                else -> StandardMaterialYouWidget(context, state, surfaceColor)
            }
        }
    }

    @Composable
    private fun resolveAdaptiveSurface(context: Context): Color {
        val alpha = ${(appearance.surfaceOpacity / 100).toFixed(2)}f
        return if (${appearance.adaptiveFromWallpaper} && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            GlanceTheme.colors.surfaceContainer.getColor(context).copy(alpha = alpha)
        } else {
            Color(${surfaceArgb})
        }
    }

    @Composable
    private fun CompactHorizontalWidget(
        context: Context,
        state: BudsSnapshot,
        surfaceColor: Color
    ) {
        Row(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(surfaceColor))
                .cornerRadius(${appearance.cornerRadius}.dp)
                .padding(horizontal = 14.dp, vertical = 10.dp)
                .clickable(actionStartActivity<MainActivity>()),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "L \${state.left.percent}%",
                style = TextStyle(color = ColorProvider(Color(${textArgb})), fontSize = 13.sp, fontWeight = FontWeight.Medium),
                modifier = GlanceModifier.defaultWeight()
            )
            Text(
                text = "C \${state.caseUnit.percent}%",
                style = TextStyle(color = ColorProvider(Color(${textArgb})), fontSize = 13.sp, fontWeight = FontWeight.Medium),
                modifier = GlanceModifier.defaultWeight()
            )
            Text(
                text = "R \${state.right.percent}%",
                style = TextStyle(color = ColorProvider(Color(${textArgb})), fontSize = 13.sp, fontWeight = FontWeight.Medium),
                modifier = GlanceModifier.defaultWeight()
            )
        }
    }

    @Composable
    private fun StandardMaterialYouWidget(
        context: Context,
        state: BudsSnapshot,
        surfaceColor: Color
    ) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(surfaceColor))
                .cornerRadius(${appearance.cornerRadius}.dp)
                .padding(16.dp)
                .clickable(actionStartActivity<MainActivity>()),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                BatteryRingTile("L:", state.left, R.drawable.ic_bud_left, GlanceModifier.defaultWeight())
                BatteryRingTile("C:", state.caseUnit, R.drawable.ic_buds_case, GlanceModifier.defaultWeight())
                BatteryRingTile("R:", state.right, R.drawable.ic_bud_right, GlanceModifier.defaultWeight())
            }
        }
    }

    @Composable
    private fun BatteryRingTile(
        prefix: String,
        unit: UnitTelemetry,
        iconRes: Int,
        modifier: GlanceModifier
    ) {
        val ringColor = if (unit.isCharging) ${chargingRingArgb}.toInt() else ${activeRingArgb}.toInt()
        val bitmap = RingGaugeRenderer.drawArcBitmap(
            sizePx = 192,
            percent = if (unit.connection == ConnectionState.DISCONNECTED) 0 else unit.percent,
            strokePx = ${(appearance.ringStrokeWidth * 2.2).toFixed(0)}f,
            arcColor = ringColor,
            trackColor = ${trackArgb}.toInt(),
            innerFillColor = ${innerFillArgb}.toInt(),
            showBolt = ${appearance.showChargingBolt} && unit.isCharging,
            isPairing = unit.connection == ConnectionState.PAIRING
        )
        Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
            Box(contentAlignment = Alignment.Center) {
                Image(provider = ImageProvider(bitmap), contentDescription = prefix, modifier = GlanceModifier.size(72.dp))
                Image(provider = ImageProvider(iconRes), contentDescription = null, modifier = GlanceModifier.size(34.dp))
            }
            Spacer(modifier = GlanceModifier.height(6.dp))
            Text(
                text = "$prefix \${unit.percent}%",
                style = TextStyle(color = ColorProvider(Color(${textArgb})), fontSize = 13.sp, fontWeight = FontWeight.Medium)
            )
        }
    }
}
`;
}

export function generateManifestAndProviderXml(appearance: WidgetAppearance): string {
  const minW = `${Math.max(110, Math.round(appearance.widgetWidthPx * 0.72))}dp`;
  const minH = `${Math.max(56, Math.round(appearance.widgetHeightPx * 0.72))}dp`;

  return `<!-- 1. AndroidManifest.xml (Universal Bluetooth & Launcher Widget Receiver) -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Bluetooth permissions for Android 8-11 and Android 12+ -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <application>
        <receiver
            android:name=".PixelBudsWidgetProvider"
            android:exported="true"
            android:label="Pixel Buds Material You">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="android.appwidget.action.APPWIDGET_OPTIONS_CHANGED" />
                <action android:name="android.bluetooth.device.action.BATTERY_LEVEL_CHANGED" />
                <action android:name="android.bluetooth.device.action.ACL_CONNECTED" />
                <action android:name="android.bluetooth.device.action.ACL_DISCONNECTED" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/pixel_buds_widget_info" />
        </receiver>
    </application>
</manifest>

<!-- 2. res/xml/pixel_buds_widget_info.xml (Works on Pixel, One UI, Nova, Niagara, Lawnchair) -->
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/pixel_buds_widget_description"
    android:initialLayout="@layout/widget_pixel_buds_standard"
    android:minWidth="${minW}"
    android:minHeight="${minH}"
    android:minResizeWidth="110dp"
    android:minResizeHeight="56dp"
    android:maxResizeWidth="540dp"
    android:maxResizeHeight="460dp"
    android:targetCellWidth="4"
    android:targetCellHeight="${appearance.layoutMode === 'horizontal' ? '1' : '2'}"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="900000"
    android:widgetCategory="home_screen|keyguard" />
`;
}

/**
 * KWGT / KLWP Universal Preset Tokens (Zero-Code install on ANY Android phone + launcher)
 */
export function generateKwgtExport(
  appearance: WidgetAppearance,
  battery: BatteryState,
  launcher: AndroidLauncherId
): string {
  const surfaceKwgt = toXmlArgb(appearance.surfaceColor, appearance.surfaceOpacity);
  const primaryKwgt = toXmlArgb(appearance.primaryContainerColor, 100);
  const chargingKwgt = toXmlArgb(appearance.chargingRingColor, 100);
  const activeKwgt = toXmlArgb(appearance.activeRingColor, 100);
  const textKwgt = toXmlArgb(appearance.textColor, 100);
  const mutedKwgt = toXmlArgb(appearance.mutedTextColor, 100);

  return `// =========================================================================
// KWGT / KLWP UNIVERSAL PRESET TOKENS (Any Android Phone + Any Launcher)
// Target Launcher: ${launcher.toUpperCase()} | Layout: ${appearance.layoutMode}
// =========================================================================

[CONTAINER SHAPE]
Shape: Rectangle
Width: ${appearance.widgetWidthPx} | Height: ${appearance.widgetHeightPx}
Corner Radius: ${appearance.cornerRadius}
Paint Color: ${surfaceKwgt}
Stroke Width: ${appearance.borderOpacity > 0 ? '1' : '0'}
Stroke Color: ${toXmlArgb('#FFFFFF', appearance.borderOpacity)}

[COLORS & MATERIAL YOU TOKENS]
Primary Icon Circle: ${primaryKwgt}
Charging Ring Color: ${chargingKwgt}
Active Ring Color: ${activeKwgt}
Text Primary: ${textKwgt}
Text Muted: ${mutedKwgt}

[KWGT LIVE KODE FORMULAS]
Left / Right / Case Battery (via Bluetooth + Tasker/FastPair variables):
  Left:  $if(nc(bt)=2, nc(abatt, 0) + "%", "--")$
  Case:  $if(br(tasker, buds_case)!="", br(tasker, buds_case) + "%", "${battery.caseBattery}%")$
  Right: $if(nc(bt)=2, nc(abatt, 1) + "%", "--")$

Ring Progress Angle (0..360):
  $if(nc(bt)=2, (nc(abatt, 0) / 100) * 310, 0)$
`;
}
