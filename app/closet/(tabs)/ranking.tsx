import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, FlatList, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import { useRanking } from '../../../src/hooks/useRanking';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useUIStore } from '../../../src/stores/uiStore';
import { addVote } from '../../../src/services/itemService';
import { getPhotoUri } from '../../../src/services/photoService';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { RankingMetric, RankingPeriod, SortDir, RankEntry } from '../../../src/types';

const METRICS: { key: RankingMetric; label: string }[] = [
  { key: 'usage',       label: '使用次數' },
  { key: 'cp',          label: 'C/P值' },
  { key: 'price',       label: '金額' },
  { key: 'brand_count', label: '品牌數量' },
  { key: 'color_count', label: '顏色' },
];

const DEFAULT_DIRS: Record<RankingMetric, SortDir> = {
  usage: 'desc', cp: 'desc', price: 'desc', brand_count: 'desc', color_count: 'desc',
};

const PERIODS: { key: RankingPeriod; label: string }[] = [
  { key: 'month',   label: '當月' },
  { key: 'quarter', label: '當季' },
  { key: 'year',    label: '當年' },
  { key: 'rolling', label: '年度' },
  { key: 'all',     label: '累積' },
];

const MISSING_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="100%" height="100%" fill="#e5e0d8"/></svg>'
  );

export default function RankingTab() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { themeColor } = useSettingsStore();
  const { setItemNavIds } = useUIStore();
  const insets = useSafeAreaInsets();

  const [metric, setMetric] = useState<RankingMetric>('usage');
  const [period, setPeriod] = useState<RankingPeriod>('all');
  const [dirs, setDirs] = useState<Record<RankingMetric, SortDir>>(DEFAULT_DIRS);
  const dir = dirs[metric];
  const { ranked, loading, reload } = useRanking(metric, period, dir);

  const handleMetricPress = useCallback((key: RankingMetric) => {
    if (key === metric) {
      // 再點一下切換方向
      setDirs(prev => ({ ...prev, [key]: prev[key] === 'desc' ? 'asc' : 'desc' }));
    } else {
      setMetric(key);
    }
  }, [metric]);

  // Vote modal state
  const [voteVisible, setVoteVisible] = useState(false);
  const [selectedForVote, setSelectedForVote] = useState<Set<string>>(new Set());
  const [voteSearch, setVoteSearch] = useState('');
  const [voteEntries, setVoteEntries] = useState<RankEntry[]>([]);
  const [confirmVote, setConfirmVote] = useState(false);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const periodDescription = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const q = Math.floor((m - 1) / 3) + 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = now.toISOString().slice(0, 10);
    const ago = new Date(now);
    ago.setFullYear(ago.getFullYear() - 1);
    const agoStr = ago.toISOString().slice(0, 10);
    switch (period) {
      case 'month':   return `${y}年${pad(m)}月`;
      case 'quarter': return `${y}年 第${q}季（${pad((q - 1) * 3 + 1)}月～${pad(q * 3)}月）`;
      case 'year':    return `${y}年（當年）`;
      case 'rolling': return `${agoStr} ～ ${today}（往前推一年）`;
      case 'all':     return '購買至今（累積總計）';
    }
  }, [period]);

  const openVote = useCallback(() => {
    setVoteEntries(ranked);
    setSelectedForVote(new Set());
    setVoteSearch('');
    setVoteVisible(true);
  }, [ranked]);

  const handleConfirmVote = useCallback(async () => {
    for (const id of Array.from(selectedForVote)) {
      await addVote(db, id); // id 是 itemId（票選時存的是 itemId）
    }
    setConfirmVote(false);
    setVoteVisible(false);
    reload();
  }, [selectedForVote, db, reload]);

  const filteredVoteEntries = voteSearch
    ? voteEntries.filter(e =>
        e.title.includes(voteSearch) ||
        (e.subtitle ?? '').includes(voteSearch)
      )
    : voteEntries;


  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>返回</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>排行</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Metric selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.metricRow}
        contentContainerStyle={styles.metricContent}
      >
        {METRICS.map(m => {
          const isActive = metric === m.key;
          const arrow = isActive ? (dirs[m.key] === 'desc' ? ' ↑' : ' ↓') : '';
          return (
            <Pressable
              key={m.key}
              style={[styles.pill, isActive && { backgroundColor: themeColor }]}
              onPress={() => handleMetricPress(m.key)}
            >
              <Text style={[styles.pillText, isActive && styles.pillActive]}>
                {m.label}{arrow}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Period selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodRow}
        contentContainerStyle={styles.periodContent}
      >
        {PERIODS.map(p => (
          <Pressable
            key={p.key}
            style={[styles.periodChip, period === p.key && { borderColor: themeColor }]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && { color: themeColor, fontWeight: '600' }]}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 時段說明 */}
      {(metric === 'usage' || metric === 'cp') && (
        <View style={styles.periodDesc}>
          <Text style={styles.periodDescText}>{periodDescription}</Text>
        </View>
      )}

      {/* Ranked list */}
      {loading ? (
        <View style={styles.center}><Text style={styles.hint}>載入中...</Text></View>
      ) : ranked.length === 0 ? (
        <View style={styles.center}><Text style={styles.hint}>此時段沒有資料</Text></View>
      ) : (
        <FlatList
          data={ranked}
          keyExtractor={entry => entry.id}
          renderItem={({ item: entry, index }) => {
            const coverUri = entry.photoPath ? getPhotoUri(entry.photoPath) : MISSING_URI;
            return (
              <Pressable
                style={styles.row}
                onPress={() => {
                  if (!entry.itemId) return;
                  setItemNavIds([]);
                  router.push(`/closet/item/${entry.itemId}`);
                }}
              >
                <Text style={[styles.rank, index < 3 && { color: themeColor, fontWeight: '700' }]}>
                  {index + 1}
                </Text>
                <Image source={{ uri: coverUri }} style={styles.thumb} resizeMode="cover" />
                <View style={styles.rowInfo}>
                  {entry.subtitle ? <Text style={styles.rowBrand}>{entry.subtitle}</Text> : null}
                  <Text style={styles.rowName} numberOfLines={1}>{entry.title}</Text>
                </View>
                <Text style={[styles.rowScore, { color: themeColor }]}>
                  {entry.scoreText}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {/* Vote modal */}
      <Modal visible={voteVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>票選衣服</Text>
            <Pressable onPress={() => setVoteVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>取消</Text>
            </Pressable>
          </View>
          <FlatList
            data={filteredVoteEntries}
            keyExtractor={e => e.id}
            renderItem={({ item: entry }) => {
              const voteId = entry.itemId ?? entry.id;
              const checked = selectedForVote.has(voteId);
              return (
                <Pressable
                  style={[styles.voteRow, checked && { backgroundColor: `${themeColor}18` }]}
                  onPress={() => {
                    setSelectedForVote(prev => {
                      const next = new Set(prev);
                      checked ? next.delete(voteId) : next.add(voteId);
                      return next;
                    });
                  }}
                >
                  <View style={[styles.voteCheck, checked && { backgroundColor: themeColor, borderColor: themeColor }]}>
                    {checked && <Text style={styles.voteCheckMark}>✓</Text>}
                  </View>
                  <View style={styles.voteInfo}>
                    {entry.subtitle ? <Text style={styles.voteBrand}>{entry.subtitle}</Text> : null}
                    <Text style={styles.voteName}>{entry.title}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
          {selectedForVote.size > 0 && (
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: themeColor }]}
              onPress={() => setConfirmVote(true)}
            >
              <Text style={styles.confirmBtnText}>確認投票（{selectedForVote.size} 件）</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </Modal>

      <ConfirmDialog
        visible={confirmVote}
        title="確認票選"
        message={`將為 ${selectedForVote.size} 件單品各加 1 票，確定嗎？`}
        confirmLabel="確認"
        onConfirm={handleConfirmVote}
        onCancel={() => setConfirmVote(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  headerRight: { flex: 1 },
  backBtn: { paddingVertical: 2, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  voteBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  voteBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  metricRow: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  metricContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  periodRow: { flexShrink: 0 },
  periodContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  pill: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#eee' },
  pillText: { fontSize: 13, color: '#555' },
  pillActive: { color: '#fff' },
  periodChip: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  periodText: { fontSize: 13, color: '#888' },
  periodDesc: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: '#f5f3f0',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8e4de',
  },
  periodDescText: { fontSize: 12, color: '#999' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#bbb', fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0ede8',
    gap: 10,
  },
  rank: { width: 32, fontSize: 14, color: '#aaa', textAlign: 'center' },
  thumb: {
    width: 48, height: 64, borderRadius: 6, backgroundColor: '#ece9e4',
  },
  rowInfo: { flex: 1 },
  rowBrand: { fontSize: 11, color: '#aaa' },
  rowName: { fontSize: 14, color: '#222', fontWeight: '500' },
  rowScore: { fontSize: 13, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  modal: { flex: 1, backgroundColor: '#faf9f7' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 15, color: '#888' },
  voteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0ede8',
  },
  voteCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ccc', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  voteCheckMark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  voteInfo: { flex: 1 },
  voteBrand: { fontSize: 11, color: '#aaa' },
  voteName: { fontSize: 14, color: '#222' },
  confirmBtn: {
    margin: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
