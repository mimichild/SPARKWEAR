import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, Platform, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSQLiteContext } from '../../src/db/context';
import { useSettingsStore } from '../../src/stores/settingsStore';
import {
  THEME_PRESETS, APP_FONT_OPTIONS, DEFAULT_THEME_COLOR, DEFAULT_FONT_KEY,
} from '../../src/constants/theme';
import {
  APP_VERSION, DEFAULT_TAB_ORDER, DEFAULT_ENABLED_TABS, CLOSET_TAB_LABELS,
} from '../../src/constants/defaults';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../src/constants/monetization';
import { getStorageStats } from '../../src/services/photoService';
import { exportBackup, importBackupFromPicker } from '../../src/services/backupService';
import {
  purchasePro, purchasePackage, restorePurchases, fetchPackages,
} from '../../src/services/purchases';
import { ProgressOverlay } from '../../src/components/ui/ProgressOverlay';
import {
  moveTabUp, moveTabDown, toggleTab, formatBytes,
} from '../../src/utils/settingsUtils';
import { useProGate } from '../../src/hooks/useProGate';
import { useIsPro } from '../../src/hooks/useIsPro';
import { AdBanner } from '../../src/components/AdBanner';
import type { ImportMode, ExportResult } from '../../src/types';

const HEX_REGEX = /^#([0-9a-fA-F]{6})$/;

function packagePlanLabel(pkg: PurchasesPackage): string {
  if (pkg.packageType === 'ANNUAL') return 'SPARK WEAR Pro 年費方案';
  if (pkg.packageType === 'MONTHLY') return 'SPARK WEAR Pro 月費方案';
  return pkg.product.title;
}

function packagePeriodLabel(pkg: PurchasesPackage): string {
  if (pkg.packageType === 'ANNUAL') return '訂閱期間：每年自動續訂';
  if (pkg.packageType === 'MONTHLY') return '訂閱期間：每月自動續訂';
  const iso = pkg.product.subscriptionPeriod;
  if (iso === 'P1Y') return '訂閱期間：每年自動續訂';
  if (iso === 'P1M') return '訂閱期間：每月自動續訂';
  if (iso === 'P1W') return '訂閱期間：每週自動續訂';
  return '訂閱期間：自動續訂';
}

export default function SettingsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const {
    themeColor, setThemeColor,
    fontKey, setFontKey,
    setProUnlocked,
    tabOrder, setTabOrder,
    enabledTabs, setEnabledTabs,
  } = useSettingsStore();

  const { requirePro } = useProGate();
  const isProUnlocked = useIsPro();

  // Pro 升級／恢復購買
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Custom hex color input
  const [customHex, setCustomHex] = useState('');
  const [customHexError, setCustomHexError] = useState('');

  // Storage stats
  const [storage, setStorage] = useState<{ count: number; totalBytes: number }>({
    count: 0, totalBytes: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // 匯出進度 overlay
  const [exportOverlayVisible, setExportOverlayVisible] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | undefined>(undefined);

  // 匯入進度 overlay
  const [importOverlayVisible, setImportOverlayVisible] = useState(false);
  const [importOverlayProgress, setImportOverlayProgress] = useState<number | undefined>(undefined);
  const [exportMsg, setExportMsg] = useState('');

  const loadStorage = useCallback(async () => {
    const stats = await getStorageStats();
    setStorage({ count: stats.count, totalBytes: stats.totalBytes });
  }, []);

  useEffect(() => { loadStorage(); }, [loadStorage]);

  // 需要顯示各方案的標題／期間／價格（Apple Guideline 3.1.2(c)），只有 iOS
  // 且尚未解鎖 Pro 時才需要載入。
  useEffect(() => {
    if (Platform.OS === 'android' || isProUnlocked) return;
    let cancelled = false;
    setLoadingPackages(true);
    fetchPackages()
      .then(pkgs => { if (!cancelled) setPackages(pkgs); })
      .finally(() => { if (!cancelled) setLoadingPackages(false); });
    return () => { cancelled = true; };
  }, [isProUnlocked]);

  // Sanitize persisted tabOrder: keep only known keys, append any missing ones at the end
  const knownTabs = new Set<string>(DEFAULT_TAB_ORDER);
  const filtered = tabOrder.filter(t => knownTabs.has(t));
  const missing = (DEFAULT_TAB_ORDER as readonly string[]).filter(t => !filtered.includes(t));
  const effectiveTabOrder = [...filtered, ...missing];

  // Sanitize enabledTabs against known keys; fall back to first tab if all invalid
  const rawEnabled = enabledTabs.filter(t => knownTabs.has(t));
  const sanitizedEnabledTabs = rawEnabled.length > 0 ? rawEnabled : [effectiveTabOrder[0]];

  const handlePurchase = useCallback(async () => {
    setPurchasing(true);
    try {
      const isPro = await purchasePro();
      if (isPro) {
        await setProUnlocked(true);
        Alert.alert('升級成功', 'Pro 功能已啟用');
      }
    } catch (e) {
      Alert.alert('升級失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setPurchasing(false);
    }
  }, [setProUnlocked]);

  const handlePurchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const isPro = await purchasePackage(pkg);
      if (isPro) {
        await setProUnlocked(true);
        Alert.alert('升級成功', 'Pro 功能已啟用');
      }
    } catch (e) {
      Alert.alert('升級失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setPurchasing(false);
    }
  }, [setProUnlocked]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const isPro = await restorePurchases();
      await setProUnlocked(isPro);
      Alert.alert(isPro ? '還原成功' : '沒有找到可還原的購買紀錄', isPro ? 'Pro 功能已啟用' : '若你曾經購買過，請確認使用的是同一個 Apple ID');
    } catch (e) {
      Alert.alert('還原失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setRestoring(false);
    }
  }, [setProUnlocked]);

  const handleCustomHex = useCallback(async () => {
    if (!requirePro('自訂主題色')) return;
    const trimmed = customHex.trim();
    if (!HEX_REGEX.test(trimmed)) {
      setCustomHexError('請輸入正確的色碼，例如 #ff0000');
      return;
    }
    setCustomHexError('');
    await setThemeColor(trimmed.toLowerCase());
    setCustomHex('');
  }, [customHex, setThemeColor, requirePro]);

  const handleSelectPreset = useCallback((color: string) => {
    if (!requirePro('主題色')) return;
    setThemeColor(color);
  }, [setThemeColor, requirePro]);

  const handleMoveUp = useCallback(async (index: number) => {
    await setTabOrder(moveTabUp(effectiveTabOrder, index));
  }, [effectiveTabOrder, setTabOrder]);

  const handleMoveDown = useCallback(async (index: number) => {
    await setTabOrder(moveTabDown(effectiveTabOrder, index));
  }, [effectiveTabOrder, setTabOrder]);

  const handleToggleTab = useCallback(async (tab: string) => {
    if (sanitizedEnabledTabs.length <= 1 && sanitizedEnabledTabs.includes(tab)) {
      Alert.alert('無法停用', '至少需要保留一個分頁');
      return;
    }
    await setEnabledTabs(toggleTab(sanitizedEnabledTabs, tab));
  }, [sanitizedEnabledTabs, setEnabledTabs]);

  const doExport = useCallback(async (saveToDevice: boolean) => {
    setExporting(true);
    setExportOverlayVisible(true);
    setExportProgress(undefined);
    setExportMsg('讀取資料中…');

    let result: ExportResult | null = null;
    try {
      result = await exportBackup(db, saveToDevice, (stage, current, total) => {
        if (stage === 'reading') {
          setExportMsg('讀取資料中…');
          setExportProgress(undefined);
        } else if (stage === 'packing') {
          const pct = total > 0 ? (current / total) * 0.9 : 0;
          setExportMsg(`打包照片 ${current} / ${total}`);
          setExportProgress(pct);
        } else if (stage === 'saving') {
          setExportMsg('寫入檔案中…');
          setExportProgress(0.95);
        } else if (stage === 'done') {
          setExportMsg('完成');
          setExportProgress(1);
        }
      });
    } catch (e) {
      console.warn('[export] failed', e);
      Alert.alert('匯出失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setExportOverlayVisible(false);
      setExportProgress(undefined);
      setExportMsg('');
      setExporting(false);
    }

    if (result?.status === 'done' && saveToDevice && Platform.OS === 'android') {
      Alert.alert('匯出完成', `備份已儲存至：\n${result.savedTo ?? '你選擇的資料夾'}`);
    }
  }, [db]);

  const handleExport = useCallback(() => {
    if (!requirePro('匯出備份')) return;
    if (Platform.OS === 'android') {
      Alert.alert(
        '匯出備份',
        '將所有單品、穿搭與照片打包成 ZIP 檔案，請選擇儲存方式：',
        [
          { text: '取消', style: 'cancel' },
          { text: '分享至…', onPress: () => doExport(false) },
          { text: '儲存至手機', onPress: () => doExport(true) },
        ]
      );
    } else {
      Alert.alert(
        '匯出備份',
        '將所有單品、穿搭與照片打包成 ZIP 檔案。\n\n完成後開啟分享視窗，選擇「儲存至檔案」即可存至手機。',
        [
          { text: '取消', style: 'cancel' },
          { text: '確認匯出', onPress: () => doExport(false) },
        ]
      );
    }
  }, [doExport, requirePro]);

  const handleImport = useCallback(async (mode: ImportMode) => {
    setImporting(true);
    setImportOverlayVisible(true);
    setImportOverlayProgress(undefined);
    setImportProgress('選取檔案中…');
    try {
      const result = await importBackupFromPicker(db, mode, (stage, current, total) => {
        if (stage === 'copying') {
          setImportProgress('正在複製備份檔案，請稍候…');
          setImportOverlayProgress(undefined);
        } else if (stage === 'reading') {
          const pct = total > 0 ? (current / total) * 0.3 : undefined;
          setImportProgress('讀取備份中…');
          setImportOverlayProgress(pct);
        } else if (stage === 'parsing') {
          setImportProgress('解析資料中…');
          setImportOverlayProgress(0.3);
        } else if (stage === 'importing') {
          const pct = total > 0 ? 0.3 + (current / total) * 0.7 : 0.3;
          setImportProgress(`還原照片 ${current} / ${total}`);
          setImportOverlayProgress(pct);
        } else if (stage === 'done') {
          setImportProgress('完成');
          setImportOverlayProgress(1);
        }
      });
      if (!result) return; // user cancelled
      await loadStorage();
      Alert.alert(
        '匯入完成',
        `單品：${result.itemCount} 件\n穿搭：${result.outfitCount} 筆\n照片：${result.photoCount} 張${result.missingPhotoCount > 0 ? `\n遺失照片：${result.missingPhotoCount} 張` : ''}`
      );
    } catch (e) {
      console.warn('[import] failed', e);
      Alert.alert('匯入失敗', e instanceof Error ? e.message : '請稍後再試');
    } finally {
      setImportOverlayVisible(false);
      setImportOverlayProgress(undefined);
      setImporting(false);
      setImportProgress('');
    }
  }, [db, loadStorage]);

  const handleImportPress = useCallback(() => {
    if (!requirePro('匯入備份')) return;
    Alert.alert('匯入備份', '請選擇匯入方式', [
      {
        text: '合併（保留現有資料）',
        onPress: () => handleImport('merge'),
      },
      {
        text: '覆蓋（清除現有資料）',
        style: 'destructive',
        onPress: () => handleImport('replace'),
      },
      { text: '取消', style: 'cancel' },
    ]);
  }, [handleImport, requirePro]);

  const handleResetTabs = useCallback(async () => {
    await setTabOrder([...DEFAULT_TAB_ORDER]);
    await setEnabledTabs([...DEFAULT_ENABLED_TABS]);
  }, [setTabOrder, setEnabledTabs]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: themeColor || DEFAULT_THEME_COLOR, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Text style={styles.headerBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Pro 解鎖 */}
        <Text style={styles.sectionTitle}>PRO 解鎖</Text>
        <View style={styles.card}>
          {Platform.OS === 'android' ? (
            <View style={styles.proBadgeRow}>
              <Text style={styles.proBadge}>✓ Pro 已解鎖（Android 版全功能免費開放）</Text>
            </View>
          ) : isProUnlocked ? (
            <View style={styles.proBadgeRow}>
              <Text style={styles.proBadge}>✓ Pro 已解鎖</Text>
            </View>
          ) : (
            <>
              <Text style={styles.cardLabel}>升級 Pro 即可解鎖主題色、字體、匯出匯入，並移除廣告</Text>

              {loadingPackages ? (
                <Text style={styles.cardLabel}>載入方案中…</Text>
              ) : packages.length > 0 ? (
                packages.map(pkg => (
                  <View key={pkg.identifier} style={styles.planRow}>
                    <View style={styles.planInfo}>
                      <Text style={styles.planTitle}>{packagePlanLabel(pkg)}</Text>
                      <Text style={styles.planMeta}>{packagePeriodLabel(pkg)}</Text>
                      <Text style={styles.planMeta}>價格：{pkg.product.priceString}</Text>
                    </View>
                    <Pressable
                      onPress={() => handlePurchasePackage(pkg)}
                      disabled={purchasing}
                      style={[styles.actionBtn, { backgroundColor: themeColor || DEFAULT_THEME_COLOR }]}
                    >
                      <Text style={styles.actionBtnText}>{purchasing ? '處理中…' : '訂閱'}</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Pressable
                  onPress={handlePurchase}
                  disabled={purchasing}
                  style={[styles.actionBtn, { backgroundColor: themeColor || DEFAULT_THEME_COLOR, marginTop: 4 }]}
                >
                  <Text style={styles.actionBtnText}>{purchasing ? '處理中…' : '升級 Pro'}</Text>
                </Pressable>
              )}

              <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                <Text style={[styles.restoreBtnText, { color: themeColor || DEFAULT_THEME_COLOR }]}>
                  {restoring ? '還原中…' : '恢復購買'}
                </Text>
              </Pressable>

              <View style={styles.legalRow}>
                <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
                  <Text style={styles.legalLink}>隱私權政策</Text>
                </Pressable>
                <Text style={styles.legalDot}>·</Text>
                <Pressable onPress={() => Linking.openURL(TERMS_OF_USE_URL)} hitSlop={8}>
                  <Text style={styles.legalLink}>服務條款</Text>
                </Pressable>
              </View>
              <Text style={styles.legalHint}>訂閱將自動續訂，可隨時於 App Store 帳號設定中取消</Text>
            </>
          )}
        </View>

        {/* 主題色 */}
        <Text style={styles.sectionTitle}>主題色</Text>
        <View style={styles.card}>
          <View style={styles.swatchWrap}>
            {THEME_PRESETS.map(preset => {
              const selected = themeColor?.toLowerCase() === preset.color.toLowerCase();
              return (
                <Pressable
                  key={preset.color}
                  onPress={() => handleSelectPreset(preset.color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: preset.color },
                    selected && styles.swatchSelected,
                  ]}
                  accessibilityLabel={preset.label}
                >
                  {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.cardLabel, { marginTop: 16 }]}>自訂色碼</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={styles.input}
              value={customHex}
              onChangeText={(t) => { setCustomHex(t); setCustomHexError(''); }}
              placeholder="#ff0000"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={handleCustomHex}
              style={[styles.actionBtn, { backgroundColor: themeColor || DEFAULT_THEME_COLOR }]}
            >
              <Text style={styles.actionBtnText}>套用</Text>
            </Pressable>
          </View>
          {customHexError ? <Text style={styles.errorText}>{customHexError}</Text> : null}
        </View>

        {/* 字體 (Pro only) */}
        <Text style={styles.sectionTitle}>字體</Text>
        {isProUnlocked ? (
          <View style={styles.card}>
            <ScrollView style={styles.fontList} nestedScrollEnabled>
              {APP_FONT_OPTIONS.filter(opt =>
                Platform.OS === 'android' ? opt.android !== null : opt.ios !== null
              ).map(opt => {
                const selected = fontKey === opt.key;
                const nativeName = Platform.OS === 'android' ? opt.android : opt.ios;
                const fontStyle = nativeName ? { fontFamily: nativeName as string } : undefined;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setFontKey(opt.key)}
                    style={[styles.fontRow, selected && { backgroundColor: `${themeColor || DEFAULT_THEME_COLOR}12` }]}
                  >
                    <View style={styles.fontRowLeft}>
                      <Text style={[styles.fontLabel, fontStyle]}>{opt.label}</Text>
                      <Text style={[styles.fontSample, fontStyle]}>Aa 春夏秋冬 123</Text>
                    </View>
                    {selected ? (
                      <Text style={[styles.fontCheck, { color: themeColor || DEFAULT_THEME_COLOR }]}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.card, styles.lockedCard]}>
            <Text style={styles.lockedText}>升級 Pro 解鎖字體選擇</Text>
          </View>
        )}

        {/* Tab 設定 */}
        <Text style={styles.sectionTitle}>TAB 順序</Text>
        <View style={styles.card}>
          {effectiveTabOrder.map((tab, index) => {
            const isEnabled = sanitizedEnabledTabs.includes(tab);
            const canMoveUp = index > 0;
            const canMoveDown = index < effectiveTabOrder.length - 1;
            return (
              <View key={tab} style={styles.tabRow}>
                <Text style={styles.tabName}>{CLOSET_TAB_LABELS[tab] ?? tab}</Text>
                <View style={styles.tabActions}>
                  <Pressable
                    onPress={() => handleMoveUp(index)}
                    disabled={!canMoveUp}
                    style={[styles.tabBtn, !canMoveUp && styles.tabBtnDisabled]}
                  >
                    <Text style={[styles.tabBtnText, !canMoveUp && styles.tabBtnTextDisabled]}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleMoveDown(index)}
                    disabled={!canMoveDown}
                    style={[styles.tabBtn, !canMoveDown && styles.tabBtnDisabled]}
                  >
                    <Text style={[styles.tabBtnText, !canMoveDown && styles.tabBtnTextDisabled]}>↓</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleToggleTab(tab)}
                    style={[
                      styles.toggleBtn,
                      isEnabled
                        ? { backgroundColor: themeColor || DEFAULT_THEME_COLOR }
                        : styles.toggleBtnOff,
                    ]}
                  >
                    <Text style={[styles.toggleText, !isEnabled && styles.toggleTextOff]}>
                      {isEnabled ? '啟用' : '停用'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Pressable onPress={handleResetTabs} style={styles.resetRow}>
            <Text style={styles.resetText}>重設為預設順序</Text>
          </Pressable>
        </View>

        {/* 暫存區 */}
        <Text style={styles.sectionTitle}>暫存區</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.storageRow}
            onPress={() => router.push('/settings/trash')}
          >
            <Text style={styles.storageLabel}>最近刪除的單品（30 天可還原）</Text>
            <Text style={[styles.storageValue, { color: themeColor || DEFAULT_THEME_COLOR }]}>查看 ›</Text>
          </Pressable>
        </View>

        {/* 儲存空間 */}
        <Text style={styles.sectionTitle}>儲存空間</Text>
        <View style={styles.card}>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>照片數量</Text>
            <Text style={styles.storageValue}>{storage.count} 張</Text>
          </View>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>總大小</Text>
            <Text style={styles.storageValue}>{formatBytes(storage.totalBytes)}</Text>
          </View>
        </View>

        {/* 備份與還原 */}
        <Text style={styles.sectionTitle}>備份與還原</Text>
        <View style={styles.card}>
          {importing && importProgress ? (
            <Text style={styles.progressText}>{importProgress}</Text>
          ) : null}
          <Pressable
            onPress={handleExport}
            disabled={exporting || importing}
            style={[
              styles.fullBtn,
              { backgroundColor: themeColor || DEFAULT_THEME_COLOR },
              (exporting || importing) && styles.fullBtnDisabled,
            ]}
          >
            <Text style={styles.fullBtnText}>{exporting ? '匯出中…' : '匯出備份（ZIP）'}</Text>
          </Pressable>
          <Pressable
            onPress={handleImportPress}
            disabled={exporting || importing}
            style={[styles.fullBtn, styles.fullBtnOutline, { borderColor: themeColor || DEFAULT_THEME_COLOR }, (exporting || importing) && styles.fullBtnDisabled]}
          >
            <Text style={[styles.fullBtnOutlineText, { color: themeColor || DEFAULT_THEME_COLOR }]}>
              {importing ? '匯入中…' : '匯入備份（ZIP）'}
            </Text>
          </Pressable>
          <Text style={styles.backupHint}>
            合併：新資料加入現有衣櫃 ｜ 覆蓋：清除現有資料後還原
          </Text>
        </View>

        {/* 版本 */}
        <Text style={styles.sectionTitle}>版本</Text>
        <View style={styles.card}>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>SPARKWEAR</Text>
            <Text style={styles.storageValue}>v{APP_VERSION}</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ProgressOverlay
        visible={exportOverlayVisible}
        title="匯出備份中"
        progress={exportProgress}
        message={exportMsg}
      />

      <ProgressOverlay
        visible={importOverlayVisible}
        title="匯入備份中"
        progress={importOverlayProgress}
        message={importProgress}
      />

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerBtn: { minWidth: 32, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2 },
  headerBtnText: { fontSize: 20, color: '#fff', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#888',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginTop: 18, marginBottom: 8, marginLeft: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
  },
  cardLabel: { fontSize: 13, color: '#666', marginBottom: 8 },

  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa',
  },
  actionBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#e53935', fontSize: 12, marginTop: 6 },

  proBadgeRow: { alignItems: 'center', paddingVertical: 4 },
  proBadge: { fontSize: 15, fontWeight: '600', color: '#43a047' },
  restoreBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  restoreBtnText: { fontSize: 13, fontWeight: '500' },

  planRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  planMeta: { fontSize: 12, color: '#888', marginTop: 2 },

  legalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12,
  },
  legalLink: { fontSize: 12, color: '#666', textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: '#ccc' },
  legalHint: {
    fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6, lineHeight: 16,
  },

  swatchWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#eee',
  },
  swatchSelected: { borderWidth: 2, borderColor: '#333' },
  swatchCheck: { color: '#fff', fontSize: 18, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },

  fontList: { maxHeight: 300 },
  fontRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  fontRowLeft: { flex: 1, gap: 2 },
  fontLabel: { fontSize: 14, color: '#333' },
  fontSample: { fontSize: 12, color: '#999' },
  fontCheck: { fontSize: 16, fontWeight: '700', marginLeft: 8 },

  lockedCard: { alignItems: 'center', paddingVertical: 18, backgroundColor: '#f1f1f1' },
  lockedText: { color: '#888', fontSize: 14 },

  tabRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  tabName: { fontSize: 15, color: '#333' },
  tabActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f4f4f4',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnDisabled: { backgroundColor: '#fafafa' },
  tabBtnText: { fontSize: 16, color: '#444' },
  tabBtnTextDisabled: { color: '#ccc' },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    minWidth: 56, alignItems: 'center',
  },
  toggleBtnOff: { backgroundColor: '#e0e0e0' },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  toggleTextOff: { color: '#666' },

  resetRow: { alignItems: 'center', paddingTop: 12 },
  resetText: { color: '#888', fontSize: 13 },

  storageRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  storageLabel: { fontSize: 14, color: '#666' },
  storageValue: { fontSize: 14, color: '#333', fontWeight: '500' },

  fullBtn: {
    marginTop: 10, paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  fullBtnDisabled: { opacity: 0.6 },
  fullBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  fullBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  fullBtnOutlineText: { fontSize: 14, fontWeight: '600' },

  progressText: {
    textAlign: 'center', fontSize: 13, color: '#888',
    marginBottom: 6,
  },
  backupHint: {
    fontSize: 11, color: '#aaa', textAlign: 'center',
    marginTop: 10, lineHeight: 16,
  },
});
