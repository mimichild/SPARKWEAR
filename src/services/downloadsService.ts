import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const { SparkwearDownloads } = NativeModules;

const LAST_DIR_KEY = '@sparkwear_last_backup_dir_uri';

export interface PickedBackupFolder {
  directoryUri: string;
  label: string;
}

/** 解析 SAF 資料夾 URI 成使用者看得懂的路徑；解析不出來就原樣回傳。 */
export function describeTreeUri(treeUri: string): string {
  const match = treeUri.match(/\/tree\/([^/]+)\/?$/);
  if (!match) return treeUri;

  let decoded: string;
  try {
    decoded = decodeURIComponent(match[1]);
  } catch {
    return treeUri;
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return decoded;

  const volume = decoded.slice(0, colonIndex);
  const relPath = decoded.slice(colonIndex + 1);
  const volumeLabel = volume === 'primary' ? '內部儲存空間' : `外接儲存裝置（${volume}）`;
  return relPath ? `${volumeLabel}/${relPath}` : volumeLabel;
}

/** 讓使用者選擇備份要存放的資料夾（Android SAF 選擇畫面）。取消時回傳 null。僅 Android 可用。 */
export async function pickBackupFolder(initialUri?: string | null): Promise<PickedBackupFolder | null> {
  if (Platform.OS !== 'android') throw new Error('Android only');
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
    initialUri ?? undefined
  );
  if (!result.granted) return null;
  return { directoryUri: result.directoryUri, label: describeTreeUri(result.directoryUri) };
}

/** 把來源檔案串流複製到使用者選定的 SAF 資料夾。回傳新檔案的 SAF URI。僅 Android 可用。 */
export async function saveFileToTreeUri(
  sourcePath: string,
  directoryUri: string,
  filename: string
): Promise<string> {
  if (Platform.OS !== 'android') throw new Error('Android only');
  if (!SparkwearDownloads) throw new Error('SparkwearDownloads native module not found');
  return SparkwearDownloads.saveToTreeUri(sourcePath, directoryUri, filename);
}

export async function getLastBackupDirectoryUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_DIR_KEY);
  } catch {
    return null;
  }
}

export async function setLastBackupDirectoryUri(uri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_DIR_KEY, uri);
  } catch {
    // 記憶上次位置失敗不影響備份結果，忽略即可
  }
}
