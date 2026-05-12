import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import {
  getOutfits, saveOutfit, updateOutfit, deleteOutfit, filterOutfits,
} from '../services/outfitService';
import { deletePhotos } from '../services/photoService';
import type { Outfit, SortOrder, Photo } from '../types';

export function useOutfits(sort: SortOrder = 'desc') {
  const db = useSQLiteContext();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOutfits(db, sort);
      setOutfits(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load outfits');
    } finally {
      setLoading(false);
    }
  }, [db, sort]);

  useEffect(() => { load(); }, [load]);

  const addOutfit = useCallback(
    async (data: Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'>) => {
      const outfit = await saveOutfit(db, data);
      setOutfits(prev => [outfit, ...prev]);
      return outfit;
    },
    [db]
  );

  const editOutfit = useCallback(
    async (id: string, data: Partial<Omit<Outfit, 'id' | 'createdAt'>>) => {
      await updateOutfit(db, id, data);
      setOutfits(prev =>
        prev.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)
      );
    },
    [db]
  );

  const removeOutfit = useCallback(
    async (id: string, photosToDelete?: Photo[]) => {
      if (photosToDelete?.length) await deletePhotos(photosToDelete);
      await deleteOutfit(db, id);
      setOutfits(prev => prev.filter(o => o.id !== id));
    },
    [db]
  );

  return { outfits, loading, error, reload: load, addOutfit, editOutfit, removeOutfit };
}

export function useFilteredOutfits(outfits: Outfit[], query: string) {
  return filterOutfits(outfits, query);
}
