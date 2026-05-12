import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from '../db/context';
import {
  getCategories, addCategory, updateCategory, deleteCategory,
  getOrigins, addOrigin, deleteOrigin,
  getColors, addColor, deleteColor,
} from '../services/categoryService';
import type { Category, Origin, Color } from '../types';

export function useCategories() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);

  const load = useCallback(async () => {
    setCategories(await getCategories(db));
  }, [db]);

  useEffect(() => { load(); }, [load]);

  return {
    categories,
    reload: load,
    addCategory: async (name: string, color: string) => {
      const cat = await addCategory(db, name, color);
      setCategories(prev => [...prev, cat]);
      return cat;
    },
    updateCategory: async (id: string, name: string, color: string) => {
      await updateCategory(db, id, name, color);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name, color } : c));
    },
    deleteCategory: async (id: string) => {
      await deleteCategory(db, id);
      setCategories(prev => prev.filter(c => c.id !== id));
    },
  };
}

export function useOrigins() {
  const db = useSQLiteContext();
  const [origins, setOrigins] = useState<Origin[]>([]);

  const load = useCallback(async () => {
    setOrigins(await getOrigins(db));
  }, [db]);

  useEffect(() => { load(); }, [load]);

  return {
    origins,
    reload: load,
    addOrigin: async (name: string) => {
      const origin = await addOrigin(db, name);
      setOrigins(prev => [...prev, origin]);
      return origin;
    },
    deleteOrigin: async (id: string) => {
      await deleteOrigin(db, id);
      setOrigins(prev => prev.filter(o => o.id !== id));
    },
  };
}

export function useColors() {
  const db = useSQLiteContext();
  const [colors, setColors] = useState<Color[]>([]);

  const load = useCallback(async () => {
    setColors(await getColors(db));
  }, [db]);

  useEffect(() => { load(); }, [load]);

  return {
    colors,
    reload: load,
    addColor: async (name: string) => {
      const color = await addColor(db, name);
      setColors(prev => [...prev, color]);
      return color;
    },
    deleteColor: async (id: string) => {
      await deleteColor(db, id);
      setColors(prev => prev.filter(c => c.id !== id));
    },
  };
}
