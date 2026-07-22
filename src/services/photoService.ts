import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { Photo, PhotoProfile } from '../types';
import { COMPRESSION_PROFILES } from '../constants/compression';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

export async function ensurePhotosDirExists(): Promise<void> {
  if (Platform.OS === 'web') return;
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

// ── Pick images from library ──────────────────────────────────

export interface PickedImage {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileName?: string;
}

export async function pickImages(limit: number): Promise<PickedImage[]> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
    exif: false,
  });

  if (result.canceled) return [];
  return result.assets.map(a => ({
    uri: a.uri,
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? 'image/jpeg',
    fileName: a.fileName ?? undefined,
  }));
}

// ── Take a photo with the camera ────────────────────────────────

export async function pickFromCamera(): Promise<PickedImage | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
    exif: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? 'image/jpeg',
    fileName: a.fileName ?? undefined,
  };
}

// ── Compress and save a photo ─────────────────────────────────

export async function savePhoto(uri: string, profile: PhotoProfile): Promise<Photo> {
  await ensurePhotosDirExists();

  const p = COMPRESSION_PROFILES[profile];
  const actions: ImageManipulator.Action[] = [];

  if ('width' in p && p.width) {
    // width のみ指定（アスペクト比を維持）
    // height も指定すると expo-image-manipulator が強制リサイズで引き伸ばすため
    actions.push({ resize: { width: p.width } });
  } else if ('maxLongEdge' in p && p.maxLongEdge) {
    // Will resize proportionally in getResizeDimensions helper
    actions.push({ resize: { width: p.maxLongEdge } });
  }

  const manipResult = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: p.quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const destPath = `${PHOTOS_DIR}${id}.jpg`;

  await FileSystem.copyAsync({ from: manipResult.uri, to: destPath });

  return {
    id,
    path: destPath,
    mimeType: 'image/jpeg',
    width: manipResult.width,
    height: manipResult.height,
    profile,
    createdAt: new Date().toISOString(),
  };
}

// ── Save multiple photos (one per profile) ────────────────────

export async function savePhotos(
  uris: string[],
  profile: PhotoProfile,
  onProgress?: (done: number, total: number) => void
): Promise<Photo[]> {
  const photos: Photo[] = [];
  for (let i = 0; i < uris.length; i++) {
    const photo = await savePhoto(uris[i], profile);
    photos.push(photo);
    onProgress?.(i + 1, uris.length);
  }
  return photos;
}

// ── Get displayable URI for a photo path ─────────────────────
// Accepts either a Photo object or a raw path string

export function getPhotoUri(photoOrPath: Photo | string): string {
  const path = typeof photoOrPath === 'string' ? photoOrPath : photoOrPath.path;
  if (Platform.OS === 'web') return path;
  return path.startsWith('file://') ? path : `file://${path}`;
}

/** Extract the UUID from a stored photo path or bare ID */
export function photoIdFromPath(pathOrId: string): string {
  // If it's a full path like file:///…/photos/abc123.jpg → extract abc123
  const filename = pathOrId.split('/').pop() ?? pathOrId;
  return filename.replace(/\.[^.]+$/, '');
}

// ── Delete a single photo file ────────────────────────────────

export async function deletePhoto(photo: Photo): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const normalizedPath = photo.path.startsWith('file://')
      ? photo.path.slice(7)
      : photo.path;
    const info = await FileSystem.getInfoAsync(normalizedPath);
    if (info.exists) {
      await FileSystem.deleteAsync(normalizedPath, { idempotent: true });
    }
  } catch {
    // Best-effort deletion — ignore missing file errors
  }
}

// ── Delete multiple photos ────────────────────────────────────

export async function deletePhotos(photos: Photo[]): Promise<void> {
  await Promise.all(photos.map(deletePhoto));
}

// ── Get storage stats ─────────────────────────────────────────

export interface StorageStats {
  count: number;
  totalBytes: number;
  lastCleanupAt?: string;
}

export async function getStorageStats(): Promise<StorageStats> {
  if (Platform.OS === 'web') return { count: 0, totalBytes: 0 };
  try {
    const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!info.exists) return { count: 0, totalBytes: 0 };

    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
    let totalBytes = 0;
    for (const file of files) {
      const fi = await FileSystem.getInfoAsync(`${PHOTOS_DIR}${file}`);
      if (fi.exists && 'size' in fi) totalBytes += (fi as { size?: number }).size ?? 0;
    }
    return { count: files.length, totalBytes };
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}
