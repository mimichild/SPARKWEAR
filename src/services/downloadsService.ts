import { NativeModules, Platform } from 'react-native';

const { SparkwearDownloads } = NativeModules;

/** 儲存檔案到 Android 下載資料夾（MediaStore.Downloads，不需權限）。
 *  回傳儲存後的路徑字串。僅 Android 可用。
 */
export async function saveFileToDownloads(
  sourcePath: string,
  filename: string
): Promise<string> {
  if (Platform.OS !== 'android') throw new Error('Android only');
  if (!SparkwearDownloads) throw new Error('SparkwearDownloads native module not found');
  return SparkwearDownloads.saveToDownloads(sourcePath, filename);
}
