import { create } from 'zustand';

interface UIState {
  closetQuery: string;
  outfitQuery: string;
  categoryItemsQuery: string;
  rankingQuery: string;
  selectedItemIds: Set<string>;
  selectedOutfitIds: Set<string>;
  isSelectionMode: boolean;
  itemNavIds: string[];

  setClosetQuery: (q: string) => void;
  setOutfitQuery: (q: string) => void;
  setCategoryItemsQuery: (q: string) => void;
  setRankingQuery: (q: string) => void;
  toggleItemSelection: (id: string) => void;
  toggleOutfitSelection: (id: string) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  setItemNavIds: (ids: string[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  closetQuery: '',
  outfitQuery: '',
  categoryItemsQuery: '',
  rankingQuery: '',
  selectedItemIds: new Set(),
  selectedOutfitIds: new Set(),
  isSelectionMode: false,
  itemNavIds: [],

  setClosetQuery: (q) => set({ closetQuery: q }),
  setOutfitQuery: (q) => set({ outfitQuery: q }),
  setCategoryItemsQuery: (q) => set({ categoryItemsQuery: q }),
  setRankingQuery: (q) => set({ rankingQuery: q }),

  toggleItemSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedItemIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedItemIds: next };
    }),

  toggleOutfitSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedOutfitIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedOutfitIds: next };
    }),

  clearSelection: () =>
    set({ selectedItemIds: new Set(), selectedOutfitIds: new Set(), isSelectionMode: false }),

  enterSelectionMode: () => set({ isSelectionMode: true }),

  setItemNavIds: (ids) => set({ itemNavIds: ids }),
}));
