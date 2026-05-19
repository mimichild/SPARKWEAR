import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from '../../../src/db/context';
import { useRanking } from '../../../src/hooks/useRanking';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { addVote } from '../../../src/services/itemService';
import { getPhotoUri } from '../../../src/services/photoService';
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog';
import type { RankingMetric, RankingPeriod, Item } from '../../../src/types';

const METRICS: { key: RankingMetric; label: string }[] = [
  { key: 'usage',      label: '使用次數' },
  { key: 'price_asc',  label: '金額↑' },
  { key: 'price_desc', label: '金額↓' },
  { key: 'cp',         label: 'C/P值' },
];

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
  const insets = useSafeAreaInsets();

  const [metric, setMetric] = useState<RankingMetric>('usage');
  const [period, setPeriod] = useState<RankingPeriod>('all');
  const { ranked, loading, reload } = useRanking(metric, period);

  // Vote modal state
  const [voteVisible, setVoteVisible] = useState(false);
  const [selectedForVote, setSelectedForVote] = useState<Set<string>>(new Set());
  const [voteSearch, setVoteSearch] = useState('');
  const [voteItems, setVoteItems] = useState<Item[]>([]);
  const [confirmVote, setConfirmVote] = useState(false);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openVote = useCallback(() => {
    setVoteItems(ranked);
    setSelectedForVote(new Set());
    setVoteSearch('');
    setVoteVisible(true);
  }, [ranked]);

  const handleConfirmVote = useCallback(async () => {
    for (const id of Array.from(selectedForVote)) {
      await addVote(db, id);
    }
    setConfirmVote(false);
    setVoteVisible(false);
    reload();
  }, [selectedForVote, db, reload]);

  const filteredVoteItems = voteSearch
    ? voteItems.filter(i =>
        i.name.includes(voteSearch) ||
        (i.brand ?? '').includes(voteSearch)
      )
    : voteItems;

  const formatScore = (item: Item, metric: RankingMetric): string => {
    switch (metric) {
      case 'usage':    return `${item.usageCount} 次`;
      case 'price_asc':
      case 'price_desc': {
        const p = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
        return p != null ? `$${p}` : '—';
      }
      case 'cp': {
        const price = item.discountPrice ?? item.specialPrice ?? item.originalPrice;
        if (price == null || item.usageCount === 0) return '—';
        return `$${Math.round(price / item.usageCount)}/次`;
      }
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>排行榜</Text>
        <Pressable onPress={openVote} style={styles.voteBtn}>
          <Text style={styles.voteBtnText}>票選</Text>
        </Pressable>
      </View>

      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricRow} contentContainerStyle={styles.selectorContent}>
        {METRICS.map(m => (
          <Pressable
            key={m.key}
            style={[styles.pill, metric === m.key && { backgroundColor: themeColor }]}
            onPress={() => setMetric(m.key)}
          >
            <Text style={[styles.pillText, metric === m.key && styles.pillActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow} contentContainerStyle={styles.selectorContent}>
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

      {/* Ranked list */}
      {loading ? (
        <View style={styles.center}><Text style={styles.hint}>載入中...</Text></View>
      ) : ranked.length === 0 ? (
        <View style={styles.center}><Text style={styles.hint}>此時段沒有單品</Text></View>
      ) : (
        <FlatList
          data={ranked}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => {
            const coverUri = item.photoIds[0] ? getPhotoUri(item.photoIds[0]) : MISSING_URI;
            return (
              <Pressable style={styles.row} onPress={() => router.push(`/closet/item/${item.id}`)}>
                <Text style={[styles.rank, index < 3 && { color: themeColor, fontWeight: '700' }]}>
                  #{index + 1}
                </Text>
                <View style={styles.rowImg}>
                  <View style={styles.thumb}>
                    {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
                    <View style={[styles.thumb, { overflow: 'hidden' }]}>
                      <Text style={styles.thumbFallback}>{item.name[0]}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.rowInfo}>
                  {item.brand ? <Text style={styles.rowBrand}>{item.brand}</Text> : null}
                  <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={[styles.rowScore, { color: themeColor }]}>
                  {formatScore(item, metric)}
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
            data={filteredVoteItems}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const checked = selectedForVote.has(item.id);
              return (
                <Pressable
                  style={[styles.voteRow, checked && { backgroundColor: `${themeColor}18` }]}
                  onPress={() => {
                    setSelectedForVote(prev => {
                      const next = new Set(prev);
                      checked ? next.delete(item.id) : next.add(item.id);
                      return next;
                    });
                  }}
                >
                  <View style={[styles.voteCheck, checked && { backgroundColor: themeColor, borderColor: themeColor }]}>
                    {checked && <Text style={styles.voteCheckMark}>✓</Text>}
                  </View>
                  <View style={styles.voteInfo}>
                    {item.brand ? <Text style={styles.voteBrand}>{item.brand}</Text> : null}
                    <Text style={styles.voteName}>{item.name}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  voteBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  voteBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  metricRow: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  periodRow: { maxHeight: 40 },
  selectorContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  pill: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#eee' },
  pillText: { fontSize: 13, color: '#555' },
  pillActive: { color: '#fff' },
  periodChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  periodText: { fontSize: 13, color: '#888' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#bbb', fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0ede8',
    gap: 10,
  },
  rank: { width: 32, fontSize: 14, color: '#aaa', textAlign: 'center' },
  rowImg: { width: 40 },
  thumb: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#ece9e4',
    justifyContent: 'center', alignItems: 'center',
  },
  thumbFallback: { fontSize: 16, color: '#999' },
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
