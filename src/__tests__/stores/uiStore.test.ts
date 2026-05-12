import { act } from 'react';
import { useUIStore } from '../../stores/uiStore';

// Reset store before each test
beforeEach(() => {
  const state = useUIStore.getState();
  state.clearSelection();
  state.setClosetQuery('');
  state.setOutfitQuery('');
  state.setRankingQuery('');
});

describe('uiStore', () => {
  describe('初始狀態', () => {
    it('搜尋關鍵字全部為空', () => {
      const { closetQuery, outfitQuery, rankingQuery } = useUIStore.getState();
      expect(closetQuery).toBe('');
      expect(outfitQuery).toBe('');
      expect(rankingQuery).toBe('');
    });

    it('選取集合為空', () => {
      const { selectedItemIds, selectedOutfitIds } = useUIStore.getState();
      expect(selectedItemIds.size).toBe(0);
      expect(selectedOutfitIds.size).toBe(0);
    });

    it('選取模式關閉', () => {
      expect(useUIStore.getState().isSelectionMode).toBe(false);
    });
  });

  describe('搜尋關鍵字', () => {
    it('setClosetQuery 更新衣櫃搜尋', () => {
      act(() => useUIStore.getState().setClosetQuery('黑色上衣'));
      expect(useUIStore.getState().closetQuery).toBe('黑色上衣');
    });

    it('setOutfitQuery 更新穿搭搜尋', () => {
      act(() => useUIStore.getState().setOutfitQuery('台北'));
      expect(useUIStore.getState().outfitQuery).toBe('台北');
    });

    it('setRankingQuery 更新排行搜尋', () => {
      act(() => useUIStore.getState().setRankingQuery('外套'));
      expect(useUIStore.getState().rankingQuery).toBe('外套');
    });
  });

  describe('批次選取', () => {
    it('enterSelectionMode 開啟選取模式', () => {
      act(() => useUIStore.getState().enterSelectionMode());
      expect(useUIStore.getState().isSelectionMode).toBe(true);
    });

    it('toggleItemSelection 新增選取', () => {
      act(() => useUIStore.getState().toggleItemSelection('item-1'));
      expect(useUIStore.getState().selectedItemIds.has('item-1')).toBe(true);
    });

    it('toggleItemSelection 再次點擊取消選取', () => {
      act(() => {
        useUIStore.getState().toggleItemSelection('item-1');
        useUIStore.getState().toggleItemSelection('item-1');
      });
      expect(useUIStore.getState().selectedItemIds.has('item-1')).toBe(false);
    });

    it('可同時選取多個 item', () => {
      act(() => {
        useUIStore.getState().toggleItemSelection('item-1');
        useUIStore.getState().toggleItemSelection('item-2');
        useUIStore.getState().toggleItemSelection('item-3');
      });
      expect(useUIStore.getState().selectedItemIds.size).toBe(3);
    });

    it('clearSelection 清除全部選取並關閉選取模式', () => {
      act(() => {
        useUIStore.getState().enterSelectionMode();
        useUIStore.getState().toggleItemSelection('item-1');
        useUIStore.getState().toggleOutfitSelection('outfit-1');
        useUIStore.getState().clearSelection();
      });
      const { selectedItemIds, selectedOutfitIds, isSelectionMode } = useUIStore.getState();
      expect(selectedItemIds.size).toBe(0);
      expect(selectedOutfitIds.size).toBe(0);
      expect(isSelectionMode).toBe(false);
    });
  });
});
