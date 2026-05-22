import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import { getItems, saveItem, updateItem, deleteItem, moveToTrash, restoreFromTrash, updateItemCategory, filterItems, type ItemSearchMeta } from '../services/itemService';
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

  const trashItem = useCallback(
    async (id: string) => {
      await moveToTrash(db, id);
      setItems(prev => prev.filter(item => item.id !== id));
    },
    [db]
  );

  const recategorizeItem = useCallback(
    async (id: string, categoryId: string | undefined) => {
      await updateItemCategory(db, id, categoryId);
      setItems(prev =>
        prev.map(item => item.id === id ? { ...item, categoryId, updatedAt: new Date().toISOString() } : item)
      );
    },
    [db]
  );

  const restoreItem = useCallback(
    async (id: string) => {
      await restoreFromTrash(db, id);
    },
    [db]
  );

  return { items, loading, error, reload: load, addItem, editItem, removeItem, trashItem, recategorizeItem, restoreItem };
}

export function useFilteredItems(items: Item[], query: string, meta?: ItemSearchMeta) {
  return filterItems(items, query, meta);
}
