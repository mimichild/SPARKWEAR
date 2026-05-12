import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import { getItems, saveItem, updateItem, deleteItem, filterItems } from '../services/itemService';
import type { Item, SortOrder } from '../types';
import { deletePhotos } from '../services/photoService';

export function useItems(sort: SortOrder = 'desc') {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getItems(db, sort);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [db, sort]);

  useEffect(() => { load(); }, [load]);

  const addItem = useCallback(
    async (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
      const item = await saveItem(db, data);
      setItems(prev => [item, ...prev]);
      return item;
    },
    [db]
  );

  const editItem = useCallback(
    async (id: string, data: Partial<Omit<Item, 'id' | 'createdAt'>>) => {
      await updateItem(db, id, data);
      setItems(prev =>
        prev.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item)
      );
    },
    [db]
  );

  const removeItem = useCallback(
    async (id: string, photosToDelete?: import('../types').Photo[]) => {
      if (photosToDelete?.length) await deletePhotos(photosToDelete);
      await deleteItem(db, id);
      setItems(prev => prev.filter(item => item.id !== id));
    },
    [db]
  );

  return { items, loading, error, reload: load, addItem, editItem, removeItem };
}

export function useFilteredItems(items: Item[], query: string) {
  return filterItems(items, query);
}
